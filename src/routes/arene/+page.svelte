<script lang="ts">
	import { onMount } from 'svelte';
	import FactionSigil from '$lib/FactionSigil.svelte';
	import { charter } from '$lib/charter';
	import { getCard } from '$lib/cards';
	import { loadDecks, validateDeck, validateDeckOwnership, type Deck } from '$lib/decks';
	import { loadCollection } from '$lib/gacha';
	import { MAJORS } from '$lib/game/engine';
	import type { CardData, FactionId } from '$lib/types';

	/**
	 * L'ARÈNE — l'écran de mise en jeu contre l'IA.
	 *
	 * La page ne fait plus jouer : tous les duels se disputent sur le vrai
	 * terrain (/duel), dans sa propre fenêtre plein écran. Ici on choisit son
	 * deck et l'adversaire, puis on entre.
	 */

	let myDecks = $state<Deck[]>([]);
	let deckChoice = $state<string>('auto-vasar'); // 'auto-<faction>' ou l'id d'un deck perso
	let aiFaction = $state<FactionId>('exar');

	onMount(() => {
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

	/**
	 * Le terrain s'ouvre dans SA fenêtre : plein écran, sans rien du site autour.
	 * Le deck et les peuples voyagent par l'URL, la graine aussi — sans elle, un
	 * rechargement re-tirerait une partie différente.
	 */
	/** Vrai si le navigateur a refusé d'ouvrir la fenêtre du terrain. */
	let fenetreBloquee = $state(false);

	function ouvrirTerrain() {
		// 'auto-<peuple>' choisit un deck genere ; sinon deckChoice est un id de deck
		const auto = deckChoice.startsWith('auto-');
		const q = new URLSearchParams({
			seed: String(Math.floor(Math.random() * 1e9)),
			moi: auto ? deckChoice.slice(5) : dominantFaction(expandDeck(myDecks.find((d) => d.id === deckChoice)!)),
			lui: aiFaction
		});
		if (!auto) q.set('deck', deckChoice);
		const f = window.open(
			`/duel?${q}`,
			'expelled-terrain',
			`popup=yes,width=${screen.availWidth},height=${screen.availHeight},left=0,top=0`
		);
		// un bloqueur de fenêtres laisserait le joueur devant un bouton mort
		if (!f || f.closed) {
			fenetreBloquee = true;
			return;
		}
		fenetreBloquee = false;
		f.focus();
	}
</script>

<svelte:head>
	<title>Arène — {charter.game.name}</title>
	<meta name="description" content="Affrontez l'IA sur le terrain de duel de {charter.game.name}." />
</svelte:head>

<!-- ============ ÉCRAN DE MISE EN JEU ============ -->
<header class="setup-hero">
	<p class="kicker">◯ L'Arène</p>
	<h1>Duel d'entraînement</h1>
	<p class="tagline">
		Choisissez un deck de 30 cartes et affrontez l’IA. Réduisez l’Intégrité de son Korum à zéro
		pour remporter le duel — sur le terrain, dans sa propre fenêtre.
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
		{#if myDecks.length === 0}
			<p class="note">Vos decks complets (30 cartes) de <a href="/profil">Mon Nom</a> apparaîtront ici.</p>
		{/if}
	</section>
	<section class="spanel">
		<h2>L'adversaire</h2>
		<div class="choices">
			{#each MAJORS as f (f)}
				<button
					class="choice"
					class:on={aiFaction === f}
					style="--fc: {charter.factions[f].color}"
					onclick={() => (aiFaction = f)}
				>
					<span class="c-sigil"><FactionSigil faction={f} /></span>
					<span class="c-name">IA·{charter.factions[f].name}</span>
				</button>
			{/each}
		</div>
		<button class="startbtn" onclick={ouvrirTerrain}>Lancer le duel ↗</button>
		{#if fenetreBloquee}
			<p class="bloquee" role="status">
				Votre navigateur a bloqué la fenêtre du terrain — autorisez les fenêtres surgissantes
				pour ce site, puis réessayez.
			</p>
		{/if}
		<p class="note"><a href="/arene/simulateur">Le simulateur IA contre IA</a> reste disponible.</p>
	</section>
</div>

<style>
	/* ============ setup ============ */
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
		font-size: clamp(2.6rem, 6vw, 4.4rem);
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
		margin-top: 1.2rem;
		width: 100%;
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
	.bloquee {
		margin: 0.8rem 0 0;
		padding: 0.55rem 1rem;
		max-width: 34rem;
		font-size: 0.84rem;
		color: #f0cfcf;
		background: rgba(200, 80, 80, 0.14);
		border: 1px solid rgba(200, 80, 80, 0.35);
		border-radius: 10px;
	}
	.note {
		margin: 1rem 0 0;
		font-size: 0.82rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.note a {
		color: var(--gold);
	}
</style>
