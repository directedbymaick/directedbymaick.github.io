<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { cards, altView } from '$lib/cards';
	import { charter } from '$lib/charter';
	import type { FactionId } from '$lib/types';

	const SET_SIZE = 60;
	const SEGMENTS = 12;

	const factions = Object.keys(charter.factions) as FactionId[];
	const filled = Math.round((cards.length / SET_SIZE) * SEGMENTS);

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
</script>

<svelte:head>
	<title>{charter.game.name} — Le Silence</title>
	<meta name="description" content={charter.game.tagline} />
</svelte:head>

<header class="hero">
	<div class="halo" aria-hidden="true"></div>
	<p class="kicker">Set 01 · {cards.length}/{SET_SIZE} cartes</p>
	<h1>Le Silence</h1>
	<p class="tagline">{charter.game.tagline}</p>
	<div class="progress" role="img" aria-label="Progression du set : {cards.length} cartes sur {SET_SIZE}">
		{#each Array(SEGMENTS) as _, i (i)}
			<span class="seg" class:on={i < filled}></span>
		{/each}
	</div>
</header>

{#each factions as f (f)}
	{@const list = byFaction(f)}
	{#if list.length > 0}
		<section class="faction-block">
			<h2 style="--fc: {charter.factions[f].color}">
				<span class="orn"></span>
				<span class="ftitle"><span class="fsigil">{charter.factions[f].sigil}</span> {charter.factions[f].name}</span>
				<span class="orn"></span>
			</h2>
			<p class="fcount">{list.length} carte{list.length > 1 ? 's' : ''}</p>
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

<style>
	/* ---------- hero : le titre sous le halo ---------- */

	.hero {
		position: relative;
		margin: 2.5rem 0 4.5rem;
		text-align: center;
	}
	.halo {
		position: absolute;
		left: 50%;
		top: 46%;
		transform: translate(-50%, -50%);
		width: min(420px, 80vw);
		aspect-ratio: 1;
		border-radius: 50%;
		border: 1px solid rgba(201, 164, 69, 0.35);
		box-shadow:
			0 0 60px rgba(201, 164, 69, 0.12),
			inset 0 0 60px rgba(201, 164, 69, 0.07);
		pointer-events: none;
	}
	.kicker {
		margin: 0 0 1rem;
		font-family: Cinzel, Georgia, serif;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.34em;
		text-transform: uppercase;
		color: rgba(236, 229, 211, 0.55);
	}
	h1 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(3rem, 8vw, 5.8rem);
		line-height: 1.04;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #f0e8d6;
		text-shadow: 0 0 40px rgba(201, 164, 69, 0.25);
	}
	.tagline {
		margin: 1.1rem 0 0;
		font-style: italic;
		font-size: 1.25rem;
		color: rgba(236, 229, 211, 0.65);
	}

	.progress {
		display: flex;
		justify-content: center;
		gap: 6px;
		margin: 1.8rem auto 0;
		max-width: 380px;
	}
	.seg {
		flex: 1;
		height: 3px;
		border-radius: 2px;
		background: rgba(236, 229, 211, 0.12);
	}
	.seg.on {
		background: #c9a445;
	}

	/* ---------- sections de peuple ---------- */

	.faction-block {
		margin-bottom: 4.2rem;
	}
	.faction-block h2 {
		display: flex;
		align-items: center;
		gap: 1.4rem;
		margin: 0 0 0.3rem;
	}
	.orn {
		flex: 1;
		height: 1px;
		background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--fc) 45%, transparent));
	}
	.orn:last-child {
		background: linear-gradient(270deg, transparent, color-mix(in srgb, var(--fc) 45%, transparent));
	}
	.ftitle {
		font-family: Cinzel, Georgia, serif;
		font-weight: 600;
		font-size: 1.25rem;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--fc) 72%, #fff);
	}
	.fsigil {
		color: var(--fc);
		margin-right: 0.2rem;
	}
	.fcount {
		margin: 0 0 1.8rem;
		text-align: center;
		font-style: italic;
		font-size: 0.98rem;
		color: rgba(236, 229, 211, 0.42);
	}

	/* ---------- grille ---------- */

	.wall {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 2.6rem 1.4rem;
	}
	.cell {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.9rem;
		--card-w: min(290px, 100%);
	}
	.cardlink {
		font-family: Cinzel, Georgia, serif;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		text-align: center;
		text-decoration: none;
		color: rgba(236, 229, 211, 0.6);
		transition: color 0.15s ease;
	}
	.cardlink:hover {
		color: #c9a445;
	}
	.altchip {
		display: inline-block;
		margin-left: 0.45em;
		padding: 0.1em 0.6em;
		font-size: 0.85em;
		letter-spacing: 0.14em;
		color: #0c0a13;
		background: #c9a445;
		border-radius: 999px;
	}
</style>
