<script lang="ts">
	import { onMount } from 'svelte';
	import FactionSigil from '$lib/FactionSigil.svelte';
	import logo from '$lib/assets/logo.svg';
	import { charter } from '$lib/charter';
	import { getCard } from '$lib/cards';
	import { loadDecks, validateDeck, validateDeckOwnership, type Deck } from '$lib/decks';
	import { loadCollection } from '$lib/gacha';
	import { session, initSession } from '$lib/account.svelte';
	import { nsKey } from '$lib/store';
	import { MAJORS } from '$lib/game/engine';
	import type { CardData, FactionId } from '$lib/types';

	/**
	 * LE VESTIBULE — la page ne fait plus jouer : elle prépare.
	 *
	 * Tous les duels se disputent sur le vrai terrain (/duel), dans sa propre
	 * fenêtre plein écran. Ici on choisit son deck et sa porte d'entrée :
	 * partie rapide (matchmaking), création d'un salon privé, ou code d'un ami.
	 * C'est la fenêtre de duel qui héberge le salon, affiche le code et attend.
	 */

	let myDecks = $state<Deck[]>([]);
	let deckChoice = $state<string>('auto-vasar');
	let joinCode = $state('');
	let fenetreBloquee = $state(false);
	let lance = $state<null | { type: 'rapide' | 'hote' | 'invite'; code?: string }>(null);

	const myName = $derived(
		session.account
			? (localStorage.getItem(nsKey('expelled-pseudo')) ?? session.account.email.split('@')[0])
			: 'Sans-Nom'
	);

	onMount(() => {
		initSession();
		const collection = loadCollection();
		myDecks = loadDecks().filter(
			(d) => validateDeck(d, getCard).isLegal && validateDeckOwnership(d, collection).isLegal
		);
	});

	function expandDeck(d: Deck): CardData[] {
		const list: CardData[] = [];
		for (const [id, n] of Object.entries(d.cards)) {
			const c = getCard(id);
			if (c) for (let i = 0; i < n; i++) list.push(c);
		}
		return list;
	}
	function dominantFaction(list: CardData[]): FactionId {
		const count: Partial<Record<FactionId, number>> = {};
		for (const c of list) count[c.faction] = (count[c.faction] ?? 0) + 1;
		return (Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'vasar') as FactionId;
	}

	/** Le deck choisi, traduit en paramètres pour la fenêtre de duel. */
	function paramsBase(): URLSearchParams {
		const auto = deckChoice.startsWith('auto-');
		const q = new URLSearchParams({ mode: 'pvp' });
		if (auto) {
			q.set('moi', deckChoice.slice(5));
		} else {
			const d = myDecks.find((x) => x.id === deckChoice);
			q.set('moi', d ? dominantFaction(expandDeck(d)) : 'vasar');
			q.set('deck', deckChoice);
		}
		return q;
	}

	function ouvrirDuel(q: URLSearchParams): boolean {
		const f = window.open(
			`/duel?${q}`,
			'expelled-terrain',
			`popup=yes,width=${screen.availWidth},height=${screen.availHeight},left=0,top=0`
		);
		if (!f || f.closed) {
			fenetreBloquee = true;
			return false;
		}
		fenetreBloquee = false;
		f.focus();
		return true;
	}

	function partieRapide() {
		const q = paramsBase();
		q.set('rapide', '1');
		if (ouvrirDuel(q)) lance = { type: 'rapide' };
	}

	function creerSalon() {
		const q = paramsBase();
		q.set('role', 'hote');
		if (ouvrirDuel(q)) lance = { type: 'hote' };
	}

	function rejoindre() {
		const code = joinCode.trim().toUpperCase();
		if (code.length < 6) return;
		const q = paramsBase();
		q.set('role', 'invite');
		q.set('code', code);
		if (ouvrirDuel(q)) lance = { type: 'invite', code };
	}
</script>

<svelte:head>
	<title>Salons — {charter.game.name}</title>
	<meta name="description" content="Duels 1v1 entre joueurs : partie rapide ou salons privés." />
</svelte:head>

<header class="setup-hero">
	<p class="kicker">◯ Salons en ligne</p>
	<h1>Duel en ligne</h1>
	<p class="tagline">
		Lancez une partie rapide contre le premier joueur disponible, ou passez par un salon privé
		avec un code. Le duel s'ouvre sur le terrain, dans sa propre fenêtre.
	</p>
</header>
<div class="setup">
	<section class="spanel">
		<h2>Votre deck</h2>
		<div class="choices">
			{#each MAJORS as f (f)}
				<button
					class="choice"
					class:on={deckChoice === `auto-${f}`}
					style="--fc: {charter.factions[f].color}"
					onclick={() => (deckChoice = `auto-${f}`)}
				>
					<span class="c-sigil"><FactionSigil faction={f} /></span>
					<span class="c-name">{charter.factions[f].name} <small>prêt à jouer</small></span>
				</button>
			{/each}
			{#each myDecks as d (d.id)}
				<button class="choice" class:on={deckChoice === d.id} onclick={() => (deckChoice = d.id)}>
					<span class="c-sigil deck">🂠</span>
					<span class="c-name">{d.name} <small>votre deck · 30 cartes</small></span>
				</button>
			{/each}
		</div>
	</section>
	<section class="spanel">
		<h2>Trouver un adversaire</h2>
		<button class="startbtn rapide" onclick={partieRapide}>⚡ Partie rapide</button>
		<p class="ou">— ou par salon privé —</p>
		<button class="startbtn" onclick={creerSalon}>Créer un salon</button>
		<div class="joinrow">
			<input
				type="text"
				bind:value={joinCode}
				placeholder="CODE DU SALON"
				maxlength="6"
				style="text-transform: uppercase"
			/>
			<button class="joinbtn" disabled={joinCode.trim().length < 6} onclick={rejoindre}>Rejoindre</button>
		</div>
		{#if fenetreBloquee}
			<p class="err">
				Votre navigateur a bloqué la fenêtre du terrain — autorisez les fenêtres surgissantes
				pour ce site, puis réessayez.
			</p>
		{/if}
		{#if lance && !fenetreBloquee}
			<p class="note lancee">
				<img src={logo} alt="" aria-hidden="true" />
				{#if lance.type === 'rapide'}
					La recherche d'adversaire s'est ouverte dans la fenêtre de duel.
				{:else if lance.type === 'hote'}
					Le salon s'est ouvert dans la fenêtre de duel — le code à partager s'y affiche.
				{:else}
					Connexion au salon {lance.code} dans la fenêtre de duel.
				{/if}
			</p>
		{/if}
		<p class="note">
			Vous jouez en tant que <b>{myName}</b> · <a href="/arene">l'Arène contre l'IA</a> reste ouverte.
		</p>
	</section>
</div>

<style>
	/* ============ écrans du vestibule ============ */
	.setup-hero {
		margin: 4rem 0 2.5rem;
	}
	.kicker {
		margin: 0 0 1rem;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--gold);
	}
	h1 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 400;
		font-size: clamp(2.4rem, 5.5vw, 4rem);
	}
	.tagline {
		margin: 1.2rem 0 0;
		max-width: 60ch;
		color: rgba(238, 240, 245, 0.55);
		line-height: 1.6;
	}
	.setup {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.6rem;
	}
	.spanel {
		padding: 1.6rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 18px;
		backdrop-filter: blur(12px);
	}
	.spanel h2 {
		margin: 0 0 1rem;
		font-size: 1.05rem;
		font-weight: 650;
	}
	.choices {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.choice {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.7rem 0.9rem;
		border: 1px solid var(--panel-line);
		border-radius: 12px;
		background: rgba(140, 170, 220, 0.05);
		font-family: inherit;
		color: rgba(238, 240, 245, 0.75);
		cursor: pointer;
		text-align: left;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.choice:hover {
		border-color: rgba(213, 178, 94, 0.4);
	}
	.choice.on {
		border-color: rgba(213, 178, 94, 0.6);
		background: rgba(213, 178, 94, 0.1);
		color: var(--ink);
	}
	.c-sigil {
		width: 1.8rem;
		height: 1.8rem;
		font-size: 1.6rem;
		color: var(--fc, var(--gold));
	}
	.c-sigil.deck {
		display: grid;
		place-items: center;
		font-size: 1.3rem;
		color: var(--gold);
	}
	.c-name {
		display: flex;
		flex-direction: column;
		font-weight: 600;
		font-size: 0.95rem;
	}
	.c-name small {
		font-weight: 450;
		font-size: 0.72rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.startbtn {
		display: inline-block;
		width: 100%;
		box-sizing: border-box;
		text-align: center;
		text-decoration: none;
		padding: 0.85rem 1.4rem;
		border: none;
		border-radius: 999px;
		background: var(--cream);
		color: #171b10;
		font-family: inherit;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 0 22px rgba(213, 178, 94, 0.3);
	}
	.startbtn:hover {
		background: #f7edd6;
	}
	.startbtn.rapide {
		background: linear-gradient(120deg, #e8c877, var(--cream) 45%, #e8c877);
		box-shadow: 0 0 30px rgba(213, 178, 94, 0.45);
	}
	.ou {
		margin: 0.9rem 0 0.9rem;
		text-align: center;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.35);
	}
	.joinrow {
		display: flex;
		gap: 0.6rem;
		margin-top: 1rem;
	}
	.joinrow input {
		flex: 1;
		min-width: 0;
		padding: 0.7rem 1rem;
		font-family: inherit;
		font-size: 1rem;
		letter-spacing: 0.2em;
		color: var(--ink);
		background: rgba(140, 170, 220, 0.08);
		border: 1px solid var(--panel-line);
		border-radius: 11px;
	}
	.joinrow input:focus {
		outline: none;
		border-color: rgba(213, 178, 94, 0.6);
	}
	.joinbtn {
		padding: 0.7rem 1.3rem;
		border: 1px solid rgba(213, 178, 94, 0.5);
		border-radius: 999px;
		background: rgba(213, 178, 94, 0.1);
		color: var(--gold);
		font-family: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.joinbtn:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.err {
		margin: 0.8rem 0 0;
		font-size: 0.85rem;
		color: #ff9d9d;
	}
	.note {
		margin: 1rem 0 0;
		font-size: 0.82rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.note a,
	.note b {
		color: var(--gold);
	}
	.note.lancee {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 0.9rem;
		border: 1px solid rgba(213, 178, 94, 0.3);
		border-radius: 12px;
		background: rgba(213, 178, 94, 0.07);
		color: rgba(238, 240, 245, 0.7);
	}
	.note.lancee img {
		width: 1.6rem;
		filter: drop-shadow(0 0 8px rgba(213, 178, 94, 0.45));
	}
</style>
