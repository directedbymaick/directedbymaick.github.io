<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/Card.svelte';
	import LazyCard from '$lib/LazyCard.svelte';
	import FactionSigil from '$lib/FactionSigil.svelte';
	import logo from '$lib/assets/logo.svg';
	import { cards, getCard } from '$lib/cards';
	import { charter } from '$lib/charter';
	import { loadCollection, saveCollection, collectionStats, FULLART_RATE } from '$lib/gacha';
	import { versionsOf } from '$lib/variants';
	import { session, initSession, signOut, setPseudo } from '$lib/account.svelte';
	import AuthPanel from '$lib/AuthPanel.svelte';
	import { nsKey, scheduleCloudSync } from '$lib/store';
	import {
		eco,
		initEconomy,
		DAILY,
		WEEKLY,
		ACHIEVEMENTS,
		ACH_CATEGORIES,
		questProgress,
		claimQuest,
		claimAchievement,
		earn,
		setAutoSell,
		SELL_KEEP,
		SELL_VALUE,
		gagnerSyllabes,
		SYLLABES_DEFAIRE,
		type AchContext
	} from '$lib/economy.svelte';
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
	import type { CardData, FactionId, Rarity } from '$lib/types';

	const factions = Object.keys(charter.factions) as FactionId[];
	const STARS: Record<Rarity, number> = { common: 2, rare: 3, epic: 4, legendary: 5, prism: 5 };
	const KIND_LABEL = { etre: 'Être', verbe: 'Verbe', relique: 'Relique', lieu: 'Lieu' } as const;

	let loaded = $state(false);
	let pseudo = $state('Sans-Nom');
	let collection = $state<Record<string, number>>({});
	let decks = $state<Deck[]>([]);

	let tab = $state<'collection' | 'decks' | 'quetes' | 'succes'>('collection');
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

	/** Entrées de la grille : TOUTES les versions réellement poolables de chaque
	 *  carte (Raw, finitions validées, Full Art). Chacune est rendue telle qu'elle
	 *  existe — jamais une finition qu'on n'a pas tirée sur la vignette de base :
	 *  la version non possédée s'affiche grisée, pas déguisée en autre chose. */
	interface ColEntry {
		key: string;
		id: string; // clé dans la collection — identique à celle posée par openPack()
		label: string;
		view: CardData;
		fullArt: boolean;
		base: CardData;
	}
	const collectionEntries = $derived<ColEntry[]>(
		pool.flatMap((c) =>
			versionsOf(c, FULLART_RATE).map((v) => ({
				key: v.key,
				id: v.key,
				label: v.label,
				view: v.view,
				fullArt: v.fullArt,
				base: c
			}))
		)
	);

	/** Toutes les versions vendables, désignées par leur CLÉ de collection : une
	 *  finition et son Raw sont deux entrées distinctes, revendre l'une ne doit
	 *  jamais toucher l'autre. */
	const sellables = $derived(
		cards.flatMap((c) =>
			versionsOf(c, FULLART_RATE).map((v) => ({
				key: v.key,
				name: v.label === 'Raw' ? c.name : `${c.name} — ${v.label}`,
				rarity: v.view.rarity,
				/* la VRAIE rareté : la vue Full Art force 'prism', ce qui ferait rendre
				   des Syllabes à n'importe quelle Commune Full Art */
				vraie: v.view.sourceRarity ?? v.view.rarity
			}))
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

	/* ---- le compte ---- */
	const account = $derived(session.account);

	/* contexte des succès + compteur de récompenses réclamables */
	const achCtx = $derived<AchContext>({
		uniques: stats.unique,
		setSize: cards.length,
		fullDecks: decks.filter((d) => deckSize(d) === 30).length,
		prisms: cards.filter((c) => c.rarity === 'prism' && (collection[c.id] ?? 0) > 0).length,
		prismTotal: cards.filter((c) => c.rarity === 'prism').length,
		legendaries: cards.filter((c) => c.rarity === 'legendary' && (collection[c.id] ?? 0) > 0)
			.length,
		legendTotal: cards.filter((c) => c.rarity === 'legendary').length,
		factionsCovered: factions.filter((f) =>
			cards.some((c) => c.faction === f && (collection[c.id] ?? 0) > 0)
		).length,
		factionTotal: factions.length
	});
	const claimable = $derived(
		DAILY.filter((q) => {
			const st = questProgress('daily', q.id);
			return !st.claimed && st.p >= q.n;
		}).length +
			WEEKLY.filter((q) => {
				const st = questProgress('weekly', q.id);
				return !st.claimed && st.p >= q.n;
			}).length +
			ACHIEVEMENTS.filter((a) => !(eco.ach[a.id]?.claimed ?? false) && a.check(eco.stats, achCtx))
				.length
	);

	onMount(() => {
		initSession();
		initEconomy();
		collection = loadCollection();
		decks = loadDecks();
		pseudo = localStorage.getItem(nsKey('expelled-pseudo')) ?? 'Sans-Nom';
		loaded = true;
	});

	/* ---- revente du surplus (au-delà de 3 copies) ---- */
	function surplusOf(key: string): number {
		return Math.max(0, (collection[key] ?? 0) - SELL_KEEP);
	}
	const surplusCount = $derived(sellables.reduce((s, v) => s + surplusOf(v.key), 0));
	const surplusValue = $derived(
		sellables.reduce((s, v) => s + surplusOf(v.key) * (SELL_VALUE[v.rarity] ?? 5), 0)
	);
	/** Ce que rend UN exemplaire : Syllabes pour une Prismatique, Éclats sinon. */
	function valeurUnitaire(vraie: string, rarity: string) {
		return vraie === 'prism'
			? { syllabes: SYLLABES_DEFAIRE, eclats: 0 }
			: { syllabes: 0, eclats: SELL_VALUE[rarity] ?? 5 };
	}

	/**
	 * Vente à l'unité — la liberté du joueur, sans seuil.
	 *
	 * La revente AUTOMATIQUE, elle, ne touche que le surplus au-delà de 3 copies :
	 * on ne dissout jamais dans son dos une version qu'on ne possède qu'en un
	 * exemplaire. Ici c'est un geste délibéré, donc tout est vendable — mais la
	 * dernière copie demande confirmation, elle sort de la collection.
	 */
	function vendreUne(key: string) {
		const v = sellables.find((x) => x.key === key);
		const n = collection[key] ?? 0;
		if (!v || n <= 0) return;
		if (n === 1 && !confirm(`Vendre votre dernier exemplaire de ${v.name} ?`)) return;

		if (n <= 1) delete collection[key];
		else collection[key] = n - 1;
		collection = { ...collection };
		saveCollection($state.snapshot(collection));

		const { syllabes, eclats } = valeurUnitaire(v.vraie, v.rarity);
		if (syllabes) gagnerSyllabes(syllabes, `${v.name} défait`);
		else earn(eclats, `Revente : ${v.name}`);
	}

	/* Défaire une Prismatique ne rend pas des Éclats : un nom entier se défait en
	   Syllabes, c'est le seul endroit d'où elles viennent avec le tirage. */
	function sellSurplus(key: string) {
		const v = sellables.find((x) => x.key === key);
		const n = surplusOf(key);
		if (!v || n <= 0) return;
		collection[key] = SELL_KEEP;
		collection = { ...collection };
		saveCollection($state.snapshot(collection));
		if (v.vraie === 'prism') gagnerSyllabes(n * SYLLABES_DEFAIRE, `${v.name} défait ×${n}`);
		else earn(n * (SELL_VALUE[v.rarity] ?? 5), `Revente : ${v.name} ×${n}`);
	}
	function sellAllSurplus() {
		let total = 0;
		let count = 0;
		let syll = 0;
		for (const v of sellables) {
			const n = surplusOf(v.key);
			if (n <= 0) continue;
			collection[v.key] = SELL_KEEP;
			if (v.vraie === 'prism') syll += n * SYLLABES_DEFAIRE;
			else total += n * (SELL_VALUE[v.rarity] ?? 5);
			count += n;
		}
		if (syll > 0) gagnerSyllabes(syll, 'Noms entiers défaits');
		if (count === 0) return;
		collection = { ...collection };
		saveCollection($state.snapshot(collection));
		earn(total, `Revente du surplus : ${count} carte${count > 1 ? 's' : ''}`);
	}

	async function logout() {
		await signOut();
		if (typeof location !== 'undefined') location.assign('/');
	}

	/* réinitialiser la collection (utile après des tests) */
	function resetCollection() {
		if (!confirm('Vider entièrement votre collection ? Cette action est irréversible.')) return;
		collection = {};
		saveCollection({});
	}

	$effect(() => {
		if (!loaded) return;
		saveDecks($state.snapshot(decks) as Deck[]);
	});
	$effect(() => {
		if (!loaded) return;
		localStorage.setItem(nsKey('expelled-pseudo'), pseudo);
		scheduleCloudSync();
		setPseudo(pseudo);
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
	<title>Mon espace — {charter.game.name}</title>
	<meta name="description" content="Votre espace : collection et decks de {charter.game.name}." />
</svelte:head>

{#if session.ready && !account}
	<!-- ============ PORTE : connexion requise ============ -->
	<section class="gate">
		<AuthPanel />
	</section>
{:else if account}
	<!-- ============ EN-TÊTE DU NOM ============ -->
	<header class="idcard">
		<img class="sigil" src={logo} alt="" aria-hidden="true" />
		<div class="who">
			<input class="pseudo" bind:value={pseudo} maxlength="24" aria-label="Votre pseudo" />
			<p class="sub">{account.email} · Niveau d'Équilibre 0</p>
		</div>
		<div class="chips">
			<span class="chip gold"><i class="shard" aria-hidden="true"></i><b>{eco.balance}</b> Éclats</span>
			<span class="chip"><b>{stats.unique}</b>/{cards.length} uniques</span>
			<span class="chip"><b>{stats.total}</b> tirées</span>
			<span class="chip"><b>{decks.length}</b> deck{decks.length > 1 ? 's' : ''}</span>
			<span class="chip"><b>{eco.stats.wins}</b> victoire{eco.stats.wins > 1 ? 's' : ''}</span>
			<button class="outbtn" onclick={logout}>Se déconnecter</button>
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
	<button
		role="tab"
		aria-selected={tab === 'quetes'}
		class:active={tab === 'quetes'}
		onclick={() => (tab = 'quetes')}
	>
		Quêtes{#if claimable > 0}<i class="claimdot" title="{claimable} récompense(s) à réclamer"
			></i>{/if}
	</button>
	<button
		role="tab"
		aria-selected={tab === 'succes'}
		class:active={tab === 'succes'}
		onclick={() => (tab = 'succes')}>Succès</button
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
				<span style="color: {charter.factions[f].color}"><FactionSigil faction={f} flat /></span>
				{charter.factions[f].name}
			</button>
		{/each}
		<input class="search" type="search" placeholder="Rechercher…" bind:value={search} />
	</div>

	<p class="hint">
		Ouvrez des <a href="/packs">boosters</a> pour compléter votre collection. Les cartes que vous
		ne possédez pas apparaissent grisées. Les exemplaires au-delà de trois peuvent être revendus en Éclats.
	</p>

	<label class="autosell">
		<input
			type="checkbox"
			checked={eco.autoSell}
			onchange={(e) => setAutoSell(e.currentTarget.checked)}
		/>
		<span class="track" aria-hidden="true"><i></i></span>
		<span class="autosell-txt">
			Revendre automatiquement les exemplaires en trop
			<small>à l’ouverture d’un booster, chaque exemplaire au-delà du troisième est converti en Éclats</small>
		</span>
	</label>

	<p class="reset-line">
		<button class="resetbtn" onclick={resetCollection}>Réinitialiser ma collection</button>
		<span>Cette action supprime vos cartes, mais conserve vos Éclats, quêtes et succès.</span>
	</p>

	{#if surplusCount > 0}
		<div class="sellbar">
			<span
				>Surplus : <b>{surplusCount}</b> carte{surplusCount > 1 ? 's' : ''} au-delà de 3 copies</span
			>
			<button class="sellall" onclick={sellAllSurplus}>
				Tout revendre · +{surplusValue} <i class="shard" aria-hidden="true"></i>
			</button>
		</div>
	{/if}

	<div class="colgrid">
		{#each collectionEntries as e (e.key)}
			{@const owned = collection[e.id] ?? 0}
			<div class="colcell" class:missing={owned === 0} class:fa={e.fullArt}>
				<a
					href="/card/{e.base.id}{e.key === e.base.id ? '' : `?v=${e.key}`}"
					aria-label="{e.base.name}{e.fullArt ? ' — Full Art' : ''}"
				>
					<LazyCard card={e.view} fullArt={e.fullArt} interactive={owned > 0} thumb />
				</a>
				{#if e.label !== 'Raw'}
					<span
						class="fabadge"
						class:sp={e.view.gene.foilPreset === 'showcase' && !!e.view.cutout}
					>
						{e.label}
					</span>
				{/if}
				{#if owned > 0}
					<span class="owncount">×{owned}</span>
				{:else}
					<span class="lock">Non possédée</span>
				{/if}
				{#if owned > 0}
					{@const v = valeurUnitaire(e.view.sourceRarity ?? e.view.rarity, e.view.rarity)}
					<button
						class="vendre1"
						title="Vendre un exemplaire"
						onclick={() => vendreUne(e.key)}
					>
						Vendre 1 · +{v.syllabes || v.eclats}
						{#if v.syllabes}
							<span class="syl" aria-hidden="true"></span>
						{:else}
							<i class="shard" aria-hidden="true"></i>
						{/if}
					</button>
				{/if}
				{#if surplusOf(e.key) > 0}
					<button
						class="sellbtn"
						title="Revendre les copies au-delà de 3"
						onclick={() => sellSurplus(e.key)}
					>
						Revendre ×{surplusOf(e.key)} · +{surplusOf(e.key) * (SELL_VALUE[e.view.rarity] ?? 5)}
						<i class="shard" aria-hidden="true"></i>
					</button>
				{/if}
			</div>
		{/each}
	</div>
{:else if tab === 'quetes'}
	<!-- ============ QUÊTES ============ -->
	<div class="qwrap">
		<section class="qgroup">
			<h3>Journalières <small>— remises à zéro chaque jour</small></h3>
			{#each DAILY as q (q.id)}
				{@const st = questProgress('daily', q.id)}
				<div class="qrow" class:claimed={st.claimed}>
					<div class="qinfo">
						<p class="qlabel">{q.label}</p>
						<div class="qbar"><i style="width: {Math.min(100, (st.p / q.n) * 100)}%"></i></div>
					</div>
					<span class="qcount">{Math.min(st.p, q.n)}/{q.n}</span>
					<span class="qreward"><i class="shard" aria-hidden="true"></i>{q.reward}</span>
					{#if st.claimed}
						<span class="qdone" title="Réclamé">✓</span>
					{:else}
						<button class="qclaim" disabled={st.p < q.n} onclick={() => claimQuest('daily', q.id)}
							>Réclamer</button
						>
					{/if}
				</div>
			{/each}
		</section>
		<section class="qgroup">
			<h3>Hebdomadaires <small>— remises à zéro chaque semaine</small></h3>
			{#each WEEKLY as q (q.id)}
				{@const st = questProgress('weekly', q.id)}
				<div class="qrow" class:claimed={st.claimed}>
					<div class="qinfo">
						<p class="qlabel">{q.label}</p>
						<div class="qbar"><i style="width: {Math.min(100, (st.p / q.n) * 100)}%"></i></div>
					</div>
					<span class="qcount">{Math.min(st.p, q.n)}/{q.n}</span>
					<span class="qreward"><i class="shard" aria-hidden="true"></i>{q.reward}</span>
					{#if st.claimed}
						<span class="qdone" title="Réclamé">✓</span>
					{:else}
						<button class="qclaim" disabled={st.p < q.n} onclick={() => claimQuest('weekly', q.id)}
							>Réclamer</button
						>
					{/if}
				</div>
			{/each}
		</section>
		<p class="qnote">
			Les Éclats se gagnent aussi à chaque partie d'<a href="/arene">Arène</a> — victoire ou
			défaite.
		</p>
	</div>
{:else if tab === 'succes'}
	<!-- ============ LIVRE DE SUCCÈS ============ -->
	{@const claimedCount = ACHIEVEMENTS.filter((a) => eco.ach[a.id]?.claimed).length}
	<div class="qwrap">
		<p class="qsummary">
			<b>{claimedCount}</b>/{ACHIEVEMENTS.length} succès réclamés
		</p>
		{#each ACH_CATEGORIES as cat (cat.id)}
			{@const list = ACHIEVEMENTS.filter((a) => a.cat === cat.id)}
			{#if list.length > 0}
				<section class="qgroup">
					<h3>
						{cat.label}
						<small>— {list.filter((a) => eco.ach[a.id]?.claimed).length}/{list.length}</small>
					</h3>
					{#each list as a (a.id)}
						{@const done = a.check(eco.stats, achCtx)}
						{@const isClaimed = eco.ach[a.id]?.claimed ?? false}
						<div class="qrow" class:claimed={isClaimed}>
							<div class="qinfo">
								<p class="qlabel">{a.label}</p>
								<p class="qdesc">{a.desc}</p>
							</div>
							<span class="qreward"><i class="shard" aria-hidden="true"></i>{a.reward}</span>
							{#if isClaimed}
								<span class="qdone" title="Réclamé">✓</span>
							{:else}
								<button
									class="qclaim"
									disabled={!done}
									onclick={() => claimAchievement(a.id, achCtx)}>Réclamer</button
								>
							{/if}
						</div>
					{/each}
				</section>
			{/if}
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
			<p>Vous n’avez encore aucun deck. Créez-en un et réunissez 30 cartes pour pouvoir jouer.</p>
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
						onclick={() => (fFaction = f)}
						><span style="color: {charter.factions[f].color}"><FactionSigil faction={f} flat /></span></button
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
										><FactionSigil faction={c.faction} flat /></i
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
				<p class="empty-deck">Sélectionnez une carte de votre collection pour l’ajouter au deck.</p>
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
{/if}

<style>
	/* ---------- la porte ---------- */
	.gate {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
		max-width: 430px;
		margin: 7rem auto 4rem;
		padding: 2.6rem 2.4rem 2rem;
		text-align: center;
		background: var(--panel);
		border: 1px solid rgba(213, 178, 94, 0.3);
		border-radius: 20px;
		backdrop-filter: blur(12px);
	}
	/* ---------- Éclats / quêtes / succès ---------- */
	.chip.gold {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-color: rgba(213, 178, 94, 0.4);
		background: rgba(213, 178, 94, 0.08);
	}
	.shard {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		rotate: 45deg;
		border-radius: 2px;
		background: linear-gradient(135deg, #f2d98a, #a97f2c);
		box-shadow: 0 0 8px rgba(213, 178, 94, 0.5);
	}
	.claimdot {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		margin-left: 0.4rem;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #f2d98a, #c9a445);
		box-shadow: 0 0 8px rgba(213, 178, 94, 0.8);
		vertical-align: middle;
	}
	.qwrap {
		display: flex;
		flex-direction: column;
		gap: 1.6rem;
		max-width: 760px;
	}
	.qgroup {
		padding: 1.3rem 1.4rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 16px;
		backdrop-filter: blur(10px);
	}
	.qgroup h3 {
		margin: 0 0 1rem;
		font-size: 0.98rem;
		font-weight: 650;
	}
	.qgroup h3 small {
		font-weight: 450;
		font-size: 0.76rem;
		color: rgba(238, 240, 245, 0.4);
	}
	.qrow {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.7rem 0.2rem;
		border-top: 1px solid rgba(140, 170, 220, 0.08);
	}
	.qrow.claimed {
		opacity: 0.55;
	}
	.qinfo {
		flex: 1;
		min-width: 0;
	}
	.qlabel {
		margin: 0 0 0.35rem;
		font-size: 0.9rem;
		font-weight: 550;
	}
	.qdesc {
		margin: 0;
		font-size: 0.78rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.qbar {
		height: 4px;
		border-radius: 2px;
		background: rgba(140, 170, 220, 0.12);
		overflow: hidden;
	}
	.qbar i {
		display: block;
		height: 100%;
		border-radius: 2px;
		background: linear-gradient(90deg, #f2d98a, #c9a445);
		transition: width 0.3s ease;
	}
	.qcount {
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
		color: rgba(238, 240, 245, 0.5);
		white-space: nowrap;
	}
	.qreward {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.84rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: #d5b25e;
		white-space: nowrap;
	}
	.qclaim {
		padding: 0.4rem 0.95rem;
		border: none;
		border-radius: 999px;
		background: var(--cream);
		color: #171b10;
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 0 12px rgba(213, 178, 94, 0.25);
	}
	.qclaim:disabled {
		background: rgba(140, 170, 220, 0.12);
		color: rgba(238, 240, 245, 0.35);
		box-shadow: none;
		cursor: default;
	}
	.qdone {
		display: grid;
		place-items: center;
		width: 1.7rem;
		height: 1.7rem;
		border-radius: 50%;
		background: rgba(213, 178, 94, 0.15);
		color: var(--gold);
		font-weight: 700;
	}
	.qsummary {
		margin: 0;
		font-size: 0.9rem;
		color: rgba(238, 240, 245, 0.55);
	}
	.qsummary b {
		color: var(--gold);
		font-variant-numeric: tabular-nums;
	}
	.qnote {
		margin: 0;
		font-size: 0.82rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.qnote a {
		color: var(--gold);
	}

	.outbtn {
		padding: 0.4rem 0.85rem;
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 550;
		color: rgba(255, 150, 150, 0.75);
		background: transparent;
		border: 1px solid rgba(220, 90, 90, 0.35);
		border-radius: 999px;
		cursor: pointer;
	}
	.outbtn:hover {
		color: #ffb3b3;
		border-color: rgba(220, 90, 90, 0.6);
	}
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
		margin: 0 0 1.2rem;
		font-size: 0.85rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.hint a {
		color: var(--gold);
	}

	.reset-line {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex-wrap: wrap;
		margin: 0 0 1.6rem;
		font-size: 0.8rem;
		color: rgba(238, 240, 245, 0.4);
	}
	.resetbtn {
		padding: 0.4rem 0.9rem;
		border: 1px solid rgba(220, 90, 90, 0.35);
		border-radius: 999px;
		background: transparent;
		color: rgba(255, 150, 150, 0.75);
		font-family: inherit;
		font-size: 0.78rem;
		font-weight: 550;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease;
	}
	.resetbtn:hover {
		border-color: rgba(220, 90, 90, 0.6);
		color: #ffb3b3;
	}

	/* ---------- revente du surplus ---------- */
	.autosell {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		margin: 0 0 1rem;
		padding: 0.75rem 1.2rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 14px;
		cursor: pointer;
		max-width: 640px;
	}
	.autosell input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.autosell .track {
		flex: none;
		position: relative;
		width: 2.6rem;
		height: 1.4rem;
		border-radius: 999px;
		background: rgba(140, 170, 220, 0.18);
		transition: background 0.18s ease;
	}
	.autosell .track i {
		position: absolute;
		top: 0.15rem;
		left: 0.15rem;
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 50%;
		background: rgba(238, 240, 245, 0.75);
		transition:
			left 0.18s ease,
			background 0.18s ease;
	}
	.autosell input:checked + .track {
		background: rgba(213, 178, 94, 0.45);
	}
	.autosell input:checked + .track i {
		left: 1.35rem;
		background: linear-gradient(135deg, #f2d98a, #c9a445);
		box-shadow: 0 0 8px rgba(213, 178, 94, 0.7);
	}
	.autosell input:focus-visible + .track {
		outline: 2px solid rgba(213, 178, 94, 0.6);
		outline-offset: 2px;
	}
	.autosell-txt {
		display: flex;
		flex-direction: column;
		font-size: 0.88rem;
		font-weight: 550;
	}
	.autosell-txt small {
		font-weight: 450;
		font-size: 0.76rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.sellbar {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin: 0 0 1.6rem;
		padding: 0.8rem 1.2rem;
		background: rgba(213, 178, 94, 0.06);
		border: 1px solid rgba(213, 178, 94, 0.3);
		border-radius: 14px;
		font-size: 0.88rem;
		color: rgba(238, 240, 245, 0.65);
	}
	.sellbar b {
		color: var(--gold);
		font-variant-numeric: tabular-nums;
	}
	.sellall {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		margin-left: auto;
		padding: 0.5rem 1.1rem;
		border: none;
		border-radius: 999px;
		background: var(--cream);
		color: #171b10;
		font-family: inherit;
		font-size: 0.84rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		box-shadow: 0 0 14px rgba(213, 178, 94, 0.25);
	}
	.sellall:hover {
		background: #f7edd6;
	}
	.sellbtn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.55rem;
		padding: 0.32rem 0.85rem;
		border: 1px solid rgba(213, 178, 94, 0.45);
		border-radius: 999px;
		background: rgba(213, 178, 94, 0.1);
		color: var(--gold);
		font-family: inherit;
		font-size: 0.74rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.sellbtn:hover {
		background: rgba(213, 178, 94, 0.22);
	}

	/* ---------- collection ---------- */
	.colgrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
		gap: 2rem 1.4rem;
	}
	/* Pas de content-visibility ici : il implique contain: paint, qui rogne tout
	   ce qui déborde de la cellule — le badge de version comme le compteur ×n, tous
	   deux volontairement posés à cheval sur le bord. Le gain n'avait de toute façon
	   jamais été mesuré sur cette page ; ce qui rend la galerie fluide, c'est le
	   will-change conditionnel, la géométrie mise en cache et les vignettes 640 px. */
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
	.fabadge {
		position: absolute;
		top: -0.5rem;
		left: 0.4rem;
		max-width: calc(100% - 0.8rem);
		z-index: 5;
		padding: 0.15rem 0.6rem;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: #171b10;
		background: linear-gradient(90deg, #e8a7b8, #e8d3a7, #a7e8c6, #a7c6e8, #c9a7e8);
	}
	/* La SP a son étiquette à elle : un prisme CHAUD, rouge vers l'or, qui ne se
	   confond pas avec l'arc-en-ciel froid des autres finitions. */
	.fabadge.sp {
		color: #2a1206;
		background: linear-gradient(90deg, #d6483c, #e8703f, #f0a63f, #f5d363, #e8b04a, #d6533c);
		border-radius: 999px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
	}
	.vendre1 {
		margin-top: 0.55rem;
		padding: 0.32rem 0.85rem;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: inherit;
		font-size: 0.74rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: rgba(238, 240, 245, 0.7);
		background: rgba(140, 170, 220, 0.08);
		border: 1px solid var(--panel-line);
		border-radius: 999px;
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}
	.vendre1:hover {
		color: var(--ink);
		border-color: rgba(213, 178, 94, 0.5);
	}
	/* la Syllabe : un éclat vertical, comme un trait de voix */
	.syl {
		width: 0.38rem;
		height: 0.64rem;
		border-radius: 40% 40% 45% 45%;
		background: linear-gradient(180deg, #fff6dc, #a97f2c);
		box-shadow: 0 0 6px rgba(213, 178, 94, 0.6);
		flex: none;
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
