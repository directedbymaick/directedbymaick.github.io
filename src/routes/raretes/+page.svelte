<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { charter } from '$lib/charter';
	import { paliers, frequence, classes } from '$lib/paliers';

	/* L'échelle est dérivée du tirage lui-même : rien n'est saisi à la main ici,
	   donc valider une variante au Lab la fait apparaître sur cette page. */
	const echelle = paliers();
	/* Six classes en tête, trente-cinq paliers en détail : personne ne retient
	   trente-cinq niveaux, mais tout le monde reconnaît une carte détourée. */
	const lesClasses = classes();

	/* Le filtre porte sur la CLASSE : c'est le vocabulaire de la page, et les six
	   lignes du haut servent directement de commande — pas de troisième rangée de
	   boutons pour dire la même chose. */
	let filtre = $state<'all' | string>('all');
	const montre = $derived(echelle.filter((p) => filtre === 'all' || p.classe === filtre));
	function basculer(id: string) {
		filtre = filtre === id ? 'all' : id;
	}

	const leRare = echelle[echelle.length - 1];

	/* Le total se compte en VERSIONS collectionnables, pas en paliers : c'est
	   l'unité de la page, et chaque classe affiche sa part. */
	const versionsTotal = echelle.reduce((a, p) => a + p.membres, 0);
</script>

<svelte:head>
	<title>Raretés et probabilités — {charter.game.name}</title>
	<meta
		name="description"
		content="Les {echelle.length} paliers de « Nés du silence », de la Commune Raw à la Prismatique Full Art détourée."
	/>
</svelte:head>

<header class="tete">
	<p class="kicker">Nés du silence · Set 01</p>
	<h1>Raretés</h1>
	<p class="chapo">
		Une carte se lit en <b>six classes</b>, reconnaissables à l’œil. En dessous, le détail complet :
		les <b>{echelle.length} paliers</b> que produit réellement le tirage, jusqu’à
		<b>{leRare.label}</b>, {frequence(leRare.taux).toLowerCase()}.
	</p>

	<!-- ============ LES SIX CLASSES ============
	     Le vocabulaire courant du jeu. Chaque règle se vérifie sur la carte, sans
	     table de correspondance, et l’ordre est monotone en rareté : une classe
	     n’est jamais plus courante que la précédente. -->
	<ol class="classes">
		{#each lesClasses as c, i (c.id)}
			<li>
				<button
					class="classe"
					class:on={filtre === c.id}
					aria-pressed={filtre === c.id}
					onclick={() => basculer(c.id)}
				>
					<span class="c-rang">{i + 1}</span>
					<span class="c-corps">
						<b class="c-nom">{c.nom}</b>
						<span class="c-regle">{c.regle}</span>
					</span>
					<span class="c-taux">{frequence(c.taux)}</span>
					<span class="c-n">{c.versions}</span>
				</button>
			</li>
		{/each}
	</ol>

</header>

<!-- Le détail, avec ses propres filtres. Ils étaient au-dessus du titre, si bien
     que la page annonçait « six classes » puis « 35 » sans dire que les deux
     nombres ne comptent pas la même chose. -->
<h2 class="detail-titre">
	{#if filtre === 'all'}
		Le détail — {echelle.length} paliers
	{:else}
		{lesClasses.find((c) => c.id === filtre)?.nom} — {montre.length} palier{montre.length > 1
			? 's'
			: ''}
		<button class="raz" onclick={() => (filtre = 'all')}>tout afficher</button>
	{/if}
</h2>
<p class="detail-chapo">
	Le tirage produit {echelle.length} combinaisons de rareté, de forme et de finition, réparties sur
	{versionsTotal} versions collectionnables. C'est la vérité du moteur ; les six classes ci-dessus en
	sont la lecture courante — cliquez-en une pour ne garder que ses paliers.
</p>



<ol class="echelle">
	{#each montre as p, i (p.key)}
		<li class="palier">
			<span class="rang">{String(echelle.indexOf(p) + 1).padStart(2, '0')}</span>
			<div class="vignette"><Card card={p.exemple} fullArt={p.exempleFullArt} thumb /></div>
			<div class="fiche">
				<p class="nom">{p.label}</p>
				<p class="freq">{frequence(p.taux)}</p>
				<p class="detail">
					<!-- au-delà d'un exemplaire par booster, le pourcentage ne veut plus rien
					     dire (« 252 % ») : la fréquence au-dessus suffit -->
					{#if p.taux < 1}
						{(p.taux * 100).toFixed(p.taux < 0.01 ? 3 : 1).replace('.', ',')} % ·
					{/if}
					{p.membres} carte{p.membres > 1 ? 's' : ''} à ce palier
				</p>
			</div>
		</li>
	{/each}
</ol>

<p class="note">
	Ces probabilités proviennent d’une simulation de trois millions de boosters utilisant exactement
	les mêmes règles que le jeu, garanties et boosters spéciaux compris. Chaque finition est comptée
	séparément afin de refléter sa fréquence réelle.
</p>

<style>
	/* ============ LES SIX CLASSES ============ */
	.classes {
		list-style: none;
		margin: 2.2rem 0 0;
		padding: 0;
		display: grid;
		gap: 1px;
		background: var(--panel-line);
		border: 1px solid var(--panel-line);
	}
	.classe {
		display: grid;
		grid-template-columns: 2.4rem minmax(0, 1fr) auto auto;
		gap: 1rem;
		align-items: center;
		padding: 0.85rem 1.1rem;
		background: rgba(8, 12, 20, 0.9);
	}
	.classe {
		width: 100%;
		border: none;
		font: inherit;
		/* `font: inherit` ne transporte PAS la couleur : sans cette ligne le bouton
		   prend le noir système, invisible sur la toile sombre. */
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition: background 0.16s ease;
	}
	.classe:hover {
		background: rgba(255, 255, 255, 0.045);
	}
	.classe.on {
		background: rgba(213, 178, 94, 0.1);
		box-shadow: inset 3px 0 0 var(--gold);
	}
	/* nombre de versions dans la classe — l'unité collectionnable */
	.c-n {
		min-width: 2.6rem;
		text-align: right;
		font-family: var(--display);
		font-size: 0.72rem;
		font-weight: 700;
		color: rgba(238, 240, 245, 0.35);
	}
	.raz {
		margin-left: 0.7rem;
		padding: 0;
		border: none;
		background: none;
		font: inherit;
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		color: var(--gold);
		cursor: pointer;
		text-transform: none;
	}
	.raz:hover {
		text-decoration: underline;
	}
	.c-rang {
		font-family: Cinzel, Georgia, serif;
		font-size: 0.95rem;
		color: var(--gold);
		text-align: center;
	}
	.c-corps {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.2rem 0.8rem;
		min-width: 0;
	}
	.c-nom {
		font-family: Cinzel, Georgia, serif;
		font-size: 1.05rem;
		letter-spacing: 0.05em;
	}
	.c-regle {
		font-size: 0.88rem;
		color: rgba(238, 240, 245, 0.55);
	}
	.c-taux {
		font-family: var(--display);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--gold);
		white-space: nowrap;
	}
	.detail-chapo {
		max-width: 1240px;
		margin: 0 auto 1.4rem;
		padding: 0 var(--spacing-20);
		font-size: 0.95rem;
		line-height: 1.65;
		color: rgba(238, 240, 245, 0.6);
	}
	.detail-titre {
		max-width: 1240px;
		margin: 3.5rem auto 1.2rem;
		padding: 0 var(--spacing-20);
		font-family: var(--display);
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.45);
	}
	@media (max-width: 640px) {
		.classe {
			grid-template-columns: 1.8rem minmax(0, 1fr);
		}
		.c-taux {
			grid-column: 2;
		}
	}

	.tete {
		margin: 3.5rem 0 3rem;
		max-width: 44rem;
	}
	.kicker {
		margin: 0 0 0.9rem;
		font-size: 0.74rem;
		font-weight: 600;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.4);
	}
	h1 {
		margin: 0 0 1.1rem;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: clamp(2.6rem, 7vw, 4.6rem);
		font-weight: 400;
		letter-spacing: 0.02em;
		line-height: 1;
	}
	.chapo {
		margin: 0 0 2rem;
		font-size: 1rem;
		line-height: 1.7;
		color: rgba(242, 240, 234, 0.62);
	}
	.chapo b {
		font-weight: 600;
		color: #f2f0ea;
	}


	.echelle {
		list-style: none;
		margin: 0 0 3rem;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
		gap: 2.6rem 1.6rem;
	}
	.palier {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		--card-w: 100%;
	}
	.rang {
		position: absolute;
		top: -0.4rem;
		left: -0.2rem;
		z-index: 4;
		font-size: 0.72rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.08em;
		color: rgba(242, 240, 234, 0.32);
	}
	.vignette {
		display: flex;
		justify-content: center;
	}
	.fiche {
		text-align: center;
	}
	.nom {
		margin: 0 0 0.25rem;
		font-size: 0.82rem;
		font-weight: 600;
		line-height: 1.35;
	}
	.freq {
		margin: 0 0 0.2rem;
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
		color: #d5b25e;
	}
	.detail {
		margin: 0;
		font-size: 0.7rem;
		line-height: 1.5;
		color: rgba(242, 240, 234, 0.38);
	}

	.note {
		margin: 0 0 5rem;
		max-width: 44rem;
		font-size: 0.78rem;
		line-height: 1.7;
		color: rgba(242, 240, 234, 0.38);
	}
</style>
