<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { cards } from '$lib/cards';
	import { charter } from '$lib/charter';
</script>

<svelte:head>
	<title>{charter.game.name} — Le mur de cartes</title>
	<meta name="description" content={charter.game.tagline} />
</svelte:head>

<header class="hero">
	<h1>Le mur de cartes</h1>
	<p>{charter.game.tagline}</p>
	<p class="count">{cards.length} cartes au catalogue — survole-les.</p>
</header>

<section class="wall">
	{#each cards as card (card.id)}
		<div class="cell">
			<Card {card} />
			<a class="cardlink" href="/card/{card.id}">{card.name}</a>
		</div>
	{/each}
</section>

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
	.count {
		font-size: 0.9rem;
	}

	.wall {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 2.5rem 1.5rem;
		justify-items: center;
	}
	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
		--card-w: min(300px, 100%);
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
