<script lang="ts">
	import Card from '$lib/Card.svelte';
	import CardBack from '$lib/CardBack.svelte';
	import PackVisual from '$lib/PackVisual.svelte';
	import { charter } from '$lib/charter';
	import { cards } from '$lib/cards';
	import {
		openPack,
		loadCollection,
		addToCollection,
		collectionStats,
		SLOT_ODDS,
		PACK_SIZE
	} from '$lib/gacha';
	import type { CardData, Rarity } from '$lib/types';

	type Stage = 'idle' | 'reveal' | 'recap';

	let stage: Stage = $state('idle');
	let pulls: CardData[] = $state([]);
	let freshIds: string[] = $state([]);
	let idx = $state(0);
	let packRef: PackVisual | undefined = $state();

	let collection = $state<Record<string, number>>({});
	$effect(() => {
		collection = loadCollection();
	});
	const stats = $derived(collectionStats(collection));

	const RARITY_TINT: Record<Rarity, string> = {
		common: '#8b95a5',
		rare: '#e8e4da',
		epic: '#b8c4d6',
		legendary: '#ffb454',
		prism: '#c9a2e8'
	};

	function onTorn() {
		pulls = openPack();
		freshIds = addToCollection(collection, pulls);
		collection = { ...collection };
		idx = 0;
		stage = 'reveal';
	}

	function next() {
		if (idx < pulls.length - 1) idx += 1;
		else stage = 'recap';
	}

	function again() {
		stage = 'idle';
		pulls = [];
		idx = 0;
	}

	const current = $derived(pulls[idx]);
	const currentRarity = $derived(current ? charter.rarities[current.rarity] : undefined);
</script>

<svelte:head>
	<title>Packs — {charter.game.name}</title>
	<meta name="description" content="Ouvre des boosters Zones Aveugles : 5 cartes, odds publiées, collection locale." />
</svelte:head>

<header class="hero">
	<p class="kicker"><span class="k-diamond">◆</span> Réquisition de matériel</p>
	<h1>Packs</h1>
	<p class="tagline">
		Le booster Zones Aveugles : {PACK_SIZE} cartes par sachet, odds publiées, zéro compte. Ta
		collection vit dans ce navigateur.
	</p>
	<p class="colstat">
		<span class="colstat-n">{stats.unique}</span>/{cards.length} cartes uniques ·
		{stats.total} tirées au total
	</p>
</header>

<!-- ============ LE STAGE ============ -->
<section class="stage" data-stage={stage}>
	{#if stage === 'idle'}
		<div class="stage-inner">
			<p class="hint">⠿ Tire la languette pour ouvrir</p>
			<PackVisual bind:this={packRef} ontorn={onTorn} />
			<button class="ghost" onclick={() => packRef?.tear()}>⚡ Ouverture rapide</button>
		</div>
	{:else if stage === 'reveal' && current}
		{#key idx}
			<div class="stage-inner">
				<div class="reveal-head">
					<h2 class="reveal-name">{current.name}</h2>
					<p class="reveal-chips">
						<span class="chip" style="--tint: {RARITY_TINT[current.rarity]}"
							>{currentRarity?.name}</span
						>
						<span class="chip faction">{charter.factions[current.faction].sigil}
							{charter.factions[current.faction].name}</span>
						{#if freshIds.includes(current.id)}
							<span class="chip new">Nouvelle !</span>
						{/if}
					</p>
				</div>
				<div class="flipper" data-rarity={current.rarity}>
					<div class="flip-back"><CardBack /></div>
					<div class="flip-front"><Card card={current} /></div>
				</div>
				<div class="reveal-controls">
					<span class="counter">{idx + 1} / {pulls.length}</span>
					<button class="primary" onclick={next}>
						{idx < pulls.length - 1 ? 'Carte suivante' : 'Voir le récap'}
					</button>
					{#if idx < pulls.length - 1}
						<button class="ghost" onclick={() => (stage = 'recap')}>Passer au récap ▸</button>
					{/if}
				</div>
			</div>
		{/key}
	{:else if stage === 'recap'}
		<div class="stage-inner recap">
			<h2 class="recap-title">Ton tirage</h2>
			<div class="recap-grid">
				{#each pulls as c, i (i)}
					<div class="recap-cell">
						{#if freshIds.includes(c.id) && pulls.findIndex((p) => p.id === c.id) === i}
							<span class="newbadge">Nouvelle !</span>
						{/if}
						<Card card={c} />
						<a class="recap-link" href="/card/{c.id}">{c.name}</a>
					</div>
				{/each}
			</div>
			<div class="reveal-controls">
				<button class="primary" onclick={again}>Ouvrir un autre booster</button>
				<a class="ghost" href="/">Retour au mur</a>
			</div>
		</div>
	{/if}
</section>

<!-- ============ ODDS PUBLIÉES ============ -->
<section class="odds">
	<h2><span class="tab">Odds publiées</span><span class="rule"></span></h2>
	<div class="odds-grid">
		{#each SLOT_ODDS as slot (slot.label)}
			<div class="odds-card">
				<p class="odds-slot">{slot.label}</p>
				<ul>
					{#each Object.entries(slot.odds) as [rarity, p] (rarity)}
						<li>
							<span class="odds-rarity" style="--tint: {RARITY_TINT[rarity as Rarity]}"
								>{charter.rarities[rarity as Rarity].name}</span
							>
							<span class="odds-p">{Math.round(p * 100)}%</span>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
	<p class="odds-note">
		Si une rareté tirée n'a aucune carte forgée, le tirage se replie sur la rareté la plus proche.
		Pas de doublon à l'intérieur d'un même booster tant que le pool le permet.
	</p>
</section>

<style>
	.hero {
		margin: 1rem 0 2.4rem;
	}
	.kicker {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin: 0 0 0.6rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.55);
	}
	.k-diamond {
		color: #c23b4e;
		font-size: 0.75em;
	}
	h1 {
		margin: 0;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-stretch: 68%;
		font-weight: 800;
		font-size: clamp(3rem, 8vw, 5.6rem);
		line-height: 0.9;
		text-transform: uppercase;
	}
	.tagline {
		margin: 1rem 0 0;
		max-width: 56ch;
		color: rgba(236, 232, 225, 0.65);
	}
	.colstat {
		margin: 0.8rem 0 0;
		font-family: Consolas, monospace;
		font-size: 0.85rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.45);
	}
	.colstat-n {
		color: #ffb454;
		font-weight: 700;
	}

	/* ---------- stage ---------- */
	.stage {
		position: relative;
		margin-bottom: 3rem;
		padding: 3rem 1.5rem;
		background:
			radial-gradient(60% 80% at 50% 30%, rgba(255, 180, 84, 0.07), transparent 70%),
			radial-gradient(80% 60% at 50% 100%, rgba(194, 59, 78, 0.06), transparent 65%),
			rgba(236, 232, 225, 0.02);
		border: 1px solid rgba(236, 232, 225, 0.08);
	}
	.stage-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}
	.hint {
		margin: 0;
		font-family: Consolas, monospace;
		font-size: 0.82rem;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgba(255, 180, 84, 0.75);
		animation: pulse 2.4s ease-in-out infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.55;
		}
		50% {
			opacity: 1;
		}
	}

	/* ---------- reveal ---------- */
	.reveal-head {
		text-align: center;
		min-height: 5.4rem;
		opacity: 0;
		animation: headin 0.4s ease 0.5s forwards;
	}
	@keyframes headin {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.reveal-name {
		margin: 0 0 0.5rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-stretch: 70%;
		font-weight: 800;
		font-size: clamp(1.8rem, 4.5vw, 3rem);
		line-height: 0.95;
		text-transform: uppercase;
	}
	.reveal-chips {
		margin: 0;
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.chip {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		padding: 0.3rem 0.7rem;
		color: #0f1923;
		background: var(--tint, #ece8e1);
		clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
	}
	.chip.faction {
		background: rgba(236, 232, 225, 0.1);
		color: rgba(236, 232, 225, 0.85);
	}
	.chip.new {
		background: #c23b4e;
		color: #ece8e1;
	}

	.flipper {
		position: relative;
		width: min(340px, 82vw);
		--card-w: 100%;
		transform-style: preserve-3d;
		animation: flipin 0.75s cubic-bezier(0.35, 0.1, 0.25, 1) forwards;
	}
	@keyframes flipin {
		from {
			transform: rotateY(180deg) scale(0.92);
		}
		to {
			transform: rotateY(0deg) scale(1);
		}
	}
	.flip-front {
		backface-visibility: hidden;
	}
	.flip-back {
		position: absolute;
		inset: 0;
		transform: rotateY(180deg);
		backface-visibility: hidden;
	}
	/* halo derrière les hautes raretés */
	.flipper[data-rarity='legendary']::before,
	.flipper[data-rarity='prism']::before {
		content: '';
		position: absolute;
		inset: -18%;
		z-index: -1;
		border-radius: 50%;
		background: radial-gradient(closest-side, rgba(255, 180, 84, 0.28), transparent 72%);
		animation: halo 1.2s ease 0.4s backwards;
	}
	.flipper[data-rarity='prism']::before {
		background: radial-gradient(closest-side, rgba(201, 162, 232, 0.3), transparent 72%);
	}
	@keyframes halo {
		from {
			opacity: 0;
			scale: 0.6;
		}
	}

	.reveal-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.counter {
		font-family: Consolas, monospace;
		font-size: 0.85rem;
		letter-spacing: 0.2em;
		color: rgba(236, 232, 225, 0.5);
	}
	.primary,
	.ghost {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		text-decoration: none;
		padding: 0.6rem 1.3rem;
		border: none;
		cursor: pointer;
		clip-path: polygon(9px 0, 100% 0, calc(100% - 9px) 100%, 0 100%);
	}
	.primary {
		color: #0f1923;
		background: #ece8e1;
	}
	.primary:hover {
		background: #c23b4e;
		color: #ece8e1;
	}
	.ghost {
		color: rgba(236, 232, 225, 0.65);
		background: rgba(236, 232, 225, 0.08);
	}
	.ghost:hover {
		color: #ece8e1;
		background: rgba(236, 232, 225, 0.15);
	}

	/* ---------- recap ---------- */
	.recap-title {
		margin: 0;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-stretch: 70%;
		font-weight: 800;
		font-size: clamp(1.6rem, 4vw, 2.4rem);
		text-transform: uppercase;
	}
	.recap-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 200px));
		justify-content: center;
		gap: 1.6rem 1rem;
		width: 100%;
	}
	.recap-cell {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		--card-w: 100%;
	}
	.newbadge {
		position: absolute;
		top: -0.6rem;
		z-index: 5;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		padding: 0.24rem 0.65rem;
		color: #ece8e1;
		background: #c23b4e;
		clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
	}
	.recap-link {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		text-decoration: none;
		color: rgba(236, 232, 225, 0.6);
	}
	.recap-link:hover {
		color: #ece8e1;
	}

	/* ---------- odds ---------- */
	.odds {
		margin-bottom: 3rem;
	}
	.odds h2 {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0 0 1.4rem;
	}
	.tab {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-stretch: 80%;
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #0f1923;
		background: #ece8e1;
		padding: 0.42rem 1.15rem 0.38rem;
		clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
	}
	.rule {
		flex: 1;
		height: 1px;
		background: rgba(236, 232, 225, 0.15);
	}
	.odds-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}
	.odds-card {
		padding: 1rem 1.2rem;
		background: rgba(236, 232, 225, 0.045);
		border-left: 3px solid #ffb454;
	}
	.odds-slot {
		margin: 0 0 0.7rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}
	.odds-card ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.odds-card li {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
	}
	.odds-rarity {
		color: var(--tint, #ece8e1);
	}
	.odds-p {
		font-family: Consolas, monospace;
		color: rgba(236, 232, 225, 0.7);
	}
	.odds-note {
		margin: 1rem 0 0;
		font-size: 0.88rem;
		color: rgba(236, 232, 225, 0.5);
		max-width: 70ch;
	}
</style>
