<script lang="ts">
	import { Spring } from 'svelte/motion';
	import type { CardData } from '$lib/types';
	import { resolveFoil, styleString } from '$lib/effects/foil';
	import { charter } from '$lib/charter';
	import FactionSigil from '$lib/FactionSigil.svelte';
	// Effets foil de simeydotme (GPL v3) — cf. src/lib/holo/LICENSE.txt
	import '$lib/holo/pokemon-cards-css.css';

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

	/* plafond d'intensité par preset — 0.5 par défaut (rendu retenu). */
	const foilIntensity = $derived(
		({ galerie: 0.75, showcase: 0.62 } as Record<string, number>)[foil.preset] ?? 0.5
	);

	const pointerVars = $derived(
		`--px: ${(px * 100).toFixed(2)}%; --py: ${(py * 100).toFixed(2)}%; ` +
			`--pxn: ${px.toFixed(3)}; --pyn: ${py.toFixed(3)}; ` +
			`--from-center: ${fromCenter.toFixed(3)}; ` +
			`--pang: ${pang.toFixed(1)}deg; ` +
			`--bgx: ${bgx.toFixed(2)}%; --bgy: ${bgy.toFixed(2)}%; ` +
			`--rx: ${rx.toFixed(2)}deg; --ry: ${ry.toFixed(2)}deg; ` +
			/* les variables au modèle EXACT de simeydotme, pour ses recettes shine/glare */
			`--pointer-x: ${(px * 100).toFixed(2)}%; --pointer-y: ${(py * 100).toFixed(2)}%; ` +
			`--pointer-from-center: ${fromCenter.toFixed(3)}; ` +
			`--pointer-from-top: ${py.toFixed(3)}; --pointer-from-left: ${px.toFixed(3)}; ` +
			`--background-x: ${bgx.toFixed(2)}%; --background-y: ${bgy.toFixed(2)}%; ` +
			/* intensité du foil : toutes les couches de simey sont × --card-opacity.
			   Sa valeur au survol est 1 ; on plafonne plus bas pour rester discret.
			   Le seuil est par preset (cf. foilIntensity) : la Galerie, plus douce
			   par construction, encaisse davantage sans devenir criarde. */
			`--card-opacity: ${hover ? foilIntensity : 0}`
	);

	/* notre preset → la rareté simeydotme dont on emprunte la recette exacte */
	/* notre preset → la rareté simeydotme dont on emprunte la recette EXACTE.
	   mat = pas de foil (comme un common) · regular = holo · amazing · cosmos ·
	   galerie (trainer-gallery-holo). Recettes verbatim, cf. src/lib/holo/. */
	/* showcase = holo DERRIÈRE le personnage détouré ; le holo de fond varie par
	   rareté (recettes simeydotme distinctes, dont reverse-holo & secret-rare). */
	const showcaseHolo: Record<string, string> = {
		common: 'reverse holo',
		rare: 'rare holo',
		epic: 'amazing rare',
		legendary: 'radiant rare',
		prism: 'rare secret'
	};
	const holoRarity = $derived(
		foil.preset === 'showcase'
			? (showcaseHolo[card.rarity] ?? 'rare rainbow alt')
			: ({
					mat: '',
					regular: 'rare holo',
					amazing: 'amazing rare',
					cosmos: 'rare holo cosmos',
					galerie: 'trainer gallery rare holo'
				}[foil.preset] ?? '')
	);
	// mode « showcase » : illustration détourée qui flotte au-dessus du holo
	const isShowcase = $derived(foil.preset === 'showcase' && !!card.cutout);
</script>

<div class="scene">
	<article
		class="card"
		class:hover
		data-material={rarityDef.material}
		data-foil={foil.preset}
		data-rarity={holoRarity}
		data-tier={card.sourceRarity ?? card.rarity}
		data-name-mat={card.nameMaterial ??
			((card.sourceRarity ?? card.rarity) === 'prism' ? 'cristal' : 'or')}
		data-kind={card.kind}
		data-fullart={fullArt ? 'true' : 'false'}
		style="{styleString(foil.vars)}; {pointerVars}{card.artPosition ? `; --art-pos: ${card.artPosition}` : ''}{card.cutoutY ? `; --cutout-y: ${card.cutoutY}` : ''}{card.cutoutX ? `; --cutout-x: ${card.cutoutX}` : ''}{card.faCutoutY ? `; --fa-cutout-y: ${card.faCutoutY}` : ''}{card.faCutoutX ? `; --fa-cutout-x: ${card.faCutoutX}` : ''}{card.faCutoutScale ? `; --fa-cutout-scale: ${card.faCutoutScale}` : ''}{card.cutoutScale ? `; --cutout-scale: ${card.cutoutScale}` : ''}"
		onpointermove={onMove}
		onpointerleave={onLeave}
	>
		<div class="face">
			<div class="body">
				<div class="art" class:showcase={isShowcase}>
					<img class="art-base" src={card.art} alt={card.name} draggable="false" />
					<div class="scrim" aria-hidden="true"></div>
					<!-- foil : recettes shine/glare de simeydotme (GPL v3), verbatim -->
					<div class="card__shine" aria-hidden="true"></div>
					<div class="card__glare" aria-hidden="true"></div>
				</div>

				{#if isShowcase}
					<!-- showcase : le personnage détouré descend DERRIÈRE le texte. -->
					<img class="cutout" src={card.cutout} alt="" aria-hidden="true" draggable="false" />
					<!-- voile sombre de la partie basse : passe DEVANT le sujet (mais
					     derrière le texte) → la moitié inférieure disparaît « sous » la
					     zone noire de la carte, exactement comme demandé. -->
					<div class="showcase-veil" aria-hidden="true"></div>
				{/if}

				<span class="cost" title="Coût en Volonté"><span class="cost-n">{card.cost}</span></span>
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

				<div class="etch" aria-hidden="true"></div>
			</div>
			<footer class="frame-footer" aria-hidden="true">
				<span class="ff-serial"
					>{faction.name} · {card.id.slice(0, 14).toUpperCase()}{#if card.alt}<span class="ff-alt"
							>Alt {card.alt}</span
						>{/if}{#if fullArt}<span class="fa-star" title="Full Art"></span>{/if}</span
				>
				<span class="ff-rarity">◯ {rarityDef.name} · Nés du silence</span>
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

	/* ============ FULL ART « L'AURÉOLE » (maquette v1, commit eb80749) ============
	   Zéro cadre, texte centré, coût NU surmonté d'une auréole d'or (comme sur une
	   tête). Le nom et le texte reposent sur l'image via un simple dégradé. */
	.card[data-fullart='true'] .art {
		position: absolute;
		inset: 0;
		height: 100%;
		z-index: 0;
	}
	.card[data-fullart='true'] .scrim {
		background: linear-gradient(
			180deg,
			rgba(10, 10, 14, 0.32) 0%,
			transparent 20%,
			transparent 44%,
			rgba(8, 9, 13, 0.9) 72%,
			rgba(6, 7, 10, 0.97) 100%
		);
	}
	/* pas de cadre : on aplatit la matière + le sertissage du corps */
	.card[data-fullart='true'] .face {
		border: none;
		box-shadow: none;
	}
	.card[data-fullart='true'] .body {
		box-shadow: none;
	}
	.card[data-fullart='true'] .etch {
		display: none;
	}
	/* coût : nombre nu, auréole d'or au-dessus (comme sur une tête) */
	.card[data-fullart='true'] .cost {
		top: 7.4cqw;
		left: 7cqw;
		width: auto;
		height: auto;
		background: none;
		box-shadow: none;
		overflow: visible;
		font-size: 6.4cqw;
		text-shadow: 0 0.4cqw 1.4cqw rgba(0, 0, 0, 0.85);
	}
	.card[data-fullart='true'] .cost::before {
		content: '';
		position: absolute;
		inset: auto;
		left: 50%;
		top: -2.5cqw;
		width: 7cqw;
		height: 2.2cqw;
		transform: translateX(-50%) rotate(-9deg);
		border-radius: 50%;
		border: 0.35cqw solid rgba(232, 200, 118, 0.95);
		border-bottom-color: rgba(232, 200, 118, 0.35);
		background: none;
		padding: 0;
		-webkit-mask: none;
		mask: none;
		filter: blur(0.35px) drop-shadow(0 0 1.8cqw rgba(201, 164, 69, 0.8));
	}
	.card[data-fullart='true'] .cost::after {
		display: none;
	}
	/* panneau : posé en bas, CENTRÉ, sans boîte */
	.card[data-fullart='true'] .content {
		position: absolute;
		inset: auto 0 0;
		margin: 0;
		padding: 0 6cqw 5.4cqw;
		text-align: center;
		z-index: 6;
	}
	.card[data-fullart='true'] .plate {
		background: none;
		box-shadow: none;
		border: none;
		padding: 0;
		align-self: stretch;
	}
	.card[data-fullart='true'] .plate::before,
	.card[data-fullart='true'] .plate::after {
		display: none;
	}
	.card[data-fullart='true'] .name {
		text-align: center;
	}
	/* nom en métal poli : or par défaut, cristal sur les Prismatiques.
	   IMPORTANT : le text-shadow de .name doit sauter. Un fond clippé au texte se
	   peint SOUS les ombres, donc l'ombre noire floue se composait PAR-DESSUS le
	   métal et le tirait au gris — même un remplissage blanc pur ressortait terne.
	   Le détachement passe par un drop-shadow, qui lui reste derrière. */
	.card[data-fullart='true'] .name {
		text-shadow: none;
		filter: drop-shadow(0 0.22cqw 0.55cqw rgba(0, 0, 0, 0.9));
		/* feuille d'or martelée — communes, rares, épiques, légendaires. Facettes
		   larges pour la même raison que le cristal : une lettre doit tomber dans une
		   plage franche plutôt que moyenner le grain. */
		background: url('/img/gold-texture.webp');
		background-size: 115cqw auto;
		background-position: center 45%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	/* cristal — les Prismatiques par défaut, plus toute carte qui force
	   nameMaterial: 'cristal'. On ne cible plus la rareté directement : la vue
	   full art force data-rarity, et certaines cartes méritent le cristal sans
	   être prismatiques. */
	.card[data-fullart='true'][data-name-mat='cristal'] .name {
		/* facettes volontairement GRANDES : à 30px de facette, chaque lettre moyennait
		   plusieurs triangles et retombait sur un gris. À cette échelle une lettre
		   tient dans une facette et garde son blanc ou sa couleur franche. */
		background: url('/img/crystal-texture.webp');
		background-size: 115cqw auto;
		background-position: center 42%;
		-webkit-background-clip: text;
		background-clip: text;
	}
	.card[data-fullart='true'] .cellline {
		justify-content: center;
	}
	/* le letter-spacing laisse une chasse morte après la DERNIÈRE lettre de chaque
	   mot : invisible, mais comptée dans la boîte. Sans compensation, l'écart
	   OPTIQUE ÊTRE→filet vaut 8.2px contre 6.2px pour filet→VASAR. On l'annule
	   après ÊTRE (écarts égaux autour du filet) et après VASAR (bloc centré). */
	.card[data-fullart='true'] .kindlabel {
		margin-right: -0.14em; /* letter-spacing de .cellline */
	}
	.card[data-fullart='true'] .fname {
		margin-right: -0.22em; /* .fname a son propre letter-spacing, plus large */
	}
	.card[data-fullart='true'] .hairline {
		flex: 0 0 auto;
		width: 5cqw;
	}
	/* on remonte légèrement les textes (nom + effet), sans bouger les stats ni le
	   coût : transform visuel, la mise en page (donc ATQ/INT) reste inchangée */
	.card[data-fullart='true'] .plate,
	.card[data-fullart='true'] .cartouche {
		transform: translateY(-3cqw);
	}
	.card[data-fullart='true'] .cartouche {
		background: none;
		box-shadow: none;
		backdrop-filter: none;
		border: none;
		padding: 1.6cqw 0 0;
		text-align: center;
	}
	.card[data-fullart='true'] .cartouche .watermark {
		display: none;
	}
	.card[data-fullart='true'] .statbar {
		justify-content: space-between;
		padding: 0;
		/* ATQ/INT gardent EXACTEMENT la position du mode normal : on annule le
		   sur-padding du panneau full-art (horizontal) et on redescend au bas. */
		margin: 0 -2.6cqw -3cqw;
	}
	/* étoile « Full Art » : collée au numéro de série, à gauche. Pas de couleur
	   propre — elle prend l'encre du cadre (--frame-ink), donc claire sur les
	   cartes sombres et sombre sur les cartes claires. */
	.fa-star {
		display: inline-block;
		vertical-align: -0.12em;
		flex: none;
		margin-left: 0.9cqw;
		width: 2.4cqw;
		height: 2.4cqw;
		background: currentColor;
		clip-path: polygon(
			50% 0%,
			61% 35%,
			98% 35%,
			68% 57%,
			79% 91%,
			50% 70%,
			21% 91%,
			32% 57%,
			2% 35%,
			39% 35%
		);
	}


	/* ===== SHOWCASE : illustration ORIGINALE en fond (le foil s'y applique, comme
	   simeydotme), et le personnage DÉTOURÉ vient PAR-DESSUS le holo → il ressort
	   du foil qui ne scintille que sur le décor autour de lui. ===== */
	/* en showcase, la fenêtre d'art devient un contexte d'empilement isolé : le
	   foil (shine/glare) reste CONFINÉ à l'image de fond (doran full) et ne peut
	   plus passer par-dessus le détourage. Le blend du foil se fait avec l'art de
	   fond, comme voulu ; le personnage détouré reste net, sans holo dessus. */
	.art.showcase {
		isolation: isolate;
		z-index: 0;
	}
	/* le détourage déborde la fenêtre d'art et descend dans le corps, DERRIÈRE le
	   texte : z-index 2 (le holo est en dessous, le contenu/coût/sigil au-dessus).
	   Il tourne avec la carte en 3D (rotateX/rotateY), comme simeydotme — pas de
	   parallaxe indépendante. */
	.body > .cutout {
		position: absolute;
		top: 0;
		/* échelle appliquée via width/height (PAS transform:scale) : un calque filtré
		   scalé par transform serait rasterisé puis agrandi → flou. Ici le drop-shadow
		   reste net. left recentre horizontalement quand on réduit. */
		left: calc(50% * (1 - var(--cutout-scale, 1)));
		width: calc(100% * var(--cutout-scale, 1));
		height: calc(84% * var(--cutout-scale, 1));
		z-index: 1; /* AU-DESSUS du holo, mais SOUS le voile sombre et le texte */
		object-fit: cover;
		object-position: var(--art-pos, center 8%);
		filter: drop-shadow(0 0.4cqw 0.8cqw rgba(0, 0, 0, 0.4));
		/* calage surchargeable par carte (--cutout-x / --cutout-y) */
		transform: translate(var(--cutout-x, 0%), var(--cutout-y, -4%));
		pointer-events: none;
	}
	/* FULL ART + showcase : l'art couvre toute la carte → le détourage doit se
	   caler EXACTEMENT sur lui (mêmes géométrie et cadrage que .art-base), sans
	   les offsets par carte du mode normal. Et pas de voile : le dégradé du
	   scrim suffit, sinon écran noir en bas. */
	.card[data-fullart='true'] .body > .cutout {
		/* léger upscale (106.8% par défaut) centré, via width/height pour rester net.
		   Surchargeable par carte : --fa-cutout-scale. */
		--fa-scale: var(--fa-cutout-scale, 1.068);
		top: calc(50% * (1 - var(--fa-scale)));
		left: calc(50% * (1 - var(--fa-scale)));
		width: calc(100% * var(--fa-scale));
		height: calc(100% * var(--fa-scale));
		object-position: var(--art-pos, center 12%);
		/* calage : le détourage était un poil trop haut par rapport au fond */
		transform: translate(var(--fa-cutout-x, 0%), var(--fa-cutout-y, 3.05%));
		-webkit-mask-image: linear-gradient(to bottom, #000 64%, transparent 88%);
		mask-image: linear-gradient(to bottom, #000 64%, transparent 88%);
	}
	.card[data-fullart='true'] .body > .showcase-veil {
		display: none;
	}
	/* voile sombre de la partie basse : DEVANT le sujet (z-index 2), DERRIÈRE le
	   texte (contenu z-index 3) → la moitié inférieure du personnage disparaît sous
	   la zone noire de la carte. Le dégradé raccorde la teinte du corps. */
	.body > .showcase-veil {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 52%;
		z-index: 2;
		pointer-events: none;
		background: linear-gradient(
			to bottom,
			transparent 0%,
			color-mix(in srgb, var(--accent) 5%, #0d0e14) 26%,
			#0d0e14 48%,
			#101119 100%
		);
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

	/* la grille centre la BOÎTE DE LIGNE, pas l'encre. Les chiffres Cinzel posent sur
	   la ligne de base (descendante nulle) : leur encre est donc centrée un poil trop
	   haut. Mesuré via les métriques de la police : 1px pour 22.8px, soit 0.044em. */
	.cost-n {
		display: block;
		transform: translateY(0.044em);
	}
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
	/* sur les Êtres le libellé est un dégradé clippé au texte (color: transparent) :
	   le ◯ ne se peint pas, mais occupait quand même sa chasse (16px) — un blanc
	   fantôme entre ÊTRE et le filet. */
	.card[data-kind='etre'] .kindlabel::after {
		content: none;
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

</style>
