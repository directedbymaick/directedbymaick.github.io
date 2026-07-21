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
				/* ---- hero : le mur se lève ligne à ligne depuis son masque.
				   Chaque mot est enfermé dans un bloc à `overflow: hidden` : il
				   monte de sous la ligne plutôt que d'apparaître en fondu. C'est
				   ce mouvement, et non l'opacité, qui donne l'impression du texte
				   qu'on imprime. */
				gsap.fromTo(
					'.hero .mot',
					{ yPercent: 108 },
					{ yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: 0.11 }
				);
				// les tuiles suivent, décalées : l'image arrive APRÈS le mot
				gsap.fromTo(
					'.hero .tuile',
					{ autoAlpha: 0, scale: 0.86, y: 26 },
					{
						autoAlpha: 1,
						scale: 1,
						y: 0,
						duration: 1.1,
						ease: 'expo.out',
						stagger: 0.14,
						delay: 0.42
					}
				);
				gsap.fromTo(
					'.hero-kicker, .hero-dit, .hero-actions',
					{ autoAlpha: 0, y: 18 },
					{ autoAlpha: 1, y: 0, duration: 1.1, ease: 'quart.out', stagger: 0.1, delay: 0.65 }
				);
				// parallax : les tuiles dérivent plus vite que le texte au défilement
				gsap.to('.hero .tuile', {
					yPercent: -18,
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
	<!-- ============ HERO : un mur typographique ============
	     Le titre occupe la page comme un bloc d'encre. Les tuiles
	     photographiques s'intercalent ENTRE les lignes plutôt que de flotter
	     par-dessus : c'est ce qui donne la mise en page de journal plutôt que
	     celle d'une bannière. -->
	<header class="hero">
		<div class="hero-top">
			<p class="hero-kicker">Set 01 — Registre du Silence</p>
			<p class="hero-kicker">{cards.length} / {SET_SIZE} noms inscrits</p>
		</div>

		<h1 class="mur">
			<span class="ligne"><span class="mot">Nés</span></span>
			<span class="ligne">
				<img class="tuile ed-photo" src={tuiles[0]} alt="" aria-hidden="true" />
				<span class="mot">du</span>
			</span>
			<span class="ligne">
				<span class="mot">silence</span>
				<img class="tuile ed-photo" src={tuiles[1]} alt="" aria-hidden="true" />
			</span>
		</h1>

		<div class="hero-bas">
			<p class="hero-dit">Le Créateur se tait.<br /><em>Pas vous.</em></p>
			<div class="hero-actions">
				<a class="ed-action" href="/packs">Ouvrir un booster</a>
				<a class="ed-ghost" href="/regles">Apprendre les règles</a>
			</div>
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
	/* ============ HERO : LE MUR TYPOGRAPHIQUE ============
	   Pas d'image de fond, pas de voile, pas d'ombre portée. Le titre EST la
	   page ; les tuiles s'insèrent dans le flux du texte comme les clichés d'un
	   journal, et la structure ne tient qu'aux filets et à la respiration. */

	.hero {
		position: relative;
		max-width: var(--page-max);
		margin: 0 auto;
		padding: var(--spacing-60) var(--spacing-20) var(--spacing-120);
	}
	.hero-top {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--spacing-20);
		padding-bottom: var(--spacing-25);
		border-bottom: 1px solid var(--panel-line);
	}
	.hero-kicker {
		margin: 0;
		font-family: var(--font-grotesque);
		font-size: var(--text-caption);
		font-weight: var(--fw-550);
		line-height: var(--leading-caption);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
		color: var(--ink-dim);
	}

	/* Le mur. L'approche très serrée (-0.04em) est ce qui fait lire le titre
	   comme un bloc d'encre plutôt que comme une suite de lettres. */
	.mur {
		margin: var(--spacing-50) 0 0;
		font-family: var(--font-editorial);
		font-weight: var(--fw-regular);
		font-size: clamp(4rem, 15vw, var(--text-heading-lg));
		line-height: var(--leading-display);
		letter-spacing: var(--tracking-display);
		color: var(--ink);
		text-transform: uppercase;
	}
	/* chaque ligne masque son mot : il monte de dessous plutôt que d'apparaître */
	.ligne {
		display: flex;
		align-items: center;
		gap: clamp(0.8rem, 2.5vw, var(--spacing-40));
		overflow: hidden;
	}
	.ligne:nth-child(2) {
		justify-content: flex-start;
		padding-left: clamp(0rem, 6vw, var(--spacing-120));
	}
	.ligne:nth-child(3) {
		justify-content: flex-end;
	}
	.mot {
		display: block;
	}

	/* L'insert : une petite tuile rectangulaire posée DANS la ligne. Elle ne
	   flotte pas au-dessus du texte, elle en fait partie. */
	.tuile {
		flex: none;
		width: clamp(90px, 15vw, 200px);
		height: clamp(62px, 10.5vw, 140px);
		object-fit: cover;
	}

	.hero-bas {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--spacing-40);
		margin-top: var(--spacing-60);
		padding-top: var(--spacing-30);
		border-top: 1px solid var(--panel-line);
	}
	.hero-dit {
		margin: 0;
		max-width: 22ch;
		font-family: var(--font-editorial);
		font-size: clamp(1.8rem, 4vw, 3rem);
		line-height: var(--leading-subheading);
		letter-spacing: var(--tracking-subheading);
		color: var(--ink);
	}
	.hero-dit em {
		font-style: italic;
		color: var(--gold);
	}
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--element-gap);
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
