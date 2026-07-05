<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { cards } from '$lib/cards';
	import { charter } from '$lib/charter';
	import type { CardData, FactionId, FoilPreset, Rarity } from '$lib/types';

	// Le Lab est la charte design incarnée : on règle la matière en live,
	// puis on reporte les choix dans charter.json / les presets.

	const foilPresets: FoilPreset[] = ['mat', 'holo', 'prismatic', 'galaxy', 'prism'];
	const rarities = Object.keys(charter.rarities) as Rarity[];
	const factions = Object.keys(charter.factions) as FactionId[];

	let base = $state(structuredClone($state.snapshot(cards[0]) as CardData));
	let cardW = $state(380);

	function loadCard(id: string) {
		const found = cards.find((c) => c.id === id);
		if (found) base = structuredClone($state.snapshot(found) as CardData);
	}

	function setRarity(r: Rarity) {
		base.rarity = r;
		base.gene.foilPreset = charter.rarities[r].foilPreset;
	}

	function reroll() {
		base.gene.seed = Math.floor(Math.random() * 1_000_000);
	}
</script>

<svelte:head>
	<title>Lab — {charter.game.name}</title>
</svelte:head>

<h1>Lab</h1>
<p class="hint">
	Règle la matière en live. Ce que tu valides ici devient la charte (presets par rareté).
</p>

<div class="lab" style="--card-w: {cardW}px">
	<div class="preview">
		<Card card={base} />
	</div>

	<form class="controls" onsubmit={(e) => e.preventDefault()}>
		<label>
			Carte de départ
			<select onchange={(e) => loadCard(e.currentTarget.value)}>
				{#each cards as c (c.id)}
					<option value={c.id} selected={c.id === base.id}>{c.name}</option>
				{/each}
			</select>
		</label>

		<label>
			Rareté (applique le preset de la charte)
			<select
				value={base.rarity}
				onchange={(e) => setRarity(e.currentTarget.value as Rarity)}
			>
				{#each rarities as r (r)}
					<option value={r}>{charter.rarities[r].name}</option>
				{/each}
			</select>
		</label>

		<label>
			Foil (override manuel)
			<select bind:value={base.gene.foilPreset}>
				{#each foilPresets as f (f)}
					<option value={f}>{f}</option>
				{/each}
			</select>
		</label>

		<label>
			Faction (couleur du cadre)
			<select bind:value={base.faction}>
				{#each factions as f (f)}
					<option value={f}>{charter.factions[f].name}</option>
				{/each}
			</select>
		</label>

		<fieldset>
			<legend>Palette (le gène qui teinte le foil)</legend>
			{#each base.gene.palette as _, i (i)}
				<input type="color" bind:value={base.gene.palette[i]} />
			{/each}
		</fieldset>

		<fieldset>
			<legend>Accent (l'unique couleur saturée — conduits, Synchro, glow)</legend>
			<input type="color" bind:value={base.gene.accent} />
		</fieldset>

		<label>
			Seed <code>{base.gene.seed}</code>
			<button type="button" onclick={reroll}>Relancer le seed</button>
		</label>

		<label>
			Largeur de carte : {cardW}px
			<input type="range" min="220" max="560" bind:value={cardW} />
		</label>

		<label>
			Nom
			<input type="text" bind:value={base.name} />
		</label>

		<label>
			Texte
			<textarea rows="2" bind:value={base.text}></textarea>
		</label>

		<details>
			<summary>card.json</summary>
			<pre>{JSON.stringify(base, null, 2)}</pre>
		</details>
	</form>
</div>

<style>
	h1 {
		font-family: Georgia, serif;
		margin-bottom: 0.2rem;
	}
	.hint {
		color: #b9b5a9;
		margin-top: 0;
	}

	.lab {
		display: flex;
		flex-wrap: wrap;
		gap: 3rem;
		align-items: flex-start;
		padding-top: 1rem;
	}
	.preview {
		position: sticky;
		top: 1.5rem;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 280px;
		max-width: 420px;
		flex: 1;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.9rem;
		color: #b9b5a9;
	}
	label.row {
		flex-direction: row;
		align-items: center;
		gap: 0.6rem;
	}
	select,
	input[type='text'],
	textarea,
	button {
		background: #1a1c26;
		color: #e8e6df;
		border: 1px solid #2c2f3d;
		border-radius: 6px;
		padding: 0.45rem 0.6rem;
		font: inherit;
	}
	button {
		cursor: pointer;
		align-self: flex-start;
	}
	button:hover {
		border-color: #4a4f66;
	}
	fieldset {
		border: 1px solid #2c2f3d;
		border-radius: 6px;
		display: flex;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: #b9b5a9;
	}
	input[type='color'] {
		width: 3rem;
		height: 2.2rem;
		border: none;
		background: none;
		cursor: pointer;
	}
	pre {
		background: #14151d;
		border: 1px solid #2c2f3d;
		border-radius: 6px;
		padding: 0.8rem;
		font-size: 0.75rem;
		overflow-x: auto;
	}
	code {
		color: #e8e6df;
	}
</style>
