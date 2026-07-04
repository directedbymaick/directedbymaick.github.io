<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { charter } from '$lib/charter';

	let { data } = $props();
	const card = $derived(data.card);
	const rarityName = $derived(charter.rarities[card.rarity].name);
	const factionName = $derived(charter.factions[card.faction]?.name ?? card.faction);
</script>

<svelte:head>
	<title>{card.name} — {charter.game.name}</title>
	<meta name="description" content={card.text} />
	<meta property="og:title" content="{card.name} — {rarityName} {factionName}" />
	<meta property="og:description" content={card.text} />
	<meta property="og:image" content={card.art} />
	<meta property="og:type" content="website" />
</svelte:head>

<section class="stage">
	<Card {card} />
	<aside class="meta">
		<h1>{card.name}</h1>
		<p class="tags">{factionName} · {rarityName} · coût {card.cost} · {card.attack}/{card.health}</p>
		<p>{card.text}</p>
		{#if card.flavor}<p class="flavor">« {card.flavor} »</p>{/if}
		<p class="gene">
			gène : foil <code>{card.gene.foilPreset}</code> · seed <code>{card.gene.seed}</code> ·
			palette
			{#each card.gene.palette as c (c)}
				<span class="swatch" style="background: {c}" title={c}></span>
			{/each}
		</p>
		<a href="/">← retour au mur</a>
	</aside>
</section>

<style>
	.stage {
		display: flex;
		flex-wrap: wrap;
		gap: 3rem;
		align-items: center;
		justify-content: center;
		padding-top: 1rem;
		--card-w: min(380px, 90vw);
	}
	.meta {
		max-width: 340px;
	}
	.meta h1 {
		font-family: Georgia, serif;
		margin: 0 0 0.3rem;
	}
	.tags {
		color: #b9b5a9;
		font-size: 0.9rem;
	}
	.flavor {
		font-style: italic;
		color: #b9b5a9;
	}
	.gene {
		font-size: 0.85rem;
		color: #8d8a80;
	}
	.gene code {
		color: #b9b5a9;
	}
	.swatch {
		display: inline-block;
		width: 0.9em;
		height: 0.9em;
		border-radius: 3px;
		margin-left: 0.3em;
		vertical-align: -0.1em;
		border: 1px solid rgba(255, 255, 255, 0.25);
	}
</style>
