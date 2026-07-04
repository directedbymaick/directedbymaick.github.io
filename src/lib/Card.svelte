<script lang="ts">
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
		charter.factions[card.faction] ?? { name: card.faction, color: '#8892a6', loreTone: '' }
	);
	const rarityDef = $derived(charter.rarities[card.rarity]);
	const foil = $derived(resolveFoil(card, faction.color));

	let px = $state(0.5);
	let py = $state(0.5);
	let hover = $state(false);

	function onMove(e: PointerEvent) {
		if (!interactive) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
		py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
		hover = true;
	}

	function onLeave() {
		hover = false;
		px = 0.5;
		py = 0.5;
	}

	const rx = $derived(hover ? (py - 0.5) * -22 : 0);
	const ry = $derived(hover ? (px - 0.5) * 26 : 0);
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
		data-foil={foil.preset}
		data-rarity={card.rarity}
		style="{styleString(foil.vars)}; {pointerVars}"
		onpointermove={onMove}
		onpointerleave={onLeave}
	>
		<div class="face">
			<header class="head">
				<span class="cost">{card.cost}</span>
				<h2 class="name">{card.name}</h2>
			</header>

			<div class="art">
				<img src={card.art} alt={card.name} draggable="false" />
				<div class="foil" aria-hidden="true"></div>
				<div class="sparkles" aria-hidden="true"></div>
			</div>

			<div class="typeline">
				<span class="faction">{faction.name}</span>
				<span class="gem" style="--gem: {rarityDef.gemColor}" title={rarityDef.name}></span>
			</div>

			<div class="textbox">
				<p class="rules">{card.text}</p>
				{#if card.flavor}
					<p class="flavor">{card.flavor}</p>
				{/if}
			</div>

			<footer class="stats">
				<span class="stat attack">{card.attack}</span>
				<span class="stat health">{card.health}</span>
			</footer>

			<div class="glare" aria-hidden="true"></div>
		</div>
	</article>
</div>

<style>
	.scene {
		perspective: 1200px;
		width: var(--card-w, 320px);
	}

	.card {
		width: 100%;
		aspect-ratio: 63 / 88;
		container-type: inline-size;
		transform: rotateX(var(--rx)) rotateY(var(--ry));
		transition: transform 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.2);
		transform-style: preserve-3d;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}
	.card.hover {
		transition: transform 0.06s linear;
	}

	.face {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		border-radius: 4.8cqw;
		overflow: hidden;
		background:
			linear-gradient(160deg, color-mix(in oklab, var(--frame) 32%, #14151d) 0%, #14151d 55%),
			#14151d;
		border: 0.9cqw solid color-mix(in oklab, var(--frame) 65%, #222);
		box-shadow:
			0 2.5cqw 6cqw rgba(0, 0, 0, 0.45),
			inset 0 0 0 0.4cqw rgba(255, 255, 255, 0.06);
		color: #e8e6df;
		font-family: 'Segoe UI', system-ui, sans-serif;
	}

	/* ---------- zones ---------- */

	.head {
		display: flex;
		align-items: center;
		gap: 2.4cqw;
		padding: 3cqw 3.4cqw 2.2cqw;
	}
	.cost {
		flex: none;
		display: grid;
		place-items: center;
		width: 11cqw;
		height: 11cqw;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #7fd1ff, #1d5fa8 70%);
		border: 0.6cqw solid rgba(255, 255, 255, 0.35);
		font-size: 6.2cqw;
		font-weight: 700;
		color: #fff;
		text-shadow: 0 0.4cqw 0.8cqw rgba(0, 0, 0, 0.5);
	}
	.name {
		margin: 0;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 5.4cqw;
		font-weight: 600;
		letter-spacing: 0.02em;
		line-height: 1.1;
		text-shadow: 0 0.4cqw 1cqw rgba(0, 0, 0, 0.6);
	}

	.art {
		position: relative;
		margin: 0 3.4cqw;
		aspect-ratio: 4 / 3;
		border-radius: 2.4cqw;
		overflow: hidden;
		border: 0.5cqw solid color-mix(in oklab, var(--frame) 50%, #000);
		background: #0a0b10;
	}
	.art img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.typeline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.8cqw 4.2cqw 0;
	}
	.faction {
		font-size: 3.4cqw;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: color-mix(in oklab, var(--frame) 70%, #fff);
	}
	.gem {
		width: 4.6cqw;
		height: 4.6cqw;
		rotate: 45deg;
		border-radius: 1cqw;
		background: radial-gradient(circle at 30% 30%, #fff8, transparent 60%), var(--gem, #999);
		box-shadow: 0 0 2.4cqw var(--gem, #999);
	}

	.textbox {
		flex: 1;
		margin: 2cqw 3.4cqw;
		padding: 2.6cqw 3cqw;
		border-radius: 2cqw;
		background: rgba(255, 255, 255, 0.055);
		border: 0.3cqw solid rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}
	.rules {
		margin: 0;
		font-size: 3.9cqw;
		line-height: 1.35;
	}
	.flavor {
		margin: 1.6cqw 0 0;
		font-size: 3.4cqw;
		line-height: 1.3;
		font-style: italic;
		color: #b9b5a9;
	}

	.stats {
		display: flex;
		justify-content: space-between;
		padding: 0 2.6cqw 2.6cqw;
		margin-top: auto;
	}
	.stat {
		display: grid;
		place-items: center;
		width: 12cqw;
		height: 12cqw;
		border-radius: 50%;
		font-size: 6.4cqw;
		font-weight: 800;
		color: #fff;
		text-shadow: 0 0.4cqw 0.8cqw rgba(0, 0, 0, 0.55);
		border: 0.6cqw solid rgba(255, 255, 255, 0.3);
	}
	.attack {
		background: radial-gradient(circle at 35% 30%, #ffd27f, #b0611d 70%);
	}
	.health {
		background: radial-gradient(circle at 35% 30%, #ff8f7f, #a81d2c 70%);
	}

	/* ---------- matière : foil ---------- */

	.foil,
	.sparkles,
	.glare {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0;
	}

	/* holo (rare) : bandes irisées teintées par la palette, glissent avec le pointeur */
	.card[data-foil='holo'] .foil {
		background:
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
		background-size: 300% 300%;
		background-position: calc(var(--pxn) * 100%) calc(var(--pyn) * 100%);
		mask-image: var(--grain);
		mask-size: 38cqw;
		mix-blend-mode: color-dodge;
		filter: brightness(0.75) contrast(1.4) saturate(1.5);
	}

	/* prismatic (épique) : roue conique centrée sur le pointeur */
	.card[data-foil='prismatic'] .foil {
		background:
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
		mask-image: var(--grain);
		mask-size: 30cqw;
		mix-blend-mode: color-dodge;
		filter: brightness(0.7) contrast(1.5) saturate(1.7);
	}

	/* galaxy (légendaire) : nappes de nébuleuse + paillettes */
	.card[data-foil='galaxy'] .foil {
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
	.card[data-foil='galaxy'] .sparkles {
		background:
			radial-gradient(
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

	.card.hover .foil {
		opacity: calc(0.22 + var(--from-center) * 0.42);
		transition: opacity 0.2s ease;
	}
	.card.hover .sparkles {
		opacity: calc(0.3 + var(--from-center) * 0.7);
		transition: opacity 0.2s ease;
	}

	/* mat (commune) : aucun foil — la matière, c'est l'absence de matière */
	.card[data-foil='mat'] .foil,
	.card[data-foil='mat'] .sparkles {
		display: none;
	}

	/* ---------- glare : reflet de lumière, toutes raretés ---------- */

	.glare {
		background: radial-gradient(
			70cqw 55cqw at var(--px) var(--py),
			rgba(255, 255, 255, 0.55) 0%,
			rgba(255, 255, 255, 0.12) 35%,
			transparent 70%
		);
		mix-blend-mode: soft-light;
	}
	.card.hover .glare {
		opacity: 1;
		transition: opacity 0.2s ease;
	}
</style>
