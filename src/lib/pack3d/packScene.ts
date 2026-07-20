/**
 * Le sachet 3D — la technique packs.com reproduite avec nos moyens :
 * un « coussin » procédural (bombé, sertissages crantés), UNE texture canvas
 * continue qui couvre tout le pack (art + habillage dessinés ensemble, jamais
 * de collage), et une languette-mesh qui SE COURBE vertex par vertex quand on
 * tire — la courbure croît vers le bout, comme une vraie feuille de mylar.
 * Éclairage PBR (environnement neutre + métal léger) pour le reflet foil.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface PackSceneOpts {
	/** Couleur de la lumière qui fuit par la coupe. */
	glow: string;
	/** URL de l'artwork de couverture. */
	art: string;
	/** Rappelé chaque frame avec la ligne de coupe projetée (px canvas). */
	onHinge?: (h: { x0: number; x1: number; y: number }) => void;
}

export interface PackScene {
	setProgress(p: number): void;
	setPointer(x: number, y: number): void; // -1..1, parallaxe idle
	clearPointer(): void;
	setGlow(color: string): void;
	/** Rush final : la languette finit de se plier puis s'envole. */
	fling(): void;
	resize(): void;
	destroy(): void;
	ready: Promise<void>;
}

/* ------------------------- la texture du sachet ------------------------- */

const TEX_W = 1024;
const TEX_H = 1760; // aspect élancé d'un vrai booster (≈ 3 / 5.16)
const STRIP_F = 0.07; // fraction haute occupée par l'opercule
const CRIMP_B = 0.042; // sertissage bas

async function loadImage(src: string): Promise<HTMLImageElement | null> {
	return new Promise((res) => {
		const im = new Image();
		im.onload = () => res(im);
		im.onerror = () => res(null);
		im.src = src;
	});
}

function drawCover(c: CanvasRenderingContext2D, im: HTMLImageElement) {
	// cover-crop : l'image couvre TOUT le canvas, centrée, cadrée haut
	const s = Math.max(TEX_W / im.width, TEX_H / im.height);
	const w = im.width * s;
	const h = im.height * s;
	c.drawImage(im, (TEX_W - w) / 2, Math.min(0, (TEX_H - h) * 0.22), w, h);
}

function crimpBand(c: CanvasRenderingContext2D, y0: number, y1: number) {
	const h = y1 - y0;
	// le sertissage ARGENTÉ : la feuille foil nue des soudures, cannelée
	c.save();
	const base = c.createLinearGradient(0, y0, 0, y1);
	base.addColorStop(0, '#f5f7fa');
	base.addColorStop(0.28, '#c6ccd6');
	base.addColorStop(0.52, '#eef1f5');
	base.addColorStop(0.78, '#aab2bf');
	base.addColorStop(1, '#dfe4ea');
	c.fillStyle = base;
	c.fillRect(0, y0, TEX_W, h);
	const pitch = TEX_W / 88;
	for (let x = 0; x < TEX_W; x += pitch) {
		const g = c.createLinearGradient(x, 0, x + pitch, 0);
		g.addColorStop(0, 'rgba(70,78,92,0.28)');
		g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
		g.addColorStop(0.7, 'rgba(120,128,142,0.12)');
		g.addColorStop(1, 'rgba(70,78,92,0.28)');
		c.fillStyle = g;
		c.fillRect(x, y0, pitch, h);
	}
	c.restore();
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	c.beginPath();
	c.moveTo(x + r, y);
	c.arcTo(x + w, y, x + w, y + h, r);
	c.arcTo(x + w, y + h, x, y + h, r);
	c.arcTo(x, y + h, x, y, r);
	c.arcTo(x, y, x + w, y, r);
	c.closePath();
}

/** Compose la texture complète du sachet : art continu + habillage. */
async function buildPackTexture(art: string): Promise<HTMLCanvasElement> {
	const cv = document.createElement('canvas');
	cv.width = TEX_W;
	cv.height = TEX_H;
	const c = cv.getContext('2d')!;

	// fond de secours puis l'art en couverture INTÉGRALE (opercule compris)
	c.fillStyle = '#12141c';
	c.fillRect(0, 0, TEX_W, TEX_H);
	const im = await loadImage(art);
	if (im) drawCover(c, im);

	// étalonnage : assoit le tiers logo, garde le sujet lisible
	let g = c.createLinearGradient(0, 0, 0, TEX_H);
	g.addColorStop(0, 'rgba(8,10,15,0.34)');
	g.addColorStop(0.16, 'rgba(8,10,15,0)');
	g.addColorStop(0.46, 'rgba(8,10,15,0)');
	g.addColorStop(0.72, 'rgba(8,10,14,0.55)');
	g.addColorStop(1, 'rgba(6,8,12,0.92)');
	c.fillStyle = g;
	c.fillRect(0, 0, TEX_W, TEX_H);

	// les sertissages : l'art CONTINUE dessous, la matière est juste pincée
	crimpBand(c, 0, TEX_H * STRIP_F);
	crimpBand(c, TEX_H * (1 - CRIMP_B), TEX_H);
	// ligne de soudure sous l'opercule
	g = c.createLinearGradient(0, TEX_H * STRIP_F - 14, 0, TEX_H * STRIP_F + 10);
	g.addColorStop(0, 'rgba(0,0,0,0)');
	g.addColorStop(0.55, 'rgba(0,0,0,0.5)');
	g.addColorStop(1, 'rgba(0,0,0,0)');
	c.fillStyle = g;
	c.fillRect(0, TEX_H * STRIP_F - 14, TEX_W, 24);

	// polices chargées avant de dessiner le lettrage
	try {
		await Promise.all([
			document.fonts.load('900 118px Cinzel'),
			document.fonts.load('700 46px Cinzel'),
			document.fonts.load('700 30px Bahnschrift')
		]);
	} catch {
		/* polices système en secours */
	}

	const cx = TEX_W / 2;

	// pastille de marque, haut centre (sur l'opercule, comme un vrai sachet)
	c.save();
	c.font = '700 34px Cinzel, Georgia, serif';
	const bw = 300;
	roundRect(c, cx - bw / 2, TEX_H * 0.135, bw, 56, 28);
	c.fillStyle = 'rgba(10,12,18,0.84)';
	c.fill();
	c.strokeStyle = 'rgba(216,180,92,0.9)';
	c.lineWidth = 4;
	c.stroke();
	c.fillStyle = '#e9cf8d';
	c.textAlign = 'center';
	c.textBaseline = 'middle';
	c.letterSpacing = '12px';
	c.fillText('EXPELLED', cx + 6, TEX_H * 0.135 + 30);
	c.restore();

	// badge « SET 01 » haut droite
	c.save();
	c.font = '700 26px Bahnschrift, "Segoe UI", sans-serif';
	roundRect(c, TEX_W - 178, TEX_H * 0.145, 132, 44, 9);
	const bg = c.createLinearGradient(0, TEX_H * 0.145, 0, TEX_H * 0.145 + 44);
	bg.addColorStop(0, '#c93247');
	bg.addColorStop(1, '#8e1626');
	c.fillStyle = bg;
	c.fill();
	c.strokeStyle = 'rgba(255,255,255,0.85)';
	c.lineWidth = 3;
	c.stroke();
	c.fillStyle = '#fff';
	c.textAlign = 'center';
	c.textBaseline = 'middle';
	c.letterSpacing = '3px';
	c.fillText('SET 01', TEX_W - 178 + 66, TEX_H * 0.145 + 23);
	c.restore();

	/* --- le tiers bas : surtitre, wordmark or, bannière du set --- */
	const baseY = TEX_H * 0.78;
	c.textAlign = 'center';

	c.save();
	c.font = '700 27px Bahnschrift, "Segoe UI", sans-serif';
	c.letterSpacing = '14px';
	c.fillStyle = 'rgba(236,232,225,0.8)';
	c.shadowColor = 'rgba(0,0,0,0.9)';
	c.shadowBlur = 8;
	c.fillText('TRADING CARD GAME', cx + 7, baseY - 96);
	c.restore();

	c.save();
	c.font = '900 118px Cinzel, Georgia, serif';
	c.letterSpacing = '6px';
	const wg = c.createLinearGradient(0, baseY - 76, 0, baseY + 34);
	wg.addColorStop(0, '#fff6d8');
	wg.addColorStop(0.34, '#ecc76a');
	wg.addColorStop(0.52, '#8a6a1f');
	wg.addColorStop(0.68, '#f4dc94');
	wg.addColorStop(1, '#b3892c');
	c.shadowColor = 'rgba(0,0,0,0.85)';
	c.shadowBlur = 14;
	c.shadowOffsetY = 5;
	c.fillStyle = wg;
	c.fillText('EXPELLED', cx + 3, baseY);
	c.restore();

	// bannière « LE SILENCE »
	c.save();
	c.font = '700 46px Cinzel, Georgia, serif';
	const tw = 420;
	roundRect(c, cx - tw / 2, baseY + 34, tw, 78, 20);
	const bb = c.createLinearGradient(0, baseY + 34, 0, baseY + 112);
	bb.addColorStop(0, 'rgba(20,14,4,0.94)');
	bb.addColorStop(1, 'rgba(4,3,1,0.96)');
	c.fillStyle = bb;
	c.fill();
	const bs = c.createLinearGradient(0, baseY + 34, 0, baseY + 112);
	bs.addColorStop(0, '#f4dc94');
	bs.addColorStop(0.45, '#8a6a1f');
	bs.addColorStop(1, '#e9cf8d');
	c.strokeStyle = bs;
	c.lineWidth = 6;
	c.stroke();
	c.fillStyle = '#f2e3b6';
	c.textBaseline = 'middle';
	c.letterSpacing = '8px';
	c.shadowColor = 'rgba(233,207,141,0.45)';
	c.shadowBlur = 16;
	c.fillText('LE SILENCE', cx + 4, baseY + 76);
	c.restore();

	/* bords crantés haut/bas : la découpe d'usine en zigzag (cf. photo) —
	   gravée en transparence dans la texture, la silhouette 3D suit. */
	c.save();
	c.globalCompositeOperation = 'destination-out';
	const TEETH = 34;
	const DEPTH = TEX_H * 0.0075;
	for (const top of [true, false]) {
		c.beginPath();
		const yEdge = top ? 0 : TEX_H;
		const dir = top ? 1 : -1;
		c.moveTo(0, yEdge);
		for (let i = 0; i <= TEETH; i++) {
			const x = (i / TEETH) * TEX_W;
			const xm = ((i + 0.5) / TEETH) * TEX_W;
			c.lineTo(x, yEdge + dir * DEPTH);
			if (i < TEETH) c.lineTo(xm, yEdge);
		}
		c.lineTo(TEX_W, yEdge);
		c.closePath();
		c.fill();
	}
	c.restore();

	// mentions basses
	c.save();
	c.textAlign = 'left';
	c.font = '800 26px Bahnschrift, "Segoe UI", sans-serif';
	c.fillStyle = '#f0ede6';
	c.shadowColor = 'rgba(0,0,0,0.95)';
	c.shadowBlur = 6;
	c.letterSpacing = '3px';
	c.fillText('5 CARTES', 44, TEX_H * 0.915);
	c.font = '700 19px Bahnschrift, "Segoe UI", sans-serif';
	c.fillStyle = 'rgba(240,237,230,0.75)';
	c.fillText('PAR SACHET', 44, TEX_H * 0.915 + 27);
	c.textAlign = 'center';
	c.font = '17px Consolas, monospace';
	c.fillStyle = 'rgba(236,232,225,0.55)';
	c.letterSpacing = '2px';
	c.fillText('© 2026 EXPELLED · SET 01 · LE SILENCE', cx, TEX_H * 0.985 - 10);
	c.restore();

	return cv;
}

/* --------------------------- la géométrie coussin --------------------------- */

const PW = 3; // largeur monde
const PH = PW * (TEX_H / TEX_W); // même aspect élancé que la texture
const BULGE = PW * 0.058; // l'arc du booster : galbe cylindrique dans la largeur
const SEGX = 48;
const SEGY = 80;

const smooth = (t: number) => {
	const x = Math.max(0, Math.min(1, t));
	return x * x * (3 - 2 * x);
};

/** z du sachet — la forme du VRAI booster (cf. photo de référence) :
 *  un arc cylindrique doux dans la LARGEUR (une seule bande de reflet
 *  verticale), constant sur la hauteur du corps, pincé aux sertissages
 *  avec de petits plis de tension en éventail. */
function pillowZ(u: number, v: number): number {
	const crimpTop = 1 - STRIP_F;
	let flat = 1;
	if (v > crimpTop) flat = Math.max(0.12, 1 - ((v - crimpTop) / STRIP_F) * 0.9);
	else if (v < CRIMP_B * 1.4) flat = 0.15 + (v / (CRIMP_B * 1.4)) * 0.85;
	const vn = Math.min(1, Math.max(0, v / crimpTop));
	// l'arc : sin^1.3 → bombé doux au centre, tombée franche aux flancs
	const arc = Math.pow(Math.sin(Math.PI * u), 1.3);
	// constant sur la hauteur, fondu court vers les soudures
	const taper = smooth(vn / 0.09) * smooth((1 - vn) / 0.09);
	// plis de tension en éventail près des soudures (comme sur la photo)
	const pinch = Math.max(0, 1 - vn / 0.09) + Math.max(0, 1 - (1 - vn) / 0.09);
	const wrinkle = 0.012 * pinch * Math.sin(u * 19.7 + 1.3) * Math.pow(Math.sin(Math.PI * u), 0.5);
	return (BULGE * arc * taper + wrinkle * PW * 0.2) * flat;
}

function buildBody(tex: THREE.Texture): THREE.Mesh {
	const bodyH = PH * (1 - STRIP_F);
	const geo = new THREE.PlaneGeometry(PW, bodyH, SEGX, SEGY);
	const pos = geo.attributes.position as THREE.BufferAttribute;
	const uv = geo.attributes.uv as THREE.BufferAttribute;
	for (let i = 0; i < pos.count; i++) {
		const u = uv.getX(i);
		const vFull = uv.getY(i) * (1 - STRIP_F); // 0..1-STRIP_F du sachet complet
		pos.setZ(i, pillowZ(u, vFull));
		uv.setY(i, uv.getY(i) * (1 - STRIP_F)); // la texture ne se répète JAMAIS
	}
	geo.computeVertexNormals();
	const mat = new THREE.MeshPhysicalMaterial({
		map: tex,
		metalness: 0.22,
		roughness: 0.46,
		clearcoat: 0.35, // satin : le film brille en douceur, jamais il n'éblouit
		clearcoatRoughness: 0.32,
		envMapIntensity: 0.5,
		alphaTest: 0.5, // les crans découpés dans la texture
		side: THREE.FrontSide
	});
	const m = new THREE.Mesh(geo, mat);
	m.position.y = -PH * STRIP_F * 0.5;
	return m;
}

interface StripBundle {
	group: THREE.Group;
	front: THREE.Mesh;
	base: Float32Array;
	deform(p: number): void;
	setOpacity(o: number): void;
}

function buildStrip(tex: THREE.Texture): StripBundle {
	const stripH = PH * STRIP_F;
	const geo = new THREE.PlaneGeometry(PW, stripH, SEGX, 10);
	const pos = geo.attributes.position as THREE.BufferAttribute;
	const uv = geo.attributes.uv as THREE.BufferAttribute;
	for (let i = 0; i < pos.count; i++) {
		const u = uv.getX(i);
		const vFull = 1 - STRIP_F + uv.getY(i) * STRIP_F;
		pos.setZ(i, pillowZ(u, vFull));
		uv.setY(i, vFull); // continuité parfaite de la texture avec le corps
	}
	geo.computeVertexNormals();
	const mat = new THREE.MeshPhysicalMaterial({
		map: tex,
		metalness: 0.22,
		roughness: 0.46,
		clearcoat: 0.35,
		clearcoatRoughness: 0.32,
		envMapIntensity: 0.5,
		alphaTest: 0.5,
		transparent: true,
		side: THREE.FrontSide
	});
	const front = new THREE.Mesh(geo, mat);

	// le dos : feuille foil mate — visible quand la languette bascule
	const backMat = new THREE.MeshStandardMaterial({
		color: 0xb9c0cc,
		metalness: 0.85,
		roughness: 0.38,
		transparent: true,
		side: THREE.BackSide
	});
	const back = new THREE.Mesh(geo.clone(), backMat);
	back.position.z = -0.001;

	const group = new THREE.Group();
	group.add(front);
	group.add(back);
	group.position.y = PH * 0.5 - stripH * 0.5;

	const base = new Float32Array(pos.array);
	const hingeY = -stripH / 2; // la ligne de coupe, en local

	/** LA courbure : chaque vertex tourne autour de la charnière d'un angle qui
	 *  croît vers le bout ET vers la gauche — la feuille PLIE, elle ne pivote pas.
	 *  Plafonnée à ~106° : la languette pliée reste DEBOUT, bien visible
	 *  au-dessus du sachet (cf. la vidéo packs.com), jamais escamotée derrière. */
	function deform(p: number) {
		const arr = pos.array as Float32Array;
		const backPos = (back.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
		const thetaMax = 2.0;
		for (let i = 0; i < pos.count; i++) {
			const ix = i * 3;
			const bx = base[ix];
			const by = base[ix + 1];
			const bz = base[ix + 2];
			const u = bx / PW + 0.5;
			const d = by - hingeY; // distance à la charnière
			const dn = d / (stripH || 1);
			// le côté gauche (départ du geste) mène ; la racine se lève (~45°),
			// le BOUT s'enroule (~115°) — la feuille visible qui plie, pas un volet
			const lead = 0.72 + 0.28 * (1 - u);
			const theta = p * thetaMax * lead * (0.35 + 0.65 * dn);
			const cos = Math.cos(theta);
			const sin = Math.sin(theta);
			arr[ix] = bx;
			arr[ix + 1] = hingeY + d * cos - bz * sin * 0.3;
			arr[ix + 2] = bz * cos - d * sin;
			backPos[ix] = arr[ix];
			backPos[ix + 1] = arr[ix + 1];
			backPos[ix + 2] = arr[ix + 2] - 0.002;
		}
		pos.needsUpdate = true;
		(back.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
		geo.computeVertexNormals();
		back.geometry.computeVertexNormals();
	}

	function setOpacity(o: number) {
		mat.opacity = o;
		backMat.opacity = o;
	}

	return { group, front, base, deform, setOpacity };
}

/* ------------------------------- les rayons ------------------------------- */

function buildRays(glow: string): { mesh: THREE.Mesh; setColor(c: string): void; mat: THREE.MeshBasicMaterial } {
	const cv = document.createElement('canvas');
	cv.width = 512;
	cv.height = 256;
	const c = cv.getContext('2d')!;
	// cœur de lumière + stries angulaires douces
	const g = c.createRadialGradient(256, 210, 6, 256, 210, 210);
	g.addColorStop(0, 'rgba(255,255,255,0.95)');
	g.addColorStop(0.25, 'rgba(255,255,255,0.5)');
	g.addColorStop(1, 'rgba(255,255,255,0)');
	c.fillStyle = g;
	c.fillRect(0, 0, 512, 256);
	for (let i = 0; i < 9; i++) {
		const a = -Math.PI / 2 + (i - 4) * 0.19;
		c.save();
		c.translate(256, 236);
		c.rotate(a);
		const rg = c.createLinearGradient(0, 0, 0, -230);
		rg.addColorStop(0, 'rgba(255,255,255,0.5)');
		rg.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = rg;
		c.fillRect(-7, -230, 14, 230);
		c.restore();
	}
	const tex = new THREE.CanvasTexture(cv);
	tex.colorSpace = THREE.SRGBColorSpace;
	const mat = new THREE.MeshBasicMaterial({
		map: tex,
		color: new THREE.Color(glow),
		transparent: true,
		opacity: 0,
		blending: THREE.AdditiveBlending,
		depthWrite: false
	});
	const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PW * 1.25, PH * 0.5), mat);
	mesh.position.set(0, PH * 0.5 - PH * STRIP_F, -0.02);
	return { mesh, setColor: (col) => mat.color.set(col), mat };
}

/* --------------------------------- la scène --------------------------------- */

export function createPackScene(canvas: HTMLCanvasElement, opts: PackSceneOpts): PackScene {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.88;

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
	camera.position.set(0, 0, 10.2);

	// lumière : environnement neutre (le foil vit de reflets) + une directionnelle
	const pmrem = new THREE.PMREMGenerator(renderer);
	scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
	const key = new THREE.DirectionalLight(0xfff2dd, 0.5);
	key.position.set(-3, 4, 6);
	scene.add(key);
	const rim = new THREE.DirectionalLight(0xaec4ff, 0.2);
	rim.position.set(4, -2, 5);
	scene.add(rim);

	const root = new THREE.Group(); // parallaxe + flottement
	scene.add(root);
	const packGroup = new THREE.Group(); // inclinaison au drag
	root.add(packGroup);

	let strip: StripBundle | null = null;
	let rays: ReturnType<typeof buildRays> | null = null;
	let progress = 0;
	let flingT = -1; // horloge d'envol de la languette (<0 = pas d'envol)
	let disposed = false;

	const ready = (async () => {
		const texCv = await buildPackTexture(opts.art);
		if (disposed) return;
		const tex = new THREE.CanvasTexture(texCv);
		tex.colorSpace = THREE.SRGBColorSpace;
		tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
		packGroup.add(buildBody(tex));
		strip = buildStrip(tex);
		packGroup.add(strip.group);
		rays = buildRays(opts.glow);
		packGroup.add(rays.mesh);
	})();

	/* pointeur → parallaxe (lerp 0.08, ±0.26 rad ≈ 15° — le réglage packs.com) */
	const target = { x: 0, y: 0 };
	const current = { x: 0, y: 0 };
	const MAXR = Math.PI / 12;

	const clock = new THREE.Clock();
	let raf = 0;
	const hinge3a = new THREE.Vector3();
	const hinge3b = new THREE.Vector3();

	function frame() {
		if (disposed) return;
		raf = requestAnimationFrame(frame);
		const t = clock.getElapsedTime();

		current.x += (target.x - current.x) * 0.08;
		current.y += (target.y - current.y) * 0.08;
		root.rotation.y = current.x * MAXR;
		root.rotation.x = -current.y * MAXR;
		// flottement
		root.position.y = Math.sin(t * 1.15) * 0.07;
		root.rotation.z = Math.sin(t * 0.9) * 0.012;

		// l'inclinaison en tirant (0.18 rad plein geste) + léger recul
		packGroup.rotation.z = -progress * 0.18;
		packGroup.position.x = progress * 0.12;

		// l'envol de la languette après l'arrachage
		if (flingT >= 0 && strip) {
			flingT += clock.getDelta() * 0 + 1 / 60;
			const k = Math.min(1, flingT / 0.5);
			const e = k * k;
			strip.group.position.x = PW * 0.9 * e;
			strip.group.position.y = PH * 0.5 - PH * STRIP_F * 0.5 + PH * 0.85 * e;
			strip.group.rotation.z = 1.9 * e;
			strip.setOpacity(1 - k);
		}

		if (rays) {
			rays.mat.opacity = Math.pow(progress, 1.6) * (0.5 + 0.14 * Math.sin(t * 9));
			rays.mesh.scale.x = 0.35 + progress * 0.85;
			rays.mesh.scale.y = 0.3 + progress * 1.1;
		}

		renderer.render(scene, camera);

		// la ligne de coupe projetée → la pilule DOM se cale dessus
		if (opts.onHinge && strip) {
			const y = PH * 0.5 - PH * STRIP_F;
			hinge3a.set(-PW / 2, y, 0.05);
			hinge3b.set(PW / 2, y, 0.05);
			packGroup.localToWorld(hinge3a);
			packGroup.localToWorld(hinge3b);
			hinge3a.project(camera);
			hinge3b.project(camera);
			const W = canvas.clientWidth;
			const H = canvas.clientHeight;
			opts.onHinge({
				x0: (hinge3a.x * 0.5 + 0.5) * W,
				x1: (hinge3b.x * 0.5 + 0.5) * W,
				y: (1 - (hinge3a.y * 0.5 + 0.5)) * H
			});
		}
	}

	function resize() {
		const w = canvas.clientWidth || 300;
		const h = canvas.clientHeight || 430;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		// cadrer le sachet : hauteur monde PH+marge dans le champ
		const fitH = (PH * 1.24) / 2 / Math.tan((camera.fov * Math.PI) / 360);
		camera.position.z = Math.max(fitH, ((PW * 1.3) / 2 / Math.tan((camera.fov * Math.PI) / 360)) / camera.aspect);
		camera.updateProjectionMatrix();
	}

	resize();
	frame();

	return {
		ready,
		setProgress(p) {
			progress = Math.max(0, Math.min(1, p));
			strip?.deform(progress);
		},
		setPointer(x, y) {
			target.x = x;
			target.y = y;
		},
		clearPointer() {
			target.x = 0;
			target.y = 0;
		},
		setGlow(c) {
			rays?.setColor(c);
		},
		fling() {
			flingT = 0;
		},
		resize,
		destroy() {
			disposed = true;
			cancelAnimationFrame(raf);
			pmrem.dispose();
			renderer.dispose();
			scene.traverse((o) => {
				const m = o as THREE.Mesh;
				if (m.geometry) m.geometry.dispose();
				const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
				for (const mat of mats) {
					const sm = mat as THREE.MeshStandardMaterial;
					sm.map?.dispose();
					mat.dispose();
				}
			});
		}
	};
}
