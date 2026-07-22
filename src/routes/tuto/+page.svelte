<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { getCard } from '$lib/cards';
	import { charter } from '$lib/charter';

	// Korven porte tout ce qu'il faut montrer : coût, type, effet, stats.
	const demo = getCard('korven');

	const ANATOMY = [
		{ n: 1, t: 'Coût', d: 'La quantité de Volonté nécessaire pour jouer la carte.' },
		{ n: 2, t: 'Peuple', d: 'L’emblème indique à quel peuple appartient la carte.' },
		{ n: 3, t: 'Identité', d: 'Le nom de la carte et son type : Être, Verbe, Relique ou Lieu.' },
		{ n: 4, t: 'Capacités', d: "Les effets de la carte et, lorsqu’elle en possède un, son effet Prononcer." },
		{ n: 5, t: 'ATQ et INT', d: "L’ATQ indique les dégâts infligés. L’Intégrité représente les dégâts que l’Être peut subir." },
		{ n: 6, t: 'Informations', d: 'La bordure indique le numéro, la rareté et le set de la carte.' }
	];

	const STEPS = [
		{
			n: '01',
			t: "L'objectif",
			d: 'Chaque Korum commence avec 30 Intégrité. Réduisez celui de votre adversaire à zéro avant qu’il ne fasse de même avec le vôtre.'
		},
		{
			n: '02',
			t: 'La Volonté',
			d: 'Votre Volonté se recharge et augmente à chaque tour, jusqu’à 10. Utilisez-la pour jouer vos cartes et activer Prononcer.'
		},
		{
			n: '03',
			t: 'Jouer une carte',
			d: "Payez son coût en Volonté. Les Êtres, Reliques et Lieux restent en jeu ; les Verbes appliquent leur effet puis vont dans la défausse."
		},
		{
			n: '04',
			t: 'Le combat',
			d: 'Chaque Être peut attaquer une fois par tour. Choisissez un Être adverse ou, si aucun défenseur ne le protège, le Korum adverse.'
		},
		{
			n: '05',
			t: 'Prononcer (n)',
			d: "Payez le coût indiqué pour déclencher un effet puissant, puis exilez définitivement la carte. Le bon moment peut décider de la partie."
		},
		{
			n: '06',
			t: 'La victoire',
			d: 'Vous gagnez dès que le Korum adverse atteint zéro. Consultez ensuite les règles complètes pour découvrir tous les mots-clés.'
		}
	];
</script>

<svelte:head>
	<title>Tutoriel — {charter.game.name}</title>
	<meta name="description" content="Votre première Prononciation : apprendre à jouer à {charter.game.name} en 6 étapes." />
</svelte:head>

<header class="hero">
	<p class="kicker"><span class="k-diamond">◯</span> Bien débuter</p>
	<h1>Tutoriel</h1>
	<p class="tagline">Comprenez une carte et les six étapes d’un tour de jeu en quelques minutes.</p>
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
	<p class="note">Survolez la carte pour observer sa finition et ses reflets.</p>
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
