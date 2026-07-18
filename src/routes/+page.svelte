<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/Card.svelte';
	import { cards, altView } from '$lib/cards';
	import { charter } from '$lib/charter';
	import type { FactionId } from '$lib/types';

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

	function byFaction(f: FactionId) {
		return cards
			.filter((c) => c.faction === f)
			.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
	}

	/** Grille d'affichage : chaque carte, suivie de ses versions alternatives (toujours foil). */
	function entriesFor(f: FactionId) {
		return byFaction(f).flatMap((card) => [
			{ key: card.id, card, alt: 0, href: `/card/${card.id}` },
			...(card.alts ?? []).map((art, i) => ({
				key: `${card.id}--alt${i + 2}`,
				card: altView(card, art, i),
				alt: i + 1,
				href: `/card/${card.id}?v=alt${i + 2}`
			}))
		]);
	}

	/** L'artwork du bandeau de chapitre : la carte la plus rare du peuple. */
	const RANK = { common: 0, rare: 1, epic: 2, legendary: 3, prism: 4 };
	function bannerArt(f: FactionId) {
		const list = byFaction(f);
		if (!list.length) return null;
		return [...list].sort((a, b) => (RANK[b.rarity] ?? 0) - (RANK[a.rarity] ?? 0))[0].art;
	}

	const heroArt = bannerArt('vasar');

	let container: HTMLElement;

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let ctx: { revert: () => void } | undefined;
		(async () => {
			const { gsap } = await import('gsap');
			const { ScrollTrigger } = await import('gsap/ScrollTrigger');
			gsap.registerPlugin(ScrollTrigger);
			ctx = gsap.context(() => {
				// ---- hero : l'émergence (l'image sort du noir, le titre se dit ligne à ligne)
				gsap.fromTo(
					'.hero-art img',
					{ autoAlpha: 0, scale: 1.07 },
					{ autoAlpha: 1, scale: 1, duration: 3, ease: 'quart.out' }
				);
				gsap.fromTo(
					'.hero .line',
					{ autoAlpha: 0, y: 34 },
					{ autoAlpha: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.14, delay: 0.5 }
				);
				gsap.fromTo(
					'.hero .quiet',
					{ autoAlpha: 0 },
					{ autoAlpha: 1, duration: 1.4, ease: 'quart.out', delay: 1.5, stagger: 0.12 }
				);
				// l'auréole se dessine en dernier
				gsap.fromTo(
					'.aureole',
					{ autoAlpha: 0, y: 10 },
					{ autoAlpha: 1, y: 0, duration: 1.4, ease: 'circ.out', delay: 1.2 }
				);
				// parallax interne du hero au scroll
				gsap.to('.hero-art img', {
					yPercent: 10,
					ease: 'none',
					scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
				});

				// ---- letterbox : le rideau s'ouvre sur chaque bandeau de chapitre
				gsap.utils.toArray<HTMLElement>('.bandeau').forEach((b) => {
					gsap.set(b.querySelectorAll('.shutter'), { scaleY: 1 });
					ScrollTrigger.create({
						trigger: b,
						start: 'top 72%',
						once: true,
						onEnter: () =>
							gsap.to(b.querySelectorAll('.shutter'), {
								scaleY: 0,
								duration: 1.4,
								ease: 'expo.inOut'
							})
					});
					const img = b.querySelector('img');
					if (img)
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

				// ---- chapitres : index + titre
				gsap.utils.toArray<HTMLElement>('.chapter-head').forEach((h) => {
					gsap.from(h.children, {
						autoAlpha: 0,
						y: 26,
						duration: 1.4,
						ease: 'expo.out',
						stagger: 0.1,
						scrollTrigger: { trigger: h, start: 'top 82%', once: true }
					});
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
	<title>{charter.game.name} — Le Silence</title>
	<meta name="description" content={charter.game.tagline} />
</svelte:head>

<div bind:this={container}>
	<!-- ============ HERO : l'émergence ============ -->
	<header class="hero">
		{#if heroArt}
			<div class="hero-art" aria-hidden="true"><img src={heroArt} alt="" /></div>
		{/if}
		<div class="hero-inner">
			<p class="quiet kicker">Set 01</p>
			<span class="aureole" aria-hidden="true"></span>
			<h1><span class="line">Le Silence</span></h1>
			<p class="tagline">
				<span class="line">Le Créateur se tait.</span>
				<span class="line em">Pas vous.</span>
			</p>
			<div class="quiet meter" role="img" aria-label="Progression du set : {cards.length} cartes sur {SET_SIZE}">
				<span class="meter-fill" style="width: {pct}%"></span>
			</div>
			<p class="quiet meter-label">{cards.length} / {SET_SIZE} cartes forgées</p>
		</div>
		<p class="quiet scrollhint">Défiler</p>
	</header>

	<!-- ============ CHAPITRES : un peuple, un écran ============ -->
	{#each factions as f, fi (f)}
		{@const list = byFaction(f)}
		{#if list.length > 0}
			{@const banner = bannerArt(f)}
			<section class="chapter" style="--fc: {charter.factions[f].color}">
				<span class="vlabel" aria-hidden="true">{charter.factions[f].name}</span>

				<header class="chapter-head">
					<span class="index">0{fi + 1}</span>
					<h2>{charter.factions[f].name}</h2>
					<p class="ftag">{FACTION_TAG[f]}</p>
					<span class="fcount"
						>{charter.factions[f].sigil} {list.length} carte{list.length > 1 ? 's' : ''}</span
					>
				</header>

				{#if banner}
					<div class="bandeau" aria-hidden="true">
						<img src={banner} alt="" />
						<i class="shutter top"></i>
						<i class="shutter bottom"></i>
					</div>
				{/if}

				<div class="galerie">
					{#each entriesFor(f) as e (e.key)}
						<div class="cell">
							<Card card={e.card} />
							<a class="cardlink" href={e.href}>
								{e.card.name}
								{#if e.alt}<span class="altchip">Alt {e.alt}</span>{/if}
							</a>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/each}
</div>

<style>
	/* ============ HERO ============ */

	.hero {
		position: relative;
		min-height: 92vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		margin: 0 -2rem;
		overflow: hidden;
	}
	/* l'image émerge du noir : masquée sur tous les bords, jamais de cadre */
	.hero-art {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.hero-art img {
		width: 100%;
		height: 112%;
		object-fit: cover;
		object-position: center 20%;
		opacity: 0.5;
		-webkit-mask-image: radial-gradient(95% 75% at 50% 38%, #000 30%, transparent 74%);
		mask-image: radial-gradient(95% 75% at 50% 38%, #000 30%, transparent 74%);
	}
	.hero-inner {
		position: relative;
		padding: 0 2rem;
	}
	.kicker {
		margin: 0 0 3.4rem;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.34em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.5);
	}
	/* l'auréole penchée, au-dessus du titre */
	.aureole {
		position: absolute;
		left: 50%;
		top: 1.6rem;
		width: min(210px, 44vw);
		height: 48px;
		transform: translateX(-50%) rotate(-7deg);
		border-radius: 50%;
		border: 2px solid rgba(232, 200, 118, 0.8);
		border-bottom-color: rgba(232, 200, 118, 0.2);
		filter: blur(0.6px) drop-shadow(0 0 24px rgba(201, 164, 69, 0.6));
		pointer-events: none;
	}
	h1 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 400;
		font-size: clamp(3.4rem, 8.5vw, 6.6rem);
		letter-spacing: 0.04em;
		line-height: 1.05;
		color: #f5f3ec;
		text-shadow: 0 0 60px rgba(201, 164, 69, 0.25);
	}
	.line {
		display: block;
	}
	/* la tagline en escalier — jamais empilée-centrée */
	.tagline {
		margin: 2.2rem 0 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: clamp(1.3rem, 2.6vw, 1.8rem);
		line-height: 1.35;
		color: rgba(242, 240, 234, 0.7);
	}
	.tagline .line {
		transform: translateX(-2.5ch);
	}
	.tagline .line.em {
		transform: translateX(3.5ch);
		font-style: italic;
		color: #e2c069;
	}
	.meter {
		width: min(240px, 60vw);
		height: 2px;
		margin: 3rem auto 0;
		border-radius: 2px;
		background: rgba(242, 240, 234, 0.12);
		overflow: hidden;
	}
	.meter-fill {
		display: block;
		height: 100%;
		background: #c9a445;
	}
	.meter-label {
		margin: 0.7rem 0 0;
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
		color: rgba(242, 240, 234, 0.4);
	}
	.scrollhint {
		position: absolute;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		margin: 0;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.4em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.35);
		animation: breathe 3.2s ease-in-out infinite;
	}
	@keyframes breathe {
		0%,
		100% {
			opacity: 0.35;
		}
		50% {
			opacity: 0.85;
		}
	}

	/* ============ CHAPITRES ============ */

	.chapter {
		position: relative;
		/* un écran de noir entre les peuples : le silence entre deux syllabes */
		padding: 22vh 0 10vh;
	}
	.vlabel {
		position: absolute;
		top: 24vh;
		left: -1.2rem;
		writing-mode: vertical-rl;
		font-family: Cinzel, Georgia, serif;
		font-size: 0.72rem;
		letter-spacing: 0.5em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.22);
		pointer-events: none;
	}
	@media (max-width: 900px) {
		.vlabel {
			display: none;
		}
	}

	.chapter-head {
		display: flex;
		align-items: baseline;
		gap: 1.4rem;
		margin-bottom: 3rem;
	}
	.index {
		font-size: 0.85rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.2em;
		color: rgba(242, 240, 234, 0.32);
	}
	.chapter-head h2 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 400;
		font-size: clamp(2rem, 4.5vw, 3.2rem);
		letter-spacing: 0.05em;
		color: #f2f0ea;
	}
	.ftag {
		margin: 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 1.15rem;
		color: rgba(242, 240, 234, 0.45);
	}
	.fcount {
		margin-left: auto;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		color: color-mix(in srgb, var(--fc) 70%, #fff);
		opacity: 0.7;
		white-space: nowrap;
	}
	@media (max-width: 700px) {
		.chapter-head {
			flex-wrap: wrap;
		}
		.ftag {
			width: 100%;
		}
	}

	/* ---------- bandeau letterbox ---------- */
	.bandeau {
		position: relative;
		height: 38vh;
		min-height: 240px;
		margin: 0 0 5rem;
		overflow: hidden;
	}
	.bandeau img {
		width: 100%;
		height: 130%;
		margin-top: -8%;
		object-fit: cover;
		object-position: center 25%;
		opacity: 0.55;
		-webkit-mask-image: linear-gradient(90deg, transparent 0, #000 12%, #000 88%, transparent 100%);
		mask-image: linear-gradient(90deg, transparent 0, #000 12%, #000 88%, transparent 100%);
	}
	.shutter {
		position: absolute;
		left: 0;
		right: 0;
		height: 51%;
		background: #0a0a0d;
		transform: scaleY(0);
	}
	.shutter.top {
		top: 0;
		transform-origin: top;
	}
	.shutter.bottom {
		bottom: 0;
		transform-origin: bottom;
	}

	/* ---------- galerie : grille propre, toutes les cartes à la même taille ---------- */

	.galerie {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 3.2rem 1.8rem;
	}
	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		--card-w: min(290px, 100%);
	}
	.cardlink {
		font-size: 0.8rem;
		font-weight: 550;
		letter-spacing: 0.01em;
		text-align: center;
		text-decoration: none;
		color: rgba(242, 240, 234, 0.5);
		transition: color 0.15s ease;
	}
	.cardlink:hover {
		color: #f2f0ea;
	}
	.altchip {
		display: inline-block;
		margin-left: 0.45em;
		padding: 0.1em 0.55em;
		font-size: 0.82em;
		font-weight: 600;
		color: #0a0a0d;
		background: #c9a445;
		border-radius: 999px;
	}
</style>
