<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { charter } from '$lib/charter';
	import { paliers, frequence } from '$lib/paliers';
	import type { Rarity } from '$lib/types';

	/* L'échelle est dérivée du tirage lui-même : rien n'est saisi à la main ici,
	   donc valider une variante au Lab la fait apparaître sur cette page. */
	const echelle = paliers();

	const raretes = Object.keys(charter.rarities) as Rarity[];
	let filtre = $state<'all' | Rarity>('all');
	const montre = $derived(echelle.filter((p) => filtre === 'all' || p.rarity === filtre));

	const leRare = echelle[echelle.length - 1];
</script>

<svelte:head>
	<title>L'échelle des raretés — {charter.game.name}</title>
	<meta
		name="description"
		content="Les {echelle.length} paliers de « Nés du silence », de la Commune Raw à la Prismatique Full Art détourée."
	/>
</svelte:head>

<header class="tete">
	<p class="kicker">Nés du silence · Set 01</p>
	<h1>L'échelle</h1>
	<p class="chapo">
		La rareté seule ne dit plus ce qu'on tient. Deux Prismatiques n'ont pas la même valeur selon
		qu'elles sortent brutes ou détourées. Voici les <b>{echelle.length} paliers</b> qui existent
		réellement, du plus courant au plus rare — jusqu'à
		<b>{leRare.label}</b>, {frequence(leRare.taux).toLowerCase()}.
	</p>

	<div class="filtres">
		<button class="fbtn" class:on={filtre === 'all'} onclick={() => (filtre = 'all')}>
			Toutes <span class="fn">{echelle.length}</span>
		</button>
		{#each raretes as r (r)}
			{@const n = echelle.filter((p) => p.rarity === r).length}
			<button class="fbtn" class:on={filtre === r} disabled={n === 0} onclick={() => (filtre = r)}>
				{charter.rarities[r].name} <span class="fn">{n}</span>
			</button>
		{/each}
	</div>
</header>

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
	Ces taux ne sont pas calculés : ils sont mesurés. Trois millions de boosters sont ouverts avec le
	moteur de tirage du jeu, god packs et garanties compris, et chaque version est comptée telle
	qu'elle sort. La somme des {echelle.length} paliers vaut donc exactement 5 — la taille d'un
	booster — et le tableau reste vrai quoi qu'on ajoute plus tard au booster.
</p>

<style>
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

	.filtres {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.fbtn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.42rem 0.95rem;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 550;
		color: rgba(242, 240, 234, 0.55);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 999px;
		cursor: pointer;
		transition:
			color 0.16s ease,
			background 0.16s ease;
	}
	.fbtn:hover:not(:disabled) {
		color: #f2f0ea;
	}
	.fbtn.on {
		color: #0a0a0d;
		background: #f2f0ea;
		border-color: transparent;
	}
	.fbtn:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.fn {
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		opacity: 0.6;
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
