<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { charter } from '$lib/charter';

	let { data } = $props();
	const card = $derived(data.card);
	const rarityDef = $derived(charter.rarities[card.rarity]);
	const faction = $derived(charter.factions[card.faction]);
</script>

<svelte:head>
	<title>{card.name} — {charter.game.name}</title>
	<meta name="description" content={card.text || card.flavor || card.name} />
	<meta property="og:title" content="{card.name} — {rarityDef.name} {faction?.name ?? card.faction}" />
	<meta property="og:description" content={card.text || card.flavor || ''} />
	<meta property="og:image" content={card.art} />
	<meta property="og:type" content="website" />
</svelte:head>

<section class="stage">
	<div class="showcase">
		<Card {card} />
	</div>

	<aside class="meta" style="--fc: {faction?.color ?? '#8892a6'}">
		<p class="role">
			<span class="r-sigil">{faction?.sigil}</span>
			{faction?.name}
			<span class="r-sep">//</span>
			{rarityDef.name}
		</p>
		<h1>{card.name}</h1>

		<div class="statline">
			<span class="chip">Coût {card.cost}</span>
			{#if card.kind !== 'protocole'}
				<span class="chip">{card.attack} ATQ</span>
				<span class="chip">{card.health} INT</span>
			{:else}
				<span class="chip">Protocole</span>
			{/if}
			{#if card.cell}
				<span class="chip cell">{card.cell}</span>
			{/if}
		</div>

		{#if card.text}
			<div class="block">
				<p class="block-label">Effet</p>
				<p class="block-body">{card.text}</p>
			</div>
		{/if}
		{#if card.synchro}
			<div class="block synchro">
				<p class="block-label">⟟ Synchro ({card.synchro.cost})</p>
				<p class="block-body">{card.synchro.text}</p>
			</div>
		{/if}
		{#if card.flavor}
			<p class="flavor">« {card.flavor} »</p>
		{/if}

		<p class="gene">
			Gène — foil <code>{card.gene.foilPreset}</code> · seed <code>{card.gene.seed}</code> ·
			{#each card.gene.palette as c, i (i)}
				<span class="swatch" style="background: {c}" title={c}></span>
			{/each}
		</p>

		<a class="back" href="/">◄ Retour au mur</a>
	</aside>
</section>

<style>
	.stage {
		display: flex;
		flex-wrap: wrap;
		gap: 3.4rem;
		align-items: center;
		justify-content: center;
		padding-top: 1.4rem;
	}
	.showcase {
		--card-w: min(380px, 90vw);
	}

	.meta {
		max-width: 380px;
		min-width: 300px;
	}
	.role {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.3rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--fc) 75%, #fff);
	}
	.r-sigil {
		color: var(--fc);
	}
	.r-sep {
		color: rgba(236, 232, 225, 0.3);
	}
	h1 {
		margin: 0 0 1.1rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-stretch: 70%;
		font-weight: 800;
		font-size: clamp(2.4rem, 5vw, 3.6rem);
		line-height: 0.92;
		text-transform: uppercase;
		color: #ece8e1;
	}

	.statline {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.4rem;
	}
	.chip {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.74rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		padding: 0.34rem 0.7rem;
		background: rgba(236, 232, 225, 0.07);
		clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
		color: rgba(236, 232, 225, 0.85);
	}
	.chip.cell {
		background: color-mix(in srgb, var(--fc) 18%, transparent);
		color: color-mix(in srgb, var(--fc) 80%, #fff);
	}

	.block {
		margin-bottom: 1rem;
		padding: 0.85rem 1rem;
		background: rgba(236, 232, 225, 0.05);
		border-left: 3px solid rgba(236, 232, 225, 0.25);
	}
	.block.synchro {
		border-left-color: var(--fc);
		background: color-mix(in srgb, var(--fc) 8%, transparent);
	}
	.block-label {
		margin: 0 0 0.3rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.5);
	}
	.block.synchro .block-label {
		color: color-mix(in srgb, var(--fc) 80%, #fff);
	}
	.block-body {
		margin: 0;
		line-height: 1.45;
	}

	.flavor {
		margin: 1.2rem 0;
		font-style: italic;
		color: rgba(236, 232, 225, 0.55);
	}

	.gene {
		font-size: 0.8rem;
		color: rgba(236, 232, 225, 0.4);
	}
	.gene code {
		color: rgba(236, 232, 225, 0.65);
	}
	.swatch {
		display: inline-block;
		width: 0.85em;
		height: 0.85em;
		rotate: 45deg;
		margin-left: 0.45em;
		border: 1px solid rgba(236, 232, 225, 0.25);
	}

	.back {
		display: inline-block;
		margin-top: 1.6rem;
		padding: 0.6rem 1.3rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		text-decoration: none;
		color: #0f1923;
		background: #ece8e1;
		clip-path: polygon(9px 0, 100% 0, calc(100% - 9px) 100%, 0 100%);
		transition: background 0.15s ease;
	}
	.back:hover {
		background: #c23b4e;
		color: #ece8e1;
	}
</style>
