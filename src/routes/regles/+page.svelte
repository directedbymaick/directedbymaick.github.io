<script lang="ts">
	import FactionSigil from '$lib/FactionSigil.svelte';
	import { charter } from '$lib/charter';
	import { cards } from '$lib/cards';
	import { paliers } from '$lib/paliers';
	import type { FactionId, Rarity } from '$lib/types';

	const factions = Object.keys(charter.factions) as FactionId[];
	const rarities = Object.keys(charter.rarities) as Rarity[];

	const MATERIAL_LABEL: Record<string, string> = {
		carbone: 'Carbone tissé',
		nacre: 'Nacre',
		argent: 'Argent brossé',
		or: 'Or brossé',
		prisme: 'Prisme'
	};

	const BASICS = [
		{ t: 'Objectif', d: 'Chaque joueur commence avec un deck de 30 cartes et un Korum à 30 Intégrité. Réduisez le Korum adverse à zéro pour gagner.' },
		{ t: 'Volonté', d: 'La Volonté permet de jouer vos cartes et d’activer Prononcer. Elle se recharge à chaque tour et augmente progressivement jusqu’à 10.' },
		{ t: 'Types de cartes', d: 'Les Êtres combattent sur le plateau. Les Verbes produisent un effet immédiat. Les Reliques restent en jeu. Chaque camp ne peut contrôler qu’un seul Lieu.' },
		{ t: 'Combat', d: 'Un Être peut attaquer une fois par tour. Lorsqu’il affronte un autre Être, les deux s’infligent simultanément des dégâts égaux à leur ATQ. Le Korum est protégé tant qu’un défenseur valide se trouve en jeu.' }
	];

	const KEYWORDS = [
		{ kw: "À l'arrivée :", def: 'Cet effet se déclenche immédiatement lorsque la carte entre en jeu.' },
		{ kw: 'Prononcer (n) :', def: "Payez le coût indiqué pour déclencher cet effet, puis exilez définitivement la carte. Une carte ne peut Prononcer qu’une fois." },
		{ kw: 'Serment', def: 'Les Êtres adverses doivent attaquer cet Être en priorité.' },
		{ kw: 'Élan', def: 'Peut attaquer dès le tour de son arrivée.' },
		{ kw: 'Mémoire', def: 'Regarder, récupérer ou copier une carte de la défausse ou de l’exil.' },
		{ kw: 'Rupture', def: 'Effet déclenché quand une carte est détruite, sacrifiée ou exilée.' },
		{ kw: 'Mutation', def: 'Choix de modes ou modification de rôle/statistiques.' }
	];

	const FACTION_STYLE: Record<FactionId, { tagline: string; forces: string; interdits: string }> = {
		vasar: {
			tagline: "L'Ordre qui récite",
			forces: 'Buffs de masse, protection (Serment), renvoi en main, punition des Prononcer adverses.',
			interdits: 'Lent. Dépendant de la structure — quand elle tombe, tout tombe.'
		},
		exar: {
			tagline: 'La Rupture qui achève',
			forces: 'Destruction ciblée, sacrifices rentables, les meilleurs Prononcer du jeu.',
			interdits: 'Se blesse soi-même, brûle ses ressources, peut s’épuiser.'
		},
		eshar: {
			tagline: 'La mémoire des syllabes',
			forces: 'Pioche, information, récupération — la seule faction qui touche à l’exil.',
			interdits: 'Corps faibles, tempo lent.'
		},
		morar: {
			tagline: 'La chute devenue arrivée',
			forces: 'Adaptation, changement de rôle, coûts réduits.',
			interdits: 'Moins explosif, demande de bien lire la partie.'
		},
		velar: {
			tagline: 'La Volonté suffit',
			forces: 'Élan, dégâts directs, pression rapide.',
			interdits: 'Faible en partie longue, défense limitée.'
		}
	};
</script>

<svelte:head>
	<title>Règles — {charter.game.name}</title>
	<meta name="description" content="Les règles de {charter.game.name} : le duel, Prononcer, les mots-clés, les cinq peuples et les raretés." />
</svelte:head>

<header class="hero">
	<p class="kicker"><span class="k-diamond">◯</span> Guide de jeu</p>
	<h1>Règles</h1>
	<p class="tagline">
		Apprenez les règles essentielles, les mots-clés et l’identité de chaque peuple avant votre
		premier duel.
	</p>
</header>

<section>
	<h2><span class="tab">Les bases</span><span class="rule"></span></h2>
	<div class="grid">
		{#each BASICS as b (b.t)}
			<div class="block">
				<h3>{b.t}</h3>
				<p>{b.d}</p>
			</div>
		{/each}
	</div>
</section>

<section>
	<h2><span class="tab">Mots-clés</span><span class="rule"></span></h2>
	<dl class="keywords">
		{#each KEYWORDS as k (k.kw)}
			<div>
				<dt>{k.kw}</dt>
				<dd>{k.def}</dd>
			</div>
		{/each}
	</dl>
</section>

<section>
	<h2><span class="tab">Les cinq peuples</span><span class="rule"></span></h2>
	<div class="grid">
		{#each factions as f (f)}
			<div class="block faction" style="--fc: {charter.factions[f].color}">
				<h3><span class="sigil"><FactionSigil faction={f} /></span> {charter.factions[f].name}</h3>
				<p class="ftag">{FACTION_STYLE[f].tagline}</p>
				<p><strong>Forces :</strong> {FACTION_STYLE[f].forces}</p>
				<p><strong>Limites :</strong> {FACTION_STYLE[f].interdits}</p>
			</div>
		{/each}
	</div>
</section>

<section>
	<h2><span class="tab">Raretés</span><span class="rule"></span></h2>
	<table>
		<thead>
			<tr><th>Rareté</th><th>Matériau du cadre</th><th>Foil</th><th>Copies max / deck</th></tr>
		</thead>
		<tbody>
			{#each rarities as r (r)}
				<tr>
					<td>{charter.rarities[r].name}</td>
					<td>{MATERIAL_LABEL[charter.rarities[r].material]}</td>
					<td><code>{charter.rarities[r].foilPreset}</code></td>
					<td>{charter.rarities[r].maxCopies}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<p class="note">
		La rareté détermine la limite de copies dans un deck. La finition et le format influencent
		également la valeur de collection. <a href="/raretes">Consulter les {paliers().length} paliers et leurs probabilités.</a>
	</p>
	<p class="note">
		Le set Nés du silence contient actuellement {cards.length} cartes. Les règles seront précisées
		à mesure des tests et des prochaines extensions.
	</p>
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
		max-width: 60ch;
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

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}
	.block {
		padding: 1.3rem 1.4rem;
		background: rgba(255, 255, 255, 0.035);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
	}
	.block h3 {
		margin: 0 0 0.45rem;
		font-size: 0.98rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}
	.block p {
		margin: 0 0 0.4rem;
		line-height: 1.55;
		color: rgba(242, 240, 234, 0.65);
		font-size: 0.92rem;
	}
	.block.faction {
		border-top: 2px solid var(--fc);
	}
	.sigil {
		color: var(--fc);
	}
	.ftag {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 1.02rem;
		color: rgba(242, 240, 234, 0.5);
	}

	.keywords {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 0.8rem;
	}
	.keywords div {
		padding: 1rem 1.2rem;
		background: rgba(255, 255, 255, 0.035);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 14px;
	}
	.keywords dt {
		font-weight: 600;
		font-size: 0.88rem;
		color: #c9a445;
		margin-bottom: 0.3rem;
	}
	.keywords dd {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
		color: rgba(242, 240, 234, 0.65);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.92rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.65rem 0.8rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}
	th {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.4);
	}
	code {
		font-family: inherit;
		color: #c9a445;
	}
	.note {
		margin: 1.4rem 0 0;
		color: rgba(242, 240, 234, 0.45);
		font-size: 0.9rem;
	}
</style>
