<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/Card.svelte';
	import { cards, altView } from '$lib/cards';
	import { charter } from '$lib/charter';
	import type { FactionId } from '$lib/types';

	const SET_SIZE = 60;

	const factions = Object.keys(charter.factions) as FactionId[];
	const pct = Math.round((cards.length / SET_SIZE) * 100);

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

	let container: HTMLElement;

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let ctx: { revert: () => void } | undefined;
		(async () => {
			const { gsap } = await import('gsap');
			const { ScrollTrigger } = await import('gsap/ScrollTrigger');
			gsap.registerPlugin(ScrollTrigger);
			ctx = gsap.context(() => {
				gsap.from('.hero > *', {
					autoAlpha: 0,
					y: 26,
					duration: 0.9,
					ease: 'power3.out',
					stagger: 0.09
				});
				ScrollTrigger.batch('.cell', {
					start: 'top 90%',
					once: true,
					onEnter: (els) =>
						gsap.fromTo(
							els,
							{ autoAlpha: 0, y: 34 },
							{ autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07 }
						)
				});
				gsap.set('.cell', { autoAlpha: 0 });
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
	<header class="hero">
		<p class="kicker">Set 01</p>
		<h1>Le Silence</h1>
		<p class="tagline">{charter.game.tagline}</p>
		<div class="meter" role="img" aria-label="Progression du set : {cards.length} cartes sur {SET_SIZE}">
			<span class="meter-fill" style="width: {pct}%"></span>
		</div>
		<p class="meter-label">{cards.length} / {SET_SIZE} cartes</p>
	</header>

	{#each factions as f (f)}
		{@const list = byFaction(f)}
		{#if list.length > 0}
			<section class="faction-block">
				<header class="fhead" style="--fc: {charter.factions[f].color}">
					<h2><span class="fsigil">{charter.factions[f].sigil}</span> {charter.factions[f].name}</h2>
					<span class="fcount">{list.length} carte{list.length > 1 ? 's' : ''}</span>
				</header>
				<div class="wall">
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
	/* ---------- hero ---------- */

	.hero {
		position: relative;
		padding: 7rem 0 5.5rem;
		text-align: center;
	}
	/* l'auréole : une ellipse penchée qui flotte au-dessus du titre, comme sur une tête */
	.hero::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 4.2rem;
		width: min(230px, 46vw);
		height: 54px;
		transform: translateX(-50%) rotate(-7deg);
		border-radius: 50%;
		border: 2px solid rgba(232, 200, 118, 0.75);
		border-bottom-color: rgba(232, 200, 118, 0.2);
		filter: blur(0.6px) drop-shadow(0 0 22px rgba(201, 164, 69, 0.55));
		pointer-events: none;
	}
	/* la lumière qu'elle projette, très diffuse */
	.hero::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 30%;
		transform: translate(-50%, -50%);
		width: min(680px, 95vw);
		height: 320px;
		background: radial-gradient(50% 50% at 50% 50%, rgba(201, 164, 69, 0.1), transparent 70%);
		pointer-events: none;
	}
	.kicker {
		margin: 0 0 1.2rem;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.4);
	}
	h1 {
		margin: 0;
		font-size: clamp(3.6rem, 9vw, 7rem);
		font-weight: 800;
		letter-spacing: -0.035em;
		line-height: 1;
		background: linear-gradient(180deg, #ffffff 20%, #e8ddba 75%, #c9a445 130%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.tagline {
		margin: 1.6rem 0 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 1.4rem;
		color: rgba(242, 240, 234, 0.55);
	}
	.meter {
		width: min(280px, 70vw);
		height: 2px;
		margin: 2.6rem auto 0;
		border-radius: 2px;
		background: rgba(242, 240, 234, 0.1);
		overflow: hidden;
	}
	.meter-fill {
		display: block;
		height: 100%;
		border-radius: 2px;
		background: #c9a445;
	}
	.meter-label {
		margin: 0.7rem 0 0;
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
		color: rgba(242, 240, 234, 0.38);
	}

	/* ---------- sections ---------- */

	.faction-block {
		margin-bottom: 5rem;
	}
	.fhead {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding-bottom: 0.9rem;
		margin-bottom: 2.2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}
	.fhead h2 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 650;
		letter-spacing: 0.01em;
	}
	.fsigil {
		color: var(--fc);
		margin-right: 0.35rem;
	}
	.fcount {
		font-size: 0.82rem;
		color: rgba(242, 240, 234, 0.38);
		font-variant-numeric: tabular-nums;
	}

	/* ---------- grille ---------- */

	.wall {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 3rem 1.6rem;
	}
	.cell {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.95rem;
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
