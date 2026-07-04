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
			sigil: '◆'
		}
	);
	const rarityDef = $derived(charter.rarities[card.rarity]);
	const foil = $derived(resolveFoil(card, faction.color));

	// Springs : le pointeur cible, la carte suit avec inertie (mode local).
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

	const px = $derived(pointer.current.x);
	const py = $derived(pointer.current.y);
	const rx = $derived(hover ? (py - 0.5) * -20 : 0);
	const ry = $derived(hover ? (px - 0.5) * 24 : 0);
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
		data-kind={card.kind}
		style="{styleString(foil.vars)}; {pointerVars}{card.artPosition ? `; --art-pos: ${card.artPosition}` : ''}"
		onpointermove={onMove}
		onpointerleave={onLeave}
	>
		<div class="face">
			<div class="body">
				<div class="art">
					<img src={card.art} alt={card.name} draggable="false" />
					<div class="foil-a" aria-hidden="true"></div>
					<div class="foil-b" aria-hidden="true"></div>
					<div class="sparkles" aria-hidden="true"></div>
					<div class="scrim" aria-hidden="true"></div>
				</div>

				<span class="cost" title="Coût en Énergie">{card.cost}</span>
				<span class="sigil" title={faction.name}>{faction.sigil}</span>

				<div class="content">
					<header class="plate">
						<h2 class="name">{card.name}</h2>
						<p class="cellline">
							{#if card.cell}
								<span class="cell">{card.cell}</span>
							{:else if card.kind === 'protocole'}
								<span class="cell">Protocole</span>
							{:else}
								<span class="cell">Zone aveugle</span>
							{/if}
							<span class="fname" style="color: var(--accent)">{faction.name}</span>
						</p>
					</header>

					<div class="cartouche">
						{#if card.text}
							<p class="rules">{card.text}</p>
						{/if}
						{#if card.synchro}
							<p class="synchro">
								<span class="synchro-tag">⟟ SYNCHRO ({card.synchro.cost})</span>
								{card.synchro.text}
							</p>
						{/if}
						{#if card.flavor}
							<p class="flavor">{card.flavor}</p>
						{/if}
					</div>

					{#if card.kind !== 'protocole'}
						<footer class="statbar">
							<span class="stat attack"><small>ATQ</small>{card.attack}</span>
							<span class="rarity-dot" title={rarityDef.name}></span>
							<span class="stat health"><small>INT</small>{card.health}</span>
						</footer>
					{:else}
						<footer class="statbar protocol-bar">
							<span class="rarity-dot" title={rarityDef.name}></span>
						</footer>
					{/if}
				</div>

				<div class="prism-veil" aria-hidden="true"></div>
				<div class="glare" aria-hidden="true"></div>
			</div>
			<div class="conduits" aria-hidden="true"></div>
		</div>
	</article>
</div>

<style>
	.scene {
		perspective: 1100px;
		width: var(--card-w, 320px);
	}

	.card {
		width: 100%;
		aspect-ratio: 63 / 88;
		container-type: inline-size;
		transform: translate3d(0, 0, 0.01px) rotateX(var(--rx)) rotateY(var(--ry));
		transform-style: preserve-3d;
		will-change: transform;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		font-family: Bahnschrift, 'Segoe UI', system-ui, sans-serif;
	}

	/* ============ LE CADRE : la rareté est un matériau ============ */

	.face {
		position: absolute;
		inset: 0;
		padding: 2.3cqw;
		border-radius: 4.6cqw;
		box-shadow:
			0 2.5cqw 6cqw rgba(0, 0, 0, 0.5),
			inset 0 0.2cqw 0.4cqw rgba(255, 255, 255, 0.25),
			inset 0 -0.3cqw 0.5cqw rgba(0, 0, 0, 0.4);
		transition: box-shadow 0.4s ease;
	}

	/* carbone (standard) : tissage anthracite mat */
	.card[data-material='carbone'] .face {
		background:
			repeating-linear-gradient(45deg, #191a1f 0 3px, #1f2127 3px 6px),
			repeating-linear-gradient(-45deg, #17181d 0 3px, #1d1f25 3px 6px),
			#191a1f;
		background-blend-mode: overlay;
	}

	/* nacre (rare) : blanc perle, reflets froids */
	.card[data-material='nacre'] .face {
		background:
			conic-gradient(
				from 210deg at 50% 50%,
				rgba(190, 215, 235, 0.35),
				rgba(235, 220, 240, 0.3),
				rgba(205, 235, 225, 0.3),
				rgba(190, 215, 235, 0.35)
			),
			linear-gradient(135deg, #f0eee9 0%, #cfd3da 38%, #ece8ee 58%, #d5dade 100%);
		background-blend-mode: soft-light, normal;
	}

	/* argent (épique) : métal brossé */
	.card[data-material='argent'] .face {
		background:
			repeating-linear-gradient(
				92deg,
				rgba(255, 255, 255, 0.09) 0 1px,
				transparent 1px 3px
			),
			linear-gradient(180deg, #d6dae0 0%, #969da8 30%, #c2c7cf 50%, #838a96 72%, #c9ced6 100%);
	}

	/* or (légendaire) : or brossé chaud */
	.card[data-material='or'] .face {
		background:
			repeating-linear-gradient(
				88deg,
				rgba(255, 245, 200, 0.14) 0 1px,
				transparent 1px 3px
			),
			linear-gradient(165deg, #f2d98a 0%, #b9862f 32%, #e6c05e 52%, #8f6420 74%, #d5ac52 100%);
	}

	/* prisme (prismatique) : irisation contenue sur graphite */
	.card[data-material='prisme'] .face {
		background:
			conic-gradient(
				from calc(var(--hue-shift) + var(--pxn) * 60deg) at 50% 50%,
				rgba(200, 120, 140, 0.5),
				rgba(210, 180, 110, 0.5),
				rgba(120, 200, 160, 0.5),
				rgba(110, 160, 210, 0.5),
				rgba(170, 120, 210, 0.5),
				rgba(200, 120, 140, 0.5)
			),
			linear-gradient(170deg, #2a2b33, #17181d 60%, #24252c);
		background-blend-mode: color-dodge, normal;
	}

	/* glow d'activation : l'accent irradie (lumière contenue → libérée) */
	.card.hover .face {
		box-shadow:
			0 2.5cqw 8cqw rgba(0, 0, 0, 0.55),
			0 0 calc(3cqw + var(--from-center) * 9cqw)
				color-mix(in srgb, var(--accent) 50%, transparent),
			inset 0 0.2cqw 0.4cqw rgba(255, 255, 255, 0.25),
			inset 0 -0.3cqw 0.5cqw rgba(0, 0, 0, 0.4);
	}

	/* conduits : lignes fines qui s'allument à l'activation seulement */
	.conduits {
		position: absolute;
		inset: 1.1cqw;
		border-radius: 3.9cqw;
		border: 0.26cqw solid transparent;
		pointer-events: none;
		transition:
			border-color 0.3s ease,
			box-shadow 0.3s ease;
	}
	.card.hover .conduits {
		border-color: color-mix(in srgb, var(--accent) 75%, transparent);
		box-shadow:
			0 0 1.6cqw color-mix(in srgb, var(--accent) 55%, transparent),
			inset 0 0 2cqw color-mix(in srgb, var(--accent) 25%, transparent);
	}

	/* ============ LE CORPS : verre sombre ============ */

	.body {
		position: relative;
		width: 100%;
		height: 100%;
		border-radius: 3cqw;
		overflow: hidden;
		background: #101117;
		display: flex;
		flex-direction: column;
		color: #e8e6df;
	}

	/* ---------- art full-bleed ---------- */

	.art {
		position: relative;
		flex: none;
		height: 55%;
		overflow: hidden;
	}
	.art img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		/* préserve le haut des portraits (têtes) — surcharge par carte via artPosition */
		object-position: var(--art-pos, center 12%);
		display: block;
	}
	.scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(16, 17, 23, 0.25) 0%, transparent 22%, transparent 68%, #101117 100%);
		pointer-events: none;
	}

	/* ---------- coût / sigil ---------- */

	.cost {
		position: absolute;
		top: 2.2cqw;
		left: 2.2cqw;
		z-index: 4;
		display: grid;
		place-items: center;
		width: 11.5cqw;
		height: 13cqw;
		clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
		background:
			linear-gradient(200deg, rgba(255, 255, 255, 0.14), transparent 45%),
			#14161d;
		font-size: 6.4cqw;
		font-weight: 700;
		color: #fff;
	}
	.cost::before {
		content: '';
		position: absolute;
		inset: 0;
		clip-path: polygon(
			50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%,
			50% 0, 50% 5.5%, 5% 27.5%, 5% 72.5%, 50% 94.5%, 95% 72.5%, 95% 27.5%, 50% 5.5%
		);
		background: color-mix(in srgb, var(--accent) 85%, #fff);
	}
	.sigil {
		position: absolute;
		top: 2.6cqw;
		right: 2.6cqw;
		z-index: 4;
		font-size: 5.4cqw;
		line-height: 1;
		color: var(--accent);
		text-shadow: 0 0 2.4cqw color-mix(in srgb, var(--accent) 70%, transparent);
	}

	/* ---------- contenu ---------- */

	.content {
		position: relative;
		z-index: 3;
		flex: 1;
		display: flex;
		flex-direction: column;
		margin-top: -7cqw;
		padding: 0 3cqw 2.4cqw;
	}

	.plate {
		align-self: flex-start;
		max-width: 100%;
		padding: 1.4cqw 3cqw 1.2cqw 2.2cqw;
		background: linear-gradient(90deg, rgba(10, 11, 16, 0.92) 0%, rgba(10, 11, 16, 0.55) 78%, transparent 100%);
		border-left: 0.7cqw solid var(--accent);
	}
	.name {
		margin: 0;
		font-size: 5.2cqw;
		font-weight: 700;
		font-stretch: 92%;
		letter-spacing: 0.01em;
		line-height: 1.08;
		text-shadow: 0 0.4cqw 1.2cqw rgba(0, 0, 0, 0.8);
	}
	.cellline {
		margin: 0.7cqw 0 0;
		display: flex;
		gap: 2.2cqw;
		align-items: baseline;
		font-size: 3cqw;
		text-transform: uppercase;
		letter-spacing: 0.16em;
	}
	.cell {
		color: #9aa0ad;
	}
	.fname {
		font-weight: 700;
	}

	.cartouche {
		flex: 1;
		margin-top: 1.8cqw;
		padding: 2.2cqw 2.6cqw;
		border-radius: 1.8cqw;
		background: rgba(255, 255, 255, 0.045);
		border: 0.22cqw solid rgba(255, 255, 255, 0.09);
		overflow: hidden;
		font-family: 'Segoe UI', system-ui, sans-serif;
	}
	.rules {
		margin: 0;
		font-size: 3.6cqw;
		line-height: 1.32;
	}
	.synchro {
		margin: 1.4cqw 0 0;
		padding: 1.2cqw 1.8cqw;
		font-size: 3.5cqw;
		line-height: 1.3;
		border-left: 0.5cqw solid var(--accent);
		background: color-mix(in srgb, var(--accent) 9%, transparent);
		border-radius: 0 1cqw 1cqw 0;
	}
	.synchro-tag {
		display: block;
		font-family: Bahnschrift, 'Segoe UI', sans-serif;
		font-size: 2.9cqw;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: var(--accent);
		margin-bottom: 0.5cqw;
	}
	.flavor {
		margin: 1.4cqw 0 0;
		font-size: 3.1cqw;
		line-height: 1.3;
		font-style: italic;
		color: #8d8a80;
	}

	.statbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 2cqw;
	}
	.protocol-bar {
		justify-content: center;
	}
	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2cqw;
		width: 14cqw;
		height: 10.5cqw;
		background:
			linear-gradient(200deg, rgba(255, 255, 255, 0.1), transparent 50%),
			#14161d;
		font-size: 5.6cqw;
		font-weight: 700;
		line-height: 1;
		color: #fff;
	}
	.stat small {
		font-size: 2.1cqw;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: #9aa0ad;
	}
	.attack {
		clip-path: polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%);
		border-left: 0.7cqw solid var(--accent);
	}
	.health {
		clip-path: polygon(18% 0, 100% 0, 100% 100%, 18% 100%, 0 50%);
		border-right: 0.7cqw solid var(--accent);
	}
	.rarity-dot {
		width: 3.4cqw;
		height: 3.4cqw;
		rotate: 45deg;
		border-radius: 0.7cqw;
		background: var(--rarity-gem, #666);
	}
	.card[data-material='carbone'] .rarity-dot { --rarity-gem: linear-gradient(135deg, #3a3d46, #23252c); background: #33363e; }
	.card[data-material='nacre'] .rarity-dot { background: linear-gradient(135deg, #f2f0ea, #c9cdd6); }
	.card[data-material='argent'] .rarity-dot { background: linear-gradient(135deg, #dfe3e9, #8d949f); }
	.card[data-material='or'] .rarity-dot { background: linear-gradient(135deg, #f2d98a, #a97f2c); }
	.card[data-material='prisme'] .rarity-dot {
		background: conic-gradient(#c87a8c, #d2b46e, #78c8a0, #6ea0d2, #aa78d2, #c87a8c);
	}

	/* ============ MATIÈRE : foils (dans la fenêtre d'art) ============ */

	.foil-a,
	.foil-b,
	.sparkles,
	.glare,
	.prism-veil {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0;
		/* hors activation, la couche ne coûte rien au compositeur */
		visibility: hidden;
	}
	.card.hover .foil-a,
	.card.hover .foil-b,
	.card.hover .sparkles,
	.card.hover .glare,
	.card.hover .prism-veil {
		visibility: visible;
	}

	/* holo (rare) : bandes irisées double couche en contre-parallaxe */
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

	/* prismatic (épique) : roue conique + bandes en contre-parallaxe */
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

	/* galaxy (légendaire) : nébuleuse + bandes lentes + paillettes */
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

	/* prism (prismatique) : l'art reçoit le foil conique ET un voile irise
	   toute la carte — seule rareté où la matière déborde du cadre d'art. */
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

	/* mat (standard) : aucun foil — la matière, c'est l'absence de matière */
	.card[data-foil='mat'] .foil-a,
	.card[data-foil='mat'] .foil-b,
	.card[data-foil='mat'] .sparkles,
	.card[data-foil='mat'] .prism-veil {
		display: none;
	}

	/* ---------- glare : reflet, toutes raretés ---------- */

	.glare {
		z-index: 6;
		background: radial-gradient(
			farthest-corner circle at var(--px) var(--py),
			rgba(255, 255, 255, 0.65) 5%,
			rgba(255, 255, 255, 0.12) 35%,
			transparent 75%
		);
		mix-blend-mode: overlay;
		filter: brightness(0.9) contrast(1.6);
	}
	.card.hover .glare {
		opacity: calc(0.45 + var(--from-center) * 0.4);
		transition: opacity 0.25s ease;
	}
</style>
