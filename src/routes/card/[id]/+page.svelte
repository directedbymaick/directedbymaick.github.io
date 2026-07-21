<script lang="ts">
	import Card from '$lib/Card.svelte';
	import FactionSigil from '$lib/FactionSigil.svelte';
	import { charter } from '$lib/charter';
	import { altView } from '$lib/cards';
	import { onMount } from 'svelte';
	import { FULLART_RATE, loadCollection, saveCollection } from '$lib/gacha';
	import { eco, initEconomy, depenserSyllabes } from '$lib/economy.svelte';
	import { versionsOf, formatRate } from '$lib/variants';
	import { tauxVersion, prixNom } from '$lib/paliers';
	import type { CardData } from '$lib/types';

	let { data } = $props();
	const card = $derived(data.card);
	const rarityDef = $derived(charter.rarities[card.rarity]);
	const faction = $derived(charter.factions[card.faction]);

	/* Toutes les versions existantes de la carte : Raw d'abord, puis les finitions
	   validées et les Full Art, chacune avec son taux de drop. Le Registre ne
	   montre que le Raw ; c'est ici qu'on voit ce qui est réellement poolable. */
	const versions = $derived(versionsOf(card, FULLART_RATE));

	/* les artworks alternatifs restent proposés à la suite (ils ne sont pas des
	   versions au sens tirage : même carte, autre illustration) */
	const alts = $derived(
		(card.alts ?? []).map((art, i) => ({
			key: `alt${i + 2}`,
			label: `Alt ${i + 1}`,
			view: altView(card, art, i)
		}))
	);

	let artSel = $state('');
	$effect(() => {
		card.id; // reset à chaque navigation de carte
		const v = new URLSearchParams(location.search).get('v');
		const dispo = [...versions.map((x) => x.key), ...alts.map((a) => a.key)];
		artSel = v && dispo.includes(v) ? v : versions[0].key;
	});

	const shown: CardData = $derived(
		versions.find((v) => v.key === artSel)?.view ??
			alts.find((a) => a.key === artSel)?.view ??
			versions[0].view
	);
	const shownFullArt = $derived(versions.find((v) => v.key === artSel)?.fullArt ?? false);

	/* Ce qu'on possède réellement. Une version jamais tirée reste VISIBLE — c'est
	   le catalogue de ce qui existe — mais grisée : on ne se voit pas propriétaire
	   d'une finition qu'on n'a pas. */
	let collection = $state<Record<string, number>>({});
	onMount(() => {
		initEconomy();
		collection = loadCollection();
	});

	/* Reconstituer un nom — l'unique usage des Syllabes.
	   « Certains d'entre nous en ont rassemblé assez pour reconstituer des noms
	   entiers. » (KORUM.md, Les Eshar)

	   Le prix découle de la rareté RÉELLE de la version — son taux de sortie par
	   booster — et non de la rareté de la carte : le Raw et sa Full Art SP ne
	   valent pas pareil. */
	const versionCourante = $derived(versions.find((v) => v.key === artSel) ?? null);
	const prix = $derived(
		versionCourante ? prixNom(tauxVersion(card, versionCourante.rate)) : 0
	);
	let messageForge = $state('');

	function reconstituer() {
		if (!versionCourante || shownPossedee > 0) return;
		if (!depenserSyllabes(prix)) {
			messageForge = `Il vous manque ${prix - eco.syllabes} Syllabe${prix - eco.syllabes > 1 ? 's' : ''}.`;
			setTimeout(() => (messageForge = ''), 3000);
			return;
		}
		collection[versionCourante.key] = (collection[versionCourante.key] ?? 0) + 1;
		collection = { ...collection };
		saveCollection($state.snapshot(collection));
		messageForge = 'Le nom est dit.';
		setTimeout(() => (messageForge = ''), 3000);
	}
	function possedee(key: string): number {
		return collection[key] ?? 0;
	}
	const shownPossedee = $derived(
		artSel.startsWith('alt') ? possedee(card.id) : possedee(artSel)
	);
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
		<div class="porte" class:manquante={shownPossedee === 0}>
			{#key artSel}
				<Card card={shown} fullArt={shownFullArt} interactive={shownPossedee > 0} />
			{/key}
			{#if shownPossedee === 0}
				<span class="verrou">Non possédée</span>
			{/if}
		</div>

		<div class="variants" role="tablist" aria-label="Versions de la carte">
			{#each versions as v (v.key)}
				<button
					class="vbtn"
					class:active={artSel === v.key}
					class:manquante={possedee(v.key) === 0}
					role="tab"
					aria-selected={artSel === v.key}
					onclick={() => (artSel = v.key)}
				>
					{v.label}
					<small class="taux">
						{formatRate(v.rate)}{possedee(v.key) > 0 ? ` · ×${possedee(v.key)}` : ''}
					</small>
				</button>
			{/each}
			{#each alts as a (a.key)}
				<button
					class="vbtn"
					class:active={artSel === a.key}
					role="tab"
					aria-selected={artSel === a.key}
					onclick={() => (artSel = a.key)}
				>
					{a.label}
					<small class="taux">artwork alt.</small>
				</button>
			{/each}
		</div>
		<p class="vhint">Taux de sortie par tirage de cette carte.</p>

		{#if versionCourante && shownPossedee === 0}
			<div class="forge">
				<button class="forge-btn" disabled={eco.syllabes < prix} onclick={reconstituer}>
					Reconstituer ce nom · {prix}
					<span class="syl" aria-hidden="true"></span>
				</button>
				<p class="forge-solde">
					Vous avez <b>{eco.syllabes}</b> Syllabe{eco.syllabes > 1 ? 's' : ''}
				</p>
			</div>
		{/if}
		{#if messageForge}
			<p class="forge-msg" role="status">{messageForge}</p>
		{/if}
	</div>

	<aside class="meta" style="--fc: {faction?.color ?? '#8892a6'}">
		<p class="role">
			<span class="r-sigil"><FactionSigil faction={card.faction} /></span>
			{faction?.name}
			<span class="r-sep">//</span>
			{rarityDef.name}
		</p>
		<h1>{card.name}</h1>

		<div class="statline">
			<span class="chip">Volonté {card.cost}</span>
			{#if card.kind === 'etre'}
				<span class="chip">{card.attack} ATQ</span>
				<span class="chip">{card.health} INT</span>
			{:else}
				<span class="chip"
					>{card.kind === 'verbe' ? 'Verbe' : card.kind === 'relique' ? 'Relique' : 'Lieu'}</span
				>
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
		{#if card.prononcer}
			<div class="block synchro">
				<p class="block-label">◯ Prononcer ({card.prononcer.cost})</p>
				<p class="block-body">{card.prononcer.text}</p>
			</div>
		{/if}
		{#if card.flavor}
			<p class="flavor">{card.flavor?.startsWith('«') ? card.flavor : `« ${card.flavor} »`}</p>
		{/if}

		<p class="gene">
			Gène — foil <code>{card.gene.foilPreset}</code> · seed <code>{card.gene.seed}</code> ·
			{#each card.gene.palette as c, i (i)}
				<span class="swatch" style="background: {c}" title={c}></span>
			{/each}
		</p>

		<a class="back" href="/">← Retour au mur</a>
	</aside>
</section>

<style>
	.stage {
		display: flex;
		flex-wrap: wrap;
		gap: 4rem;
		align-items: center;
		justify-content: center;
		padding-top: 3.5rem;
	}
	.showcase {
		--card-w: min(380px, 90vw);
	}

	/* sélecteur de version — segmented control */
	.variants {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.25rem;
		margin-top: 1.4rem;
		padding: 0.25rem;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 999px;
	}
	.vbtn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 550;
		padding: 0.38rem 1rem;
		border: none;
		cursor: pointer;
		color: rgba(242, 240, 234, 0.55);
		background: transparent;
		border-radius: 999px;
		transition:
			background 0.18s ease,
			color 0.18s ease;
	}
	/* reconstituer un nom : l'achat direct, payé en Syllabes */
	.forge {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: center;
		gap: 0.5rem 0.9rem;
		margin: 1rem 0 0;
	}
	.forge-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.5rem 1.2rem;
		font-family: inherit;
		font-size: 0.86rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: #0a0a0d;
		background: linear-gradient(180deg, #f0d68a, #c9a445);
		border: none;
		border-radius: 999px;
		cursor: pointer;
		transition: filter 0.16s ease;
	}
	.forge-btn:hover:not(:disabled) {
		filter: brightness(1.08);
	}
	.forge-btn:disabled {
		color: rgba(242, 240, 234, 0.35);
		background: rgba(255, 255, 255, 0.06);
		cursor: default;
	}
	/* la Syllabe : un éclat vertical, comme un trait de voix */
	.syl {
		width: 0.42rem;
		height: 0.72rem;
		border-radius: 40% 40% 45% 45%;
		background: linear-gradient(180deg, #fff6dc, #a97f2c);
		box-shadow: 0 0 6px rgba(213, 178, 94, 0.65);
	}
	.forge-solde {
		margin: 0;
		font-size: 0.78rem;
		color: rgba(242, 240, 234, 0.4);
	}
	.forge-solde b {
		color: #d5b25e;
		font-variant-numeric: tabular-nums;
	}
	.forge-msg {
		margin: 0.5rem 0 0;
		text-align: center;
		font-size: 0.8rem;
		color: #d5b25e;
	}

	/* version jamais tirée : lisible, mais visiblement pas à nous */
	.vbtn.manquante {
		color: rgba(242, 240, 234, 0.28);
	}
	.vbtn.manquante.active {
		color: #0a0a0d;
		background: rgba(242, 240, 234, 0.45);
	}
	.porte {
		position: relative;
	}
	.porte.manquante {
		filter: grayscale(0.92) brightness(0.6);
	}
	.verrou {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 5;
		padding: 0.32rem 0.95rem;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: #0a0a0d;
		background: rgba(242, 240, 234, 0.92);
		border-radius: 999px;
		pointer-events: none;
	}
	.vbtn:hover {
		color: #f2f0ea;
	}
	.vbtn.active {
		color: #0a0a0d;
		background: #f2f0ea;
	}
	/* taux de drop : discret sous le nom de la version */
	.taux {
		font-size: 0.62rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.04em;
		opacity: 0.65;
	}
	.vhint {
		margin: 0.55rem 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: rgba(242, 240, 234, 0.35);
	}

	.meta {
		max-width: 400px;
		min-width: 300px;
	}
	.role {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.8rem;
		font-size: 0.76rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.45);
	}
	.r-sigil {
		color: var(--fc);
	}
	.r-sep {
		color: rgba(242, 240, 234, 0.25);
	}
	h1 {
		margin: 0 0 1.3rem;
		font-weight: 800;
		font-size: clamp(2.2rem, 4.5vw, 3.2rem);
		letter-spacing: -0.025em;
		line-height: 1.05;
		color: #f2f0ea;
	}

	.statline {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.6rem;
	}
	.chip {
		font-size: 0.8rem;
		font-weight: 550;
		padding: 0.34rem 0.8rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 999px;
		color: rgba(242, 240, 234, 0.8);
	}
	.chip.cell {
		background: color-mix(in srgb, var(--fc) 14%, transparent);
		border-color: color-mix(in srgb, var(--fc) 30%, transparent);
		color: color-mix(in srgb, var(--fc) 80%, #fff);
	}

	.block {
		margin-bottom: 0.9rem;
		padding: 1.1rem 1.3rem;
		background: rgba(255, 255, 255, 0.035);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
	}
	.block.synchro {
		background: color-mix(in srgb, var(--fc) 7%, transparent);
		border-color: color-mix(in srgb, var(--fc) 25%, transparent);
	}
	.block-label {
		margin: 0 0 0.35rem;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.45);
	}
	.block.synchro .block-label {
		color: color-mix(in srgb, var(--fc) 80%, #fff);
	}
	.block-body {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.55;
		color: rgba(242, 240, 234, 0.85);
	}

	.flavor {
		margin: 1.4rem 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 1.15rem;
		line-height: 1.5;
		color: rgba(242, 240, 234, 0.5);
	}

	.gene {
		font-size: 0.78rem;
		color: rgba(242, 240, 234, 0.35);
	}
	.gene code {
		font-family: inherit;
		color: rgba(242, 240, 234, 0.55);
	}
	.swatch {
		display: inline-block;
		width: 0.8em;
		height: 0.8em;
		border-radius: 50%;
		margin-left: 0.45em;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.back {
		display: inline-flex;
		margin-top: 1.8rem;
		font-size: 0.88rem;
		font-weight: 550;
		text-decoration: none;
		color: rgba(242, 240, 234, 0.55);
		transition: color 0.15s ease;
	}
	.back:hover {
		color: #f2f0ea;
	}
</style>
