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
	/** L'illustration d'une carte, servie en 640px — assez pour un bandeau. */
	function artDe(id: string) {
		const c = cards.find((x) => x.id === id);
		return c ? c.art.replace('/art/', '/art/w640/') : '';
	}

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
	     Titre centré en capitales, phrase d'intro, puis une grille de blocs
	     illustrés — la structure de section d'un site de jeu de cartes. -->
	<section class="sec">
		<div class="sec-inner">
			<h2 class="sec-titre">Les cinq peuples</h2>
			<p class="sec-intro">
				Cinq façons de tenir un nom. Chaque peuple impose son rythme, ses risques et sa manière
				de gagner.
			</p>
			<div class="sec-actions">
				<a class="btn-plein" href="/registre">Parcourir le Registre</a>
			</div>

			<div class="grille-peuples">
				{#each factions as f (f)}
					{@const n = byFaction(f).length}
					{@const art = bannerArt(f)}
					<a class="bloc" href="/registre" style="--fc: {charter.factions[f].color}">
						<span class="bloc-img">
							{#if art}<img src={art.replace('/art/', '/art/w640/')} alt="" loading="lazy" />{/if}
							<span class="bloc-sigil"><FactionSigil faction={f} flat /></span>
						</span>
						<span class="bloc-nom">{charter.factions[f].name}</span>
						<span class="bloc-txt">{FACTION_TAG[f]}</span>
						<span class="bloc-n">{n} cartes</span>
					</a>
				{/each}
			</div>
		</div>
	</section>

	<!-- ============ LE RÉCIT ============
	     Trois moments du Korum, chacun porté par l'illustration du personnage
	     qui le vit. C'est le lore qui donne un poids aux cartes du Registre. -->
	<section class="sec sombre">
		<div class="sec-inner">
			<p class="sec-kick">Le Korum · recueil d'Eshel</p>
			<h2 class="sec-titre">Un créateur s’est taché</h2>
			<p class="sec-intro">
				KOR dit les noms, et tant qu'on les répétait, ceux qui les portaient existaient. Puis un
				mot que nul n'avait dit est entré dans l'Origine.
			</p>

			<div class="grille-lore">
				<a class="lore-bloc" href="/lore#ex">
					<span class="bloc-img">
						<img src={artDe('thalen')} alt="" loading="lazy" />
					</span>
					<span class="lore-n">Livre IV</span>
					<span class="bloc-nom">Le mot que nul n’avait dit</span>
					<span class="bloc-txt">
						Thalen entend sous les chœurs une fêlure : EX. Hors. Si un dehors existe, alors la
						Création a une limite — donc une fin.
					</span>
				</a>
				<a class="lore-bloc" href="/lore#fracture">
					<span class="bloc-img">
						<img src={artDe('exen')} alt="" loading="lazy" />
					</span>
					<span class="lore-n">Livre V</span>
					<span class="bloc-nom">La Fracture</span>
					<span class="bloc-txt">
						L'Origine n'est pas détruite : elle est fêlée. Tous les noms en descendaient, la
						fêlure court dans les noms. Puis KOR se tait.
					</span>
				</a>
				<a class="lore-bloc" href="/lore#exar">
					<span class="bloc-img">
						<img src={artDe('rasen')} alt="" loading="lazy" />
					</span>
					<span class="lore-n">Livre VII</span>
					<span class="bloc-nom">Rasen et les Exar</span>
					<span class="bloc-txt">
						Condamné le premier, Rasen reprend sa chaîne d'or et la porte comme un titre. S'il
						existe un dehors, alors le dehors est à nous.
					</span>
				</a>
			</div>

			<div class="sec-actions bas">
				<a class="btn-plein" href="/lore">Lire le Korum</a>
			</div>
		</div>
	</section>

	<!-- ============ COMMENT ON JOUE ============ -->
	<section class="sec sombre">
		<div class="sec-inner">
			<h2 class="sec-titre">Comment on joue</h2>
			<p class="sec-intro">
				Trente cartes, un Korum à faire tomber, et une Volonté qui monte d'un point par tour. On
				ne gagne pas en accumulant : on gagne en choisissant ce qu'on accepte de perdre.
			</p>
			<div class="sec-actions">
				<a class="btn-plein" href="/tuto">Apprendre à jouer</a>
				<a class="btn-contour" href="/regles">Les règles</a>
			</div>

			<div class="grille-etapes">
				<div class="etape">
					<span class="etape-n">01</span>
					<span class="bloc-nom">Composez</span>
					<span class="bloc-txt">
						Trente cartes, trois copies maximum d'une Commune, une seule d'une Prismatique.
					</span>
				</div>
				<div class="etape">
					<span class="etape-n">02</span>
					<span class="bloc-nom">Prononcez</span>
					<span class="bloc-txt">
						Chaque Être porte un nom. Le prononcer déclenche son effet — puis l'exile pour de bon.
					</span>
				</div>
				<div class="etape">
					<span class="etape-n">03</span>
					<span class="bloc-nom">Faites taire</span>
					<span class="bloc-txt">
						Le Korum adverse tombe à zéro, ou son deck s'épuise. Il n'y a pas d'autre issue.
					</span>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ OBTENIR DES CARTES ============ -->
	<section class="sec">
		<div class="sec-inner">
			<h2 class="sec-titre">Obtenir des cartes</h2>
			<p class="sec-intro">
				Deux voies : le hasard d'un booster, ou la patience de reconstituer un nom précis avec
				les Syllabes glanées sur les Prismatiques.
			</p>

			<div class="grille-produits">
				<a class="produit" href="/packs">
					<span class="bloc-img grand">
						{#if tuiles[1]}<img src={tuiles[1]} alt="" loading="lazy" />{/if}
					</span>
					<span class="bloc-nom">Booster</span>
					<span class="bloc-txt">
						Cinq cartes, probabilités publiées, deux garanties : une Prismatique tous les 40
						boosters au plus tard, un Full Art tous les 25.
					</span>
				</a>
				<a class="produit" href="/packs/noms">
					<span class="bloc-img grand">
						{#if tuiles[0]}<img src={tuiles[0]} alt="" loading="lazy" />{/if}
					</span>
					<span class="bloc-nom">Le Glanage</span>
					<span class="bloc-txt">
						Les 193 versions du set, chacune à son prix. Vous choisissez le nom au lieu de le
						subir.
					</span>
				</a>
			</div>
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

	/* ============ SECTIONS ============
	   Même moule pour toutes : titre centré en capitales, phrase d'intro, actions,
	   puis une grille de blocs. C'est la répétition de ce moule qui donne son
	   rythme à la page — pas la variation. */

	.sec {
		width: 100vw;
		margin-left: calc(50% - 50vw);
		padding-block: clamp(4rem, 9vw, 7.5rem);
	}
	/* une section sur deux s'assombrit : c'est tout le découpage vertical */
	.sec.sombre {
		background: rgba(4, 8, 16, 0.55);
		border-block: 1px solid var(--panel-line);
	}
	.sec-inner {
		max-width: 1240px;
		margin: 0 auto;
		padding-inline: var(--spacing-20);
		text-align: center;
	}
	.sec-titre {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(1.9rem, 4.5vw, 3.2rem);
		line-height: 1.05;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #f5f3ec;
	}
	.sec-intro {
		max-width: 62ch;
		margin: var(--spacing-25) auto 0;
		font-size: 1rem;
		line-height: 1.6;
		color: rgba(238, 240, 245, 0.68);
	}
	.sec-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--spacing-15);
		margin-top: var(--spacing-35);
	}

	/* ---- les blocs illustrés ---- */
	.grille-peuples {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: var(--spacing-25);
		margin-top: var(--spacing-60);
	}
	.grille-produits {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--spacing-35);
		margin-top: var(--spacing-60);
	}
	.bloc,
	.produit {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-10);
		text-decoration: none;
		color: inherit;
	}
	.bloc-img {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border: 1px solid var(--panel-line);
		background: rgba(4, 8, 16, 0.5);
		transition: border-color 0.2s ease;
	}
	.bloc-img.grand {
		aspect-ratio: 16 / 9;
	}
	.bloc-img img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.72;
		transition:
			transform 0.4s var(--ease-out-cubic),
			opacity 0.3s ease;
	}
	.bloc:hover .bloc-img,
	.produit:hover .bloc-img {
		border-color: var(--fc, var(--gold));
	}
	.bloc:hover .bloc-img img,
	.produit:hover .bloc-img img {
		transform: scale(1.06);
		opacity: 0.95;
	}
	/* le sigil du peuple, posé sur l'illustration */
	.bloc-sigil {
		position: absolute;
		left: 50%;
		bottom: 0.7rem;
		transform: translateX(-50%);
		width: 2.1rem;
		height: 2.1rem;
		color: var(--fc);
		filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.8));
	}
	.bloc-nom {
		margin-top: var(--spacing-8);
		font-family: var(--display);
		font-size: 1.02rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #f5f3ec;
	}
	.bloc-txt {
		max-width: 34ch;
		font-size: 0.9rem;
		line-height: 1.55;
		color: rgba(238, 240, 245, 0.6);
	}
	.bloc-n {
		font-family: var(--display);
		font-size: 0.74rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--gold);
	}

	/* ---- le récit ---- */
	.sec-kick {
		margin: 0 0 var(--spacing-15);
		font-family: var(--display);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.grille-lore {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: var(--spacing-35);
		margin-top: var(--spacing-55);
	}
	.lore-bloc {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-10);
		text-decoration: none;
		color: inherit;
	}
	.lore-bloc .bloc-img {
		aspect-ratio: 3 / 2;
	}
	.lore-n {
		margin-top: var(--spacing-8);
		font-family: var(--display);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.sec-actions.bas {
		margin-top: var(--spacing-55);
	}

	/* ---- les trois étapes ---- */
	.grille-etapes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--spacing-40);
		margin-top: var(--spacing-60);
	}
	.etape {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-10);
		padding-top: var(--spacing-25);
		border-top: 2px solid var(--gold);
	}
	.etape-n {
		font-family: Cinzel, Georgia, serif;
		font-size: 2.2rem;
		line-height: 1;
		color: var(--gold);
	}

</style>
