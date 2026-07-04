<script lang="ts">
	import { charter } from '$lib/charter';
	import { cards } from '$lib/cards';
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

	const KEYWORDS = [
		{ kw: "À l'arrivée :", def: 'Effet déclenché au moment du Transfert (quand la carte entre en jeu).' },
		{ kw: 'Synchro (X) :', def: "Payez X Énergie pour activer le CELL — une seule fois par carte, à tout moment de votre tour. L'effet se déclenche et la carte s'embrase." },
		{ kw: 'Garde', def: 'Les unités adverses doivent attaquer cette unité en priorité.' },
		{ kw: 'Célérité', def: "Peut attaquer dès le tour de son arrivée (ignore le mal du transfert)." },
		{ kw: 'Insaisissable', def: 'Ne peut pas être ciblé par les protocoles ni les Synchros adverses.' },
		{ kw: 'Dernier souffle :', def: 'Effet déclenché à la mort de cette unité.' }
	];

	const FACTION_STYLE: Record<FactionId, { tagline: string; forces: string; interdits: string }> = {
		rikken: {
			tagline: 'Le collectif amplifié',
			forces: 'Soins, pioche, protection (Garde), synergies entre Travelers, récompenses de Synchro.',
			interdits: 'Ne vole jamais, ne sabote pas, ne sacrifie pas les siens.'
		},
		kairos: {
			tagline: 'Le moment opportun',
			forces: 'Sabotage des Synchros adverses, contrôle et vol, dégâts ciblés, information (voir la main adverse).',
			interdits: 'Ne soigne pas les autres, ne pioche pas en masse.'
		},
		epoques: {
			tagline: 'La masse silencieuse',
			forces: 'Stats brutes supérieures à coût égal, Garde, Célérité, Derniers souffles simples. Jouables dans tous les decks.',
			interdits: "Pas de CELL, donc jamais de Synchro. Pas d'effets complexes."
		}
	};
</script>

<svelte:head>
	<title>Règles — {charter.game.name}</title>
	<meta name="description" content="Les règles complètes de {charter.game.name} : le duel, la Synchro, les mots-clés, les factions et les raretés." />
</svelte:head>

<header class="hero">
	<p class="kicker"><span class="k-diamond">◆</span> Manuel de jeu · v1</p>
	<h1>Règles</h1>
	<p class="tagline">
		Le temps est déjà écrit. Vos parties, non. Deux directeurs de mission s'affrontent —
		le premier qui fait tomber la Centrale adverse l'emporte.
	</p>
</header>

<!-- ============ LE DUEL ============ -->
<section>
	<h2><span class="tab">01 · Le duel</span><span class="rule"></span></h2>
	<div class="grid3">
		<div class="panel">
			<h3>La Centrale</h3>
			<p>
				Chaque joueur protège sa <strong>Centrale</strong> : <strong>30 points d'Intégrité</strong>.
				Réduire l'Intégrité adverse à 0 = victoire.
			</p>
		</div>
		<div class="panel">
			<h3>Le deck</h3>
			<p>
				<strong>30 cartes.</strong> Copies max par rareté : Standard ×3, Rare et Épique ×2,
				Légendaire et Prismatique ×1.
			</p>
		</div>
		<div class="panel">
			<h3>Le départ</h3>
			<p>
				Main de départ : <strong>3 cartes</strong> (4 pour le second joueur, qui reçoit aussi une
				<strong>Cellule d'Énergie</strong> : +1 Énergie, une fois). Chaque carte de la main initiale
				peut être remplacée une fois (mulligan).
			</p>
		</div>
	</div>
	<div class="panel wide">
		<h3>L'Énergie</h3>
		<p>
			La Centrale alloue l'énergie des transferts : <strong>1 Énergie au tour 1</strong>, +1 par tour,
			<strong>plafond 10</strong>. Elle se recharge entièrement au début de chaque tour.
			L'Énergie paye les Transferts (poser une carte), les protocoles et les Synchros.
		</p>
	</div>
</section>

<!-- ============ LES TYPES ============ -->
<section>
	<h2><span class="tab">02 · Les types de cartes</span><span class="rule"></span></h2>
	<div class="grid3">
		<div class="panel">
			<h3>◆ Traveler</h3>
			<p>
				Unité RIKKEN ou KAIROS, déployée par <strong>Transfert</strong>. Elle arrive
				<em>en civil</em> — son CELL n'est pas actif — et ne peut pas attaquer le tour de son
				arrivée (<strong>mal du transfert</strong>), sauf Célérité. Stats :
				<strong>Attaque / Intégrité</strong>.
			</p>
		</div>
		<div class="panel">
			<h3>◉ Époque</h3>
			<p>
				Figure des zones aveugles, neutre, jouable dans tous les decks. Pas de CELL, donc
				<strong>jamais de Synchro</strong> — compensé par des stats supérieures d'un cran à coût
				égal. Ce que vous voyez est ce que vous affrontez.
			</p>
		</div>
		<div class="panel">
			<h3>◇ Protocole</h3>
			<p>
				Un sort : effet immédiat, puis défaussé. RIKKEN et KAIROS ont leurs protocoles ;
				certains, nés des zones aveugles, sont neutres.
			</p>
		</div>
	</div>
</section>

<!-- ============ LA SYNCHRO ============ -->
<section>
	<h2><span class="tab">03 · La Synchro</span><span class="rule"></span></h2>
	<div class="panel synchro-panel">
		<p class="big">
			La mécanique signature. Un Traveler portant un CELL a une capacité
			<strong>Synchro (X)</strong> : une fois en jeu, payez <strong>X Énergie</strong> pour
			<strong>activer son CELL</strong> — une seule fois par carte, à tout moment de votre tour.
		</p>
		<ul>
			<li>L'effet signature se déclenche immédiatement.</li>
			<li>La carte <strong>s'embrase</strong> : son foil s'active en jeu — l'aura du mode local.</li>
			<li>Un Traveler synchronisé le reste jusqu'à sa mort.</li>
			<li>Certains effets ne ciblent que les Travelers synchronisés — ou non-synchronisés. KAIROS adore éteindre ce que vous venez d'allumer.</li>
		</ul>
	</div>
</section>

<!-- ============ LES MOTS-CLÉS ============ -->
<section>
	<h2><span class="tab">04 · Les mots-clés</span><span class="rule"></span></h2>
	<div class="kwtable">
		{#each KEYWORDS as k (k.kw)}
			<div class="kwrow">
				<span class="kw">{k.kw}</span>
				<span class="kwdef">{k.def}</span>
			</div>
		{/each}
	</div>
	<p class="note">
		Le combat : vos unités attaquent une fois par tour — une unité adverse ou la Centrale.
		Les dégâts sont simultanés (l'attaquant subit l'Attaque du défenseur).
	</p>
</section>

<!-- ============ LES FACTIONS ============ -->
<section>
	<h2><span class="tab">05 · Les factions</span><span class="rule"></span></h2>
	<div class="grid3">
		{#each factions as f (f)}
			<div class="panel faction" style="--fc: {charter.factions[f].color}">
				<h3><span class="fsigil">{charter.factions[f].sigil}</span> {charter.factions[f].name}</h3>
				<p class="ftag">{FACTION_STYLE[f].tagline}</p>
				<p><strong>Forces :</strong> {FACTION_STYLE[f].forces}</p>
				<p><strong>Jamais :</strong> {FACTION_STYLE[f].interdits}</p>
			</div>
		{/each}
	</div>
</section>

<!-- ============ LES RARETÉS ============ -->
<section>
	<h2><span class="tab">06 · Les raretés</span><span class="rule"></span></h2>
	<p class="note">
		La rareté est un <strong>matériau</strong> : le cadre de la carte est fait de sa rareté.
		Les Légendaires et Prismatiques sont en <strong>full art</strong> — l'artwork couvre toute la carte.
	</p>
	<div class="kwtable">
		{#each rarities as r (r)}
			<div class="kwrow">
				<span class="kw">{charter.rarities[r].name}</span>
				<span class="kwdef">
					Cadre {MATERIAL_LABEL[charter.rarities[r].material]} · foil
					<code>{charter.rarities[r].foilPreset}</code> · max ×{charter.rarities[r].maxCopies} par deck
				</span>
			</div>
		{/each}
	</div>
</section>

<!-- ============ LE SET ============ -->
<section>
	<h2><span class="tab">07 · Le set</span><span class="rule"></span></h2>
	<div class="panel wide">
		<h3>Set 01 — Zones Aveugles</h3>
		<p>
			<strong>60 cartes</strong> ({cards.length} déjà forgées). Les zones aveugles sont les moments
			de l'Histoire sans témoin ni archive — les seuls endroits où les Travelers peuvent agir, et
			le terrain de toutes les missions. Chaque carte du set est une pièce des archives RIKKEN au
			moment où tout commence : un cycle de recrutement s'ouvre, un réseau s'infiltre, et sept
			zones sont fouillées à la recherche d'un seul homme.
		</p>
		<a class="cta" href="/">Explorer le mur →</a>
	</div>
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
		max-width: 60ch;
		color: rgba(236, 232, 225, 0.65);
	}

	section {
		margin-bottom: 3.2rem;
	}
	h2 {
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

	.grid3 {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 1rem;
	}
	.panel {
		padding: 1.1rem 1.3rem;
		background: rgba(236, 232, 225, 0.045);
		border-left: 3px solid rgba(236, 232, 225, 0.25);
	}
	.panel.wide {
		margin-top: 1rem;
	}
	.panel h3 {
		margin: 0 0 0.5rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.panel p {
		margin: 0.4rem 0;
		line-height: 1.5;
		color: rgba(236, 232, 225, 0.8);
	}
	.panel strong {
		color: #ece8e1;
	}

	.synchro-panel {
		border-left-color: #c23b4e;
		background: rgba(194, 59, 78, 0.07);
	}
	.big {
		font-size: 1.05rem;
	}
	.synchro-panel ul {
		margin: 0.8rem 0 0;
		padding-left: 1.2rem;
		color: rgba(236, 232, 225, 0.8);
		line-height: 1.6;
	}

	.kwtable {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.kwrow {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: 1rem;
		padding: 0.65rem 1rem;
		background: rgba(236, 232, 225, 0.04);
	}
	.kw {
		font-family: Consolas, 'Cascadia Mono', monospace;
		font-weight: 700;
		font-size: 0.85rem;
		color: #ffb454;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.kwdef {
		color: rgba(236, 232, 225, 0.78);
		line-height: 1.45;
		font-size: 0.95rem;
	}
	.kwdef code {
		color: #ffb454;
	}
	.note {
		margin: 0.9rem 0;
		color: rgba(236, 232, 225, 0.6);
		font-size: 0.95rem;
	}

	.faction {
		border-left-color: var(--fc);
	}
	.fsigil {
		color: var(--fc);
	}
	.ftag {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.78rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--fc) 75%, #fff) !important;
	}

	.cta {
		display: inline-block;
		margin-top: 0.8rem;
		padding: 0.55rem 1.2rem;
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

	@media (max-width: 640px) {
		.kwrow {
			grid-template-columns: 1fr;
			gap: 0.2rem;
		}
	}
</style>
