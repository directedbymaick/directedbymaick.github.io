<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { getCard } from '$lib/cards';
	import { charter } from '$lib/charter';

	// Korven porte tout ce qu'il faut montrer : coût, type, effet, stats.
	const demo = getCard('korven');

	const ANATOMY = [
		{ n: 1, t: 'La Volonté', d: 'Le coût à payer pour prononcer la carte (la jouer). La cellule en haut à gauche.' },
		{ n: 2, t: 'Le sigil', d: 'Le peuple de la carte : ◯ Vasar, ⊘ Exar, ☽ Eshar, ◐ Morar, ☀ Velar.' },
		{ n: 3, t: 'La plaque', d: 'Le nom, le type (Être / Verbe / Relique / Lieu) et le sous-titre.' },
		{ n: 4, t: 'Le cartouche', d: "L'effet, le Prononcer éventuel (l'étiquette au cercle), et une ligne du Korum en italique." },
		{ n: 5, t: 'Les stats', d: "ATQ (les dégâts qu'il inflige) et INT (l'Intégrité qu'il encaisse). Êtres uniquement." },
		{ n: 6, t: 'La bordure', d: 'Le numéro de série, la rareté et le code du set — gravés dans le cadre.' }
	];

	const STEPS = [
		{
			n: '01',
			t: "L'objectif",
			d: 'Votre Nom a 30 Intégrité. Celui d’en face aussi. Faites taire le sien d’abord — avec les attaques de vos Êtres, tour après tour.'
		},
		{
			n: '02',
			t: 'La Volonté',
			d: 'Votre Volonté se recharge et augmente de 1 chaque tour (max 10). Tout se paye avec : les Êtres, les Verbes, les Prononcer.'
		},
		{
			n: '03',
			t: 'Prononcer une carte',
			d: "Payer le coût d'une carte de votre main = elle entre en jeu (Être, Relique, Lieu) ou fait son effet et disparaît (Verbe)."
		},
		{
			n: '04',
			t: 'Le combat',
			d: 'Chaque Être peut attaquer une fois par tour : un Être adverse ou le Nom. Les dégâts sont simultanés. Un Serment en face doit être frappé d’abord.'
		},
		{
			n: '05',
			t: 'Prononcer (n)',
			d: "Le geste signature. Payez n : l'effet part, le halo se brise, et la carte est exilée définitivement. Une fois par carte. Choisissez votre moment."
		},
		{
			n: '06',
			t: 'La victoire',
			d: 'Nom adverse à 0 : la partie est dite. Le reste — peuples, raretés, mots-clés — vous attend dans les Règles.'
		}
	];
</script>

<svelte:head>
	<title>Tuto — {charter.game.name}</title>
	<meta name="description" content="Votre première Prononciation : apprendre à jouer à {charter.game.name} en 6 étapes." />
</svelte:head>

<header class="hero">
	<p class="kicker"><span class="k-diamond">◯</span> Première prononciation</p>
	<h1>Tuto</h1>
	<p class="tagline">Six étapes pour votre premier duel. Le Créateur se tait — à vous de parler.</p>
</header>

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
	<p class="note">Survole la carte : le tilt et le foil réagissent — le halo répond à qui le regarde.</p>
</section>

<section>
	<h2><span class="tab">Votre premier duel</span><span class="rule"></span></h2>
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
		margin: 4rem 0 4rem;
	}
	.kicker {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin: 0 0 1rem;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.4);
	}
	.k-diamond {
		color: #c9a445;
		font-size: 0.75em;
	}
	h1 {
		margin: 0;
		font-weight: 800;
		font-size: clamp(2.8rem, 6.5vw, 4.6rem);
		letter-spacing: -0.03em;
		line-height: 1;
	}
	.tagline {
		margin: 1.2rem 0 0;
		max-width: 56ch;
		font-size: 1.05rem;
		line-height: 1.6;
		color: rgba(242, 240, 234, 0.55);
	}

	section {
		margin-bottom: 4.2rem;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 1.2rem;
		margin: 0 0 1.8rem;
	}
	.tab {
		font-size: 1.15rem;
		font-weight: 650;
		letter-spacing: 0.01em;
		white-space: nowrap;
	}
	.rule {
		flex: 1;
		height: 1px;
		background: rgba(255, 255, 255, 0.07);
	}

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
		width: 1.6rem;
		height: 1.6rem;
		font-weight: 600;
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
		color: #c9a445;
		border: 1px solid rgba(201, 164, 69, 0.5);
		border-radius: 50%;
	}
	.lt {
		margin: 0 0 0.2rem;
		font-size: 0.92rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}
	.ld {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
		color: rgba(242, 240, 234, 0.6);
	}
	.note {
		margin: 1.4rem 0 0;
		color: rgba(242, 240, 234, 0.45);
		font-size: 0.9rem;
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}
	.step {
		display: flex;
		gap: 1.1rem;
		padding: 1.3rem 1.4rem;
		background: rgba(255, 255, 255, 0.035);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
	}
	.step-n {
		font-weight: 700;
		font-size: 1.5rem;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
		color: rgba(242, 240, 234, 0.22);
	}
	.step h3 {
		margin: 0 0 0.4rem;
		font-size: 0.98rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}
	.step p {
		margin: 0;
		line-height: 1.55;
		color: rgba(242, 240, 234, 0.65);
		font-size: 0.92rem;
	}

	.cta {
		display: inline-flex;
		align-items: center;
		margin-top: 1.8rem;
		padding: 0.65rem 1.4rem;
		font-size: 0.88rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		text-decoration: none;
		color: #0a0a0d;
		background: #f2f0ea;
		border-radius: 999px;
		transition: background 0.18s ease;
	}
	.cta:hover {
		background: #c9a445;
	}
</style>
