<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/Card.svelte';
	import FactionSigil from '$lib/FactionSigil.svelte';
	import { cards, altView } from '$lib/cards';
	import { charter } from '$lib/charter';
	import { FULLART_RATE } from '$lib/gacha';
	import { versionsOf } from '$lib/variants';
	import type { CardData, FactionId, Rarity } from '$lib/types';

	/** nombre de versions existantes (Raw + finitions + Full Art) — indiqué sur la
	    vignette pour signaler qu'il y a plus à voir sur la fiche */
	function nbVersions(card: CardData) {
		return versionsOf(card, FULLART_RATE).length;
	}

	const SET_SIZE = 60;

	const factions = Object.keys(charter.factions) as FactionId[];
	const pct = Math.round((cards.length / SET_SIZE) * 100);

	const FACTION_TAG: Record<FactionId, string> = {
		vasar: "L'Ordre qui récite",
		exar: 'La Rupture qui achève',
		eshar: 'La mémoire des syllabes',
		morar: 'La chute devenue arrivée',
		velar: 'La Volonté suffit'
	};

	/* rareté → étoiles, comme les personnages HSR */
	const STARS: Record<Rarity, number> = { common: 2, rare: 3, epic: 4, legendary: 5, prism: 5 };

	function byFaction(f: FactionId) {
		return cards
			.filter((c) => c.faction === f)
			.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
	}

	/** Le Registre ne montre QUE le Raw : l'état de base réel de chaque carte,
	    sans foil. Les finitions et les Full Art se consultent sur la fiche de la
	    carte, avec leur taux de drop — ça garde la grille lisible et légère. */
	function entriesFor(f: FactionId) {
		return byFaction(f).map((card) => ({
			key: card.id,
			card: { ...card, gene: { ...card.gene, foilPreset: 'mat' as const } },
			href: `/card/${card.id}`
		}));
	}

	/** L'artwork du bandeau de chapitre : la carte la plus rare du peuple. */
	const RANK = { common: 0, rare: 1, epic: 2, legendary: 3, prism: 4 };
	function bannerArt(f: FactionId) {
		const list = byFaction(f);
		if (!list.length) return null;
		return [...list].sort((a, b) => (RANK[b.rarity] ?? 0) - (RANK[a.rarity] ?? 0))[0].art;
	}

	const heroArt = bannerArt('vasar');

	/* Les deux inserts du mur : des illustrations du set, servies en 640px et
	   passées au duotone doré par .ed-photo. Deux peuples différents, pour que
	   le hero annonce l'étendue du set et pas une seule carte. */
	const tuiles = ['doran', 'exen']
		.map((id) => cards.find((c) => c.id === id)?.art ?? heroArt ?? '')
		.map((src) => (src.startsWith('/art/') ? src.replace('/art/', '/art/w640/') : src));

	/* filtre par peuple, façon Banque de Données */
	let sel = $state<'all' | FactionId>('all');
	const shown = $derived(
		(sel === 'all' ? factions : [sel]).filter((f) => byFaction(f).length > 0)
	);

	let container: HTMLElement;
	let refreshST: (() => void) | null = null;

	// au changement de filtre, les positions des déclencheurs changent : on recalcule
	$effect(() => {
		void sel;
		if (refreshST) requestAnimationFrame(() => refreshST?.());
	});

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let ctx: { revert: () => void } | undefined;
		(async () => {
			const { gsap } = await import('gsap');
			const { ScrollTrigger } = await import('gsap/ScrollTrigger');
			gsap.registerPlugin(ScrollTrigger);
			refreshST = () => ScrollTrigger.refresh();
			ctx = gsap.context(() => {
				/* ---- hero : l'illustration sort du noir, le titre s'installe.
				   Mouvement retenu — sur un hero plein cadre, une entree trop
				   demonstrative fatigue des la deuxieme visite. */
				gsap.fromTo(
					'.hero-fond img',
					{ autoAlpha: 0, scale: 1.08 },
					{ autoAlpha: 1, scale: 1, duration: 2.4, ease: 'quart.out' }
				);
				gsap.fromTo(
					'.hero-kicker, .hero-titre, .hero-accroche, .hero-actions, .hero-chiffres',
					{ autoAlpha: 0, y: 24 },
					{ autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.25 }
				);
				// parallax : le fond derive plus lentement que le contenu
				gsap.to('.hero-fond img', {
					yPercent: 10,
					ease: 'none',
					scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
				});

				// ---- bandeaux : l'image émerge du noir en fondu (jamais de bord, jamais de rideau)
				gsap.utils.toArray<HTMLElement>('.bandeau').forEach((b) => {
					const img = b.querySelector('img');
					if (!img) return;
					gsap.fromTo(
						img,
						{ autoAlpha: 0, scale: 1.06 },
						{
							autoAlpha: 0.6,
							scale: 1,
							duration: 2.2,
							ease: 'quart.out',
							scrollTrigger: { trigger: b, start: 'top 78%', once: true }
						}
					);
					gsap.fromTo(
						img,
						{ yPercent: -8 },
						{
							yPercent: 8,
							ease: 'none',
							scrollTrigger: { trigger: b, start: 'top bottom', end: 'bottom top', scrub: 1 }
						}
					);
				});

				// ---- chapitres : index + titre, puis dérive lente en profondeur
				gsap.utils.toArray<HTMLElement>('.chapter-head').forEach((h) => {
					gsap.from(h.children, {
						autoAlpha: 0,
						y: 26,
						duration: 1.4,
						ease: 'expo.out',
						stagger: 0.1,
						scrollTrigger: { trigger: h, start: 'top 82%', once: true }
					});
					gsap.fromTo(
						h,
						{ y: 34 },
						{
							y: -34,
							ease: 'none',
							scrollTrigger: { trigger: h, start: 'top bottom', end: 'bottom top', scrub: 1.4 }
						}
					);
				});

				// ---- galerie : les cartes émergent en vagues, puis restent en place
				gsap.set('.cell', { autoAlpha: 0 });
				ScrollTrigger.batch('.cell', {
					start: 'top 92%',
					once: true,
					onEnter: (els) =>
						gsap.fromTo(
							els,
							{ autoAlpha: 0, y: 36 },
							{ autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06 }
						)
				});

				ScrollTrigger.refresh();
			}, container);
		})();
		return () => ctx?.revert();
	});
</script>

<svelte:head>
	<title>{charter.game.name} — Nés du silence</title>
	<meta name="description" content={charter.game.tagline} />
</svelte:head>

<div bind:this={container}>
	<!-- ============ HERO ============
	     Grammaire de site de jeu : une illustration plein cadre assombrie, le
	     titre centré en capitales lourdes, une accroche d'une phrase, et deux
	     actions à angle vif — l'une pleine, l'autre en contour. -->
	<header class="hero">
		<div class="hero-fond" aria-hidden="true">
			<img src={tuiles[0]} alt="" />
		</div>

		<div class="hero-inner">
			<p class="hero-kicker">Set 01 · Nés du silence</p>
			<h1 class="hero-titre">Expelled</h1>
			<p class="hero-accroche">
				Un jeu de cartes où chaque Être porte un nom — et où le prononcer l'efface à jamais.
			</p>
			<div class="hero-actions">
				<a class="btn-plein" href="/packs">Ouvrir un booster</a>
				<a class="btn-contour" href="/regles">Comment jouer</a>
			</div>
		</div>

		<div class="hero-chiffres">
			<span><b>{cards.length}</b> cartes</span>
			<span><b>5</b> peuples</span>
			<span><b>33</b> paliers de rareté</span>
		</div>
	</header>

	<!-- ============ LES PEUPLES ============
	     Grille de rubriques : une étiquette teintée, un nom, un chiffre.
	     Aucun fond, aucun cadre — la structure vient des filets. -->
	<section class="ed-section peuples">
		<div class="sec-tete">
			<p class="ed-tag">Les cinq peuples</p>
			<a class="ed-link" href="/registre">Voir le Registre</a>
		</div>
		<div class="peuples-grille">
			{#each factions as f (f)}
				{@const n = byFaction(f).length}
				<a class="peuple" href="/registre" style="--fc: {charter.factions[f].color}">
					<span class="p-sigil"><FactionSigil faction={f} flat /></span>
					<span class="p-nom">{charter.factions[f].name}</span>
					<span class="p-tag">{FACTION_TAG[f]}</span>
					<span class="ed-stat">{n}</span>
				</a>
			{/each}
		</div>
	</section>

	<!-- ============ BLOC DE RUPTURE ============ -->
	<section class="rupture">
		<div class="rupture-inner">
			<p class="ed-tag">Le jeu</p>
			<h2 class="ed-heading">Trente cartes.<br />Un nom qu'on prononce une fois.</h2>
			<p class="rupture-txt">
				Chaque Être porte un nom, et le prononcer l'exile définitivement. La Volonté monte d'un
				point par tour. On ne gagne pas en accumulant : on gagne en choisissant ce qu'on accepte
				de perdre.
			</p>
			<div class="rupture-actions">
				<a class="ed-ghost" href="/regles">Les règles</a>
				<a class="ed-ghost" href="/tuto">Initiation</a>
				<a class="ed-ghost" href="/arene">Entrer dans l'Arène</a>
			</div>
		</div>
	</section>

	<!-- ============ CHIFFRES ============ -->
	<section class="ed-section chiffres">
		<div class="chiffre">
			<span class="ed-stat">{cards.length}</span>
			<p class="ed-tag">noms inscrits</p>
		</div>
		<div class="chiffre">
			<span class="ed-stat">33</span>
			<p class="ed-tag">paliers de rareté</p>
		</div>
		<div class="chiffre">
			<span class="ed-stat">5</span>
			<p class="ed-tag">peuples</p>
		</div>
		<div class="chiffre">
			<span class="ed-stat">1 / 13 000</span>
			<p class="ed-tag">le palier le plus rare</p>
		</div>
	</section>
</div>

<style>
	/* ============ HERO ============
	   Grammaire de site de jeu : illustration plein cadre assombrie, titre centré
	   en capitales lourdes, deux actions à angle vif. L'or d'Expelled tient le
	   rôle de l'accent saturé — un seul aplat sur toute la page. */

	.hero {
		position: relative;
		width: 100vw;
		margin-left: calc(50% - 50vw);
		min-height: 78vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--spacing-120) var(--spacing-20) var(--spacing-60);
		overflow: hidden;
	}
	.hero-fond {
		position: absolute;
		inset: 0;
		z-index: 0;
	}
	.hero-fond img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 28%;
	}
	/* le voile : l'illustration doit rester lisible SOUS le texte, jamais avec */
	.hero-fond::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(180deg, rgba(5, 9, 18, 0.72) 0%, rgba(5, 9, 18, 0.55) 45%, var(--bg) 100%),
			radial-gradient(70% 55% at 50% 45%, rgba(5, 9, 18, 0.35), transparent 75%);
	}
	.hero-inner {
		position: relative;
		z-index: 2;
		max-width: 52rem;
	}
	.hero-kicker {
		margin: 0 0 var(--spacing-25);
		font-family: var(--display);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--gold);
	}
	/* le titre : capitales lourdes, serrées — la signature des sites de TCG */
	.hero-titre {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(3.2rem, 11vw, 8rem);
		line-height: 0.95;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #f5f3ec;
		text-shadow: 0 4px 40px rgba(0, 0, 0, 0.75);
	}
	.hero-accroche {
		max-width: 40ch;
		margin: var(--spacing-25) auto var(--spacing-45);
		font-family: var(--display);
		font-size: clamp(0.95rem, 1.6vw, 1.1rem);
		font-weight: 600;
		line-height: 1.45;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.82);
	}
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--spacing-15);
	}

	/* Les deux boutons : angle VIF, capitales, jamais de pilule. Le plein porte
	   l'accent, le contour ne porte qu'un filet — c'est toute la hiérarchie. */
	.btn-plein,
	.btn-contour {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 15rem;
		padding: 1.15rem 2.4rem;
		font-family: var(--display);
		font-size: 0.86rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-decoration: none;
		border-radius: 0;
		transition:
			background 0.18s ease,
			color 0.18s ease,
			border-color 0.18s ease;
	}
	.btn-plein {
		color: #14120c;
		background: var(--gold);
		border: 2px solid var(--gold);
	}
	.btn-plein:hover {
		background: var(--cream);
		border-color: var(--cream);
	}
	.btn-contour {
		color: #f5f3ec;
		background: rgba(5, 9, 18, 0.35);
		border: 2px solid #f5f3ec;
	}
	.btn-contour:hover {
		color: #14120c;
		background: #f5f3ec;
	}

	/* la barre de chiffres, collée au bas du hero */
	.hero-chiffres {
		position: relative;
		z-index: 2;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--spacing-45);
		margin-top: var(--spacing-60);
		padding-top: var(--spacing-25);
		border-top: 1px solid var(--panel-line);
		font-family: var(--display);
		font-size: 0.76rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.55);
	}
	.hero-chiffres b {
		color: var(--gold);
		font-size: 1.05rem;
		font-variant-numeric: tabular-nums;
	}

	/* ============ SECTIONS ÉDITORIALES ============ */

	.sec-tete {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--spacing-20);
		margin-bottom: var(--spacing-50);
	}

	/* Les peuples : une grille de rubriques. Aucun fond, aucun cadre —
	   seulement un filet en haut de chaque colonne. */
	.peuples-grille {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--element-gap);
	}
	.peuple {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-10);
		padding-top: var(--spacing-20);
		border-top: 1px solid var(--panel-line);
		text-decoration: none;
		color: inherit;
		transition: border-color 0.2s ease;
	}
	.peuple:hover {
		border-top-color: var(--gold);
	}
	.p-sigil {
		width: 1.6rem;
		height: 1.6rem;
		color: var(--fc);
	}
	.p-nom {
		font-family: var(--font-grotesque);
		font-size: var(--text-body);
		font-weight: var(--fw-550);
		letter-spacing: var(--tracking-body);
	}
	.p-tag {
		font-family: var(--font-editorial);
		font-style: italic;
		font-size: 1rem;
		color: var(--ink-dim);
	}

	/* Le bloc de rupture : une surface plus profonde, pleine largeur, où les
	   actions passent en contour. C'est la respiration de la page. */
	.rupture {
		width: 100vw;
		margin-left: calc(50% - 50vw);
		margin-block: var(--section-gap);
		padding-block: var(--spacing-120);
		background: var(--surface-deep);
		border-block: 1px solid var(--panel-line);
		/* Le bloc s'INVERSE : sur une page de papier c'est le seul endroit sombre,
		   donc l'encre y redevient claire. Sans ce basculement, le texte héritait
		   du noir de la page et disparaissait sur le noir du bloc. */
		--ink: #faf8f2;
		--ink-dim: rgba(250, 248, 242, 0.6);
		--panel-line: rgba(250, 248, 242, 0.16);
		color: #faf8f2;
	}
	/* Et les actions y passent en contour clair, comme le veut la référence.
	   Un sélecteur de plus que celui du layout (.app.papier .ed-ghost) : à
	   spécificité égale, l'ordre des feuilles décidait, et il ne se contrôle pas. */
	.rupture .rupture-actions :global(.ed-ghost) {
		color: #faf8f2;
		border-color: #faf8f2;
	}
	.rupture .rupture-actions :global(.ed-ghost:hover) {
		color: var(--gold);
		border-color: var(--gold);
	}
	.rupture .rupture-inner :global(.ed-tag) {
		color: rgba(250, 248, 242, 0.55);
	}
	.rupture-inner {
		max-width: var(--page-max);
		margin: 0 auto;
		padding-inline: var(--spacing-20);
	}
	.rupture .ed-heading {
		margin: var(--spacing-20) 0 var(--spacing-30);
	}
	.rupture-txt {
		max-width: 52ch;
		margin: 0 0 var(--spacing-50);
		font-family: var(--font-grotesque);
		font-size: var(--text-body);
		font-weight: var(--fw-extralight);
		line-height: 1.5;
		letter-spacing: var(--tracking-body);
		color: var(--ink-dim);
	}
	.rupture-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--element-gap);
	}

	/* Les chiffres : grande taille, couleur sourde. C'est la couleur éteinte
	   qui les fait lire comme des données de journal. */
	.chiffres {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--spacing-40);
	}
	.chiffre {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-8);
		padding-top: var(--spacing-20);
		border-top: 1px solid var(--panel-line);
	}

</style>
