<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/Card.svelte';
	import logo from '$lib/assets/logo.svg';
	import { cards, getCard } from '$lib/cards';
	import { charter } from '$lib/charter';
	import { loadCollection, collectionStats } from '$lib/gacha';
	import {
		type Deck,
		DECK_SIZE,
		loadDecks,
		saveDecks,
		newDeck,
		deckSize,
		maxCopiesOf,
		canAdd,
		costCurve,
		factionSpread
	} from '$lib/decks';
	import type { FactionId, Rarity } from '$lib/types';

	const factions = Object.keys(charter.factions) as FactionId[];
	const STARS: Record<Rarity, number> = { common: 2, rare: 3, epic: 4, legendary: 5, prism: 5 };
	const KIND_LABEL = { etre: 'Être', verbe: 'Verbe', relique: 'Relique', lieu: 'Lieu' } as const;

	let loaded = $state(false);
	let pseudo = $state('Sans-Nom');
	let collection = $state<Record<string, number>>({});
	let decks = $state<Deck[]>([]);

	let tab = $state<'collection' | 'decks'>('collection');
	let editId = $state<string | null>(null);
	const cur = $derived(decks.find((d) => d.id === editId) ?? null);

	/* filtres partagés collection / pool */
	let fFaction = $state<'all' | FactionId>('all');
	let search = $state('');

	const stats = $derived(collectionStats(collection));

	const pool = $derived(
		cards
			.filter((c) => fFaction === 'all' || c.faction === fFaction)
			.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
			.sort(
				(a, b) =>
					factions.indexOf(a.faction) - factions.indexOf(b.faction) ||
					a.cost - b.cost ||
					a.name.localeCompare(b.name)
			)
	);

	const deckRows = $derived(
		cur
			? Object.entries(cur.cards)
					.map(([id, n]) => ({ card: getCard(id)!, n }))
					.filter((r) => r.card)
					.sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name))
			: []
	);
	const curSize = $derived(cur ? deckSize(cur) : 0);
	const curve = $derived(cur ? costCurve(cur, getCard) : []);
	const curveMax = $derived(Math.max(1, ...curve));
	const spread = $derived(cur ? factionSpread(cur, getCard) : {});

	onMount(() => {
		collection = loadCollection();
		decks = loadDecks();
		pseudo = localStorage.getItem('expelled-pseudo') ?? 'Sans-Nom';
		loaded = true;
	});

	$effect(() => {
		if (!loaded) return;
		saveDecks($state.snapshot(decks) as Deck[]);
	});
	$effect(() => {
		if (!loaded) return;
		localStorage.setItem('expelled-pseudo', pseudo);
	});

	function createDeck() {
		const d = newDeck(`Deck ${decks.length + 1}`);
		decks.push(d);
		editId = d.id;
		tab = 'decks';
	}
	function removeDeck(id: string) {
		decks = decks.filter((d) => d.id !== id);
		if (editId === id) editId = null;
	}
	function duplicateDeck(d: Deck) {
		const copy = newDeck(`${d.name} (copie)`);
		copy.cards = { ...d.cards };
		decks.push(copy);
	}
	function addTo(cardId: string) {
		if (!cur) return;
		const card = getCard(cardId);
		if (!card || !canAdd(cur, card)) return;
		cur.cards[cardId] = (cur.cards[cardId] ?? 0) + 1;
		cur.updatedAt = Date.now();
	}
	function removeFrom(cardId: string) {
		if (!cur || !cur.cards[cardId]) return;
		cur.cards[cardId] -= 1;
		if (cur.cards[cardId] <= 0) delete cur.cards[cardId];
		cur.updatedAt = Date.now();
	}
</script>

<svelte:head>
	<title>Mon Nom — {charter.game.name}</title>
	<meta name="description" content="Votre espace : collection et decks de {charter.game.name}." />
</svelte:head>

<!-- ============ EN-TÊTE DU NOM ============ -->
<header class="idcard">
	<img class="sigil" src={logo} alt="" aria-hidden="true" />
	<div class="who">
		<input class="pseudo" bind:value={pseudo} maxlength="24" aria-label="Votre pseudo" />
		<p class="sub">UID : KOR-701606888 · Niveau d'Équilibre 0</p>
	</div>
	<div class="chips">
		<span class="chip"><b>30</b> Intégrité</span>
		<span class="chip"><b>{stats.unique}</b>/{cards.length} uniques</span>
		<span class="chip"><b>{stats.total}</b> tirées</span>
		<span class="chip"><b>{decks.length}</b> deck{decks.length > 1 ? 's' : ''}</span>
	</div>
</header>

<!-- ============ ONGLETS ============ -->
<div class="tabs" role="tablist">
	<button
		role="tab"
		aria-selected={tab === 'collection'}
		class:active={tab === 'collection'}
		onclick={() => (tab = 'collection')}>Collection</button
	>
	<button
		role="tab"
		aria-selected={tab === 'decks'}
		class:active={tab === 'decks'}
		onclick={() => {
			tab = 'decks';
			editId = null;
		}}>Decks</button
	>
</div>

{#if tab === 'collection'}
	<!-- ============ COLLECTION ============ -->
	<div class="filters">
		<button class="fbtn" class:on={fFaction === 'all'} onclick={() => (fFaction = 'all')}>✦ Tous</button>
		{#each factions as f (f)}
			<button
				class="fbtn"
				class:on={fFaction === f}
				style="--fc: {charter.factions[f].color}"
				onclick={() => (fFaction = f)}
			>
				{charter.factions[f].sigil}
				{charter.factions[f].name}
			</button>
		{/each}
		<input class="search" type="search" placeholder="Rechercher…" bind:value={search} />
	</div>

	<p class="hint">
		Les cartes s'obtiennent en ouvrant des <a href="/packs">boosters</a> — les grisées manquent
		encore à votre Registre.
	</p>

	<div class="colgrid">
		{#each pool as c (c.id)}
			{@const owned = collection[c.id] ?? 0}
			<div class="colcell" class:missing={owned === 0}>
				<a href="/card/{c.id}" aria-label={c.name}>
					<Card card={c} interactive={owned > 0} />
				</a>
				{#if owned > 0}
					<span class="owncount">×{owned}</span>
				{:else}
					<span class="lock">Non possédée</span>
				{/if}
			</div>
		{/each}
	</div>
{:else if !cur}
	<!-- ============ LISTE DES DECKS ============ -->
	<div class="deckbar">
		<button class="primary" onclick={createDeck}>+ Nouveau deck</button>
	</div>
	{#if decks.length === 0}
		<div class="empty">
			<img src={logo} alt="" aria-hidden="true" />
			<p>Aucun deck. Trente cartes, une volonté — commencez le vôtre.</p>
		</div>
	{:else}
		<div class="decklist">
			{#each decks as d (d.id)}
				{@const n = deckSize(d)}
				{@const sp = factionSpread(d, getCard)}
				<article class="deckcard" class:ready={n === DECK_SIZE}>
					<header>
						<h3>{d.name}</h3>
						<span class="dsize" class:full={n === DECK_SIZE}>{n}/{DECK_SIZE}</span>
					</header>
					<div class="spread" aria-hidden="true">
						{#each factions as f (f)}
							{#if sp[f]}
								<i style="flex: {sp[f]}; background: {charter.factions[f].color}"></i>
							{/if}
						{/each}
						{#if n === 0}<i style="flex: 1; background: rgba(140,170,220,.15)"></i>{/if}
					</div>
					<footer>
						<button onclick={() => (editId = d.id)}>Modifier</button>
						<button onclick={() => duplicateDeck(d)}>Dupliquer</button>
						<button class="danger" onclick={() => removeDeck(d.id)}>Supprimer</button>
					</footer>
				</article>
			{/each}
		</div>
	{/if}
{:else}
	<!-- ============ ÉDITEUR DE DECK ============ -->
	<div class="editbar">
		<button class="ghost" onclick={() => (editId = null)}>← Mes decks</button>
		<input class="deckname" bind:value={cur.name} maxlength="32" aria-label="Nom du deck" />
		<span class="dsize big" class:full={curSize === DECK_SIZE}>{curSize}/{DECK_SIZE}</span>
	</div>

	<div class="editor">
		<!-- pool -->
		<section class="pool">
			<div class="filters">
				<button class="fbtn" class:on={fFaction === 'all'} onclick={() => (fFaction = 'all')}>✦</button>
				{#each factions as f (f)}
					<button
						class="fbtn"
						class:on={fFaction === f}
						style="--fc: {charter.factions[f].color}"
						onclick={() => (fFaction = f)}>{charter.factions[f].sigil}</button
					>
				{/each}
				<input class="search" type="search" placeholder="Rechercher…" bind:value={search} />
			</div>
			<ul class="rows">
				{#each pool as c (c.id)}
					{@const inDeck = cur.cards[c.id] ?? 0}
					{@const cap = maxCopiesOf(c)}
					<li>
						<button
							class="row"
							disabled={!canAdd(cur, c)}
							onclick={() => addTo(c.id)}
							title="{c.name} — ajouter"
						>
							<span class="cost">{c.cost}</span>
							<span class="rname">
								{c.name}
								<small
									>{KIND_LABEL[c.kind]} · <i style="color: {charter.factions[c.faction].color}"
										>{charter.factions[c.faction].sigil}</i
									>
									{charter.factions[c.faction].name}</small
								>
							</span>
							<span class="rstars" class:prism={c.rarity === 'prism'}
								>{'★'.repeat(STARS[c.rarity])}</span
							>
							<span class="incount" class:zero={inDeck === 0}>{inDeck}/{cap}</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>

		<!-- deck courant -->
		<aside class="current">
			<div class="curve" aria-label="Courbe de Volonté">
				{#each curve as n, i (i)}
					<div class="bucket">
						<i style="height: {(n / curveMax) * 100}%" class:zero={n === 0}></i>
						<small>{i === 7 ? '7+' : i}</small>
					</div>
				{/each}
			</div>
			<div class="spread" aria-hidden="true">
				{#each factions as f (f)}
					{#if spread[f]}
						<i style="flex: {spread[f]}; background: {charter.factions[f].color}"></i>
					{/if}
				{/each}
				{#if curSize === 0}<i style="flex: 1; background: rgba(140,170,220,.15)"></i>{/if}
			</div>
			{#if deckRows.length === 0}
				<p class="empty-deck">Cliquez une carte du pool pour l'ajouter.</p>
			{:else}
				<ul class="rows">
					{#each deckRows as r (r.card.id)}
						<li>
							<button class="row" onclick={() => removeFrom(r.card.id)} title="{r.card.name} — retirer">
								<span class="cost">{r.card.cost}</span>
								<span class="rname">{r.card.name}</span>
								<span class="mult">×{r.n}</span>
								<span class="minus">−</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</aside>
	</div>
{/if}

<style>
	/* ---------- en-tête ---------- */
	.idcard {
		display: flex;
		align-items: center;
		gap: 1.4rem;
		margin: 3.5rem 0 2rem;
		padding: 1.6rem 1.8rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 20px;
		backdrop-filter: blur(12px);
	}
	.sigil {
		width: 4.2rem;
		height: 4.2rem;
		filter: drop-shadow(0 0 12px rgba(213, 178, 94, 0.4));
	}
	.who {
		min-width: 0;
	}
	.pseudo {
		width: 100%;
		max-width: 16ch;
		background: transparent;
		border: none;
		border-bottom: 1px dashed rgba(213, 178, 94, 0.35);
		padding: 0 0 0.15rem;
		font-family: Cinzel, Georgia, serif;
		font-size: 1.5rem;
		color: var(--ink);
	}
	.pseudo:focus {
		outline: none;
		border-bottom-color: var(--gold);
	}
	.sub {
		margin: 0.4rem 0 0;
		font-size: 0.74rem;
		letter-spacing: 0.08em;
		color: rgba(238, 240, 245, 0.4);
	}
	.chips {
		margin-left: auto;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.chip {
		padding: 0.4rem 0.85rem;
		font-size: 0.8rem;
		color: rgba(238, 240, 245, 0.6);
		background: rgba(140, 170, 220, 0.08);
		border: 1px solid var(--panel-line);
		border-radius: 999px;
		white-space: nowrap;
	}
	.chip b {
		color: var(--gold);
		font-variant-numeric: tabular-nums;
	}
	@media (max-width: 760px) {
		.idcard {
			flex-wrap: wrap;
		}
		.chips {
			margin-left: 0;
			justify-content: flex-start;
		}
	}

	/* ---------- onglets ---------- */
	.tabs {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 1.8rem;
	}
	.tabs button {
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		padding: 0.5rem 1.3rem;
		border: 1px solid transparent;
		border-radius: 999px;
		background: rgba(140, 170, 220, 0.07);
		color: rgba(238, 240, 245, 0.6);
		cursor: pointer;
		transition:
			background 0.16s ease,
			color 0.16s ease;
	}
	.tabs button:hover {
		color: var(--ink);
	}
	.tabs button.active {
		background: var(--cream);
		color: #171b10;
		box-shadow: 0 0 16px rgba(213, 178, 94, 0.25);
	}

	/* ---------- filtres ---------- */
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
		margin-bottom: 1.2rem;
	}
	.fbtn {
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 550;
		padding: 0.38rem 0.85rem;
		border: 1px solid var(--panel-line);
		border-radius: 999px;
		background: transparent;
		color: rgba(238, 240, 245, 0.6);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			background 0.15s ease;
	}
	.fbtn:hover {
		color: var(--ink);
	}
	.fbtn.on {
		border-color: rgba(213, 178, 94, 0.5);
		background: rgba(213, 178, 94, 0.1);
		color: var(--ink);
	}
	.search {
		margin-left: auto;
		min-width: 180px;
		padding: 0.45rem 0.9rem;
		font-family: inherit;
		font-size: 0.85rem;
		color: var(--ink);
		background: rgba(140, 170, 220, 0.07);
		border: 1px solid var(--panel-line);
		border-radius: 999px;
	}
	.search:focus {
		outline: none;
		border-color: rgba(213, 178, 94, 0.5);
	}

	.hint {
		margin: 0 0 1.6rem;
		font-size: 0.85rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.hint a {
		color: var(--gold);
	}

	/* ---------- collection ---------- */
	.colgrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
		gap: 2rem 1.4rem;
	}
	.colcell {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		--card-w: min(230px, 100%);
	}
	.colcell a {
		display: block;
		width: 100%;
	}
	.colcell.missing {
		filter: grayscale(0.9) brightness(0.55);
		opacity: 0.75;
	}
	.owncount {
		position: absolute;
		top: -0.5rem;
		right: 0.4rem;
		z-index: 5;
		padding: 0.15rem 0.6rem;
		font-size: 0.74rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: #171b10;
		background: linear-gradient(180deg, #f0d68a, var(--gold-deep));
		border-radius: 999px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
	}
	.lock {
		position: absolute;
		top: 45%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 5;
		padding: 0.3rem 0.9rem;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: #171b10;
		background: rgba(238, 240, 245, 0.9);
		border-radius: 4px;
	}

	/* ---------- decks : liste ---------- */
	.deckbar {
		margin-bottom: 1.4rem;
	}
	.primary {
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 650;
		padding: 0.6rem 1.4rem;
		border: none;
		border-radius: 999px;
		background: var(--cream);
		color: #171b10;
		cursor: pointer;
		box-shadow: 0 0 16px rgba(213, 178, 94, 0.25);
		transition: background 0.16s ease;
	}
	.primary:hover {
		background: #f7edd6;
	}
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 4rem 1rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.empty img {
		width: 5rem;
		opacity: 0.6;
		filter: drop-shadow(0 0 14px rgba(213, 178, 94, 0.35));
	}
	.decklist {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.2rem;
	}
	.deckcard {
		padding: 1.2rem 1.4rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 16px;
		backdrop-filter: blur(10px);
		transition: border-color 0.18s ease;
	}
	.deckcard:hover {
		border-color: rgba(213, 178, 94, 0.4);
	}
	.deckcard.ready {
		border-color: rgba(213, 178, 94, 0.45);
	}
	.deckcard header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.8rem;
		margin-bottom: 0.8rem;
	}
	.deckcard h3 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 600;
		font-size: 1.05rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.dsize {
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		color: rgba(238, 240, 245, 0.45);
		white-space: nowrap;
	}
	.dsize.full {
		color: var(--gold);
		font-weight: 650;
	}
	.dsize.big {
		font-size: 1rem;
	}
	.spread {
		display: flex;
		height: 4px;
		border-radius: 2px;
		overflow: hidden;
		gap: 1px;
	}
	.deckcard footer {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.deckcard footer button {
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 550;
		padding: 0.35rem 0.8rem;
		border: 1px solid var(--panel-line);
		border-radius: 999px;
		background: transparent;
		color: rgba(238, 240, 245, 0.65);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease;
	}
	.deckcard footer button:hover {
		border-color: rgba(213, 178, 94, 0.5);
		color: var(--ink);
	}
	.deckcard footer .danger:hover {
		border-color: rgba(220, 90, 90, 0.6);
		color: #e58a8a;
	}

	/* ---------- éditeur ---------- */
	.editbar {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.4rem;
	}
	.ghost {
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 550;
		padding: 0.45rem 1rem;
		border: 1px solid var(--panel-line);
		border-radius: 999px;
		background: transparent;
		color: rgba(238, 240, 245, 0.65);
		cursor: pointer;
	}
	.ghost:hover {
		color: var(--ink);
		border-color: rgba(213, 178, 94, 0.5);
	}
	.deckname {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: none;
		border-bottom: 1px dashed rgba(213, 178, 94, 0.35);
		padding: 0.2rem 0;
		font-family: Cinzel, Georgia, serif;
		font-size: 1.3rem;
		color: var(--ink);
	}
	.deckname:focus {
		outline: none;
		border-bottom-color: var(--gold);
	}

	.editor {
		display: grid;
		grid-template-columns: 1fr 360px;
		gap: 1.6rem;
		align-items: start;
	}
	@media (max-width: 900px) {
		.editor {
			grid-template-columns: 1fr;
		}
	}
	.pool,
	.current {
		padding: 1.2rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 16px;
		backdrop-filter: blur(10px);
	}
	.current {
		position: sticky;
		top: 5.4rem;
	}
	@media (max-width: 900px) {
		.current {
			position: static;
		}
	}

	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		max-height: 62vh;
		overflow-y: auto;
	}
	.row {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.45rem 0.7rem;
		border: 1px solid transparent;
		border-radius: 10px;
		background: rgba(140, 170, 220, 0.05);
		font-family: inherit;
		color: var(--ink);
		cursor: pointer;
		text-align: left;
		transition:
			background 0.14s ease,
			border-color 0.14s ease;
	}
	.row:hover:not(:disabled) {
		background: rgba(213, 178, 94, 0.09);
		border-color: rgba(213, 178, 94, 0.35);
	}
	.row:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.cost {
		flex: none;
		display: grid;
		place-items: center;
		width: 1.7rem;
		height: 1.7rem;
		border-radius: 50%;
		border: 1px solid rgba(213, 178, 94, 0.45);
		font-size: 0.8rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: var(--gold);
	}
	.rname {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		font-size: 0.86rem;
		font-weight: 550;
		overflow: hidden;
	}
	.rname small {
		font-size: 0.68rem;
		font-weight: 450;
		color: rgba(238, 240, 245, 0.45);
	}
	.rname small i {
		font-style: normal;
	}
	.rstars {
		font-size: 0.62rem;
		color: var(--gold);
		white-space: nowrap;
	}
	.rstars.prism {
		background: linear-gradient(90deg, #e8a7b8, #e8d3a7, #a7e8c6, #a7c6e8, #c9a7e8);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.incount {
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		color: var(--gold);
		white-space: nowrap;
	}
	.incount.zero {
		color: rgba(238, 240, 245, 0.3);
	}
	.mult {
		font-size: 0.8rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: var(--gold);
	}
	.minus {
		color: rgba(238, 240, 245, 0.5);
		font-size: 1rem;
	}

	/* courbe de Volonté */
	.curve {
		display: flex;
		align-items: flex-end;
		gap: 0.35rem;
		height: 74px;
		margin-bottom: 0.8rem;
	}
	.bucket {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		height: 100%;
		justify-content: flex-end;
	}
	.bucket i {
		width: 100%;
		min-height: 2px;
		border-radius: 3px 3px 0 0;
		background: linear-gradient(180deg, #f0d68a, var(--gold-deep));
		transition: height 0.25s ease;
	}
	.bucket i.zero {
		background: rgba(140, 170, 220, 0.15);
	}
	.bucket small {
		font-size: 0.62rem;
		color: rgba(238, 240, 245, 0.4);
		font-variant-numeric: tabular-nums;
	}
	.current .spread {
		margin-bottom: 1rem;
	}
	.empty-deck {
		margin: 1.5rem 0;
		text-align: center;
		font-size: 0.85rem;
		color: rgba(238, 240, 245, 0.45);
	}
</style>
