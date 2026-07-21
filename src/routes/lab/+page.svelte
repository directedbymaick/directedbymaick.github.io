<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/Card.svelte';
	import { cards } from '$lib/cards';
	import { charter } from '$lib/charter';
	import { fullArtView, eligibleFullArt } from '$lib/gacha';
	import type { CardData, FactionId, FoilPreset, Rarity } from '$lib/types';

	// Le Lab est la charte design incarnée : on règle la matière en live,
	// puis on reporte les choix dans charter.json / les presets.

	// Noms lisibles des foils — recettes verbatim de simeydotme.
	const foilLabels: Record<FoilPreset, string> = {
		mat: 'Satin mat (aucun)',
		regular: 'Holographique',
		amazing: 'Cristallin',
		cosmos: 'Cosmique',
		galerie: 'Galerie',
		showcase: 'Illustration spéciale'
	};
	// Tous les foils (mode labo).
	const allFoils: FoilPreset[] = [
		'mat',
		'regular',
		'amazing',
		'cosmos',
		'galerie',
		'showcase'
	];
	// Foils recommandés PAR rareté (le 1er = le foil par défaut de la charte).
	// Échelle premium : mat → holo → cristallin → cosmique → galerie.
	const rarityFoils: Record<Rarity, FoilPreset[]> = {
		common: ['mat', 'showcase'],
		rare: ['regular', 'showcase'],
		epic: ['cosmos', 'amazing', 'showcase'],
		legendary: ['galerie', 'cosmos', 'showcase'],
		prism: ['galerie', 'cosmos', 'showcase']
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

	// Version Full Art (le chase) : dispo pour les cartes qui ont un détourage.
	let showFullArt = $state(false);
	const hasFullArt = $derived(eligibleFullArt(base));
	// snapshot : fullArtView fait un structuredClone → il faut un objet simple, pas le proxy $state
	const preview = $derived(
		showFullArt && hasFullArt
			? {
					...fullArtView($state.snapshot(base) as CardData),
					// en full art on prévisualise le foil choisi dans le Lab, pas le défaut
					gene: { ...$state.snapshot(base).gene }
				}
			: base
	);

	/* ---------- validation : le Lab écrit dans cards/<id>.json ----------
	   Outil d'auteur, donc local uniquement (cf. src/routes/api/card/+server.ts).
	   « Valider » fixe la composition OFFICIELLE : soit celle de la carte de base,
	   soit — si le mode Full Art est actif — le foil de sa vue full art.
	   « Valider comme variante » ajoute une finition SUPPLÉMENTAIRE, qui apparaîtra
	   en plus au Registre. Elle n'est proposée qu'une fois la base validée. */
	let statut = $state('');
	let enCours = $state(false);
	/* cartes dont la composition de base a déjà été validée : en session, ou déjà
	   porteuses de variantes (donc validées lors d'un passage précédent) */
	let valides = $state(new Set<string>(cards.filter((c) => c.variants?.length).map((c) => c.id)));

	/** mémorise les cartes validées : l'écriture recharge la page (HMR), sans quoi
	    le bouton « variante » redeviendrait inactif juste après une validation */
	function marquerValide(id: string) {
		valides = new Set(valides).add(id);
		sessionStorage.setItem('lab-valides', JSON.stringify([...valides]));
	}
	const baseValidee = $derived(valides.has(base.id));
	/* la fiche telle qu'elle est SUR LE DISQUE (pas le brouillon en cours d'édition) :
	   c'est elle qui fait foi pour l'historique de validation. `cards` est relu à
	   chaque rechargement, donc la liste se met à jour après chaque validation. */
	const officiel = $derived(cards.find((c) => c.id === base.id));
	const variantesActuelles = $derived(officiel?.variants ?? []);

	/** Toutes les versions officielles de la carte, full art comprises. */
	const versionsOfficielles = $derived([
		{ role: 'Base', foil: officiel?.gene.foilPreset, fullArt: false, defaut: false },
		...(eligibleFullArt(base)
			? [
					{
						role: 'Full Art',
						foil: officiel?.fullArtFoil ?? (officiel?.cutout ? 'showcase' : 'galerie'),
						fullArt: true,
						// pas encore validée explicitement : on affiche le défaut
						defaut: !officiel?.fullArtFoil
					}
				]
			: []),
		...variantesActuelles.map((v) => ({
			role: 'Variante',
			foil: v.foilPreset,
			fullArt: !!v.fullArt,
			defaut: false
		}))
	]);

	async function envoyer(patch: Record<string, unknown>, message: string) {
		enCours = true;
		statut = '';
		try {
			const r = await fetch('/api/card', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: base.id, patch })
			});
			if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
			statut = message;
			/* écrire dans cards/*.json fait recharger la page (HMR) : on mémorise la
			   carte en cours et le message pour les retrouver après le rechargement,
			   sinon on repart sur la première carte sans savoir si ça a marché */
			sessionStorage.setItem('lab-retour', JSON.stringify({ id: base.id, statut: message }));
			return true;
		} catch (e) {
			statut = `Échec : ${e instanceof Error ? e.message : e}`;
			return false;
		} finally {
			enCours = false;
		}
	}

	async function valider() {
		const b = $state.snapshot(base) as CardData;
		if (showFullArt && hasFullArt) {
			if (await envoyer({ fullArtFoil: b.gene.foilPreset }, `Full Art officialisée : ${foilLabels[b.gene.foilPreset]}`))
				marquerValide(b.id);
			return;
		}
		const patch = {
			name: b.name,
			text: b.text,
			flavor: b.flavor ?? '',
			rarity: b.rarity,
			faction: b.faction,
			gene: {
				foilPreset: b.gene.foilPreset,
				palette: b.gene.palette,
				accent: b.gene.accent,
				seed: b.gene.seed
			}
		};
		if (await envoyer(patch, `Composition officialisée : ${foilLabels[b.gene.foilPreset]}`))
			marquerValide(b.id);
	}

	async function validerVariante() {
		const b = $state.snapshot(base) as CardData;
		await envoyer(
			{ addVariant: { foilPreset: b.gene.foilPreset, fullArt: showFullArt && hasFullArt } },
			`Variante ajoutée : ${foilLabels[b.gene.foilPreset]}${showFullArt && hasFullArt ? ' (Full Art)' : ''}`
		);
	}

	/* restauration après le rechargement provoqué par l'écriture.
	   onMount et pas $effect : on modifie l'état (carte courante, statut), ce que
	   Svelte refuse dans un effet — et c'est de toute façon un one-shot au montage. */
	onMount(() => {
		const memo = sessionStorage.getItem('lab-valides');
		if (memo) {
			try {
				valides = new Set([...valides, ...(JSON.parse(memo) as string[])]);
			} catch {
				/* mémo illisible : on repart de la liste déduite des fiches */
			}
		}
		const brut = sessionStorage.getItem('lab-retour');
		if (!brut) return;
		sessionStorage.removeItem('lab-retour');
		try {
			const { id, statut: msg } = JSON.parse(brut);
			if (id) loadCard(id);
			statut = msg ?? '';
		} catch {
			/* rien à restaurer */
		}
	});

	async function viderVariantes() {
		await envoyer({ clearVariants: true }, 'Variantes supprimées');
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
		<Card card={preview} fullArt={showFullArt && hasFullArt} />
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

		{#if hasFullArt}
			<label class="row toggle fullart-toggle">
				<input type="checkbox" bind:checked={showFullArt} />
				Version Full Art (le chase — cadre prismatique)
			</label>
		{/if}

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
				Tous les foils (hors filtre de rareté)
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

		<label>
			Citation (la ligne de lore, en italique sous l'effet)
			<textarea rows="2" bind:value={base.flavor}></textarea>
		</label>

		<div class="valider">
			<button type="button" class="primaire" disabled={enCours} onclick={valider}>
				{showFullArt && hasFullArt ? 'Valider la Full Art' : 'Valider la composition'}
			</button>
			<button type="button" disabled={enCours || !baseValidee} onclick={validerVariante}>
				Valider comme variante
			</button>
			{#if variantesActuelles.length}
				<button type="button" class="discret" disabled={enCours} onclick={viderVariantes}>
					Vider les variantes
				</button>
			{/if}
			<p class="aide">
				{#if !baseValidee}
					Valide d'abord la composition de base : la variante s'ajoute par-dessus.
				{:else}
					Une variante s'ajoute au Registre à côté de la version de base.
				{/if}
			</p>

			<!-- historique : ce qui est réellement écrit dans la fiche, quel que soit
			     le mode dans lequel on se trouve -->
			<ul class="officiel">
				<li class="titre">Versions officielles — {officiel?.name ?? base.name}</li>
				{#each versionsOfficielles as v, i (i)}
					<li>
						<span class="role" class:fa={v.fullArt}
						>{v.role}{v.fullArt && v.role !== 'Full Art' ? ' · Full Art' : ''}</span
					>
						<span class="quoi">{v.foil ? foilLabels[v.foil] : '—'}</span>
						{#if v.defaut}<span class="dft">par défaut</span>{/if}
					</li>
				{/each}
			</ul>
			{#if statut}
				<p class="statut" class:erreur={statut.startsWith('Échec')}>{statut}</p>
			{/if}
		</div>

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
	.valider {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		padding: 0.9rem;
		border: 1px solid #2c2f3d;
		border-radius: 10px;
		background: #14161e;
	}
	.valider button {
		align-self: auto;
	}
	.valider .primaire {
		background: rgba(213, 178, 94, 0.14);
		border-color: rgba(213, 178, 94, 0.55);
		color: #f0e6cf;
	}
	.valider .discret {
		background: transparent;
		color: #8f8b80;
	}
	.valider button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.officiel {
		width: 100%;
		margin: 0.2rem 0 0;
		padding: 0;
		list-style: none;
		font-size: 0.78rem;
		border-top: 1px solid #2c2f3d;
	}
	.officiel .titre {
		padding: 0.55rem 0 0.35rem;
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #6f6b62;
	}
	.officiel li:not(.titre) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.22rem 0;
	}
	.officiel .role {
		flex: none;
		min-width: 8.5rem;
		color: #8f8b80;
	}
	.officiel .role.fa {
		color: #c9a6e0;
	}
	.officiel .quoi {
		color: #e8e6df;
	}
	.officiel .dft {
		font-size: 0.68rem;
		color: #6f6b62;
	}
	.aide,
	.statut {
		width: 100%;
		margin: 0;
		font-size: 0.78rem;
		color: #8f8b80;
	}
	.statut {
		color: #9ad5a0;
	}
	.statut.erreur {
		color: #e08585;
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
