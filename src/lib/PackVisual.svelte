<script lang="ts">
	/**
	 * Le booster ZONES AVEUGLES — et son geste signature : le peel.
	 * On saisit la languette, on tire vers la droite, le sachet cède.
	 * Inspiré du « Peel back to unlock cards » de packs.com.
	 */
	let { ontorn }: { ontorn?: () => void } = $props();

	let progress = $state(0); // 0 → 1
	let dragging = $state(false);
	let torn = $state(false);
	let startX = 0;
	let stripEl: HTMLElement;

	const THRESHOLD = 0.78;

	function down(e: PointerEvent) {
		if (torn) return;
		dragging = true;
		startX = e.clientX;
		stripEl.setPointerCapture(e.pointerId);
	}
	function move(e: PointerEvent) {
		if (!dragging || torn) return;
		const w = stripEl.parentElement?.clientWidth ?? 300;
		progress = Math.min(1, Math.max(0, (e.clientX - startX) / (w * 0.8)));
		if (progress >= THRESHOLD) tear();
	}
	function up() {
		if (torn) return;
		dragging = false;
		progress = 0; // spring back
	}
	/** Déchire le sachet (drag abouti, ou ouverture rapide via bind). */
	export function tear() {
		if (torn) return;
		torn = true;
		dragging = false;
		progress = 1;
		setTimeout(() => ontorn?.(), 620);
	}
</script>

<div class="pack" class:torn class:dragging>
	<div class="crimp top"></div>

	<!-- la languette de peel -->
	<div
		bind:this={stripEl}
		class="seal"
		role="slider"
		aria-label="Glisser pour ouvrir le booster"
		aria-valuenow={Math.round(progress * 100)}
		tabindex="0"
		style="--p: {progress}"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onkeydown={(e) => e.key === 'Enter' && tear()}
	>
		<span class="grip">⠿</span>
		<span class="seal-label">Tirer pour ouvrir</span>
	</div>
	<div class="tearline"></div>

	<div class="body">
		<div class="sheen"></div>
		<p class="brand">Travelers TCG</p>
		<h3 class="title">Zones<br />Aveugles</h3>
		<p class="setline">Set 01 · 5 cartes</p>
		<p class="sigils"><span class="s-r">◆</span><span class="s-k">◈</span><span class="s-e">◉</span></p>
		<p class="footline">Contient 5 cartes authentiques du registre</p>
	</div>

	<div class="crimp bottom"></div>
</div>

<style>
	.pack {
		position: relative;
		width: var(--pack-w, 300px);
		aspect-ratio: 3 / 4.3;
		container-type: inline-size;
		font-family: Bahnschrift, 'Segoe UI', system-ui, sans-serif;
		filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.55));
		transition: filter 0.3s ease;
	}
	.pack.dragging {
		filter: drop-shadow(0 22px 48px rgba(255, 180, 84, 0.12)) drop-shadow(0 18px 40px rgba(0, 0, 0, 0.55));
	}

	/* ---------- sertissage (crimp) haut/bas ---------- */
	.crimp {
		position: absolute;
		left: 0;
		right: 0;
		height: 5.5%;
		background:
			repeating-linear-gradient(90deg, #262d38 0 4px, #171c24 4px 8px),
			#1c222c;
		box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.6);
		transition:
			transform 0.55s cubic-bezier(0.5, 0, 0.8, 0.4),
			opacity 0.5s ease;
	}
	.crimp.top {
		top: 0;
		border-radius: 6px 6px 0 0;
	}
	.crimp.bottom {
		bottom: 0;
		border-radius: 0 0 6px 6px;
	}

	/* ---------- languette ---------- */
	.seal {
		position: absolute;
		top: 5.5%;
		left: 0;
		right: 0;
		height: 9%;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: 2.6cqw;
		padding: 0 3.4cqw;
		cursor: grab;
		touch-action: none;
		user-select: none;
		background: linear-gradient(180deg, #232a35, #1a202a);
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		border-bottom: 1px solid rgba(255, 180, 84, 0.35);
		transform: translateX(calc(var(--p) * 105%)) rotate(calc(var(--p) * 3deg));
		transition: transform 0.25s ease;
	}
	.pack.dragging .seal {
		cursor: grabbing;
		transition: none;
	}
	.pack.torn .seal {
		transform: translateX(130%) rotate(6deg);
		opacity: 0;
		transition:
			transform 0.5s cubic-bezier(0.3, 0, 0.7, 0.2),
			opacity 0.45s ease;
	}
	.grip {
		color: #ffb454;
		font-size: 4.6cqw;
		letter-spacing: 0.1em;
	}
	.seal-label {
		font-family: Consolas, monospace;
		font-size: 3.2cqw;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.55);
	}
	.tearline {
		position: absolute;
		top: 14.5%;
		left: 0;
		right: 0;
		z-index: 2;
		border-top: 2px dashed rgba(255, 180, 84, 0.3);
	}

	/* ---------- corps du sachet ---------- */
	.body {
		position: absolute;
		top: 14.5%;
		bottom: 5.5%;
		left: 0;
		right: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2cqw;
		text-align: center;
		background:
			radial-gradient(120% 70% at 50% 0%, rgba(255, 180, 84, 0.08), transparent 55%),
			radial-gradient(100% 60% at 50% 110%, rgba(194, 59, 78, 0.12), transparent 60%),
			repeating-linear-gradient(45deg, #151a21 0 3px, #0f131a 3px 6px),
			#10141a;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.07),
			inset 0 0 40px rgba(0, 0, 0, 0.45);
		transition:
			transform 0.55s cubic-bezier(0.5, 0, 0.8, 0.4),
			opacity 0.5s ease;
	}
	.pack.torn .crimp.top {
		transform: translateY(-160%) rotate(-2deg);
		opacity: 0;
	}
	.pack.torn .body,
	.pack.torn .crimp.bottom {
		transform: translateY(28%) scale(0.96);
		opacity: 0;
	}

	/* reflet qui balaie le sachet */
	.sheen {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			115deg,
			transparent 30%,
			rgba(255, 255, 255, 0.07) 45%,
			rgba(255, 255, 255, 0.13) 50%,
			rgba(255, 255, 255, 0.07) 55%,
			transparent 70%
		);
		background-size: 250% 100%;
		animation: sweep 4.2s ease-in-out infinite;
		pointer-events: none;
	}
	@keyframes sweep {
		0%,
		55% {
			background-position: 120% 0;
		}
		100% {
			background-position: -60% 0;
		}
	}

	.brand {
		margin: 0;
		font-family: Consolas, monospace;
		font-size: 3cqw;
		letter-spacing: 0.5em;
		text-indent: 0.5em;
		text-transform: uppercase;
		color: rgba(255, 180, 84, 0.75);
	}
	.title {
		margin: 0;
		font-stretch: 68%;
		font-weight: 800;
		font-size: 15cqw;
		line-height: 0.9;
		text-transform: uppercase;
		color: #ece8e1;
		text-shadow: 0 0 8cqw rgba(255, 180, 84, 0.25);
	}
	.setline {
		margin: 0.6cqw 0 0;
		font-size: 3.6cqw;
		font-weight: 700;
		letter-spacing: 0.3em;
		text-indent: 0.3em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.6);
	}
	.sigils {
		margin: 2.4cqw 0 0;
		display: flex;
		gap: 4cqw;
		font-size: 5.4cqw;
	}
	.s-r {
		color: #3d8fd6;
	}
	.s-k {
		color: #c23b4e;
	}
	.s-e {
		color: #b08d57;
	}
	.footline {
		position: absolute;
		bottom: 3cqw;
		left: 0;
		right: 0;
		margin: 0;
		font-family: Consolas, monospace;
		font-size: 2.4cqw;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.3);
	}
</style>
