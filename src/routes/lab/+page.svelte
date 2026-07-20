<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { cards } from '$lib/cards';
	import { charter } from '$lib/charter';
	import type { CardData, FactionId, FoilPreset, Rarity } from '$lib/types';

	// Le Lab est la charte design incarnée : on règle la matière en live,
	// puis on reporte les choix dans charter.json / les presets.

	// Noms lisibles des foils. Deux familles : SIMEY (recettes simeydotme) et
	// MAISON (couches .foil-a/b d'origine Expelled).
	const foilLabels: Record<FoilPreset, string> = {
		// simey
		mat: 'Satin mat',
		regular: 'Holographique',
		cosmos: 'Cosmique',
		amazing: 'Cristallin',
		radiant: 'Radiant',
		secret: 'Prismatique',
		// maison (anciens)
		holo: 'Holo maison',
		prismatic: 'Prismatique maison',
		galaxy: 'Galaxie maison',
		prism: 'Prisme maison'
	};
	// Tous les foils (mode labo) : simey puis maison.
	const allFoils: FoilPreset[] = [
		'mat',
		'regular',
		'amazing',
		'cosmos',
		'secret',
		'radiant',
		'holo',
		'prismatic',
		'galaxy',
		'prism'
	];
	// Foils recommandés PAR rareté (le 1er = le foil par défaut de la charte).
	// Échelle premium : mat → holo → cosmique → radiant → prismatique.
	const rarityFoils: Record<Rarity, FoilPreset[]> = {
		common: ['mat'],
		rare: ['regular'],
		epic: ['cosmos', 'amazing'],
		legendary: ['radiant', 'cosmos'],
		prism: ['secret', 'radiant']
	};

	const rarities = Object.keys(charter.rarities) as Rarity[];
	const factions = Object.keys(charter.factions) as FactionId[];

	let base = $state(structuredClone($state.snapshot(cards[0]) as CardData));
	let cardW = $state(380);
	// mode labo : expose TOUS les foils (simey + maison), hors filtre de rareté
	let showAllFoils = $state(false);

	const availableFoils = $derived(rarityFoils[base.rarity] ?? ['mat']);
	const foilOptions = $derived(showAllFoils ? allFoils : availableFoils);
	// en mode filtré, le foil reste cohérent avec la rareté ; en mode labo, libre
	$effect(() => {
		if (!showAllFoils && !availableFoils.includes(base.gene.foilPreset)) {
			base.gene.foilPreset = availableFoils[0];
		}
	});

	function loadCard(id: string) {
		const found = cards.find((c) => c.id === id);
		if (found) base = structuredClone($state.snapshot(found) as CardData);
	}

	function setRarity(r: Rarity) {
		base.rarity = r;
		base.gene.foilPreset = rarityFoils[r][0];
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

		<div class="field">
			<span class="field-label">Rareté</span>
			<div class="chips">
				{#each rarities as r (r)}
					<button
						type="button"
						class="chip"
						class:on={base.rarity === r}
						onclick={() => setRarity(r)}
					>
						{charter.rarities[r].name}
					</button>
				{/each}
			</div>
		</div>

		<div class="field">
			<span class="field-label">
				Foil {showAllFoils ? '— tous (labo)' : availableFoils.length > 1 ? '— variantes de cette rareté' : ''}
			</span>
			{#if foilOptions.length > 1}
				<select bind:value={base.gene.foilPreset}>
					{#each foilOptions as f (f)}
						<option value={f}>{foilLabels[f]}</option>
					{/each}
				</select>
			{:else}
				<span class="foil-static">{foilLabels[base.gene.foilPreset]}</span>
			{/if}
			<label class="row toggle">
				<input type="checkbox" bind:checked={showAllFoils} />
				Tous les foils (simey + maison)
			</label>
		</div>

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
			<legend>Accent (la couleur-âme — halo, Prononcer, glow)</legend>
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
	/* Rareté en pastilles : on voit les combinaisons d'un coup d'œil */
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}
	.field-label {
		font-size: 0.9rem;
		color: #b9b5a9;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.chip {
		align-self: auto;
		padding: 0.4rem 0.85rem;
		border-radius: 999px;
		background: #1a1c26;
		border: 1px solid #2c2f3d;
		color: #b9b5a9;
		font-size: 0.86rem;
		font-weight: 550;
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			background 0.15s ease;
	}
	.chip:hover {
		color: #e8e6df;
	}
	.chip.on {
		background: rgba(213, 178, 94, 0.12);
		border-color: rgba(213, 178, 94, 0.6);
		color: #f0e6cf;
		box-shadow: 0 0 14px rgba(213, 178, 94, 0.18);
	}
	.foil-static {
		align-self: flex-start;
		padding: 0.45rem 0.6rem;
		border: 1px solid #2c2f3d;
		border-radius: 6px;
		background: #14161e;
		color: #8f8b80;
		font-size: 0.9rem;
	}
	.toggle {
		font-size: 0.8rem;
		color: #8f8b80;
	}
	.toggle input {
		width: auto;
		accent-color: #d5b25e;
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
