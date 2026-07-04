<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { cards } from '$lib/cards';
	import { charter } from '$lib/charter';
	import type { FactionId } from '$lib/types';

	const SET_SIZE = 60;
	const SET_NAME = 'Set 01 — Zones Aveugles';

	const factions = Object.keys(charter.factions) as FactionId[];

	function byFaction(f: FactionId) {
		return cards
			.filter((c) => c.faction === f)
			.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
	}
</script>

<svelte:head>
	<title>{charter.game.name} — Le mur de cartes</title>
	<meta name="description" content={charter.game.tagline} />
</svelte:head>

<header class="hero">
	<h1>Le mur de cartes</h1>
	<p>{charter.game.tagline}</p>
	<p class="setline">
		<span class="setname">{SET_NAME}</span>
		<span class="bar"><span class="fill" style="width: {(cards.length / SET_SIZE) * 100}%"></span></span>
		<span class="count">{cards.length}/{SET_SIZE}</span>
	</p>
</header>

{#each factions as f (f)}
	{@const list = byFaction(f)}
	{#if list.length > 0}
		<section class="faction-block">
			<h2 style="--fc: {charter.factions[f].color}">
				<span class="sigil">{charter.factions[f].sigil}</span>
				{charter.factions[f].name}
				<span class="fcount">{list.length}</span>
			</h2>
			<div class="wall">
				{#each list as card (card.id)}
					<div class="cell">
						<Card {card} />
						<a class="cardlink" href="/card/{card.id}">{card.name}</a>
					</div>
				{/each}
			</div>
		</section>
	{/if}
{/each}

<style>
	.hero {
		margin-bottom: 2.5rem;
	}
	.hero h1 {
		font-family: Georgia, serif;
		font-size: 2.2rem;
		margin: 0 0 0.4rem;
	}
	.hero p {
		margin: 0.2rem 0;
		color: #b9b5a9;
	}
	.setline {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin-top: 0.9rem !important;
		font-size: 0.9rem;
	}
	.setname {
		font-family: Bahnschrift, 'Segoe UI', sans-serif;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #e8e6df;
	}
	.bar {
		flex: 0 1 220px;
		height: 6px;
		border-radius: 3px;
		background: #22242e;
		overflow: hidden;
	}
	.fill {
		display: block;
		height: 100%;
		border-radius: 3px;
		background: linear-gradient(90deg, #3d8fd6, #77c2ea);
	}
	.count {
		color: #8d8a80;
		font-variant-numeric: tabular-nums;
	}

	.faction-block {
		margin-bottom: 3rem;
	}
	.faction-block h2 {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		font-family: Bahnschrift, 'Segoe UI', sans-serif;
		font-size: 1.15rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--fc) 75%, #fff);
		border-bottom: 1px solid color-mix(in srgb, var(--fc) 35%, transparent);
		padding-bottom: 0.5rem;
		margin: 0 0 1.4rem;
	}
	.faction-block .sigil {
		color: var(--fc);
	}
	.fcount {
		margin-left: auto;
		font-size: 0.85rem;
		color: #8d8a80;
		letter-spacing: 0;
	}

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
		gap: 0.8rem;
		--card-w: min(290px, 100%);
	}
	.cardlink {
		font-size: 0.9rem;
		text-decoration: none;
		opacity: 0.7;
	}
	.cardlink:hover {
		opacity: 1;
		text-decoration: underline;
	}
</style>
