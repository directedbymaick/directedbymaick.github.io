<script lang="ts">
	import { Spring } from 'svelte/motion';
	import type { CardData } from '$lib/types';
	import { resolveFoil, styleString } from '$lib/effects/foil';
	import { charter } from '$lib/charter';
	import FactionSigil from '$lib/FactionSigil.svelte';

	let {
		card,
		interactive = true,
		fullArt = false
	}: {
		card: CardData;
		interactive?: boolean;
		fullArt?: boolean;
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

	// Spring : le pointeur cible, la carte suit avec inertie — et REVIENT par le
	// même ressort à la sortie (jamais de snap). Légèrement sous-amorti, comme
	// le {tension:300, friction:30} de packs.com (cf. PACKSCOM-CODES.md §2.4).
	const pointer = new Spring({ x: 0.5, y: 0.5 }, { stiffness: 0.16, damping: 0.78 });
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
	/* La maths packs.com, à l'identique (PACKSCOM-CODES.md §2.3) :
	   tout dérive du spring — le retour au repos est donc lui aussi un ressort. */
	const centerX = $derived((px - 0.5) * 100); // -50..50
	const centerY = $derived((py - 0.5) * 100);
	const rx = $derived(centerY / 2.8); // rotateX : max ±17.9°
	const ry = $derived(-(centerX / 3.5)); // rotateY : max ±14.3°, sens « pression »
	const fromCenter = $derived(Math.min(1, Math.hypot(centerX, centerY) / 50));
	/* angle du pointeur (atan2, 0-360°) : oriente les bandes holo */
	const pang = $derived(((Math.atan2(centerX, -centerY) * 180) / Math.PI + 360) % 360);
	/* fond holo borné 37–63 % / 33–67 % : la retenue premium */
	const bgx = $derived(37 + px * 26);
	const bgy = $derived(33 + py * 34);

	const pointerVars = $derived(
		`--px: ${(px * 100).toFixed(2)}%; --py: ${(py * 100).toFixed(2)}%; ` +
			`--pxn: ${px.toFixed(3)}; --pyn: ${py.toFixed(3)}; ` +
			`--from-center: ${fromCenter.toFixed(3)}; ` +
			`--pang: ${pang.toFixed(1)}deg; ` +
			`--bgx: ${bgx.toFixed(2)}%; --bgy: ${bgy.toFixed(2)}%; ` +
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
		data-fullart={fullArt ? 'true' : 'false'}
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

				<span class="cost" title="Coût en Volonté">{card.cost}</span>
				<span class="sigil" title={faction.name}><FactionSigil faction={card.faction} /></span>

				<div class="content">
					<header class="plate">
						<h2 class="name">{card.name}</h2>
						<p class="cellline">
							<span class="kindlabel">{kindLabel}</span>
							{#if card.cell}
								<span class="cell">{card.cell}</span>
							{/if}
							<span class="hairline"></span>
							<span class="fname">{faction.name}</span>
						</p>
					</header>

					<div class="cartouche">
						<span class="watermark" aria-hidden="true"><FactionSigil faction={card.faction} flat /></span>
						{#if card.text}
							<p class="rules">{card.text}</p>
						{/if}
						{#if card.prononcer}
							<p class="synchro">
								<span class="synchro-tag"><span class="ptag-ring" aria-hidden="true"></span><span class="ptag-label">Prononcer {card.prononcer.cost}</span></span>
								{card.prononcer.text}
							</p>
						{/if}
						{#if card.flavor}
							<p class="flavor">{card.flavor}</p>
						{/if}
					</div>

					{#if card.kind === 'etre'}
						<footer class="statbar">
							<span class="stat"><span class="hex">{card.attack}</span><small>ATQ</small></span>
							<span class="rarity-dot" title={rarityDef.name}></span>
							<span class="stat"><small>INT</small><span class="hex">{card.health}</span></span>
						</footer>
					{:else}
						<footer class="statbar protocol-bar">
							<span class="rarity-dot" title={rarityDef.name}></span>
						</footer>
					{/if}
				</div>

				<div class="prism-veil" aria-hidden="true"></div>
				<div class="etch" aria-hidden="true"></div>
				<div class="glare" aria-hidden="true"></div>
				<div class="glare2" aria-hidden="true"></div>
			</div>
			<footer class="frame-footer" aria-hidden="true">
				<span class="ff-serial"
					>{faction.name} · {card.id.slice(0, 14).toUpperCase()}{#if card.alt}<span class="ff-alt"
							>Alt {card.alt}</span
						>{/if}</span
				>
				<span class="ff-rarity">◯ {rarityDef.name} · Le Silence</span>
			</footer>
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
		/* l'or du halo : la couleur système d'Expelled — distincte de l'accent
		   de faction qui reste sur les conduits */
		--sys: #c9a445;
		transform: translate3d(0, 0, 0.01px) rotateX(var(--rx)) rotateY(var(--ry));
		transform-style: preserve-3d;
		will-change: transform;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		font-family: 'Inter Variable', Inter, 'Segoe UI', system-ui, sans-serif;
	}

	/* ============ LE CADRE : la rareté est un matériau ============ */

	.face {
		position: absolute;
		inset: 0;
		padding: 2.3cqw 2.3cqw 5.4cqw;
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
			linear-gradient(115deg, transparent 18%, rgba(255,255,255,.24) 28%, transparent 38%),
			conic-gradient(from calc(var(--hue-shift) + var(--pxn) * 24deg),rgba(238,185,202,.2),rgba(232,210,158,.2),rgba(228,220,205,.18),rgba(166,188,232,.2),rgba(202,174,226,.18),rgba(238,185,202,.2)),
			repeating-linear-gradient(96deg,rgba(255,255,255,.035) 0 1px,transparent 1px 4px),
			linear-gradient(165deg,#3b3d45 0%,#111218 24%,#292b33 52%,#0d0e13 76%,#353740 100%);
		background-size: 240% 100%,100% 100%,auto,auto;
		background-position: calc(var(--pxn) * 100%) 0,center,center,center;
		background-blend-mode: screen,color-dodge,soft-light,normal;
		box-shadow:
			0 2.8cqw 7cqw rgba(0,0,0,.62),
			0 0 1.2cqw rgba(175,210,255,.24),
			0 0 2.8cqw rgba(221,170,255,.12),
			inset 0 .32cqw .55cqw rgba(255,255,255,.58),
			inset 0 -.35cqw .65cqw rgba(65,105,160,.42);
	}
	.card[data-material='prisme'] .face::before,
	.card[data-material='prisme'] .face::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 8;
		border-radius: inherit;
		pointer-events: none;
	}
	/* Une couche optique extrêmement fine : la couleur vit dans la tranche, pas sur la carte. */
	.card[data-material='prisme'] .face::before {
		padding: .72cqw;
		background: conic-gradient(from calc(205deg + var(--pxn) * 55deg),rgba(255,142,174,.76),rgba(255,224,158,.76),rgba(236,228,216,.78),rgba(145,181,255,.76),rgba(201,151,255,.7),rgba(255,142,174,.76));
		-webkit-mask: linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
		mask: linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		opacity: calc(.58 + var(--from-center) * .4);
		filter: saturate(1.12) brightness(1.38) contrast(1.06);
		mix-blend-mode: screen;
		transition: opacity .28s ease;
	}
	/* Reflet blanc étroit, comparable à une arête métallique sous une source ponctuelle. */
	.card[data-material='prisme'] .face::after {
		inset: .3cqw;
		border: .28cqw solid transparent;
		background: radial-gradient(34cqw 18cqw at var(--px) var(--py),rgba(255,255,255,.95),rgba(220,240,255,.42) 22%,transparent 66%) border-box;
		-webkit-mask: linear-gradient(#fff 0 0) padding-box,linear-gradient(#fff 0 0);
		mask: linear-gradient(#fff 0 0) padding-box,linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		opacity: calc(.34 + var(--from-center) * .66);
		filter: blur(.045cqw) brightness(1.25);
		mix-blend-mode: screen;
	}
	.card[data-material='prisme'].hover .face {
		box-shadow:
			0 3cqw 8cqw rgba(0,0,0,.64),
			0 0 1.8cqw rgba(180,200,255,.48),
			0 0 4.5cqw rgba(220,150,255,.24),
			inset 0 .35cqw .65cqw rgba(255,255,255,.72),
			inset 0 -.4cqw .75cqw rgba(80,130,195,.5);
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
		/* corps teinté faction : riche, jamais plat */
		background:
			radial-gradient(
				120% 60% at 50% 108%,
				color-mix(in srgb, var(--accent) 14%, transparent) 0%,
				transparent 60%
			),
			linear-gradient(180deg, color-mix(in srgb, var(--accent) 7%, #12131b) 0%, #0d0e14 55%, #101119 100%);
		display: flex;
		flex-direction: column;
		color: #e8e6df;
		/* sertissage : liseré sombre + filet lumineux (relief imprimé) */
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.7),
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			inset 0 -1px 0 rgba(0, 0, 0, 0.5);
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

	/* footer de bordure : série, rareté, code du set — gravés dans le cadre.
	   L'encre s'adapte au matériau (claire sur carbone/prisme, sombre sur métaux). */
	.frame-footer {
		position: absolute;
		left: 3.2cqw;
		right: 3.2cqw;
		bottom: 0;
		height: 5.4cqw;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-family: Cinzel, Georgia, serif;
		font-size: 2cqw;
		letter-spacing: 0.16em;
		color: var(--frame-ink, rgba(236, 232, 225, 0.55));
		text-shadow: 0 1px 0 var(--frame-ink-relief, rgba(0, 0, 0, 0.35));
		pointer-events: none;
	}
	.ff-rarity {
		text-transform: uppercase;
	}
	/* le sceau ALT : pastille prismatique gravée dans le cadre — l'iridescence
	   balaie lentement le dégradé argent-violet-or, discret mais indubitable */
	.ff-alt {
		display: inline-block;
		margin-left: 1.2cqw;
		padding: 0.35cqw 1.3cqw 0.25cqw;
		font-size: 1.7cqw;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-indent: 0.1em;
		text-transform: uppercase;
		color: #14100a;
		text-shadow: none;
		background: linear-gradient(
			100deg,
			#e8ecf4 0%,
			#cbb8ff 22%,
			#f4f0ff 40%,
			#ffe3a1 58%,
			#e8ecf4 78%,
			#cbb8ff 100%
		);
		background-size: 250% 100%;
		border-radius: 999px;
		box-shadow:
			0 0 1.6cqw rgba(203, 184, 255, 0.4),
			inset 0 0.2cqw 0.3cqw rgba(255, 255, 255, 0.7);
		animation: altsheen 5s linear infinite;
	}
	@keyframes altsheen {
		to { background-position: -250% 0; }
	}
	@media (prefers-reduced-motion: reduce) {
		.ff-alt { animation: none; }
	}
	.card[data-material='carbone'] {
		--frame-ink: rgba(236, 232, 225, 0.55);
		--frame-ink-relief: rgba(0, 0, 0, 0.5);
	}
	.card[data-material='nacre'] {
		--frame-ink: rgba(24, 30, 40, 0.65);
		--frame-ink-relief: rgba(255, 255, 255, 0.5);
	}
	.card[data-material='argent'] {
		--frame-ink: rgba(18, 22, 30, 0.62);
		--frame-ink-relief: rgba(255, 255, 255, 0.45);
	}
	.card[data-material='or'] {
		--frame-ink: rgba(46, 30, 8, 0.68);
		--frame-ink-relief: rgba(255, 235, 180, 0.5);
	}
	.card[data-material='prisme'] {
		--frame-ink: rgba(236, 232, 225, 0.6);
		--frame-ink-relief: rgba(0, 0, 0, 0.5);
	}

	/* ---------- coût / sigil ---------- */

	.cost {
		position: absolute;
		top: 3.2cqw;
		left: 3.2cqw;
		z-index: 4;
		display: grid;
		place-items: center;
		width: 12cqw;
		height: 12cqw;
		border-radius: 50%;
		/* le halo : verre sombre bombé, lueur d'or qui monte du bas */
		background:
			radial-gradient(90% 55% at 50% 8%, rgba(255, 255, 255, 0.22), transparent 60%),
			radial-gradient(100% 70% at 50% 115%, color-mix(in srgb, var(--sys) 32%, transparent), transparent 62%),
			radial-gradient(120% 120% at 50% 50%, #1a1b22 0%, #0e0f15 100%);
		font-family: Cinzel, Georgia, serif;
		font-size: 6cqw;
		font-weight: 700;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: #f5edd8;
		text-shadow:
			0 0.35cqw 0.5cqw rgba(0, 0, 0, 0.65),
			0 0 2.2cqw color-mix(in srgb, var(--sys) 60%, transparent);
		/* filet d'or intérieur, en retrait de l'anneau */
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--sys) 40%, transparent),
			0 0.5cqw 1cqw rgba(0, 0, 0, 0.55);
	}
	/* l'anneau d'or : masque radial = cercle parfait, sans couture ni bosse */
	.cost::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: linear-gradient(160deg, #f7e6ac 0%, #d9b45e 34%, #9c7328 62%, #efce77 100%);
		-webkit-mask: radial-gradient(closest-side, #0000 calc(100% - 0.95cqw), #000 calc(100% - 0.6cqw));
		mask: radial-gradient(closest-side, #0000 calc(100% - 0.95cqw), #000 calc(100% - 0.6cqw));
	}
	/* sigil de faction : le glyphe accent, seul */
	.sigil {
		position: absolute;
		top: 3.2cqw;
		right: 3.2cqw;
		z-index: 4;
		font-size: 5cqw;
		line-height: 1;
		color: color-mix(in srgb, var(--accent) 80%, #fff);
	}
	.sigil :global(span) {
		filter: drop-shadow(0 0 1.6cqw color-mix(in srgb, var(--accent) 65%, transparent))
			drop-shadow(0 0.3cqw 0.5cqw rgba(0, 0, 0, 0.5));
	}

	/* gravure : un filet fin, sous les badges et le contenu (z2) —
	   il encadre, il ne croise rien. */
	.etch {
		position: absolute;
		inset: 1.4cqw;
		z-index: 2;
		pointer-events: none;
		border-radius: 2cqw;
		border: 1px solid color-mix(in srgb, var(--sys) 28%, transparent);
	}

	/* ---------- contenu ---------- */

	.content {
		position: relative;
		z-index: 3;
		flex: 1;
		display: flex;
		flex-direction: column;
		margin-top: -7cqw;
		/* respire à l'intérieur de la gravure (filet à 1.4cqw + pastilles) */
		padding: 0 3.4cqw 3.2cqw;
	}

	.plate {
		position: relative;
		align-self: flex-start;
		max-width: 100%;
		padding: 1.6cqw 3.4cqw 1.7cqw 2.6cqw;
		/* plaque gravée : verre sombre serti d'un filet d'or, lueur de faction à gauche */
		border-radius: 1.4cqw;
		background:
			radial-gradient(
				60% 100% at 0% 50%,
				color-mix(in srgb, var(--accent) 16%, transparent) 0%,
				transparent 70%
			),
			linear-gradient(180deg, rgba(30, 31, 40, 0.94) 0%, rgba(11, 12, 17, 0.9) 100%);
		border: 1px solid color-mix(in srgb, var(--sys) 38%, transparent);
		box-shadow:
			0 0.5cqw 1cqw rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
	}
	/* filet d'or en tête : l'écriture est sertie, pas affichée */
	.plate::before {
		content: '';
		position: absolute;
		top: -1px;
		left: 1.4cqw;
		right: 1.4cqw;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			color-mix(in srgb, var(--sys) 85%, #fff) 50%,
			transparent 100%
		);
	}
	.name {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-size: 4.8cqw;
		font-weight: 700;
		letter-spacing: 0.02em;
		line-height: 1.12;
		text-shadow: 0 0.4cqw 1.2cqw rgba(0, 0, 0, 0.8);
	}
	.cellline {
		margin: 1cqw 0 0;
		display: flex;
		flex-wrap: nowrap;
		gap: 1.2cqw;
		align-items: center;
		font-family: Cinzel, Georgia, serif;
		font-size: 2.7cqw;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		white-space: nowrap;
	}
	/* taxonomie affichée : métaux précieux, sobres — sauf l'Être, irisé prismatique */
	.kindlabel {
		font-weight: 700;
	}
	/* Verbe — argent */
	.card[data-kind='verbe'] .kindlabel {
		color: #d3d8de;
		text-shadow: 0 0 1.2cqw rgba(205, 214, 224, 0.35);
	}
	/* Relique — or */
	.card[data-kind='relique'] .kindlabel {
		color: #e6c778;
		text-shadow: 0 0 1.2cqw rgba(213, 178, 94, 0.4);
	}
	/* Lieu — bronze */
	.card[data-kind='lieu'] .kindlabel {
		color: #cf9a6b;
		text-shadow: 0 0 1.2cqw rgba(190, 130, 90, 0.35);
	}
	/* Être — dégradé prismatique irisé, animé */
	.card[data-kind='etre'] .kindlabel {
		background: linear-gradient(
			90deg,
			#e8a7b8,
			#e8d3a7,
			#a7e8c6,
			#a7c6e8,
			#c9a7e8,
			#e8a7b8
		);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		filter: drop-shadow(0 0 0.8cqw rgba(200, 180, 220, 0.35));
		animation: kindsheen 6s linear infinite;
	}
	@keyframes kindsheen {
		to {
			background-position: 200% 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.card[data-kind='etre'] .kindlabel {
			animation: none;
		}
	}
	.kindlabel::after {
		content: ' ◯';
		font-size: 0.8em;
		opacity: 0.7;
	}
	.hairline {
		flex: 1 1 0;
		min-width: 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--sys) 35%, transparent),
			transparent 90%
		);
	}
	/* le CELL est un cartel serti — filet d'accent, fond de verre */
	.cell {
		padding: 0.45cqw 1.6cqw 0.4cqw;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
		/* jamais deux lignes : le chip se compresse (tracking réduit) puis ellipse */
		letter-spacing: 0.05em;
		min-width: 0;
		flex-shrink: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		background: color-mix(in srgb, var(--accent) 14%, rgba(10, 11, 16, 0.6));
		color: color-mix(in srgb, var(--accent) 45%, #fff);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
	}
	.fname {
		color: rgba(236, 232, 225, 0.5);
		letter-spacing: 0.22em;
	}
	.fname {
		font-weight: 700;
	}

	.cartouche {
		flex: 1;
		margin-top: 1.8cqw;
		padding: 2.2cqw 2.6cqw;
		border-radius: 0 0 1.8cqw 1.8cqw;
		/* panneau en creux : plus sombre en haut, remonte vers le bas */
		background: linear-gradient(
			180deg,
			rgba(0, 0, 0, 0.34) 0%,
			rgba(255, 255, 255, 0.035) 85%
		);
		border: 0.22cqw solid rgba(0, 0, 0, 0.45);
		/* tranche dorée : le panneau est relié, comme une page du Korum */
		border-top: 0.45cqw solid color-mix(in srgb, var(--sys) 45%, #3a2c14);
		box-shadow:
			inset 0 0.6cqw 1.6cqw rgba(0, 0, 0, 0.5),
			inset 0 -1px 0 rgba(255, 255, 255, 0.07);
		overflow: hidden;
	}
	/* filigrane de faction derrière le texte (cf. le watermark MTG) */
	.watermark {
		position: absolute;
		right: -2.4cqw;
		bottom: -4.4cqw;
		font-size: 19cqw;
		line-height: 1;
		color: color-mix(in srgb, var(--accent) 55%, transparent);
		opacity: 0.1;
		pointer-events: none;
		user-select: none;
	}
	.cartouche {
		position: relative;
	}
	.rules {
		margin: 0;
		font-size: 3.6cqw;
		line-height: 1.32;
		position: relative;
	}
	.synchro {
		margin: 1.4cqw 0 0;
		padding: 1.2cqw 1.8cqw;
		font-size: 3.5cqw;
		line-height: 1.3;
		border-left: 0.5cqw solid var(--sys);
		background: color-mix(in srgb, var(--sys) 9%, transparent);
		border-radius: 0 1cqw 1cqw 0;
	}
	/* le sceau du Prononcer : pill d'or — le geste signature est doré, pas faction */
	.synchro-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.9cqw;
		font-family: Cinzel, Georgia, serif;
		font-size: 2.6cqw;
		font-weight: 700;
		line-height: 1;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		/* padding symétrique : l'anneau se centre au vrai milieu ; padding droit réduit
		   pour rattraper le letter-spacing orphelin après le dernier caractère. */
		padding: 0.7cqw 1.6cqw 0.7cqw 1.9cqw;
		margin-bottom: 0.7cqw;
		border-radius: 999px;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--sys) 80%, #fff) 0%,
			color-mix(in srgb, var(--sys) 88%, #000) 100%
		);
		color: #14100a;
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.25);
	}
	/* l'anneau du Prononcer : dessiné, pas un glyphe — centrage garanti */
	.ptag-ring {
		flex: none;
		width: 1.9cqw;
		height: 1.9cqw;
		border: 0.4cqw solid currentColor;
		border-radius: 50%;
	}
	/* Cinzel : capitales sans jambages — les glyphes flottent haut dans leur em-box.
	   La correction optique s'applique au texte SEUL, jamais à l'anneau. */
	.ptag-label {
		transform: translateY(0.055em);
	}
	.flavor {
		margin: 1.4cqw 0 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: 3.5cqw;
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
	/* stats : médaillons — le même halo que la cellule de coût, en plus petit.
	   Un seul langage de badge sur la carte. */
	.stat {
		display: flex;
		align-items: center;
		gap: 1.3cqw;
	}
	.stat .hex {
		position: relative;
		display: grid;
		place-items: center;
		width: 9cqw;
		height: 9cqw;
		border-radius: 50%;
		background:
			radial-gradient(90% 55% at 50% 8%, rgba(255, 255, 255, 0.2), transparent 60%),
			radial-gradient(100% 70% at 50% 115%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 62%),
			radial-gradient(120% 120% at 50% 50%, #1a1b22 0%, #0e0f15 100%);
		font-family: Cinzel, Georgia, serif;
		font-size: 4.3cqw;
		font-weight: 700;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: #f5edd8;
		text-shadow: 0 0.3cqw 0.45cqw rgba(0, 0, 0, 0.6);
		box-shadow: 0 0.4cqw 0.7cqw rgba(0, 0, 0, 0.5);
	}
	/* sertissage d'or : anneau radial parfait (aucune bosse même agrandi) */
	.stat .hex::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: linear-gradient(160deg, #f7e6ac 0%, #d9b45e 34%, #9c7328 62%, #efce77 100%);
		-webkit-mask: radial-gradient(closest-side, #0000 calc(100% - 0.72cqw), #000 calc(100% - 0.45cqw));
		mask: radial-gradient(closest-side, #0000 calc(100% - 0.72cqw), #000 calc(100% - 0.45cqw));
	}
	.stat small {
		font-family: Cinzel, Georgia, serif;
		font-size: 2.2cqw;
		font-weight: 700;
		letter-spacing: 0.24em;
		color: rgba(236, 232, 225, 0.5);
	}
	.rarity-dot {
		width: 3.4cqw;
		height: 3.4cqw;
		border-radius: 50%;
		background: var(--rarity-gem, #666);
		/* gemme-halo sertie : reflet + assise */
		box-shadow:
			inset 0.4cqw 0.4cqw 0.7cqw rgba(255, 255, 255, 0.55),
			inset -0.4cqw -0.4cqw 0.7cqw rgba(0, 0, 0, 0.45),
			0 0.3cqw 0.8cqw rgba(0, 0, 0, 0.5);
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
	.glare2,
	.prism-veil {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0;
		/* sortie : l'holo S'ÉTEINT en fondu (le code packs.com — jamais de snap),
		   puis la couche se masque pour ne rien coûter au compositeur au repos */
		visibility: hidden;
		transition:
			opacity 0.45s ease,
			visibility 0s linear 0.45s;
	}
	.card.hover .foil-a,
	.card.hover .foil-b,
	.card.hover .sparkles,
	.card.hover .glare,
	.card.hover .glare2,
	.card.hover .prism-veil {
		visibility: visible;
		transition: opacity 0.25s ease;
	}

	/* holo (rare) : bandes irisées double couche en contre-parallaxe.
	   L'angle des bandes suit l'atan2 du pointeur ; la course du fond est
	   bornée (37-63 %) ; le grain est INTERSECTÉ avec un masque radial au
	   pointeur — l'holo ne s'allume qu'autour du curseur (le code packs.com). */
	.card[data-foil='holo'] .foil-a {
		background:
			radial-gradient(
				farthest-corner circle at var(--px) var(--py),
				rgba(255, 255, 255, 0.55) 5%,
				rgba(120, 120, 120, 0.5) 40%,
				#000 100%
			),
			repeating-linear-gradient(
				calc(var(--band-angle) + (var(--pang, 180deg) - 180deg) * 0.12),
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
			var(--bgx, 50%) var(--bgy, 50%);
		mask-image:
			var(--grain),
			radial-gradient(farthest-corner circle at var(--px) var(--py), #fff 16%, transparent 78%);
		mask-size: 34cqw, cover;
		-webkit-mask-composite: source-in;
		mask-composite: intersect;
		mix-blend-mode: color-dodge;
		filter: brightness(0.7) contrast(1.6) saturate(1.4);
	}
	.card[data-foil='holo'] .foil-b {
		background: repeating-linear-gradient(
			calc(var(--band-angle) + 55deg - (var(--pang, 180deg) - 180deg) * 0.08),
			var(--c2) 0%,
			#fff3c4 9%,
			var(--c1) 18%,
			#c4f0ff 27%,
			var(--c2) 36%
		);
		background-size: 340% 340%;
		background-position: calc(100% - var(--bgx, 50%)) calc(100% - var(--bgy, 50%));
		mask-image: var(--grain);
		mask-size: 58cqw;
		mix-blend-mode: overlay;
		filter: brightness(0.9) contrast(1.3) saturate(1.3);
	}
	/* les BARRES D'EXCLUSION packs.com : deux bandes grises croisées, fondues en
	   exclusion puis posées en hard-light — l'interférence métallique du foil.
	   (héritées du masque du parent : elles ne vivent qu'autour du pointeur) */
	.card[data-foil='holo'] .foil-a::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(calc(var(--ry, 0deg) * -0.9), #000 24%, #797979 30%, #000 36%),
			linear-gradient(calc(var(--ry, 0deg) * 0.9), #000 24%, #797979 30%, #000 36%);
		background-size: 300% 300%;
		background-position:
			50% calc(var(--bgy, 50%) * 1.7),
			50% calc(120% - var(--bgy, 50%) * 1.3);
		background-blend-mode: exclusion;
		mix-blend-mode: hard-light;
		filter: contrast(0.8) brightness(1.05);
		opacity: 0.75;
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
		mask-image:
			var(--grain),
			radial-gradient(farthest-corner circle at var(--px) var(--py), #fff 16%, transparent 78%);
		mask-size: 28cqw, cover;
		-webkit-mask-composite: source-in;
		mask-composite: intersect;
		mix-blend-mode: color-dodge;
		filter: brightness(0.68) contrast(1.7) saturate(1.6);
	}
	.card[data-foil='prismatic'] .foil-b {
		background: repeating-linear-gradient(
			calc(var(--band-angle) + (var(--pang, 180deg) - 180deg) * 0.1),
			var(--c1) 0%,
			#ffe9c4 8%,
			var(--c2) 16%,
			#c4e0ff 24%,
			var(--c1) 32%
		);
		background-size: 300% 300%;
		background-position: calc(100% - var(--bgx, 50%)) var(--bgy, 50%);
		mask-image: var(--grain);
		mask-size: 52cqw;
		mix-blend-mode: overlay;
		filter: brightness(0.95) contrast(1.25) saturate(1.4);
	}
	/* le GLITTER packs.com, verbatim : la texture est INCRUSTÉE dans la carte
	   (position fixe, graine par carte) — c'est l'OPACITÉ qui s'allume avec
	   l'inclinaison, et un jumeau en parallaxe ±2.5 % DANS le sens du pointeur
	   donne la profondeur. Rien ne glisse contre la carte. */
	.card[data-foil='prismatic'] .sparkles {
		background-image: var(--glitter);
		background-size: 16cqw;
		background-position: var(--seedx, 50%) var(--seedy, 50%);
		background-repeat: repeat;
		mix-blend-mode: plus-lighter;
		filter: contrast(2) saturate(1.2);
	}
	.card[data-foil='prismatic'] .sparkles::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image: var(--glitter);
		background-size: 16cqw;
		background-position: calc(var(--seedx, 50%) + 11% + var(--pxn, 0.5) * 5%)
			calc(var(--seedy, 50%) + 6% + var(--pyn, 0.5) * 5%);
		background-repeat: repeat;
		mix-blend-mode: overlay;
		filter: brightness(2) contrast(1.2) saturate(2);
		opacity: var(--pyn, 0.5);
	}
	.card[data-foil='prismatic'].hover .sparkles {
		opacity: calc(0.2 + var(--from-center) * 0.55);
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
			linear-gradient(
				calc(var(--band-angle) + (var(--pang, 180deg) - 180deg) * 0.1),
				var(--c2),
				var(--c1),
				var(--c0)
			);
		background-blend-mode: screen;
		mask-image:
			var(--galaxy),
			radial-gradient(farthest-corner circle at var(--px) var(--py), #fff 22%, transparent 85%);
		mask-size: cover, cover;
		-webkit-mask-composite: source-in;
		mask-composite: intersect;
		mix-blend-mode: color-dodge;
		filter: brightness(0.62) contrast(1.35) saturate(1.6);
	}
	.card[data-foil='galaxy'] .foil-b {
		background: repeating-linear-gradient(
			calc(var(--band-angle) - 40deg - (var(--pang, 180deg) - 180deg) * 0.08),
			var(--c0) 0%,
			#ffe6a7 10%,
			var(--c1) 20%,
			#a7e6ff 30%,
			var(--c0) 40%
		);
		background-size: 320% 320%;
		background-position: calc(100% - var(--bgx, 50%)) var(--bgy, 50%);
		mask-image: var(--grain);
		mask-size: 46cqw;
		mix-blend-mode: overlay;
		filter: brightness(0.85) contrast(1.4) saturate(1.5);
	}
	/* paillettes du cosmos : INCRUSTÉES (position fixe), allumées par l'opacité */
	.card[data-foil='galaxy'] .sparkles {
		background-image: var(--glitter);
		background-size: 19cqw;
		background-position: var(--seedx, 50%) var(--seedy, 50%);
		background-repeat: repeat;
		mix-blend-mode: plus-lighter;
		filter: contrast(2) saturate(1.15) brightness(0.95);
	}
	.card[data-foil='galaxy'] .sparkles::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image: var(--glitter);
		background-size: 19cqw;
		background-position: calc(var(--seedx, 50%) + 13% + var(--pxn, 0.5) * 5%)
			calc(var(--seedy, 50%) + 8% + var(--pyn, 0.5) * 5%);
		background-repeat: repeat;
		mix-blend-mode: overlay;
		filter: brightness(2) contrast(1.2) saturate(1.6);
		opacity: var(--pyn, 0.5);
	}
	.card[data-foil='galaxy'].hover .sparkles {
		opacity: calc(0.22 + var(--from-center) * 0.55);
	}
	/* le COSMOS packs.com : un SECOND plan de nébuleuse en contre-parallaxe —
	   la profondeur du foil galaxie vient de ce décalage entre les deux nappes */
	.card[data-foil='galaxy'] .prism-veil {
		z-index: 4;
		background:
			radial-gradient(
				100cqw 80cqw at calc(100% - var(--bgx, 50%)) calc(100% - var(--bgy, 50%)),
				color-mix(in oklab, var(--c2) 72%, #fff) 0%,
				transparent 55%
			),
			linear-gradient(calc(var(--band-angle) + 90deg), var(--c1), var(--c0), var(--c2));
		background-blend-mode: screen;
		mask-image: var(--galaxy2);
		mask-size: cover;
		mask-position: calc(100% - var(--seedx, 0%)) var(--seedy, 0%);
		mix-blend-mode: color-dodge;
		filter: brightness(0.55) contrast(1.5) saturate(1.5);
	}
	.card[data-foil='galaxy'].hover .prism-veil {
		opacity: calc(0.25 + var(--from-center) * 0.35);
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
		mask-image:
			var(--grain),
			radial-gradient(farthest-corner circle at var(--px) var(--py), #fff 16%, transparent 80%);
		mask-size: 26cqw, cover;
		-webkit-mask-composite: source-in;
		mask-composite: intersect;
		mix-blend-mode: color-dodge;
		filter: brightness(0.7) contrast(1.7) saturate(1.5);
	}
	.card[data-foil='prism'] .foil-b {
		background: repeating-linear-gradient(
			calc(var(--band-angle) + 30deg + (var(--pang, 180deg) - 180deg) * 0.1),
			var(--c0) 0%,
			#fff0c4 8%,
			var(--c1) 16%,
			#c4e6ff 24%,
			var(--c2) 32%,
			#f0c4ff 40%,
			var(--c0) 48%
		);
		background-size: 300% 300%;
		background-position: calc(100% - var(--bgx, 50%)) var(--bgy, 50%);
		mask-image: var(--grain);
		mask-size: 50cqw;
		mix-blend-mode: overlay;
		filter: brightness(0.9) contrast(1.3) saturate(1.5);
	}
	/* barres d'exclusion, version prismatique : le croisement est plus ouvert */
	.card[data-foil='prism'] .foil-a::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(calc(var(--ry, 0deg) * -1.1), #000 22%, #8a8a8a 30%, #000 38%),
			linear-gradient(calc(var(--ry, 0deg) * 1.1), #000 22%, #8a8a8a 30%, #000 38%);
		background-size: 300% 300%;
		background-position:
			50% calc(var(--bgy, 50%) * 1.7),
			50% calc(120% - var(--bgy, 50%) * 1.3);
		background-blend-mode: exclusion;
		mix-blend-mode: hard-light;
		filter: contrast(0.8) brightness(1.08);
		opacity: 0.8;
	}
	/* glitter froid — INCRUSTÉ, jumeau en parallaxe de profondeur */
	.card[data-foil='prism'] .sparkles {
		background-image: var(--glitter);
		background-size: 14cqw;
		background-position: var(--seedx, 50%) var(--seedy, 50%);
		background-repeat: repeat;
		mix-blend-mode: plus-lighter;
		filter: contrast(2.1) saturate(1.1) brightness(1.05);
	}
	.card[data-foil='prism'] .sparkles::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image: var(--glitter);
		background-size: 14cqw;
		background-position: calc(var(--seedx, 50%) + 9% + var(--pxn, 0.5) * 5%)
			calc(var(--seedy, 50%) + 5% + var(--pyn, 0.5) * 5%);
		background-repeat: repeat;
		mix-blend-mode: overlay;
		filter: brightness(2) contrast(1.25) saturate(1.8);
		opacity: var(--pyn, 0.5);
	}
	.card[data-foil='prism'].hover .sparkles {
		opacity: calc(0.25 + var(--from-center) * 0.6);
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
		background-position: var(--bgx, 50%) var(--bgy, 50%);
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

	/* ============ FULL ART : l'artwork couvre toute la carte ============
	   Les panneaux deviennent du verre flouté posé sur l'image ; les foils,
	   logés dans .art, s'étendent naturellement à toute la carte. */

	.card[data-fullart='true'] .art {
		position: absolute;
		inset: 0;
		height: 100%;
		z-index: 0;
	}
	.card[data-fullart='true'] .scrim {
		background: linear-gradient(
			180deg,
			rgba(16, 17, 23, 0.3) 0%,
			transparent 18%,
			transparent 46%,
			rgba(10, 11, 16, 0.82) 78%,
			rgba(9, 10, 15, 0.94) 100%
		);
	}
	.card[data-fullart='true'] .content {
		margin-top: auto;
		flex: none;
	}
	.card[data-fullart='true'] .plate {
		background: rgba(10, 11, 16, 0.66);
		backdrop-filter: blur(6px);
	}
	.card[data-fullart='true'] .cartouche {
		flex: none;
		background: rgba(8, 9, 14, 0.6);
		backdrop-filter: blur(9px);
		box-shadow:
			inset 0 0.6cqw 1.6cqw rgba(0, 0, 0, 0.35),
			inset 0 -1px 0 rgba(255, 255, 255, 0.06);
	}

	/* ---------- glare : reflet, toutes raretés ---------- */

	/* PRISME FULL ART : L'AURÉOLE */
	.card[data-material='prisme'][data-fullart='true'] .scrim { background: linear-gradient(180deg,rgba(8,9,13,.22),transparent 24%,transparent 43%,rgba(7,8,12,.76) 70%,#07080c 100%); }
	.card[data-material='prisme'][data-fullart='true'] .cost { top: 8.4cqw; left: 6.4cqw; width: auto; height: auto; border-radius: 0; background: none; box-shadow: none; font-size: 7.2cqw; font-weight: 600; text-shadow: 0 .5cqw 1.4cqw rgba(0,0,0,.9),0 0 2.4cqw rgba(201,164,69,.35); }
	.card[data-material='prisme'][data-fullart='true'] .cost::before { inset: -3.25cqw -.85cqw auto; height: 2.35cqw; padding: 0; border: .4cqw solid rgba(235,205,126,.92); border-bottom-color: rgba(235,205,126,.28); border-radius: 50%; background: none; -webkit-mask: none; mask: none; filter: drop-shadow(0 0 1.4cqw rgba(201,164,69,.65)); transform: rotate(-8deg); }
	.card[data-material='prisme'][data-fullart='true'] .sigil { top: 6.2cqw; right: 5.8cqw; font-size: 4.5cqw; }
	.card[data-material='prisme'][data-fullart='true'] .content { padding: 0 6cqw 4.2cqw; text-align: center; }
	.card[data-material='prisme'][data-fullart='true'] .plate { align-self: stretch; padding: 0; border: 0; border-radius: 0; background: none; box-shadow: none; backdrop-filter: none; }
	.card[data-material='prisme'][data-fullart='true'] .plate::before { top: auto; bottom: -1.7cqw; left: 24%; right: 24%; }
	.card[data-material='prisme'][data-fullart='true'] .name { font-size: 5.5cqw; font-weight: 600; letter-spacing: .055em; color: #fff9ea; }
	.card[data-material='prisme'][data-fullart='true'] .cellline { justify-content: center; margin-top: 2.6cqw; font-size: 2.35cqw; }
	.card[data-material='prisme'][data-fullart='true'] .hairline,
	.card[data-material='prisme'][data-fullart='true'] .fname,
	.card[data-material='prisme'][data-fullart='true'] .watermark { display: none; }
	.card[data-material='prisme'][data-fullart='true'] .cartouche { margin-top: 1.2cqw; padding: 1.2cqw 1cqw; border: 0; border-radius: 0; background: none; box-shadow: none; backdrop-filter: none; }
	.card[data-material='prisme'][data-fullart='true'] .rules { font-size: 3.35cqw; }
	.card[data-material='prisme'][data-fullart='true'] .synchro { margin-top: 1.1cqw; padding: .8cqw 1cqw; border: 0; border-radius: 0; background: none; }
	.card[data-material='prisme'][data-fullart='true'] .synchro-tag { display: flex; width: fit-content; margin: 0 auto .7cqw; padding: 0; background: none; color: #e5c56e; text-shadow: 0 0 1.5cqw rgba(201,164,69,.35); }
	.card[data-material='prisme'][data-fullart='true'] .flavor { margin-top: 1cqw; }

	.glare {
		z-index: 6;
		/* halo diffus : retombée très progressive, aucun cercle lisible */
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
	}
	/* le second glare packs.com : l'ombre opposée — un voile multiply à la
	   position INVERSE du pointeur. C'est lui qui donne le volume : la lumière
	   d'un côté, la pénombre de l'autre. */
	.glare2 {
		z-index: 6;
		background: radial-gradient(
			farthest-corner circle at calc(100% - var(--px)) calc(100% - var(--py)),
			rgba(16, 18, 26, 0) 30%,
			rgba(10, 12, 18, 0.28) 78%,
			rgba(6, 8, 12, 0.42) 100%
		);
		mix-blend-mode: multiply;
	}
	.card.hover .glare2 {
		opacity: calc(0.4 + var(--from-center) * 0.35);
	}
</style>
