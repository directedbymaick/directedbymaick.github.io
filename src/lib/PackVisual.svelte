<script lang="ts">
	import { onMount } from 'svelte';
	import type { PackScene } from '$lib/pack3d/packScene';

	let {
		ontorn,
		glow = '#ffcd6e',
		prisma = false
	}: { ontorn?: () => void; glow?: string; prisma?: boolean } = $props();

	let progress = $state(0); // 0 → 1
	let dragging = $state(false);
	let torn = $state(false);
	let bursting = $state(false); // la seconde de rage avant que le sachet cède
	let hover = $state(false);
	let webgl = $state(true);
	let startX = 0;

	let wrapEl: HTMLElement;
	let cv = $state<HTMLCanvasElement>();
	let tabEl = $state<HTMLElement>();
	let scene: PackScene | null = null;

	const THRESHOLD = 0.85;

	onMount(() => {
		let ro: ResizeObserver | undefined;
		(async () => {
			try {
				if (!cv) throw new Error('no canvas');
				const canvas = cv;
				const { createPackScene } = await import('$lib/pack3d/packScene');
				scene = createPackScene(canvas, {
					glow,
					art: '/art/rasen.webp',
					onHinge: (h) => {
						if (!tabEl || torn) return;
						// la pilule court le long de la ligne de coupe projetée
						const x = canvas.offsetLeft + h.x0 + (h.x1 - h.x0) * (0.06 + progress * 0.82);
						const y = canvas.offsetTop + h.y;
						tabEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
					}
				});
				ro = new ResizeObserver(() => scene?.resize());
				ro.observe(canvas);
			} catch {
				webgl = false; // secours : sachet statique, ouverture au clic
			}
		})();
		return () => {
			ro?.disconnect();
			scene?.destroy();
			scene = null;
		};
	});

	$effect(() => {
		scene?.setGlow(glow);
	});
	$effect(() => {
		scene?.setProgress(progress);
	});

	/* ---- parallaxe idle : le sachet suit doucement le pointeur ---- */
	function parallax(e: PointerEvent) {
		if (torn || bursting) return;
		const r = wrapEl.getBoundingClientRect();
		scene?.setPointer(
			Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)),
			Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1))
		);
	}
	function leave() {
		hover = false;
		scene?.clearPointer();
	}

	/* ---- le geste : tirer la languette ---- */
	function down(e: PointerEvent) {
		if (torn || bursting) return;
		dragging = true;
		startX = e.clientX;
		try {
			wrapEl.setPointerCapture(e.pointerId);
		} catch {
			/* évènement synthétique : pas de capture */
		}
	}
	function move(e: PointerEvent) {
		parallax(e);
		if (!dragging || torn || bursting) return;
		const w = wrapEl.clientWidth || 300;
		progress = Math.min(1, Math.max(0, (e.clientX - startX) / (w * 0.9)));
		if (progress >= THRESHOLD) tear();
	}
	function up() {
		if (torn || bursting) return;
		dragging = false;
		// rescellage élastique : la languette se repose
		const p0 = progress;
		const t0 = performance.now();
		const dur = 420;
		const reseal = (now: number) => {
			if (dragging || bursting || torn) return;
			const k = Math.min(1, (now - t0) / dur);
			progress = p0 * Math.pow(1 - k, 3);
			if (k < 1) requestAnimationFrame(reseal);
		};
		requestAnimationFrame(reseal);
	}

	/** Déchire le sachet (drag abouti, ou ouverture rapide via bind). */
	export function tear() {
		if (torn || bursting) return;
		bursting = true;
		dragging = false;
		// la languette finit de se plier dans l'élan
		const p0 = progress;
		const t0 = performance.now();
		const dur = 240;
		const finish = (now: number) => {
			const k = Math.min(1, (now - t0) / dur);
			progress = p0 + (1 - p0) * k * k;
			if (k < 1) requestAnimationFrame(finish);
		};
		requestAnimationFrame(finish);
		setTimeout(() => {
			torn = true;
			scene?.fling(); // la languette s'envole en tournoyant
		}, 430);
		// la chute du sachet (.7 s dès torn) chevauche la levée des cartes
		setTimeout(() => ontorn?.(), 980);
	}
</script>

<div
	class="pack3d"
	bind:this={wrapEl}
	role="slider"
	aria-label="Tirer la languette pour ouvrir le booster"
	aria-valuenow={Math.round(progress * 100)}
	tabindex="0"
	onpointermove={move}
	onpointerdown={down}
	onpointerup={up}
	onpointercancel={up}
	onpointerenter={() => (hover = true)}
	onpointerleave={leave}
	onkeydown={(e) => e.key === 'Enter' && tear()}
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
		{#if webgl}
			<canvas bind:this={cv} class="cv3d" aria-hidden="true"></canvas>
			{#if !torn}
				<span class="tab" bind:this={tabEl} aria-hidden="true">
					<i></i><i></i><i></i><i></i><i></i><i></i>
				</span>
			{/if}
		{:else}
			<!-- secours sans WebGL : la couverture seule, ouverture au clavier/clic -->
			<img class="flat" src="/art/rasen.webp" alt="" draggable="false" />
		{/if}
	</div>
</div>

<style>
	.pack3d {
		cursor: grab;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}
	.pack3d:active {
		cursor: grabbing;
	}
	.pack {
		position: relative;
		width: var(--pack-w, 320px);
		aspect-ratio: 3 / 4.3;
		container-type: inline-size;
	}
	/* le canvas déborde du cadre : marges de respiration pour la parallaxe,
	   l'envol de la languette et les rayons — le sachet 3D remplit le layout */
	.cv3d {
		position: absolute;
		inset: -16% -18%;
		width: 136%;
		height: 132%;
		display: block;
		pointer-events: none;
	}
	.flat {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 3cqw;
	}

	/* le bloom : une boule de lumière DERRIÈRE le sachet */
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
	.pack.hover:not(.dragging):not(.bursting):not(.torn)::before {
		opacity: 0.22;
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
	/* la sortie packs.com : sursaut d'anticipation, puis le sachet vidé tombe */
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

	/* la pilule à grip : positionnée chaque frame sur la ligne de coupe projetée */
	.tab {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 4;
		width: 16cqw;
		height: 6.6cqw;
		display: grid;
		grid-template-columns: repeat(3, auto);
		place-content: center;
		gap: 0.85cqw 1.5cqw;
		border-radius: 999px;
		background: linear-gradient(180deg, #f7f3ea 0%, #ddd5c4 55%, #efe8d8 100%);
		border: 0.3cqw solid rgba(120, 100, 60, 0.35);
		box-shadow:
			0 0.8cqw 2.2cqw rgba(0, 0, 0, 0.5),
			inset 0 0.3cqw 0.4cqw rgba(255, 255, 255, 0.8),
			0 0 2.6cqw color-mix(in srgb, var(--glow) 40%, transparent);
		pointer-events: none;
		will-change: transform;
	}
	.tab i {
		width: 0.85cqw;
		height: 0.85cqw;
		border-radius: 50%;
		background: rgba(90, 78, 50, 0.55);
		box-shadow: inset 0 0.2cqw 0.25cqw rgba(0, 0, 0, 0.3);
	}
	.pack.dragging .tab {
		scale: 1.08;
	}

	@media (prefers-reduced-motion: reduce) {
		.pack.bursting { animation: none; }
		.pack.torn { animation: none; opacity: 0; }
	}
</style>
