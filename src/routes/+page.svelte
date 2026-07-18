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
	<p class="kicker"><span class="k-diamond">◯</span> Set 01 · {cards.length}/{SET_SIZE} cartes</p>
	<h1>Le<br />Silence</h1>
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
				<span class="tab">{charter.factions[f].sigil} {charter.factions[f].name}</span>
				<span class="rule"></span>
				<span class="fcount">{list.length.toString().padStart(2, '0')}</span>
			</h2>
			<div class="wall">
				{#each entriesFor(f) as e (e.key)}
					<div class="cell">
						<Card card={e.card} />
						<a class="cardlink" href={e.href}>
							{e.card.name}
							{#if e.alt}<span class="altchip">ALT {e.alt}</span>{/if}
						</a>
					</div>
				{/each}
			</div>
		</section>
	{/if}
{/each}

<style>
	/* ---------- hero ---------- */

	.hero {
		margin: 1rem 0 3.4rem;
	}
	.kicker {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin: 0 0 0.6rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.55);
	}
	.k-diamond {
		color: #c9a445;
		font-size: 0.75em;
	}
	h1 {
		margin: 0;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-stretch: 68%;
		font-weight: 800;
		font-size: clamp(3.4rem, 9vw, 6.8rem);
		line-height: 0.88;
		letter-spacing: 0.01em;
		text-transform: uppercase;
		color: #ece8e1;
	}
	.tagline {
		margin: 1.1rem 0 0;
		max-width: 46ch;
		color: rgba(236, 232, 225, 0.65);
	}

	.progress {
		display: flex;
		gap: 5px;
		margin-top: 1.4rem;
		max-width: 420px;
	}
	.seg {
		flex: 1;
		height: 9px;
		background: rgba(236, 232, 225, 0.1);
		clip-path: polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%);
	}
	.seg.on {
		background: #c9a445;
	}

	/* ---------- sections de faction ---------- */

	.faction-block {
		margin-bottom: 3.4rem;
	}
	.faction-block h2 {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0 0 1.6rem;
	}
	.tab {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-stretch: 80%;
		font-size: 1.02rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #0f1923;
		background: color-mix(in srgb, var(--fc) 82%, #fff);
		padding: 0.42rem 1.15rem 0.38rem;
		clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
	}
	.rule {
		flex: 1;
		height: 1px;
		background: color-mix(in srgb, var(--fc) 35%, transparent);
	}
	.fcount {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.9rem;
		font-weight: 700;
		color: color-mix(in srgb, var(--fc) 70%, #fff);
		font-variant-numeric: tabular-nums;
	}

	/* ---------- grille ---------- */

	.wall {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 2.4rem 1.4rem;
	}
	.cell {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		--card-w: min(290px, 100%);
	}
	.cardlink {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		text-decoration: none;
		color: rgba(236, 232, 225, 0.6);
		transition: color 0.15s ease;
	}
	.cardlink:hover {
		color: #ece8e1;
	}
	.altchip {
		display: inline-block;
		margin-left: 0.4em;
		padding: 0.12em 0.5em;
		font-size: 0.85em;
		letter-spacing: 0.14em;
		color: #0f1923;
		background: #ffb454;
		clip-path: polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%);
	}
</style>
