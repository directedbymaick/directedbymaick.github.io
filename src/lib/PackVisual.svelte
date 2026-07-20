<script lang="ts" module>
	/* Géométrie du sachet : dents de sertissage régulières, déchirure irrégulière.
	   Tout est précalculé en polygones clip-path — même rendu partout, zéro asset. */

	/** Bord cranté régulier (sertissage industriel). */
	function saw(edge: 'top' | 'bottom', teeth: number, depth: number): string {
		const pts: string[] = [];
		if (edge === 'top') {
			pts.push('0% 100%');
			for (let i = 0; i <= teeth * 2; i++)
				pts.push(`${((i / (teeth * 2)) * 100).toFixed(2)}% ${i % 2 === 0 ? depth : 0}%`);
			pts.push('100% 100%');
		} else {
			pts.push('0% 0%');
			for (let i = 0; i <= teeth * 2; i++)
				pts.push(`${((i / (teeth * 2)) * 100).toFixed(2)}% ${i % 2 === 0 ? 100 - depth : 100}%`);
			pts.push('100% 0%');
		}
		return `polygon(${pts.join(',')})`;
	}

	/* L'opercule : sertissage denté en haut, bord bas NET au repos (sachet scellé).
	   Les formes sont des listes de points de même longueur : la déchirure
	   s'INTERPOLE avec la progression du geste — on déchire, on ne déclenche pas. */
	type Pts = [number, number][];
	function bodyPts(jagged: boolean): Pts {
		let s = 13;
		const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
		const pts: Pts = [[0, 100]];
		for (let i = 0; i <= 30; i++) pts.push([(i / 30) * 100, jagged ? rnd() * 2.2 : 0]);
		pts.push([100, 100]);
		return pts;
	}
	const BODY_CLEAN_PTS = bodyPts(false);
	const BODY_TORN_PTS = bodyPts(true);

	const poly = (pts: Pts) =>
		`polygon(${pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(',')})`;
	const lerpPts = (a: Pts, b: Pts, t: number): Pts =>
		a.map(([x, y], i) => [x + (b[i][0] - x) * t, y + (b[i][1] - y) * t]);

	/* Échantillonneurs pour le rendu canvas de l'opercule :
	   bord haut denté (fixe) et bord bas déchiré (interpolé). En % de la hauteur.
	   Crans FINS, comme la découpe d'usine d'un vrai booster. */
	const sawTopY = (u: number) => 11 * Math.abs(2 * ((u * 42) % 1) - 1);
	const BOT_TORN: number[] = (() => {
		let s = 7;
		const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
		const a: number[] = [];
		for (let i = 30; i >= 0; i--) a[i] = 56 + rnd() * 40;
		return a;
	})();
	function tornBottomY(u: number, t: number): number {
		const x = Math.min(29.999, u * 30);
		const i = Math.floor(x);
		const f = x - i;
		const jag = BOT_TORN[i] + (BOT_TORN[i + 1] - BOT_TORN[i]) * f;
		return 88 + (jag - 88) * t;
	}

	const SAW_BOTTOM = saw('bottom', 44, 30);
</script>

<script lang="ts">
	import { Spring } from 'svelte/motion';

	let {
		ontorn,
		glow = '#ffcd6e',
		prisma = false
	}: { ontorn?: () => void; glow?: string; prisma?: boolean } = $props();

	let progress = $state(0); // 0 → 1
	let dragging = $state(false);
	let torn = $state(false);
	let bursting = $state(false); // la seconde de rage avant que le sachet cède
	let startX = 0;
	let stripEl: HTMLElement;
	let wrapEl: HTMLElement;

	/* ---- relief : le sachet est un objet. Il s'incline sous le pointeur,
	   le reflet glisse sur le mylar — ressort physique, comme les cartes. ---- */
	const tilt = new Spring({ x: 0.5, y: 0.5 }, { stiffness: 0.08, damping: 0.6 });
	let hover = $state(false);
	function tiltMove(e: PointerEvent) {
		if (dragging || bursting || torn) return;
		const r = wrapEl.getBoundingClientRect();
		tilt.target = {
			x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
			y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
		};
	}
	function tiltLeave() {
		hover = false;
		tilt.target = { x: 0.5, y: 0.5 };
	}
	const rx = $derived((0.5 - tilt.current.y) * 9);
	const ry = $derived((tilt.current.x - 0.5) * 13);

	const THRESHOLD = 0.85;

	/* Le corps se découvre quand l'opercule se soulève. */
	const bodyT = $derived(torn || bursting ? 1 : Math.max(0, (progress - 0.3) / 0.7));
	const clipBodyPts = $derived(lerpPts(BODY_CLEAN_PTS, BODY_TORN_PTS, bodyT));
	const clipBody = $derived(poly(clipBodyPts));
	/* le bord déchiré seul (sans les coins bas) : le trait de lumière l'épouse
	   au pixel — MÊMES points que la découpe du corps. */
	const tearEdge = $derived(
		clipBodyPts
			.slice(1, -1)
			.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
			.join(' ')
	);

	/* ---- l'opercule : rendu canvas avec VRAI enroulement (page-curl) ----
	   Chaque colonne de pixels s'enroule autour d'un cylindre virtuel placé au
	   front de déchirure : raccourci horizontal en cos(θ), levée en R(1-cos θ),
	   ombrage de courbure, reflet sur la crête, dos de feuille au-delà de 90°. */
	let ripCv: HTMLCanvasElement;
	let tex: HTMLCanvasElement | null = null;
	let texW = 0;
	let texH = 0;
	const CDPR = Math.min(globalThis.devicePixelRatio || 1, 2);

	function buildTexture(w: number, h: number) {
		tex = document.createElement('canvas');
		tex.width = w;
		tex.height = h;
		const c = tex.getContext('2d')!;
		const g = c.createLinearGradient(0, 0, 0, h);
		g.addColorStop(0, '#f5f7fa');
		g.addColorStop(0.28, '#c6ccd6');
		g.addColorStop(0.52, '#eef1f5');
		g.addColorStop(0.78, '#aab2bf');
		g.addColorStop(1, '#dfe4ea');
		c.fillStyle = g;
		c.fillRect(0, 0, w, h);
		// cannelures du sertissage : paires ombre/lumière serrées — le métal gaufré
		const pitch = Math.max(4, Math.round(w / 70));
		const lw = Math.max(1, Math.round(w / 300));
		for (let x = 0; x < w; x += pitch) {
			c.fillStyle = 'rgba(30,36,46,0.16)';
			c.fillRect(x, 0, lw, h);
			c.fillStyle = 'rgba(255,255,255,0.38)';
			c.fillRect(x + lw, 0, lw, h);
		}
		// l'indice de geste, gravé dans la matière — il se courbe avec elle
		c.fillStyle = 'rgba(40,48,60,0.7)';
		c.font = `600 ${Math.round(h * 0.28)}px Consolas, monospace`;
		c.textAlign = 'center';
		c.textBaseline = 'middle';
		c.fillText('⠿  T I R E R  →', w / 2, h * 0.45);
	}

	function drawCurl() {
		if (!ripCv || !tex) return;
		const c = ripCv.getContext('2d')!;
		const cw = ripCv.width;
		const chh = ripCv.height;
		c.clearRect(0, 0, cw, chh);
		const w = texW;
		const h = texH;
		const baseY = chh - h;
		const p = torn ? 1 : progress;
		const t = torn || bursting ? 1 : Math.pow(progress, 1.6);
		const F = p * w; // front de déchirure
		const R = h * 1.05; // rayon d'enroulement
		const step = Math.max(1, Math.round(CDPR));

		// ombre portée de la boucle sur le corps du sachet
		if (F > 4) {
			const sh = c.createLinearGradient(0, baseY + h * 0.15, 0, chh);
			sh.addColorStop(0, `rgba(0,0,0,${(0.3 * Math.min(1, p * 1.5)).toFixed(3)})`);
			sh.addColorStop(1, 'rgba(0,0,0,0)');
			c.fillStyle = sh;
			c.fillRect(0, baseY + h * 0.15, F, h);
		}

		for (let x = 0; x < w; x += step) {
			const u = x / w;
			const topY = (sawTopY(u) / 100) * h;
			const botY = (tornBottomY(u, t) / 100) * h;
			const colH = botY - topY;
			if (colH <= 0) continue;
			if (x >= F) {
				// encore soudé : à plat
				c.drawImage(tex, x, topY, step, colH, x, baseY + topY, step, colH);
			} else {
				const th = Math.min((F - x) / R, 2.2);
				const cosT = Math.cos(th);
				const xP = F - R * Math.sin(th);
				const lift = R * (1 - cosT) * 0.85;
				const wCol = Math.max(0.7, step * Math.max(0.25, Math.abs(cosT)));
				const y = baseY + topY - lift;
				if (th <= Math.PI / 2) {
					// face avant qui s'enroule
					c.drawImage(tex, x, topY, step, colH, xP, y, wCol, colH);
					const dark = (1 - cosT) * 0.34;
					if (dark > 0.02) {
						c.fillStyle = `rgba(15,20,28,${dark.toFixed(3)})`;
						c.fillRect(xP, y, wCol, colH);
					}
					const spec = Math.max(0, 1 - Math.abs(th - 0.9) / 0.45) * 0.22;
					if (spec > 0.02) {
						c.fillStyle = `rgba(255,255,255,${spec.toFixed(3)})`;
						c.fillRect(xP, y, wCol, colH);
					}
				} else {
					// le dos de l'opercule : feuille argentée mate, dans l'ombre
					c.fillStyle = 'rgba(168,176,190,0.92)';
					c.fillRect(xP, y, wCol, colH);
					c.fillStyle = `rgba(60,70,84,${(0.25 + Math.min(0.3, (th - Math.PI / 2) * 0.3)).toFixed(3)})`;
					c.fillRect(xP, y, wCol, colH);
				}
			}
		}
	}

	$effect(() => {
		void progress;
		void torn;
		void bursting;
		drawCurl();
	});

	$effect(() => {
		if (!stripEl || !ripCv) return;
		const ro = new ResizeObserver(() => {
			const w = Math.max(1, Math.round(stripEl.offsetWidth * CDPR));
			const h = Math.max(1, Math.round(stripEl.offsetHeight * CDPR));
			ripCv.width = w;
			ripCv.height = h * 3; // marge haute : la boucle monte au-dessus de l'opercule
			texW = w;
			texH = h;
			buildTexture(w, h);
			drawCurl();
		});
		ro.observe(stripEl);
		return () => ro.disconnect();
	});

	function down(e: PointerEvent) {
		if (torn || bursting) return;
		dragging = true;
		startX = e.clientX;
		try {
			stripEl.setPointerCapture(e.pointerId);
		} catch {
			/* évènement synthétique : pas de capture */
		}
	}
	function move(e: PointerEvent) {
		if (!dragging || torn || bursting) return;
		const w = stripEl.parentElement?.clientWidth ?? 300;
		// tout le geste compte : ~un sachet de large pour arracher l'opercule
		progress = Math.min(1, Math.max(0, (e.clientX - startX) / (w * 0.95)));
		if (progress >= THRESHOLD) tear();
	}
	function up() {
		if (torn || bursting) return;
		dragging = false;
		// le sachet se rescelle en douceur : la boucle se déroule et se repose
		const p0 = progress;
		const t0 = performance.now();
		const dur = 420;
		const reseal = (now: number) => {
			if (dragging || bursting || torn) return;
			const k = Math.min(1, (now - t0) / dur);
			progress = p0 * (1 - (1 - Math.pow(1 - k, 3)));
			if (k < 1) requestAnimationFrame(reseal);
		};
		requestAnimationFrame(reseal);
	}
	/** Déchire le sachet (drag abouti, ou ouverture rapide via bind).
	 *  L'arrachage se TERMINE dans l'élan : la progression file vers 1 en accélérant,
	 *  puis tremblement + fuite de lumière → le sachet cède → burst parent. */
	export function tear() {
		if (torn || bursting) return;
		bursting = true;
		dragging = false;
		const p0 = progress;
		const t0 = performance.now();
		const dur = 260;
		const finish = (now: number) => {
			const k = Math.min(1, (now - t0) / dur);
			progress = p0 + (1 - p0) * k * k;
			if (k < 1) requestAnimationFrame(finish);
		};
		requestAnimationFrame(finish);
		setTimeout(() => (torn = true), 430);
		setTimeout(() => ontorn?.(), 800);
	}
</script>

<div
	class="pack3d"
	bind:this={wrapEl}
	role="presentation"
	onpointermove={tiltMove}
	onpointerenter={() => (hover = true)}
	onpointerleave={tiltLeave}
	style="--rx: {rx.toFixed(2)}deg; --ry: {ry.toFixed(2)}deg; --gx: {(tilt.current.x * 100).toFixed(1)}%; --gy: {(tilt.current.y * 100).toFixed(1)}%"
>
<div
	class="pack"
	class:torn
	class:dragging
	class:bursting
	class:prisma
	class:hover
	style="--p: {progress}; --glow: {glow}"
>
	<!-- l'opercule serti qu'on arrache -->
	<div
		bind:this={stripEl}
		class="rip"
		role="slider"
		aria-label="Glisser pour ouvrir le booster"
		aria-valuenow={Math.round(progress * 100)}
		tabindex="0"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onkeydown={(e) => e.key === 'Enter' && tear()}
	>
		<canvas bind:this={ripCv} class="ripcv" aria-hidden="true"></canvas>
	</div>

	<!-- rails latéraux : la soudure du sachet -->
	<div class="rail left" aria-hidden="true"></div>
	<div class="rail right" aria-hidden="true"></div>

	<!-- le corps : couverture pleine, habillage éditorial façon booster réel -->
	<div class="body" style="clip-path: {clipBody}">
		<img class="cover" src="/art/rasen.webp" alt="" draggable="false" />
		<div class="grade" aria-hidden="true"></div>
		<div class="plastic" aria-hidden="true"></div>
		<div class="foilgrain" aria-hidden="true"></div>
		<div class="sheen" aria-hidden="true"></div>
			<!-- le trait de lumière qui ÉPOUSE le bord déchiré (mêmes points que la découpe) -->
			<svg class="tearline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
				<polyline points={tearEdge} vector-effect="non-scaling-stroke" />
			</svg>

		<span class="brand-pill">Expelled</span>
		<span class="badges">
			<span class="badge red">Set 01</span>
			<span class="badge dark">1ʳᵉ Édition</span>
		</span>

		<div class="logo-block">
			<p class="logo-over">Trading Card Game</p>
			<p class="wordmark">Expelled</p>
			<p class="set-banner">Le Silence</p>
		</div>

		<p class="count">5 cartes<br /><small>par sachet</small></p>
		<p class="legal">© 2026 Expelled · Set 01 · Le Silence</p>

		<!-- le reflet qui suit le pointeur — clippé par le corps, jamais de voile fantôme -->
		<div class="glare3d" aria-hidden="true"></div>
	</div>

	<div class="crimp-bottom" style="clip-path: {SAW_BOTTOM}" aria-hidden="true"></div>
</div>
</div>

<style>
	/* ---------- relief : perspective + inclinaison au pointeur ---------- */
	.pack3d {
		perspective: 1100px;
		animation: float 5.2s ease-in-out infinite;
	}
	/* on n'inspecte pas un objet qui bouge : le flottement s'arrête sous le pointeur */
	.pack3d:hover {
		animation-play-state: paused;
	}
	.pack3d .pack {
		transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
		will-change: transform;
	}
	.pack {
		position: relative;
		width: var(--pack-w, 274px);
		/* l'élancement d'un vrai booster (cf. photo de référence MTG) */
		aspect-ratio: 3 / 5.05;
		container-type: inline-size;
		filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.55));
		transition: filter 0.3s ease;
	}
	@keyframes float {
		0%, 100% { transform: translateY(0) rotate(0deg); }
		50% { transform: translateY(-8px) rotate(0.5deg); }
	}
	.pack.dragging {
		animation-play-state: paused;
	}
	.pack.bursting {
		animation: rumble 0.43s linear forwards;
	}
	@keyframes rumble {
		0% { transform: translate(0, 0) rotate(0deg); }
		12% { transform: translate(-1px, 1px) rotate(-0.3deg); }
		24% { transform: translate(2px, -1px) rotate(0.4deg); }
		36% { transform: translate(-2px, 2px) rotate(-0.6deg); }
		48% { transform: translate(3px, -2px) rotate(0.7deg); }
		60% { transform: translate(-4px, 2px) rotate(-0.9deg); }
		72% { transform: translate(4px, -3px) rotate(1deg); }
		84% { transform: translate(-5px, 3px) rotate(-1.2deg); }
		100% { transform: translate(3px, -2px) rotate(0.8deg); }
	}
	@media (prefers-reduced-motion: reduce) {
		.pack3d, .pack, .pack.bursting { animation: none; }
		.pack3d .pack { transform: none; }
	}

	/* ---------- métal argenté du sertissage bas : gaufré ombre/lumière ---------- */
	.crimp-bottom {
		background:
			repeating-linear-gradient(
				90deg,
				rgba(30, 36, 46, 0.14) 0 1.5px,
				rgba(255, 255, 255, 0.32) 1.5px 3px,
				transparent 3px 7px
			),
			linear-gradient(180deg, #f5f7fa 0%, #c6ccd6 28%, #eef1f5 52%, #aab2bf 78%, #dfe4ea 100%);
	}

	/* ---------- l'opercule ---------- */
	.rip {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 9.5%; /* la bande d'un vrai booster : plus fine */
		z-index: 3;
		cursor: grab;
		touch-action: none;
		user-select: none;
	}
	.pack.dragging .rip { cursor: grabbing; }
	/* la boucle du curl monte au-dessus de l'opercule : le canvas déborde vers le haut */
	.ripcv {
		position: absolute;
		left: 0;
		bottom: 0;
		width: 100%;
		height: 300%;
		pointer-events: none;
	}
	.pack.torn .rip {
		transform: translate(60%, -120%) rotate(18deg);
		opacity: 0;
		transition:
			transform 0.55s cubic-bezier(0.3, 0, 0.7, 0.2),
			opacity 0.5s ease;
	}

	/* ---------- LA LUEUR : lumière qui sourd de la déchirure, DERRIÈRE le pack ----
	   .pack::before, DERRIÈRE (z-index -1) : on la voit à travers l'ouverture qui
	   s'élargit et auréoler le haut. Radiale, TRÈS floutée → aucun bord, aucune
	   forme lisible, juste de la lumière diffuse. Enfant de .pack → suit ses
	   mouvements ET s'efface avec lui (l'opacité du parent emporte le pseudo). */
	/* ---------- LA LUEUR : une bande de lumière douce derrière la fente ----------
	   DERRIÈRE le pack (z-index -1), contenue dans sa largeur, diffuse. Rien de
	   plus qu'une lumière qui sourd de l'ouverture. Couleur du meilleur tirage ;
	   enfant de .pack → suit ses mouvements et s'éteint avec lui. */
	.pack::before {
		content: '';
		position: absolute;
		z-index: -1;
		left: 50%;
		top: 8%; /* la fente */
		width: 84%; /* contenu : s'éteint avant les bords */
		height: 7%;
		translate: -50% -50%;
		pointer-events: none;
		background: radial-gradient(
			68% 56% at 50% 50%,
			color-mix(in srgb, var(--glow) 34%, transparent) 0%,
			color-mix(in srgb, var(--glow) 14%, transparent) 40%,
			color-mix(in srgb, var(--glow) 5%, transparent) 66%,
			transparent 86%
		);
		filter: blur(14px); /* très flou : une chaleur, aucune forme */
		opacity: calc(var(--p, 0) * var(--p, 0) * 0.55);
	}
	.pack.bursting::before {
		animation: glowflare 0.55s ease-out forwards;
	}
	@keyframes glowflare {
		to { opacity: 1; }
	}

	/* le trait de lumière qui court sur le bord déchiré, au pixel */
	.tearline {
		position: absolute;
		inset: 0;
		z-index: 5;
		pointer-events: none;
		overflow: visible;
		opacity: calc(var(--p, 0) * var(--p, 0));
	}
	.tearline polyline {
		fill: none;
		stroke: color-mix(in srgb, var(--glow) 45%, #fff);
		stroke-width: 1.4;
		stroke-linejoin: round;
		stroke-linecap: round;
		filter:
			drop-shadow(0 0 2px color-mix(in srgb, var(--glow) 80%, #fff))
			drop-shadow(0 0 5px var(--glow));
	}
	.pack.torn .tearline {
		opacity: 0;
		transition: opacity 0.4s ease;
	}
	/* la lumière s'éteint EN MÊME TEMPS que le pack cède — ils ne font qu'un */
	.pack.torn::before {
		animation: none;
		opacity: 0;
		transition: opacity 0.45s ease;
	}

	/* ---------- bords enveloppés : un booster n'a PAS de soudure latérale
	   au recto — le film s'enroule vers l'arrière. Ombre de fuite + arête. */
	.rail {
		position: absolute;
		top: 8.2%;
		bottom: 3.8%;
		width: 1.6%;
		z-index: 1;
		transition: opacity 0.4s ease;
	}
	.rail.left {
		left: 0;
		background: linear-gradient(
			90deg,
			rgba(2, 3, 6, 0.92) 0%,
			rgba(8, 10, 15, 0.55) 35%,
			rgba(255, 255, 255, 0.1) 78%,
			rgba(10, 12, 18, 0.35) 100%
		);
	}
	.rail.right {
		right: 0;
		background: linear-gradient(
			270deg,
			rgba(2, 3, 6, 0.92) 0%,
			rgba(8, 10, 15, 0.55) 35%,
			rgba(255, 255, 255, 0.1) 78%,
			rgba(10, 12, 18, 0.35) 100%
		);
	}
	.pack.torn .rail { opacity: 0; }

	/* ---------- le corps ---------- */
	.body {
		position: absolute;
		top: 8.2%;
		bottom: 3.8%;
		left: 1.6%;
		right: 1.6%;
		overflow: hidden;
		background: #0c0f15;
		transition:
			transform 0.55s cubic-bezier(0.5, 0, 0.8, 0.4),
			opacity 0.5s ease,
			clip-path 0.4s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.pack.dragging .body {
		transition: none; /* la découpe suit le doigt sans latence */
	}
	.pack.torn .body {
		transform: translateY(26%) scale(0.96);
		opacity: 0;
	}
	.crimp-bottom {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 4.2%;
		transition:
			transform 0.55s cubic-bezier(0.5, 0, 0.8, 0.4),
			opacity 0.5s ease;
	}
	.pack.torn .crimp-bottom {
		transform: translateY(160%);
		opacity: 0;
	}

	.cover {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 18%;
		/* l'impression d'un vrai sachet : encres denses, légèrement contrastées */
		filter: saturate(1.08) contrast(1.05);
	}
	/* étalonnage : garde le sujet lisible, assoit le tiers logo */
	.grade {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(180deg, rgba(8, 10, 15, 0.5) 0%, transparent 20%),
			linear-gradient(180deg, transparent 42%, rgba(8, 10, 14, 0.6) 66%, rgba(6, 8, 12, 0.94) 100%),
			radial-gradient(130% 90% at 50% 38%, transparent 55%, rgba(5, 7, 11, 0.45) 100%);
	}
	/* galbe CYLINDRIQUE (cf. photo de référence) : UNE dorsale de lumière au
	   centre, tombée progressive vers les flancs, pincements aux soudures. */
	.plastic {
		position: absolute;
		inset: 0;
		background:
			/* pincements haut/bas — la matière tendue près des soudures */
			linear-gradient(
				180deg,
				rgba(0, 0, 0, 0.42) 0%,
				transparent 10%,
				transparent 90%,
				rgba(0, 0, 0, 0.46) 100%
			),
			/* l'arc : une seule bande de reflet, large et douce, au centre */
			linear-gradient(
				90deg,
				rgba(0, 0, 0, 0.5) 0%,
				rgba(0, 0, 0, 0.22) 7%,
				transparent 22%,
				rgba(255, 255, 255, 0.045) 38%,
				rgba(255, 255, 255, 0.1) 50%,
				rgba(255, 255, 255, 0.045) 62%,
				transparent 78%,
				rgba(0, 0, 0, 0.22) 93%,
				rgba(0, 0, 0, 0.52) 100%
			);
	}
	/* plis de tension en éventail près des soudures — comme un vrai mylar pincé */
	.plastic::before,
	.plastic::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 9%;
		background: repeating-linear-gradient(
			90deg,
			transparent 0 3.2cqw,
			rgba(255, 255, 255, 0.05) 3.2cqw 3.8cqw,
			transparent 3.8cqw 5.4cqw,
			rgba(0, 0, 0, 0.1) 5.4cqw 6cqw
		);
	}
	.plastic::before {
		top: 0;
		mask-image: linear-gradient(180deg, #fff, transparent);
	}
	.plastic::after {
		bottom: 0;
		mask-image: linear-gradient(0deg, #fff, transparent);
	}
	/* le grain du foil : micro-texture qui accroche la lumière, très discret */
	.foilgrain {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		background-size: 160px 160px;
		mix-blend-mode: overlay;
		opacity: 0.22;
		pointer-events: none;
	}
	/* le reflet au pointeur : une source de lumière qui glisse sur la surface bombée */
	.glare3d {
		position: absolute;
		inset: 0;
		z-index: 5;
		pointer-events: none;
		background: radial-gradient(
			55% 42% at var(--gx, 50%) var(--gy, 35%),
			rgba(255, 255, 255, 0.14),
			rgba(255, 255, 255, 0.05) 45%,
			transparent 72%
		);
		opacity: 0;
		transition: opacity 0.35s ease;
	}
	.pack.hover .glare3d {
		opacity: 1;
	}
	.pack.torn .glare3d {
		opacity: 0;
	}
	.sheen {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			115deg,
			transparent 30%,
			rgba(255, 255, 255, 0.07) 45%,
			rgba(255, 255, 255, 0.14) 50%,
			rgba(255, 255, 255, 0.07) 55%,
			transparent 70%
		);
		background-size: 250% 100%;
		animation: sweep 4.2s ease-in-out infinite;
	}
	@keyframes sweep {
		0%, 55% { background-position: 120% 0; }
		100% { background-position: -60% 0; }
	}

	/* ---------- habillage éditorial (structure booster réel) ---------- */
	/* la pastille de marque, haut centre — l'équivalent du cartouche éditeur */
	.brand-pill {
		position: absolute;
		top: 3cqw;
		left: 50%;
		translate: -50% 0;
		padding: 1.1cqw 4cqw 0.9cqw;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 3cqw;
		letter-spacing: 0.34em;
		text-indent: 0.34em;
		text-transform: uppercase;
		color: #e9cf8d;
		background: rgba(10, 12, 18, 0.82);
		border: 0.4cqw solid rgba(216, 180, 92, 0.85);
		border-radius: 999px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
	}
	/* badges d'édition, haut droite — l'empilement des vrais sachets */
	.badges {
		position: absolute;
		top: 3cqw;
		right: 2.6cqw;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 1cqw;
	}
	.badge {
		padding: 0.8cqw 2.2cqw 0.7cqw;
		font-family: Bahnschrift, 'Segoe UI', sans-serif;
		font-weight: 700;
		font-size: 2.3cqw;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		border-radius: 0.9cqw;
		box-shadow: 0 1px 5px rgba(0, 0, 0, 0.55);
	}
	.badge.red {
		color: #fff;
		background: linear-gradient(180deg, #c93247, #8e1626);
		border: 0.3cqw solid rgba(255, 255, 255, 0.8);
	}
	.badge.dark {
		font-family: Cinzel, Georgia, serif;
		color: #e9cf8d;
		background: rgba(10, 12, 18, 0.85);
		border: 0.3cqw solid rgba(216, 180, 92, 0.8);
	}

	/* le bloc logo du tiers bas : surtitre, wordmark métallique, bannière de set */
	.logo-block {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 13cqw;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
	}
	.logo-over {
		margin: 0 0 0.6cqw;
		font-family: Bahnschrift, 'Segoe UI', sans-serif;
		font-weight: 700;
		font-size: 2cqw;
		letter-spacing: 0.5em;
		text-indent: 0.5em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.75);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
	}
	.wordmark {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 900;
		font-size: 9.6cqw;
		line-height: 1;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		background: linear-gradient(180deg, #fff6d8 8%, #ecc76a 38%, #8a6a1f 55%, #f4dc94 72%, #b3892c 100%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		filter:
			drop-shadow(0 1px 0 rgba(60, 40, 5, 0.9))
			drop-shadow(0 3px 8px rgba(0, 0, 0, 0.85));
	}
	.set-banner {
		margin: 1.6cqw 0 0;
		padding: 1.3cqw 6cqw 1.1cqw;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 5cqw;
		letter-spacing: 0.16em;
		text-indent: 0.16em;
		text-transform: uppercase;
		background:
			linear-gradient(180deg, rgba(20, 14, 4, 0.92), rgba(4, 3, 1, 0.95)) padding-box,
			linear-gradient(180deg, #f4dc94, #8a6a1f 45%, #e9cf8d) border-box;
		border: 0.55cqw solid transparent;
		border-radius: 2.2cqw;
		color: #f2e3b6;
		text-shadow: 0 0 3cqw rgba(233, 207, 141, 0.4), 0 1px 2px #000;
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.6);
	}

	/* mentions basses : compte à gauche, légal centré */
	.count {
		position: absolute;
		left: 3cqw;
		bottom: 4.6cqw;
		margin: 0;
		font-family: Bahnschrift, 'Segoe UI', sans-serif;
		font-weight: 800;
		font-size: 2.7cqw;
		line-height: 1.25;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		text-align: left;
		color: #f0ede6;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
	}
	.count small {
		font-size: 1.9cqw;
		font-weight: 700;
		color: rgba(240, 237, 230, 0.75);
	}
	.legal {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 1.4cqw;
		margin: 0;
		font-family: Consolas, monospace;
		font-size: 1.7cqw;
		letter-spacing: 0.12em;
		color: rgba(236, 232, 225, 0.5);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
	}
</style>
