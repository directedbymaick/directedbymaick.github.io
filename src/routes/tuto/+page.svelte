<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { getCard } from '$lib/cards';
	import { charter } from '$lib/charter';

	// L'Opérationnelle porte tout ce qu'il faut montrer : coût, CELL, Synchro, stats.
	const demo = getCard('operationnelle-cell-aqua');

	const ANATOMY = [
		{ n: 1, t: 'Le coût', d: "L'Énergie à payer pour le Transfert (poser la carte). La cellule ambre, en haut à gauche." },
		{ n: 2, t: 'Le sigil', d: 'La faction de la carte : ◆ RIKKEN, ◈ KAIROS, ◉ Les Époques.' },
		{ n: 3, t: 'La plaque', d: 'Le nom, le type (Traveler / Époque / Protocole) et le CELL porté.' },
		{ n: 4, t: 'Le cartouche', d: "L'effet permanent, la Synchro (l'étiquette colorée) et une ligne de lore en italique." },
		{ n: 5, t: 'Les stats', d: "ATQ (les dégâts qu'elle inflige) et INT (ce qu'elle encaisse avant de tomber)." },
		{ n: 6, t: 'La bordure', d: 'Le numéro de série, la rareté et le code du set — gravés dans le cadre.' }
	];

	const STEPS = [
		{
			n: '01',
			t: 'L’objectif',
			d: "Ta Centrale a 30 points d'Intégrité. Celle d'en face aussi. Fais tomber la sienne d'abord — avec les dégâts de tes unités, tour après tour."
		},
		{
			n: '02',
			t: 'La mise en place',
			d: 'Deck de 30 cartes. Tu pioches 3 cartes (4 si tu joues en second, plus une Cellule d’Énergie : +1 Énergie, une fois). Tu peux remplacer une fois chaque carte de ta main de départ.'
		},
		{
			n: '03',
			t: 'Ton tour',
			d: "Ton Énergie se recharge et augmente de 1 (max 10). Au tour 1 tu as 1 Énergie, au tour 5 tu en as 5. Tout se paye avec : les Transferts, les protocoles, les Synchros. Dépense bien."
		},
		{
			n: '04',
			t: 'Le Transfert',
			d: "Payer le coût d'une carte de ta main = elle arrive en jeu. Un Traveler arrive « en civil » : il ne peut pas attaquer ce tour-ci (mal du transfert), sauf s'il a Célérité. Son effet « À l'arrivée : » se déclenche immédiatement."
		},
		{
			n: '05',
			t: 'La Synchro',
			d: "Le geste signature. Un Traveler en jeu avec « Synchro (X) » : paye X, son CELL s'active, l'effet part, et la carte s'embrase — définitivement. Une fois par carte. Choisis ton moment : KAIROS sait éteindre les CELL allumés."
		},
		{
			n: '06',
			t: 'Le combat',
			d: "À chaque tour, chaque unité peut attaquer une fois : une unité adverse ou la Centrale. Les dégâts sont simultanés — attaquer un 4/4 avec un 2/3, c'est perdre son unité. S'il y a une Garde en face, c'est elle que tu dois frapper d'abord."
		},
		{
			n: '07',
			t: 'La victoire',
			d: 'Centrale adverse à 0 : gagné. C’est tout. Le reste — les identités de faction, les raretés, le barème — t’attend dans les Règles.'
		}
	];
</script>

<svelte:head>
	<title>Tuto — {charter.game.name}</title>
	<meta name="description" content="Ton premier transfert : apprendre à jouer à {charter.game.name} en 7 étapes." />
</svelte:head>

<header class="hero">
	<p class="kicker"><span class="k-diamond">◆</span> Premier transfert</p>
	<h1>Tuto</h1>
	<p class="tagline">
		Sept étapes pour ton premier duel. Dix minutes, pas plus — le mal du transfert passe vite.
	</p>
</header>

<!-- ============ LIRE UNE CARTE ============ -->
<section>
	<h2><span class="tab">Lire une carte</span><span class="rule"></span></h2>
	<div class="anatomy">
		<div class="anatomy-card">
			{#if demo}
				<Card card={demo} />
			{/if}
		</div>
		<ol class="legend">
			{#each ANATOMY as a (a.n)}
				<li>
					<span class="ln">{a.n}</span>
					<div>
						<p class="lt">{a.t}</p>
						<p class="ld">{a.d}</p>
					</div>
				</li>
			{/each}
		</ol>
	</div>
	<p class="note">Survole la carte : le tilt et le foil réagissent — c'est l'aura du mode local.</p>
</section>

<!-- ============ LES 7 ÉTAPES ============ -->
<section>
	<h2><span class="tab">Ton premier duel</span><span class="rule"></span></h2>
	<div class="steps">
		{#each STEPS as s (s.n)}
			<div class="step">
				<span class="step-n">{s.n}</span>
				<div>
					<h3>{s.t}</h3>
					<p>{s.d}</p>
				</div>
			</div>
		{/each}
	</div>
	<a class="cta" href="/regles">Les règles complètes →</a>
</section>

<style>
	.hero {
		margin: 1rem 0 3rem;
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

	section {
		margin-bottom: 3.2rem;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0 0 1.6rem;
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

	/* ---------- anatomie ---------- */
	.anatomy {
		display: flex;
		flex-wrap: wrap;
		gap: 2.6rem;
		align-items: center;
	}
	.anatomy-card {
		--card-w: min(340px, 88vw);
	}
	.legend {
		flex: 1;
		min-width: 280px;
		max-width: 480px;
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.legend li {
		display: flex;
		gap: 0.9rem;
		align-items: flex-start;
	}
	.ln {
		flex: none;
		display: grid;
		place-items: center;
		width: 1.7rem;
		height: 1.7rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-weight: 700;
		font-size: 0.85rem;
		color: #0f1923;
		background: #ffb454;
		clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
	}
	.lt {
		margin: 0 0 0.15rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.ld {
		margin: 0;
		font-size: 0.92rem;
		line-height: 1.45;
		color: rgba(236, 232, 225, 0.72);
	}
	.note {
		margin: 1.2rem 0 0;
		color: rgba(236, 232, 225, 0.55);
		font-size: 0.92rem;
	}

	/* ---------- étapes ---------- */
	.steps {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}
	.step {
		display: flex;
		gap: 1rem;
		padding: 1.1rem 1.2rem;
		background: rgba(236, 232, 225, 0.045);
		border-left: 3px solid #c23b4e;
	}
	.step-n {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-stretch: 70%;
		font-weight: 800;
		font-size: 1.9rem;
		line-height: 1;
		color: rgba(236, 232, 225, 0.25);
	}
	.step h3 {
		margin: 0 0 0.4rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.step p {
		margin: 0;
		line-height: 1.5;
		color: rgba(236, 232, 225, 0.78);
		font-size: 0.95rem;
	}

	.cta {
		display: inline-block;
		margin-top: 1.6rem;
		padding: 0.6rem 1.3rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		text-decoration: none;
		color: #0f1923;
		background: #ece8e1;
		clip-path: polygon(9px 0, 100% 0, calc(100% - 9px) 100%, 0 100%);
	}
	.cta:hover {
		background: #c23b4e;
		color: #ece8e1;
	}
</style>
