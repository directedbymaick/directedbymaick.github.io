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
	<title>Galerie — {charter.game.name}</title>
	<meta name="description" content="Les {cards.length} noms de Nés du silence, rangés par peuple." />
</svelte:head>

<div bind:this={container}>
	<header class="reg-tete">
		<div class="hero-top">
			<p class="hero-kicker">Set 01 — Nés du silence</p>
			<p class="hero-kicker">{cards.length} / {SET_SIZE} noms inscrits</p>
		</div>
		<h1 class="mur"><span class="ligne"><span class="mot">Galerie</span></span></h1>
		<p class="reg-chapo">
			Les soixante noms du premier cycle, rangés par peuple. Chaque carte est montrée dans son
			état de base ; ses finitions et sa Full Art se consultent sur sa fiche.
		</p>
	</header>

	<!-- ============ LE REGISTRE : sidebar + chapitres ============ -->
	<div class="registre">
		<aside class="side">
			<p class="side-title">Galerie du set</p>
			<button class="srow" class:active={sel === 'all'} onclick={() => (sel = 'all')}>
				<span class="s-ico">✦</span>
				<span class="s-label">Tous</span>
				<span class="s-count">{cards.length}</span>
			</button>
			{#each factions as f (f)}
				{@const n = byFaction(f).length}
				<button
					class="srow"
					class:active={sel === f}
					disabled={n === 0}
					style="--fc: {charter.factions[f].color}"
					onclick={() => (sel = f)}
				>
					<span class="s-ico" style="color: {charter.factions[f].color}"
						><FactionSigil faction={f} flat /></span
					>
					<span class="s-label">{charter.factions[f].name}</span>
					<span class="s-count">{n}</span>
				</button>
			{/each}
		</aside>

		<div class="content">
			{#each shown as f (f)}
				{@const list = byFaction(f)}
				{@const banner = bannerArt(f)}
				<section class="chapter" style="--fc: {charter.factions[f].color}">
					<header class="chapter-head">
						<span class="index">0{factions.indexOf(f) + 1}</span>
						<h2>{charter.factions[f].name}</h2>
						<p class="ftag">{FACTION_TAG[f]}</p>
						<span class="fcount"
							><FactionSigil faction={f} flat /> {list.length} carte{list.length > 1 ? 's' : ''}</span
						>
					</header>

					{#if banner}
						<div class="bandeau" aria-hidden="true">
							<img src={banner} alt="" />
						</div>
					{/if}

					<div class="galerie">
						{#each entriesFor(f) as e (e.key)}
							<div class="cell">
								<Card card={e.card} thumb />
								<a class="band" href={e.href}>
									<span class="bname">{e.card.name}</span>
									<span class="stars" class:prism={e.card.rarity === 'prism'}
										>{'★'.repeat(STARS[e.card.rarity])}</span
									>
									{#if nbVersions(e.card) > 1}
										<span class="verchip">{nbVersions(e.card)} versions</span>
									{/if}
								</a>
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	</div>
</div>

<style>
	/* ============ EN-TÊTE DU REGISTRE ============
	   Même grammaire que l'accueil — bandeau de micro-libellés entre filets,
	   titre monumental — mais sans les inserts photographiques : ici c'est la
	   grille des cartes qui porte les images. */

	.reg-tete {
		position: relative;
		max-width: var(--page-max);
		margin: 0 auto;
		padding: var(--spacing-60) var(--spacing-20) var(--spacing-60);
	}
	.reg-chapo {
		max-width: 46ch;
		margin: var(--spacing-30) 0 0;
		font-family: var(--font-grotesque);
		font-size: var(--text-body);
		font-weight: var(--fw-extralight);
		line-height: 1.5;
		letter-spacing: var(--tracking-body);
		color: var(--ink-dim);
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

	/* ============ REGISTRE : sidebar + contenu ============ */

	.registre {
		display: grid;
		grid-template-columns: 220px 1fr;
		gap: 2.6rem;
		align-items: start;
	}
	@media (max-width: 900px) {
		.registre {
			grid-template-columns: 1fr;
		}
	}

	/* ---------- sidebar : filtres façon Banque de Données ---------- */
	.side {
		position: sticky;
		top: 5.4rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 1.1rem 0.9rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 18px;
		backdrop-filter: blur(12px);
	}
	@media (max-width: 900px) {
		.side {
			position: static;
			flex-direction: row;
			flex-wrap: wrap;
		}
	}
	.side-title {
		margin: 0 0 0.6rem;
		padding: 0 0.6rem;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.38);
	}
	@media (max-width: 900px) {
		.side-title {
			width: 100%;
		}
	}
	.srow {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.8rem;
		border: 1px solid transparent;
		border-radius: 12px;
		background: transparent;
		font-family: inherit;
		font-size: 0.88rem;
		font-weight: 550;
		color: rgba(238, 240, 245, 0.62);
		cursor: pointer;
		text-align: left;
		transition:
			background 0.16s ease,
			color 0.16s ease,
			border-color 0.16s ease;
	}
	.srow:hover:not(:disabled) {
		background: rgba(140, 170, 220, 0.08);
		color: var(--ink);
	}
	.srow.active {
		background: rgba(213, 178, 94, 0.1);
		border-color: rgba(213, 178, 94, 0.4);
		color: var(--ink);
	}
	.srow:disabled {
		opacity: 0.32;
		cursor: default;
	}
	.s-ico {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		font-size: 1.75rem;
		color: var(--gold);
		filter: drop-shadow(0 0 6px color-mix(in srgb, currentColor 45%, transparent));
	}
	.srow.active .s-ico {
		filter: drop-shadow(0 0 10px color-mix(in srgb, currentColor 70%, transparent));
	}
	.s-label {
		flex: 1;
	}
	.s-count {
		font-size: 0.76rem;
		font-variant-numeric: tabular-nums;
		color: rgba(238, 240, 245, 0.4);
	}
	.srow.active .s-count {
		color: var(--gold);
	}

	/* ---------- chapitres ---------- */

	.chapter {
		position: relative;
		padding: 4rem 0 6rem;
	}
	.chapter::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: min(900px, 120vw);
		height: 420px;
		background: radial-gradient(
			50% 50% at 50% 50%,
			color-mix(in srgb, var(--fc) 7%, transparent) 0%,
			transparent 70%
		);
		pointer-events: none;
	}

	.chapter-head {
		display: flex;
		align-items: baseline;
		gap: 1.4rem;
		margin-bottom: 2.6rem;
	}
	.index {
		font-size: 0.85rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.2em;
		color: rgba(238, 240, 245, 0.32);
	}
	.chapter-head h2 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 400;
		font-size: clamp(1.9rem, 4vw, 2.9rem);
		letter-spacing: 0.05em;
		color: var(--ink);
	}
	.ftag {
		margin: 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 1.15rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.fcount {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		color: color-mix(in srgb, var(--fc) 70%, #fff);
		opacity: 0.85;
		white-space: nowrap;
	}
	.fcount :global(.sigil) {
		font-size: 1.5rem;
	}
	@media (max-width: 700px) {
		.chapter-head {
			flex-wrap: wrap;
		}
		.ftag {
			width: 100%;
		}
	}

	/* ---------- bandeau : fondu sur les quatre bords ---------- */
	.bandeau {
		position: relative;
		height: 36vh;
		min-height: 230px;
		margin: 0 0 4rem;
		overflow: hidden;
	}
	.bandeau img {
		width: 100%;
		height: 130%;
		margin-top: -8%;
		object-fit: cover;
		object-position: center 25%;
		opacity: 0.6;
		-webkit-mask-image: radial-gradient(100% 86% at 50% 50%, #000 32%, transparent 92%);
		mask-image: radial-gradient(100% 86% at 50% 50%, #000 32%, transparent 92%);
	}

	/* ---------- galerie : grille propre, cartes à taille unique ---------- */

	.galerie {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(255px, 1fr));
		gap: 2.8rem 1.6rem;
	}
	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
		--card-w: min(285px, 100%);
	}

	/* le bandeau de nom : vignette HSR — nom, étoiles de rareté, chip Alt */
	.band {
		width: 100%;
		max-width: 285px;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.55rem 0.9rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 12px;
		text-decoration: none;
		transition:
			border-color 0.18s ease,
			background 0.18s ease;
	}
	.band:hover {
		border-color: rgba(213, 178, 94, 0.55);
		background: rgba(213, 178, 94, 0.07);
	}
	.bname {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.82rem;
		font-weight: 550;
		color: rgba(238, 240, 245, 0.85);
	}
	.stars {
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		color: var(--gold);
		white-space: nowrap;
	}
	.stars.prism {
		background: linear-gradient(90deg, #e8a7b8, #e8d3a7, #a7e8c6, #a7c6e8, #c9a7e8);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	/* signale qu'il existe d'autres versions (foils, Full Art) sur la fiche */
	.verchip {
		flex: none;
		padding: 0.12em 0.55em;
		font-size: 0.66rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: rgba(238, 240, 245, 0.55);
		background: rgba(140, 170, 220, 0.1);
		border: 1px solid rgba(140, 170, 220, 0.2);
		border-radius: 999px;
		white-space: nowrap;
	}
	/* nom de l'effet, sous la vignette : le foil ne vit qu'au survol */
</style>
