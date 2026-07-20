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

	const SAW_BOTTOM = saw('bottom', 26, 40);
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
	const clipBody = $derived(poly(lerpPts(BODY_CLEAN_PTS, BODY_TORN_PTS, bodyT)));

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
		// la chute du sachet (.7 s dès torn) chevauche la levée des cartes — le
		// raccord packs.com : on coupe quand le sachet est presque éteint.
		setTimeout(() => ontorn?.(), 980);
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
	<!-- l'opercule serti qu'on arrache : la languette-pilule court le long de la
	     découpe, l'opercule SE REPLIE vers l'arrière (le geste packs.com) -->
	<div
		bind:this={stripEl}
		class="rip"
		role="slider"
		aria-label="Glisser la languette pour ouvrir le booster"
		aria-valuenow={Math.round(progress * 100)}
		tabindex="0"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onkeydown={(e) => e.key === 'Enter' && tear()}
	>
		<div class="strip" aria-hidden="true">
			<div class="strip-front"></div>
			<div class="strip-back"></div>
		</div>
		<!-- la ligne de coupe : une brûlure de lumière qui progresse avec le geste -->
		<div class="tearline" aria-hidden="true"></div>
		<!-- la pilule à grip : elle SUIT le doigt le long de la découpe -->
		<span class="tab" aria-hidden="true">
			<i></i><i></i><i></i><i></i><i></i><i></i>
		</span>
	</div>

	<div class="leak" aria-hidden="true"></div>

	<!-- rails latéraux : la soudure du sachet -->
	<div class="rail left" aria-hidden="true"></div>
	<div class="rail right" aria-hidden="true"></div>

	<!-- le corps : couverture pleine, habillage éditorial façon booster réel -->
	<div class="body" style="clip-path: {clipBody}">
		<img class="cover" src="/art/rasen.webp" alt="" draggable="false" />
		<div class="grade" aria-hidden="true"></div>
		<div class="plastic" aria-hidden="true"></div>
		<div class="sheen" aria-hidden="true"></div>

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
		/* le code packs.com : le sachet S'INCLINE en tirant (0.18 rad ≈ 10° à fond).
		   La propriété rotate compose avec transform sans le disputer. */
		rotate: calc(var(--p, 0) * 8deg);
		will-change: transform, rotate;
		transition: scale 0.45s var(--ease-out-cubic, ease);
	}
	/* survol : le sachet avance doucement, le bloom s'éveille — l'invitation */
	.pack3d:hover .pack {
		scale: 1.03;
	}
	.pack.hover:not(.dragging):not(.bursting):not(.torn)::before {
		opacity: 0.22;
	}
	.pack {
		position: relative;
		width: var(--pack-w, 300px);
		aspect-ratio: 3 / 4.3;
		container-type: inline-size;
		filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.55));
		transition: filter 0.3s ease;
	}
	@keyframes float {
		0%, 100% { transform: translateY(0) rotate(0deg); }
		50% { transform: translateY(-8px) rotate(0.5deg); }
	}
	/* le bloom : une boule de lumière DERRIÈRE le sachet — jamais un contour qui épouse
	   la silhouette (le drop-shadow coloré dessinait un rectangle arrondi, interdit) */
	.pack::before {
		content: '';
		position: absolute;
		inset: -35%;
		z-index: -1;
		pointer-events: none;
		background: radial-gradient(
			50% 50% at 50% 46%,
			color-mix(in srgb, var(--glow) 42%, transparent),
			color-mix(in srgb, var(--glow) 16%, transparent) 42%,
			color-mix(in srgb, var(--glow) 5%, transparent) 62%,
			transparent 78%
		);
		opacity: 0;
		transition: opacity 0.35s ease;
	}
	.pack.dragging {
		animation-play-state: paused;
	}
	.pack.dragging::before {
		opacity: calc(var(--p) * 0.9);
	}
	.pack.bursting {
		animation: rumble 0.43s linear forwards;
	}
	.pack.bursting::before {
		opacity: 1;
		animation: bloomup 0.43s ease-in forwards;
	}
	/* la sortie packs.com : petit sursaut d'anticipation (14 %), puis le sachet
	   vidé tombe hors champ en fondant — pendant que les cartes se lèvent. */
	.pack.torn {
		animation: pack-exit 0.7s cubic-bezier(0.33, 0, 0.18, 1) both;
		pointer-events: none;
	}
	@keyframes pack-exit {
		0% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		14% {
			opacity: 1;
			transform: translateY(-8px) scale(1.02);
		}
		to {
			opacity: 0;
			transform: translateY(75%) scale(0.95);
		}
	}
	@keyframes bloomup {
		to {
			transform: scale(1.3);
			opacity: 1;
		}
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
		.pack3d .pack { transform: none; rotate: none; }
		.pack.torn { animation: none; opacity: 0; }
	}

	/* ---------- métal argenté commun (sertissage bas + rails) ---------- */
	.crimp-bottom,
	.rail {
		background:
			repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.045) 0 2px, transparent 2px 7px),
			linear-gradient(180deg, #f5f7fa 0%, #c6ccd6 28%, #eef1f5 52%, #aab2bf 78%, #dfe4ea 100%);
	}

	/* ---------- l'opercule : le repli packs.com ---------- */
	.rip {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 12%;
		z-index: 3;
		cursor: grab;
		touch-action: none;
		user-select: none;
		perspective: 90cqw;
	}
	.pack.dragging .rip { cursor: grabbing; }

	/* l'opercule : charnière sur la ligne de coupe (bord bas), il SE REPLIE vers
	   l'arrière en tirant — l'art continue dessus, le dos est une feuille foil. */
	.strip {
		position: absolute;
		inset: 0;
		transform-origin: 50% 100%;
		transform-style: preserve-3d;
		transform: rotateX(calc(var(--p, 0) * -118deg)) rotateZ(calc(var(--p, 0) * -3deg));
		will-change: transform;
	}
	.strip-front,
	.strip-back {
		position: absolute;
		inset: 0;
		backface-visibility: hidden;
	}
	/* face avant : la continuité de l'artwork + le sertissage cranté */
	.strip-front {
		background:
			/* pincement de soudure le long de la coupe */
			linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, transparent 22%, transparent 72%, rgba(0, 0, 0, 0.42) 100%),
			/* cannelures verticales du sertissage */
			repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.16) 0 1.1cqw, transparent 1.1cqw 3.2cqw, rgba(255, 255, 255, 0.06) 3.2cqw 4.3cqw),
			/* l'art du sachet, tranche haute */
			url('/art/rasen.webp') 50% 0 / 100% 850% no-repeat,
			#171a22;
	}
	/* dos : la feuille argentée mate, visible quand l'opercule bascule au-delà de 90° */
	.strip-back {
		transform: rotateX(180deg);
		background:
			repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.06) 0 2px, transparent 2px 7px),
			linear-gradient(180deg, #cdd3dd 0%, #9aa2af 40%, #c3c9d3 70%, #8f97a4 100%);
	}
	/* ombre portée de l'opercule levé sur le corps */
	.strip::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -2.2cqw;
		height: 2.2cqw;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.4), transparent);
		opacity: calc(var(--p, 0) * 0.9);
		transform: rotateX(calc(var(--p, 0) * 118deg)); /* reste plaquée au corps */
	}

	/* la ligne de coupe : une brûlure de lumière qui progresse de gauche à droite */
	.tearline {
		position: absolute;
		left: 1%;
		right: 1%;
		bottom: -0.4cqw;
		height: 0.9cqw;
		border-radius: 999px;
		transform-origin: 0 50%;
		transform: scaleX(var(--p, 0));
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--glow) 60%, #fff),
			color-mix(in srgb, var(--glow) 85%, #fff) 85%,
			#fff
		);
		filter: blur(0.35cqw);
		opacity: calc(var(--p, 0) * 1.6);
		box-shadow: 0 0 3cqw color-mix(in srgb, var(--glow) 80%, transparent);
		pointer-events: none;
	}

	/* la pilule à grip : elle court le long de la découpe, sous le doigt */
	.tab {
		position: absolute;
		bottom: 0;
		left: calc(2% + var(--p, 0) * 78%);
		translate: 0 50%;
		width: 17cqw;
		height: 7cqw;
		display: grid;
		grid-template-columns: repeat(3, auto);
		place-content: center;
		gap: 0.9cqw 1.6cqw;
		border-radius: 999px;
		background: linear-gradient(180deg, #f7f3ea 0%, #ddd5c4 55%, #efe8d8 100%);
		border: 0.3cqw solid rgba(120, 100, 60, 0.35);
		box-shadow:
			0 0.8cqw 2.2cqw rgba(0, 0, 0, 0.5),
			inset 0 0.3cqw 0.4cqw rgba(255, 255, 255, 0.8),
			0 0 2.6cqw color-mix(in srgb, var(--glow) 40%, transparent);
		pointer-events: none;
		transition: scale 0.2s ease;
	}
	.tab i {
		width: 0.9cqw;
		height: 0.9cqw;
		border-radius: 50%;
		background: rgba(90, 78, 50, 0.55);
		box-shadow: inset 0 0.2cqw 0.25cqw rgba(0, 0, 0, 0.3);
	}
	.pack.dragging .tab {
		scale: 1.08;
	}
	.pack.hover:not(.dragging) .tab {
		animation: tabnudge 1.8s ease-in-out infinite;
	}
	@keyframes tabnudge {
		0%, 100% { translate: 0 50%; }
		50% { translate: 1.6cqw 50%; }
	}

	/* l'arrachage : l'opercule (et sa pilule) s'envole en tournoyant, haut-droite */
	.pack.torn .rip {
		animation: rip-fling 0.55s cubic-bezier(0.3, 0, 0.7, 0.2) both;
		pointer-events: none;
	}
	@keyframes rip-fling {
		0% {
			opacity: 1;
			transform: translate(0, 0) rotate(0deg);
		}
		to {
			opacity: 0;
			transform: translate(75%, -260%) rotate(38deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pack.torn .rip { animation: none; opacity: 0; }
		.pack.hover:not(.dragging) .tab { animation: none; }
	}

	/* la lumière qui fuit par la déchirure — couleur du meilleur tirage du sachet */
	.leak {
		position: absolute;
		top: 9%;
		left: 2%;
		right: 2%;
		height: 4.5%;
		z-index: 2;
		pointer-events: none;
		background: radial-gradient(
			50% 100% at 50% 50%,
			color-mix(in srgb, var(--glow) 92%, #fff),
			color-mix(in srgb, var(--glow) 45%, transparent) 55%,
			transparent 85%
		);
		filter: blur(3px);
		opacity: calc(var(--p, 0) * var(--p, 0));
		transform: scaleY(calc(0.4 + var(--p, 0) * 1.4));
	}
	/* un prismatique / full art dort dedans : la fuite est froide, blanc-violet —
	   une lumière d'un autre monde, pas une guirlande */
	.pack.prisma .leak {
		background: radial-gradient(
			50% 100% at 50% 50%,
			rgba(244, 240, 255, 0.95),
			rgba(203, 184, 255, 0.45) 52%,
			rgba(168, 200, 255, 0.18) 72%,
			transparent 88%
		);
	}
	.pack.bursting .leak { animation: leakflare 0.43s ease-in forwards; }
	@keyframes leakflare {
		to {
			opacity: 1;
			transform: scaleY(4);
			filter: blur(6px);
		}
	}

	/* ---------- rails latéraux (soudure) ---------- */
	.rail {
		position: absolute;
		top: 10%;
		bottom: 4.5%;
		width: 1.6%;
		z-index: 1;
		transition: opacity 0.4s ease;
	}
	.rail.left { left: 0; }
	.rail.right { right: 0; }

	/* ---------- le corps ---------- */
	.body {
		position: absolute;
		top: 10%;
		bottom: 4.5%;
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
	.crimp-bottom {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 5%;
	}

	.cover {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 18%;
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
	/* galbe en coussin : le sachet bombe au centre, se pince aux sertissages */
	.plastic {
		position: absolute;
		inset: 0;
		background:
			/* pincements haut/bas — la matière tendue près des soudures */
			linear-gradient(
				180deg,
				rgba(0, 0, 0, 0.4) 0%,
				transparent 11%,
				transparent 89%,
				rgba(0, 0, 0, 0.45) 100%
			),
			/* bombé horizontal : ombres latérales, rehauts, dorsale centrale */
			linear-gradient(
				90deg,
				rgba(0, 0, 0, 0.45) 0%,
				transparent 9%,
				rgba(255, 255, 255, 0.06) 17%,
				transparent 30%,
				rgba(255, 255, 255, 0.07) 47%,
				rgba(255, 255, 255, 0.07) 53%,
				transparent 70%,
				rgba(255, 255, 255, 0.055) 83%,
				transparent 91%,
				rgba(0, 0, 0, 0.48) 100%
			);
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
