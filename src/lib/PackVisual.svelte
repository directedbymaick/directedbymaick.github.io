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
		<img class="cover" src="/pack/zones-aveugles-cover.webp" alt="" draggable="false" />
		<div class="scrim"></div>
		<div class="plastic"></div>
		<div class="sheen"></div>
		<p class="brand">Travelers TCG</p>
		<span class="count-chip">5<small>cartes</small></span>
		<div class="bottom">
			<h3 class="title">Zones<br />Aveugles</h3>
			<p class="setline">Set 01 · Booster</p>
			<p class="sigils"><span class="s-r">◆</span><span class="s-k">◈</span><span class="s-e">◉</span></p>
			<p class="footline">Contient 5 cartes authentiques du registre</p>
		</div>
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

	/* ---------- corps du sachet : l'artwork couvre tout ---------- */
	.body {
		position: absolute;
		top: 14.5%;
		bottom: 5.5%;
		left: 0;
		right: 0;
		overflow: hidden;
		text-align: center;
		background: #10141a;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.07),
			inset 0 0 40px rgba(0, 0, 0, 0.45);
		transition:
			transform 0.55s cubic-bezier(0.5, 0, 0.8, 0.4),
			opacity 0.5s ease;
	}
	.cover {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 22%;
		user-select: none;
	}
	/* lisibilité de la typo : scrim progressif sur le tiers inférieur */
	.scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(10, 14, 20, 0.42) 0%,
			transparent 16%,
			transparent 52%,
			rgba(8, 11, 16, 0.62) 76%,
			rgba(6, 9, 13, 0.88) 100%
		);
		pointer-events: none;
	}
	/* le film plastique : arrondi du sachet (ombres latérales + rehaut central) */
	.plastic {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(
				90deg,
				rgba(0, 0, 0, 0.4) 0%,
				transparent 9%,
				rgba(255, 255, 255, 0.05) 18%,
				transparent 30%,
				transparent 70%,
				rgba(255, 255, 255, 0.04) 82%,
				transparent 91%,
				rgba(0, 0, 0, 0.42) 100%
			);
		pointer-events: none;
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
		position: absolute;
		top: 3cqw;
		left: 0;
		right: 0;
		margin: 0;
		font-family: Consolas, monospace;
		font-size: 3cqw;
		letter-spacing: 0.5em;
		text-indent: 0.5em;
		text-transform: uppercase;
		color: rgba(255, 180, 84, 0.9);
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
	}
	/* pastille « 5 cartes » — le badge coin des vrais boosters */
	.count-chip {
		position: absolute;
		top: 8.5cqw;
		right: 4cqw;
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1;
		padding: 1.8cqw 2.6cqw 1.6cqw;
		font-weight: 800;
		font-size: 5.4cqw;
		color: #ece8e1;
		background: rgba(8, 11, 16, 0.85);
		border: 1px solid rgba(236, 232, 225, 0.18);
		border-radius: 1.6cqw;
		rotate: 4deg;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
	}
	.count-chip small {
		font-size: 2cqw;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.6);
	}
	.bottom {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 2.6cqw;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.2cqw;
	}
	.title {
		margin: 0;
		font-stretch: 68%;
		font-weight: 800;
		font-size: 13.5cqw;
		line-height: 0.88;
		text-transform: uppercase;
		color: #ece8e1;
		text-shadow:
			0 2px 10px rgba(0, 0, 0, 0.85),
			0 0 8cqw rgba(61, 143, 214, 0.35);
	}
	.setline {
		margin: 0.4cqw 0 0;
		font-size: 3.2cqw;
		font-weight: 700;
		letter-spacing: 0.34em;
		text-indent: 0.34em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.75);
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
	}
	.sigils {
		margin: 1.2cqw 0 0;
		display: flex;
		gap: 4cqw;
		font-size: 4.6cqw;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
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
		margin: 1cqw 0 0;
		font-family: Consolas, monospace;
		font-size: 2.2cqw;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.42);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
	}
</style>
