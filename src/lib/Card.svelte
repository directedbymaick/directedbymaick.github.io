<script lang="ts">
	import { Spring } from 'svelte/motion';
	import type { CardData } from '$lib/types';
	import { resolveFoil, styleString } from '$lib/effects/foil';
	import { charter } from '$lib/charter';

	let {
		card,
		interactive = true
	}: {
		card: CardData;
		interactive?: boolean;
	} = $props();

	const faction = $derived(
		charter.factions[card.faction] ?? {
			name: card.faction,
			color: '#8892a6',
			loreTone: '',
			sigil: '◯'
		}
	);
	const rarityDef = $derived(charter.rarities[card.rarity]);
	const foil = $derived(resolveFoil(card, faction.color));

	// Springs : le pointeur cible, la carte suit avec inertie.
	const pointer = new Spring({ x: 0.5, y: 0.5 }, { stiffness: 0.12, damping: 0.5 });
	let hover = $state(false);

	function onMove(e: PointerEvent) {
		if (!interactive) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		pointer.target = {
			x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
			y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
		};
		hover = true;
	}

	function onLeave() {
		hover = false;
		pointer.target = { x: 0.5, y: 0.5 };
	}

	const kindLabel = $derived(
		card.kind === 'etre'
			? 'Être'
			: card.kind === 'verbe'
				? 'Verbe'
				: card.kind === 'relique'
					? 'Relique'
					: 'Lieu'
	);

	const px = $derived(pointer.current.x);
	const py = $derived(pointer.current.y);
	const rx = $derived(hover ? (py - 0.5) * -16 : 0);
	const ry = $derived(hover ? (px - 0.5) * 19 : 0);
	const fromCenter = $derived(hover ? Math.min(1, Math.hypot(px - 0.5, py - 0.5) * 2.2) : 0);

	const pointerVars = $derived(
		`--px: ${(px * 100).toFixed(2)}%; --py: ${(py * 100).toFixed(2)}%; ` +
			`--pxn: ${px.toFixed(3)}; --pyn: ${py.toFixed(3)}; ` +
			`--from-center: ${fromCenter.toFixed(3)}; ` +
			`--rx: ${rx.toFixed(2)}deg; --ry: ${ry.toFixed(2)}deg`
	);
</script>

<div class="scene">
	<article
		class="card"
		class:hover
		data-material={rarityDef.material}
		data-foil={foil.preset}
		style="{styleString(foil.vars)}; {pointerVars}; --fc: {faction.color}{card.artPosition
			? `; --art-pos: ${card.artPosition}`
			: ''}"
		onpointermove={onMove}
		onpointerleave={onLeave}
	>
		<div class="art">
			<img src={card.art} alt={card.name} draggable="false" />
			<div class="foil-a" aria-hidden="true"></div>
			<div class="foil-b" aria-hidden="true"></div>
			<div class="sparkles" aria-hidden="true"></div>
			<div class="prism-veil" aria-hidden="true"></div>
			<div class="scrim" aria-hidden="true"></div>
			<div class="glare" aria-hidden="true"></div>
		</div>

		<span class="cost">{card.cost}</span>
		<span class="sigil" style="color: {faction.color}" title={faction.name}>{faction.sigil}</span>

		<div class="panel">
			<h2 class="name">{card.name}</h2>
			<p class="typeline">
				{kindLabel} <span class="dot">·</span> {faction.name}
			</p>
			{#if card.text}
				<p class="text">{card.text}</p>
			{/if}
			{#if card.prononcer}
				<p class="pron"><span class="pron-tag">◯ Prononcer {card.prononcer.cost}</span> {card.prononcer.text}</p>
			{/if}
			{#if card.flavor}
				<p class="flavor">{card.flavor}</p>
			{/if}
			{#if card.kind === 'etre'}
				<div class="stats">
					<span class="stat"><b>{card.attack}</b><small>ATQ</small></span>
					<span class="stat"><b>{card.health}</b><small>INT</small></span>
				</div>
			{/if}
		</div>

		<span class="edge" aria-hidden="true"></span>
		<span class="rarity-line" aria-hidden="true"></span>
	</article>
</div>

<style>
	.scene {
		perspective: 1100px;
		width: var(--card-w, 320px);
	}

	.card {
		position: relative;
		width: 100%;
		aspect-ratio: 63 / 88;
		container-type: inline-size;
		border-radius: 5.4cqw;
		overflow: hidden;
		background: #0b0b10;
		transform: translate3d(0, 0, 0.01px) rotateX(var(--rx)) rotateY(var(--ry));
		transform-style: preserve-3d;
		will-change: transform;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		font-family: 'Inter Variable', Inter, system-ui, sans-serif;
		box-shadow:
			0 24px 60px rgba(0, 0, 0, 0.55),
			0 4px 14px rgba(0, 0, 0, 0.4);
		transition: box-shadow 0.35s ease;
	}
	.card.hover {
		box-shadow:
			0 32px 80px rgba(0, 0, 0, 0.6),
			0 6px 18px rgba(0, 0, 0, 0.45);
	}

	/* ---------- artwork plein cadre ---------- */
	.art {
		position: absolute;
		inset: 0;
	}
	.art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: var(--art-pos, center 12%);
		display: block;
	}
	.scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(8, 8, 12, 0.18) 0%,
			transparent 16%,
			transparent 44%,
			rgba(8, 8, 12, 0.78) 74%,
			rgba(7, 7, 11, 0.94) 100%
		);
	}

	/* ---------- chrome minimal ---------- */

	/* le coût : un halo — anneau d'or fin, verre sombre */
	.cost {
		position: absolute;
		top: 3.6cqw;
		left: 3.6cqw;
		z-index: 8;
		display: grid;
		place-items: center;
		width: 10.5cqw;
		height: 10.5cqw;
		border-radius: 50%;
		border: 1px solid rgba(201, 164, 69, 0.85);
		background: rgba(8, 8, 12, 0.45);
		backdrop-filter: blur(6px);
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 4.8cqw;
		color: #f2ead6;
		box-shadow: 0 0 14px rgba(201, 164, 69, 0.25);
	}

	.sigil {
		position: absolute;
		top: 4.4cqw;
		right: 4.2cqw;
		z-index: 8;
		font-size: 4.6cqw;
		opacity: 0.9;
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
	}

	/* ---------- panneau bas : typographie nue sur le scrim ---------- */
	.panel {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 7;
		padding: 0 5.4cqw 5.2cqw;
		display: flex;
		flex-direction: column;
		gap: 1.5cqw;
	}
	.name {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 600;
		font-size: 5.2cqw;
		line-height: 1.12;
		letter-spacing: 0.02em;
		color: #f4edda;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
	}
	.typeline {
		margin: 0 0 0.6cqw;
		font-size: 2.5cqw;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: rgba(242, 234, 214, 0.55);
	}
	.typeline .dot {
		color: var(--fc);
	}
	.text {
		margin: 0;
		font-size: 3.2cqw;
		font-weight: 450;
		line-height: 1.45;
		color: rgba(244, 240, 228, 0.95);
	}
	.pron {
		margin: 0;
		font-size: 3.1cqw;
		line-height: 1.45;
		color: rgba(244, 240, 228, 0.95);
	}
	.pron-tag {
		font-weight: 700;
		letter-spacing: 0.06em;
		color: #d9b45c;
	}
	.flavor {
		margin: 0.4cqw 0 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 3.1cqw;
		line-height: 1.4;
		color: rgba(236, 229, 211, 0.55);
	}
	.stats {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-top: 1.8cqw;
	}
	.stat {
		display: flex;
		align-items: baseline;
		gap: 1.4cqw;
	}
	.stat b {
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 6cqw;
		line-height: 1;
		color: #f2ead6;
	}
	.stat small {
		font-size: 2.1cqw;
		font-weight: 700;
		letter-spacing: 0.26em;
		color: rgba(242, 234, 214, 0.45);
	}
	.stat:last-child {
		flex-direction: row-reverse;
	}

	/* ---------- bord et rareté ---------- */

	/* hairline du cadre, teinté par le matériau */
	.edge {
		position: absolute;
		inset: 0;
		z-index: 9;
		border-radius: inherit;
		border: 1px solid var(--edge-c, rgba(255, 255, 255, 0.14));
		pointer-events: none;
	}
	.card[data-material='carbone'] {
		--edge-c: rgba(255, 255, 255, 0.13);
	}
	.card[data-material='nacre'] {
		--edge-c: rgba(240, 240, 248, 0.4);
	}
	.card[data-material='argent'] {
		--edge-c: rgba(215, 222, 235, 0.55);
	}
	.card[data-material='or'] {
		--edge-c: rgba(201, 164, 69, 0.8);
	}
	.card[data-material='prisme'] {
		--edge-c: rgba(255, 255, 255, 0.55);
	}

	/* la ligne de rareté : un fil discret au bas de la carte */
	.rarity-line {
		position: absolute;
		left: 5.4cqw;
		right: 5.4cqw;
		bottom: 2.6cqw;
		height: 1px;
		z-index: 8;
		background: var(--edge-c, rgba(255, 255, 255, 0.14));
		opacity: 0.55;
		pointer-events: none;
	}
	.card[data-material='prisme'] .rarity-line {
		background: linear-gradient(90deg, #e8a7b8, #e8d3a7, #a7e8c6, #a7c6e8, #c9a7e8);
		opacity: 0.8;
	}

	/* ============ FOILS (machinerie conservée) ============ */

	.foil-a,
	.foil-b,
	.sparkles,
	.glare,
	.prism-veil {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0;
		visibility: hidden;
	}
	.card.hover .foil-a,
	.card.hover .foil-b,
	.card.hover .sparkles,
	.card.hover .glare,
	.card.hover .prism-veil {
		visibility: visible;
	}

	.card[data-foil='holo'] .foil-a {
		background:
			radial-gradient(
				farthest-corner circle at var(--px) var(--py),
				rgba(255, 255, 255, 0.55) 5%,
				rgba(120, 120, 120, 0.5) 40%,
				#000 100%
			),
			repeating-linear-gradient(
				var(--band-angle),
				var(--c0) 0%,
				#ffe6a7 7%,
				var(--c1) 14%,
				#a7e6ff 21%,
				var(--c2) 28%,
				#e6a7ff 35%,
				var(--c0) 42%
			);
		background-blend-mode: multiply;
		background-size: 120% 120%, 300% 300%;
		background-position:
			center,
			calc(10% + var(--pxn) * 80%) calc(10% + var(--pyn) * 80%);
		mask-image: var(--grain);
		mask-size: 34cqw;
		mix-blend-mode: color-dodge;
		filter: brightness(0.7) contrast(1.6) saturate(1.4);
	}
	.card[data-foil='holo'] .foil-b {
		background: repeating-linear-gradient(
			calc(var(--band-angle) + 55deg),
			var(--c2) 0%,
			#fff3c4 9%,
			var(--c1) 18%,
			#c4f0ff 27%,
			var(--c2) 36%
		);
		background-size: 340% 340%;
		background-position: calc(20% + (1 - var(--pxn)) * 60%) calc(20% + (1 - var(--pyn)) * 60%);
		mask-image: var(--grain);
		mask-size: 58cqw;
		mix-blend-mode: overlay;
		filter: brightness(0.9) contrast(1.3) saturate(1.3);
	}

	.card[data-foil='prismatic'] .foil-a {
		background:
			radial-gradient(
				farthest-corner circle at var(--px) var(--py),
				rgba(255, 255, 255, 0.5) 4%,
				rgba(110, 110, 110, 0.45) 35%,
				#000 100%
			),
			conic-gradient(
				from var(--hue-shift) at var(--px) var(--py),
				var(--c0),
				#ffd7a7,
				var(--c1),
				#a7ffd7,
				#a7d7ff,
				var(--c2),
				#ffa7e6,
				var(--c0)
			);
		background-blend-mode: multiply;
		mask-image: var(--grain);
		mask-size: 28cqw;
		mix-blend-mode: color-dodge;
		filter: brightness(0.68) contrast(1.7) saturate(1.6);
	}
	.card[data-foil='prismatic'] .foil-b {
		background: repeating-linear-gradient(
			var(--band-angle),
			var(--c1) 0%,
			#ffe9c4 8%,
			var(--c2) 16%,
			#c4e0ff 24%,
			var(--c1) 32%
		);
		background-size: 300% 300%;
		background-position: calc(15% + (1 - var(--pxn)) * 70%) calc(15% + var(--pyn) * 70%);
		mask-image: var(--grain);
		mask-size: 52cqw;
		mix-blend-mode: overlay;
		filter: brightness(0.95) contrast(1.25) saturate(1.4);
	}

	.card[data-foil='galaxy'] .foil-a {
		background:
			radial-gradient(
				120cqw 90cqw at calc(100% - var(--px)) calc(100% - var(--py)),
				color-mix(in oklab, var(--c1) 70%, #fff) 0%,
				transparent 55%
			),
			radial-gradient(90cqw 120cqw at var(--px) var(--py), var(--c0) 0%, transparent 60%),
			linear-gradient(var(--band-angle), var(--c2), var(--c1), var(--c0));
		background-blend-mode: screen;
		mask-image: var(--galaxy);
		mask-size: cover;
		mix-blend-mode: color-dodge;
		filter: brightness(0.62) contrast(1.35) saturate(1.6);
	}
	.card[data-foil='galaxy'] .foil-b {
		background: repeating-linear-gradient(
			calc(var(--band-angle) - 40deg),
			var(--c0) 0%,
			#ffe6a7 10%,
			var(--c1) 20%,
			#a7e6ff 30%,
			var(--c0) 40%
		);
		background-size: 320% 320%;
		background-position: calc(20% + (1 - var(--pxn)) * 60%) calc(10% + var(--pyn) * 80%);
		mask-image: var(--grain);
		mask-size: 46cqw;
		mix-blend-mode: overlay;
		filter: brightness(0.85) contrast(1.4) saturate(1.5);
	}
	.card[data-foil='galaxy'] .sparkles {
		background: radial-gradient(
			60cqw 60cqw at var(--px) var(--py),
			#fff 0%,
			#ffe9c4 25%,
			transparent 65%
		);
		mask-image: var(--sparkle);
		mask-size: 24cqw;
		mix-blend-mode: color-dodge;
		filter: contrast(2.2) brightness(0.9);
	}

	.card[data-foil='prism'] .foil-a {
		background:
			radial-gradient(
				farthest-corner circle at var(--px) var(--py),
				rgba(255, 255, 255, 0.55) 4%,
				rgba(110, 110, 110, 0.5) 35%,
				#000 100%
			),
			conic-gradient(
				from calc(var(--hue-shift) + var(--pxn) * 90deg) at var(--px) var(--py),
				#e8a7b8,
				#e8d3a7,
				#a7e8c6,
				#a7c6e8,
				#c9a7e8,
				#e8a7b8
			);
		background-blend-mode: multiply;
		mask-image: var(--grain);
		mask-size: 26cqw;
		mix-blend-mode: color-dodge;
		filter: brightness(0.7) contrast(1.7) saturate(1.5);
	}
	.card[data-foil='prism'] .foil-b {
		background: repeating-linear-gradient(
			calc(var(--band-angle) + 30deg),
			var(--c0) 0%,
			#fff0c4 8%,
			var(--c1) 16%,
			#c4e6ff 24%,
			var(--c2) 32%,
			#f0c4ff 40%,
			var(--c0) 48%
		);
		background-size: 300% 300%;
		background-position: calc(15% + (1 - var(--pxn)) * 70%) calc(15% + var(--pyn) * 70%);
		mask-image: var(--grain);
		mask-size: 50cqw;
		mix-blend-mode: overlay;
		filter: brightness(0.9) contrast(1.3) saturate(1.5);
	}
	.card[data-foil='prism'] .prism-veil {
		z-index: 5;
		background: linear-gradient(
			calc(var(--band-angle) + var(--pxn) * 40deg),
			rgba(232, 167, 184, 0.5),
			rgba(232, 211, 167, 0.4) 25%,
			rgba(167, 232, 198, 0.4) 50%,
			rgba(167, 198, 232, 0.4) 75%,
			rgba(201, 167, 232, 0.5)
		);
		background-size: 250% 250%;
		background-position: calc(var(--pxn) * 100%) calc(var(--pyn) * 100%);
		mask-image: var(--galaxy);
		mask-size: cover;
		mix-blend-mode: color-dodge;
		filter: brightness(0.55) contrast(1.5) saturate(1.3);
	}

	.card.hover .foil-a {
		opacity: calc(0.3 + var(--from-center) * 0.45);
		transition: opacity 0.25s ease;
	}
	.card.hover .foil-b {
		opacity: calc(0.18 + var(--from-center) * 0.35);
		transition: opacity 0.25s ease;
	}
	.card.hover .sparkles {
		opacity: calc(0.3 + var(--from-center) * 0.7);
		transition: opacity 0.25s ease;
	}
	.card.hover .prism-veil {
		opacity: calc(0.16 + var(--from-center) * 0.22);
		transition: opacity 0.25s ease;
	}

	.card[data-foil='mat'] .foil-a,
	.card[data-foil='mat'] .foil-b,
	.card[data-foil='mat'] .sparkles,
	.card[data-foil='mat'] .prism-veil {
		display: none;
	}

	.glare {
		z-index: 6;
		background: radial-gradient(
			130cqw 130cqw at var(--px) var(--py),
			rgba(255, 255, 255, 0.22) 0%,
			rgba(255, 255, 255, 0.13) 25%,
			rgba(255, 255, 255, 0.06) 48%,
			rgba(255, 255, 255, 0.02) 68%,
			transparent 88%
		);
		mix-blend-mode: overlay;
	}
	.card.hover .glare {
		opacity: calc(0.55 + var(--from-center) * 0.3);
		transition: opacity 0.25s ease;
	}
</style>
