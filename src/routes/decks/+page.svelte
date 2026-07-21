<script lang="ts">
	import { onMount } from 'svelte';
	import FactionSigil from '$lib/FactionSigil.svelte';
	import Card from '$lib/Card.svelte';
	import { charter } from '$lib/charter';
	import { cards, getCard } from '$lib/cards';
	import { loadCollection } from '$lib/gacha';
	import {
		loadDecks,
		saveDecks,
		newDeck,
		deckSize,
		maxCopiesOf,
		costCurve,
		factionSpread,
		DECK_SIZE,
		type Deck
	} from '$lib/decks';
	import type { CardData, FactionId, Rarity } from '$lib/types';

	/* ---------------- données de référence ---------------- */

	const FACTIONS = Object.keys(charter.factions) as FactionId[];
	const RARITIES = Object.keys(charter.rarities) as Rarity[];
	const KINDS = [
		{ id: 'etre', label: 'Êtres' },
		{ id: 'verbe', label: 'Verbes' },
		{ id: 'relique', label: 'Reliques' },
		{ id: 'lieu', label: 'Lieux' }
	] as const;

	/* ---------------- decks ---------------- */

	let decks = $state<Deck[]>([]);
	let courantId = $state('');
	let pret = $state(false);

	const deck = $derived(decks.find((d) => d.id === courantId));

	onMount(() => {
		const chargés = loadDecks();
		decks = chargés.length ? chargés : [newDeck('Nouveau deck')];
		courantId = decks[0].id;
		collection = loadCollection();
		pret = true;
	});

	/** Persiste dès qu'une modification a lieu (jamais au premier rendu). */
	function persister() {
		if (!pret) return;
		if (deck) deck.updatedAt = Date.now();
		saveDecks($state.snapshot(decks) as Deck[]);
	}

	function creer() {
		const d = newDeck(`Deck ${decks.length + 1}`);
		decks = [...decks, d];
		courantId = d.id;
		persister();
	}

	function dupliquer() {
		if (!deck) return;
		const d = newDeck(`${deck.name} (copie)`);
		d.cards = { ...$state.snapshot(deck).cards };
		decks = [...decks, d];
		courantId = d.id;
		persister();
	}

	function supprimer() {
		if (!deck) return;
		decks = decks.filter((d) => d.id !== deck.id);
		if (!decks.length) decks = [newDeck('Nouveau deck')];
		courantId = decks[0].id;
		persister();
	}

	function vider() {
		if (!deck) return;
		deck.cards = {};
		persister();
	}

	/* ---------------- collection ---------------- */

	let collection = $state<Record<string, number>>({});

	/** Exemplaires possédés d'une carte, toutes versions confondues (Raw, foils, Full Art). */
	function possedees(id: string): number {
		let n = 0;
		for (const [clé, q] of Object.entries(collection)) {
			if (clé === id || clé.startsWith(`${id}--`)) n += q;
		}
		return n;
	}

	/* ---------------- filtres ---------------- */

	let recherche = $state('');
	let factionsSel = $state<FactionId[]>([]);
	let raretesSel = $state<Rarity[]>([]);
	let kindSel = $state<string[]>([]);
	let masquerNonPossedees = $state(false);

	function bascule<T>(liste: T[], v: T): T[] {
		return liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v];
	}

	function reinitialiser() {
		recherche = '';
		factionsSel = [];
		raretesSel = [];
		kindSel = [];
		masquerNonPossedees = false;
	}

	const filtreActif = $derived(
		!!recherche || !!factionsSel.length || !!raretesSel.length || !!kindSel.length || masquerNonPossedees
	);

	const catalogue = $derived(
		cards
			.filter((c) => {
				if (factionsSel.length && !factionsSel.includes(c.faction)) return false;
				if (raretesSel.length && !raretesSel.includes(c.rarity)) return false;
				if (kindSel.length && !kindSel.includes(c.kind)) return false;
				if (masquerNonPossedees && possedees(c.id) === 0) return false;
				if (recherche) {
					const q = recherche.toLowerCase();
					const foin = `${c.name} ${c.text} ${c.flavor ?? ''}`.toLowerCase();
					if (!foin.includes(q)) return false;
				}
				return true;
			})
			.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name))
	);

	/* ---------------- édition du deck ---------------- */

	const taille = $derived(deck ? deckSize(deck) : 0);
	const complet = $derived(taille >= DECK_SIZE);

	function exemplaires(id: string): number {
		return deck?.cards[id] ?? 0;
	}

	function peutAjouter(c: CardData): boolean {
		if (!deck) return false;
		return taille < DECK_SIZE && exemplaires(c.id) < maxCopiesOf(c);
	}

	/** Dernier refus d'ajout, affiché brièvement pour dire POURQUOI ça n'a pas marché. */
	let refus = $state('');
	let refusTimer: ReturnType<typeof setTimeout> | null = null;

	function signaler(msg: string) {
		refus = msg;
		if (refusTimer) clearTimeout(refusTimer);
		refusTimer = setTimeout(() => (refus = ''), 2600);
	}

	function ajouter(c: CardData) {
		if (!deck) return;
		if (taille >= DECK_SIZE) {
			signaler(`Deck complet : ${DECK_SIZE} cartes maximum.`);
			return;
		}
		const max = maxCopiesOf(c);
		if (exemplaires(c.id) >= max) {
			signaler(
				`${max} copie${max > 1 ? 's' : ''} maximum pour une ${charter.rarities[c.rarity].name.toLowerCase()}.`
			);
			return;
		}
		deck.cards[c.id] = exemplaires(c.id) + 1;
		persister();
	}

	function retirer(c: CardData) {
		if (!deck) return;
		const n = exemplaires(c.id);
		if (n <= 1) delete deck.cards[c.id];
		else deck.cards[c.id] = n - 1;
		persister();
	}

	/* ---------------- statistiques ---------------- */

	const lignes = $derived(
		deck
			? Object.entries(deck.cards)
					.map(([id, n]) => ({ card: getCard(id)!, n }))
					.filter((r) => r.card)
					.sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name))
			: []
	);

	const courbe = $derived(deck ? costCurve(deck, getCard) : []);
	const courbeMax = $derived(Math.max(1, ...courbe));
	const peuples = $derived(deck ? factionSpread(deck, getCard) : {});
	const peuplesTries = $derived(
		Object.entries(peuples).sort((a, b) => b[1] - a[1]) as [FactionId, number][]
	);

	/** Un deck est jouable s'il est complet et ne dépasse aucune limite de copies. */
	const invalides = $derived(
		lignes.filter((r) => r.n > maxCopiesOf(r.card)).map((r) => r.card.name)
	);

	/* ---------------- interactions ----------------
	   Clic simple = lire la carte en grand. Double-clic ou glisser-déposer = ajouter.
	   L'aperçu est différé de 200 ms puis annulé si un double-clic suit, sinon le
	   premier clic ouvrirait la loupe et le second atterrirait dessus. */

	let apercu = $state<CardData | null>(null);
	let survolDepot = $state(false);
	let minuterie: ReturnType<typeof setTimeout> | null = null;

	function clicTuile(c: CardData) {
		if (minuterie) clearTimeout(minuterie);
		minuterie = setTimeout(() => (apercu = c), 200);
	}

	function doubleClicTuile(c: CardData) {
		if (minuterie) clearTimeout(minuterie);
		minuterie = null;
		ajouter(c);
	}

	function debutGlisser(e: DragEvent, c: CardData) {
		if (minuterie) clearTimeout(minuterie);
		e.dataTransfer?.setData('text/plain', c.id);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
	}

	function deposer(e: DragEvent) {
		e.preventDefault();
		survolDepot = false;
		const id = e.dataTransfer?.getData('text/plain');
		const c = id ? getCard(id) : undefined;
		if (c) ajouter(c);
	}
</script>

<svelte:head>
	<title>Atelier de deck — {charter.game.name}</title>
	<meta name="description" content="Construisez vos decks du Silence : 30 cartes, copies limitées par rareté." />
</svelte:head>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (apercu = null)} />

<div class="atelier">
	<!-- ========== PANNEAU DECK ========== -->
	<aside
		class="panneau"
		class:depot={survolDepot}
		ondragover={(e) => {
			e.preventDefault();
			survolDepot = true;
		}}
		ondragleave={() => (survolDepot = false)}
		ondrop={deposer}
	>
		<div class="entete">
			{#if deck}
				<input
					class="nom"
					bind:value={deck.name}
					oninput={persister}
					aria-label="Nom du deck"
					placeholder="Nom du deck"
				/>
			{/if}
			<select class="choix" bind:value={courantId} aria-label="Deck courant">
				{#each decks as d (d.id)}
					<option value={d.id}>{d.name} — {deckSize(d)}/{DECK_SIZE}</option>
				{/each}
			</select>
		</div>

		<div class="actions">
			<button type="button" onclick={creer}>Nouveau</button>
			<button type="button" onclick={dupliquer}>Dupliquer</button>
			<button type="button" onclick={vider}>Vider</button>
			<button type="button" class="danger" onclick={supprimer}>Supprimer</button>
		</div>

		<!-- identité : peuples représentés -->
		<div class="identite">
			{#if peuplesTries.length}
				{#each peuplesTries as [f, n] (f)}
					<span class="peuple" style="--fc: {charter.factions[f].color}" title={charter.factions[f].name}>
						<FactionSigil faction={f} />
						<b>{n}</b>
					</span>
				{/each}
			{:else}
				<p class="vide-note">Aucun peuple engagé.</p>
			{/if}
		</div>

		<!-- liste -->
		<ol class="liste">
			{#each lignes as r (r.card.id)}
				<li>
					<button
						class="ligne"
						style="--fc: {charter.factions[r.card.faction]?.color ?? '#8892a6'}"
						onclick={() => retirer(r.card)}
						title="Clic : retirer une copie"
					>
						<span class="cout">{r.card.cost}</span>
						<img class="vignette" src={r.card.art} alt="" loading="lazy" />
						<span class="titre">{r.card.name}</span>
						<span class="qte" class:trop={r.n > maxCopiesOf(r.card)}>{r.n}</span>
					</button>
				</li>
			{:else}
				<li class="vide">
					<p>Le deck est vide.</p>
					<p class="sub">Double-cliquez une carte, ou glissez-la jusqu'ici.</p>
				</li>
			{/each}
		</ol>

		<!-- courbe de Volonté -->
		<div class="courbe" aria-label="Répartition des coûts en Volonté">
			{#each courbe as n, i (i)}
				<span class="barre" style="--h: {(n / courbeMax) * 100}%">
					<b>{n || ''}</b>
					<i>{i === 7 ? '7+' : i}</i>
				</span>
			{/each}
		</div>

		<section class="contraintes">
			<h3>Règles de construction</h3>
			<ul>
				<li><b>{DECK_SIZE}</b> cartes exactement.</li>
				{#each RARITIES as r (r)}
					<li>
						<span class="cr-nom">{charter.rarities[r].name}</span>
						<b>{charter.rarities[r].maxCopies}</b>
						copie{charter.rarities[r].maxCopies > 1 ? 's' : ''} max par carte
					</li>
				{/each}
			</ul>
		</section>

		{#if refus}
			<p class="refus" role="status">{refus}</p>
		{/if}

		<footer class="bilan" class:ok={complet && !invalides.length}>
			<span class="compte">{taille} / {DECK_SIZE}</span>
			{#if invalides.length}
				<span class="alerte">Trop de copies : {invalides.join(', ')}</span>
			{:else if complet}
				<span class="pret">Deck complet</span>
			{:else}
				<span class="reste">{DECK_SIZE - taille} carte{DECK_SIZE - taille > 1 ? 's' : ''} à ajouter</span>
			{/if}
		</footer>
	</aside>

	<!-- ========== CATALOGUE ========== -->
	<section class="catalogue">
		<div class="barre-filtres">
			<input class="recherche" type="search" placeholder="Rechercher un nom, un effet…" bind:value={recherche} />

			<div class="groupe" role="group" aria-label="Peuples">
				{#each FACTIONS as f (f)}
					<button
						type="button"
						class="jeton"
						class:on={factionsSel.includes(f)}
						style="--fc: {charter.factions[f].color}"
						onclick={() => (factionsSel = bascule(factionsSel, f))}
						title={charter.factions[f].name}
					>
						<FactionSigil faction={f} flat />
					</button>
				{/each}
			</div>

			<div class="groupe" role="group" aria-label="Raretés">
				{#each RARITIES as r (r)}
					<button
						type="button"
						class="jeton texte"
						class:on={raretesSel.includes(r)}
						onclick={() => (raretesSel = bascule(raretesSel, r))}
					>
						{charter.rarities[r].name}
					</button>
				{/each}
			</div>

			<div class="groupe" role="group" aria-label="Types">
				{#each KINDS as k (k.id)}
					<button
						type="button"
						class="jeton texte"
						class:on={kindSel.includes(k.id)}
						onclick={() => (kindSel = bascule(kindSel, k.id))}
					>
						{k.label}
					</button>
				{/each}
			</div>

			<label class="bascule">
				<input type="checkbox" bind:checked={masquerNonPossedees} />
				Possédées uniquement
			</label>

			{#if filtreActif}
				<button type="button" class="raz" onclick={reinitialiser}>Réinitialiser</button>
			{/if}
		</div>

		<p class="compteur">
			{catalogue.length} carte{catalogue.length > 1 ? 's' : ''}
			<span class="aide-interaction">— clic pour lire, double-clic ou glisser vers le deck pour ajouter</span>
		</p>

		<div class="grille">
			{#each catalogue as c (c.id)}
				{@const n = exemplaires(c.id)}
				{@const max = maxCopiesOf(c)}
				{@const owned = possedees(c.id)}
				<button
					class="tuile"
					class:saturee={n >= max}
					class:bloquee={!peutAjouter(c) && n < max}
					style="--fc: {charter.factions[c.faction]?.color ?? '#8892a6'}"
					draggable="true"
					ondragstart={(e) => debutGlisser(e, c)}
					onclick={() => clicTuile(c)}
					ondblclick={() => doubleClicTuile(c)}
					title="Clic : lire la carte · Double-clic ou glisser vers le deck : ajouter"
				>
					<span class="art"><img src={c.art} alt="" loading="lazy" /></span>
					<span class="tcout">{c.cost}</span>
					{#if n}<span class="tqte">{n}/{max}</span>{/if}
					{#if !owned}<span class="tnon">non possédée</span>{/if}
					<span class="tnom">{c.name}</span>
					<span class="tmeta">
						<span class="tsigil"><FactionSigil faction={c.faction} flat /></span>
						{charter.rarities[c.rarity].name}
					</span>
				</button>
			{/each}
		</div>
	</section>
</div>

{#if apercu}
	<button class="loupe" onclick={() => (apercu = null)} aria-label="Fermer l'aperçu">
		<div class="loupe-carte"><Card card={apercu} /></div>
	</button>
{/if}

<style>
	.atelier {
		display: grid;
		grid-template-columns: minmax(280px, 340px) 1fr;
		gap: 1.6rem;
		align-items: start;
		padding: 1.6rem 0 4rem;
	}
	@media (max-width: 900px) {
		.atelier {
			grid-template-columns: 1fr;
		}
	}

	/* ---------- panneau deck ---------- */
	.panneau {
		position: sticky;
		top: 5.4rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 1rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 18px;
		backdrop-filter: blur(12px);
	}
	@media (max-width: 900px) {
		.panneau {
			position: static;
		}
	}
	.entete {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.nom {
		font-family: Cinzel, Georgia, serif;
		font-size: 1.05rem;
		font-weight: 700;
		padding: 0.55rem 0.8rem;
		color: var(--ink);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--panel-line);
		border-radius: 10px;
	}
	.choix {
		font: inherit;
		font-size: 0.82rem;
		padding: 0.4rem 0.6rem;
		color: rgba(238, 240, 245, 0.75);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--panel-line);
		border-radius: 8px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.actions button {
		flex: 1;
		font: inherit;
		font-size: 0.74rem;
		font-weight: 600;
		padding: 0.4rem 0.5rem;
		color: rgba(238, 240, 245, 0.7);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--panel-line);
		border-radius: 8px;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}
	.actions button:hover {
		background: rgba(213, 178, 94, 0.12);
		color: #f0e6cf;
	}
	.actions .danger:hover {
		background: rgba(200, 80, 80, 0.16);
		color: #f0cfcf;
	}

	.identite {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		min-height: 2rem;
		align-items: center;
	}
	.peuple {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.6rem 0.25rem 0.35rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--fc) 14%, transparent);
		border: 1px solid color-mix(in srgb, var(--fc) 40%, transparent);
		color: var(--fc);
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
	}
	.peuple :global(.sigil) {
		font-size: 1.2rem;
	}
	.peuple b {
		color: rgba(238, 240, 245, 0.85);
	}
	.vide-note {
		margin: 0;
		font-size: 0.78rem;
		color: rgba(238, 240, 245, 0.35);
	}

	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		max-height: 46vh;
		overflow-y: auto;
	}
	.ligne {
		width: 100%;
		display: grid;
		grid-template-columns: 1.7rem 2.2rem 1fr auto;
		align-items: center;
		gap: 0.55rem;
		padding: 0.28rem 0.5rem 0.28rem 0.28rem;
		font: inherit;
		text-align: left;
		color: rgba(238, 240, 245, 0.85);
		background: linear-gradient(90deg, color-mix(in srgb, var(--fc) 16%, transparent), transparent 70%);
		border: 1px solid var(--panel-line);
		border-radius: 8px;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.ligne:hover {
		border-color: color-mix(in srgb, var(--fc) 55%, transparent);
	}
	.cout {
		display: grid;
		place-items: center;
		width: 1.7rem;
		height: 1.7rem;
		border-radius: 50%;
		background: rgba(10, 11, 16, 0.75);
		border: 1px solid color-mix(in srgb, var(--fc) 50%, transparent);
		font-size: 0.8rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.vignette {
		width: 2.2rem;
		height: 1.6rem;
		object-fit: cover;
		border-radius: 4px;
		opacity: 0.85;
	}
	.titre {
		font-size: 0.82rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.qte {
		font-size: 0.8rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--gold);
	}
	.qte.trop {
		color: #e08585;
	}
	.vide {
		padding: 1.4rem 0.6rem;
		text-align: center;
		color: rgba(238, 240, 245, 0.4);
		font-size: 0.84rem;
	}
	.vide p {
		margin: 0;
	}
	.vide .sub {
		margin-top: 0.3rem;
		font-size: 0.76rem;
		opacity: 0.7;
	}

	.courbe {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 0.2rem;
		align-items: end;
		height: 3.6rem;
		padding-top: 0.4rem;
		border-top: 1px solid var(--panel-line);
	}
	.barre {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		gap: 0.15rem;
		height: 100%;
		font-size: 0.6rem;
		color: rgba(238, 240, 245, 0.4);
	}
	.barre b {
		width: 100%;
		height: var(--h);
		min-height: 2px;
		display: grid;
		place-items: start center;
		border-radius: 3px 3px 0 0;
		background: linear-gradient(180deg, var(--gold), rgba(213, 178, 94, 0.25));
		color: #14100a;
		font-size: 0.58rem;
		font-weight: 800;
	}
	.barre i {
		font-style: normal;
	}

	.contraintes {
		font-size: 0.76rem;
		border-top: 1px solid var(--panel-line);
		padding-top: 0.6rem;
	}
	.contraintes h3 {
		margin: 0;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(238, 240, 245, 0.4);
	}
	.contraintes ul {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.22rem;
		color: rgba(238, 240, 245, 0.5);
	}
	.contraintes li {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
	}
	.contraintes .cr-nom {
		flex: 1;
	}
	.contraintes b {
		color: var(--gold);
		font-variant-numeric: tabular-nums;
	}
	.refus {
		margin: 0;
		padding: 0.4rem 0.6rem;
		font-size: 0.76rem;
		color: #f0cfcf;
		background: rgba(200, 80, 80, 0.14);
		border: 1px solid rgba(200, 80, 80, 0.35);
		border-radius: 8px;
	}
	.bilan {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.6rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--panel-line);
		font-size: 0.78rem;
	}
	.compte {
		font-family: Cinzel, Georgia, serif;
		font-size: 1.05rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: rgba(238, 240, 245, 0.8);
	}
	.bilan.ok .compte {
		color: var(--gold);
	}
	.reste {
		color: rgba(238, 240, 245, 0.4);
	}
	.pret {
		color: #9ad5a0;
	}
	.alerte {
		color: #e08585;
		text-align: right;
	}

	/* ---------- catalogue ---------- */
	.catalogue {
		min-width: 0;
	}
	.barre-filtres {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 14px;
	}
	.recherche {
		flex: 1 1 14rem;
		font: inherit;
		font-size: 0.85rem;
		padding: 0.45rem 0.7rem;
		color: var(--ink);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--panel-line);
		border-radius: 8px;
	}
	.groupe {
		display: flex;
		gap: 0.25rem;
	}
	.jeton {
		display: grid;
		place-items: center;
		min-width: 2rem;
		height: 2rem;
		padding: 0 0.5rem;
		font: inherit;
		font-size: 0.74rem;
		font-weight: 600;
		color: rgba(238, 240, 245, 0.55);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--panel-line);
		border-radius: 8px;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}
	.jeton :global(.sigil) {
		font-size: 1.3rem;
		color: var(--fc);
	}
	.jeton:hover {
		color: var(--ink);
	}
	.jeton.on {
		background: rgba(213, 178, 94, 0.14);
		border-color: rgba(213, 178, 94, 0.5);
		color: #f0e6cf;
	}
	.bascule {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.76rem;
		color: rgba(238, 240, 245, 0.6);
		cursor: pointer;
	}
	.bascule input {
		accent-color: var(--gold);
	}
	.raz {
		font: inherit;
		font-size: 0.74rem;
		padding: 0.35rem 0.7rem;
		color: rgba(238, 240, 245, 0.6);
		background: transparent;
		border: 1px solid var(--panel-line);
		border-radius: 8px;
		cursor: pointer;
	}
	.raz:hover {
		color: var(--ink);
	}
	.compteur {
		margin: 0.7rem 0 0.5rem;
		font-size: 0.74rem;
		color: rgba(238, 240, 245, 0.35);
	}
	.aide-interaction {
		color: rgba(238, 240, 245, 0.28);
	}
	.panneau.depot {
		border-color: rgba(213, 178, 94, 0.7);
		box-shadow: 0 0 0 3px rgba(213, 178, 94, 0.16);
	}

	.grille {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.7rem;
	}
	.tuile {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0;
		font: inherit;
		text-align: left;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 12px;
		overflow: hidden;
		cursor: pointer;
		transition:
			border-color 0.16s ease,
			transform 0.16s ease;
	}
	.tuile:hover {
		border-color: color-mix(in srgb, var(--fc) 60%, transparent);
		transform: translateY(-2px);
	}
	.tuile:active {
		cursor: grabbing;
	}
	.tuile.saturee {
		border-color: rgba(213, 178, 94, 0.55);
	}
	.tuile.bloquee {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.art {
		display: block;
		aspect-ratio: 4 / 3;
		overflow: hidden;
	}
	.art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 18%;
	}
	.tcout {
		position: absolute;
		top: 0.4rem;
		left: 0.4rem;
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 50%;
		background: rgba(8, 9, 13, 0.82);
		border: 1px solid color-mix(in srgb, var(--fc) 55%, transparent);
		font-size: 0.78rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--ink);
	}
	.tqte {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: rgba(213, 178, 94, 0.9);
		color: #14100a;
		font-size: 0.68rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.tnon {
		position: absolute;
		top: 2.4rem;
		right: 0.4rem;
		padding: 0.08rem 0.4rem;
		border-radius: 999px;
		background: rgba(8, 9, 13, 0.8);
		border: 1px solid rgba(238, 240, 245, 0.18);
		color: rgba(238, 240, 245, 0.5);
		font-size: 0.6rem;
		letter-spacing: 0.04em;
	}
	.tnom {
		padding: 0 0.6rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: rgba(238, 240, 245, 0.9);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tmeta {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0 0.6rem 0.6rem;
		font-size: 0.68rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.4);
	}
	.tsigil :global(.sigil) {
		font-size: 1.1rem;
		color: var(--fc);
	}

	/* ---------- aperçu ---------- */
	.loupe {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: grid;
		place-items: center;
		padding: 2rem;
		border: none;
		background: rgba(5, 6, 10, 0.82);
		backdrop-filter: blur(6px);
		cursor: zoom-out;
	}
	.loupe-carte {
		--card-w: min(420px, 86vw);
	}
</style>
