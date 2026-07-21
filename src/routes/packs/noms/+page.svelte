<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/Card.svelte';
	import FactionSigil from '$lib/FactionSigil.svelte';
	import { charter } from '$lib/charter';
	import { cards } from '$lib/cards';
	import { FULLART_RATE, loadCollection, saveCollection } from '$lib/gacha';
	import { versionsOf } from '$lib/variants';
	import { eco, initEconomy, depenserSyllabes } from '$lib/economy.svelte';
	import { tauxVersion, prixNom, frequence } from '$lib/paliers';
	import type { CardData, FactionId, Rarity } from '$lib/types';

	/**
	 * LE GLANAGE — on n'achète pas une carte, on reconstitue un nom.
	 *
	 *   « Nous collectionnons les syllabes perdues. Certains d'entre nous en ont
	 *     rassemblé assez pour reconstituer des noms entiers. »  (KORUM.md)
	 *
	 * Chaque VERSION est un nom distinct : le Raw et sa finition ne sont pas le
	 * même exemplaire, et le tirage les distingue déjà.
	 *
	 * Le prix découle de la rareté RÉELLE de la version — son taux de sortie par
	 * booster, qui tient compte de la rareté, de la forme et de la finition. Une
	 * Commune Raw sort 2,5 fois par booster, une Commune Full Art SP une fois sur
	 * 480 : elles ne peuvent pas valoir pareil.
	 */
	interface Nom {
		key: string;
		base: CardData;
		label: string;
		view: CardData;
		fullArt: boolean;
		rarity: Rarity;
		prix: number;
		taux: number;
	}

	const FACTIONS = Object.keys(charter.factions) as FactionId[];
	const RARETES = Object.keys(charter.rarities) as Rarity[];

	const tous: Nom[] = cards.flatMap((c) =>
		versionsOf(c, FULLART_RATE).map((v) => {
			const rarity = (v.view.sourceRarity ?? c.rarity) as Rarity;
			const taux = tauxVersion(c, v.rate);
			return {
				key: v.key,
				base: c,
				label: v.label,
				view: v.view,
				fullArt: v.fullArt,
				rarity,
				taux,
				prix: prixNom(taux)
			};
		})
	);

	let collection = $state<Record<string, number>>({});
	onMount(() => {
		initEconomy();
		collection = loadCollection();
	});

	let recherche = $state('');
	let faction = $state<'all' | FactionId>('all');
	let rarete = $state<'all' | Rarity>('all');
	let masquerPossedes = $state(true);
	let abordablesSeules = $state(false);

	const liste = $derived(
		tous
			.filter((n) => {
				if (faction !== 'all' && n.base.faction !== faction) return false;
				if (rarete !== 'all' && n.rarity !== rarete) return false;
				if (masquerPossedes && (collection[n.key] ?? 0) > 0) return false;
				if (abordablesSeules && n.prix > eco.syllabes) return false;
				if (recherche && !n.base.name.toLowerCase().includes(recherche.toLowerCase())) return false;
				return true;
			})
			.sort((a, b) => a.prix - b.prix || a.base.name.localeCompare(b.base.name))
	);

	/** Combien de noms le solde actuel permet de reconstituer, ici et maintenant. */
	const aPortee = $derived(
		tous.filter((n) => (collection[n.key] ?? 0) === 0 && n.prix <= eco.syllabes).length
	);

	/* La loupe : on achète un objet, on doit pouvoir l'examiner avant. Le grisé
	   n'est qu'un signal de solde DANS la galerie — l'aperçu, lui, montre toujours
	   la carte telle qu'elle sera, en couleur et lisible. */
	let apercu = $state<Nom | null>(null);

	function fermer() {
		apercu = null;
	}

	function auClavier(e: KeyboardEvent) {
		if (e.key === 'Escape') fermer();
	}

	let message = $state('');
	let messageTimer: ReturnType<typeof setTimeout> | null = null;
	function dire(txt: string) {
		message = txt;
		if (messageTimer) clearTimeout(messageTimer);
		messageTimer = setTimeout(() => (message = ''), 3200);
	}

	function reconstituer(n: Nom) {
		if ((collection[n.key] ?? 0) > 0) return;
		if (!depenserSyllabes(n.prix)) {
			const manque = n.prix - eco.syllabes;
			dire(`Il vous manque ${manque} Syllabe${manque > 1 ? 's' : ''} pour ${n.base.name}.`);
			return;
		}
		collection[n.key] = 1;
		collection = { ...collection };
		saveCollection($state.snapshot(collection));
		dire(`« ${n.base.name} » est dit.`);
	}
</script>

<svelte:head>
	<title>Le Glanage — {charter.game.name}</title>
	<meta
		name="description"
		content="Reconstituez des noms entiers avec les Syllabes glanées sur les Prismatiques."
	/>
</svelte:head>

<header class="tete">
	<p class="kicker">Réquisition · Les Eshar</p>
	<h1>Le Glanage</h1>
	<p class="chapo">
		Un nom qu'on ne dit plus s'efface, syllabe après syllabe. Les Eshar les ramassent. Rassemblez-en
		assez et vous reconstituerez un nom entier — sans passer par le hasard d'un sceau.
	</p>
	<p class="chapo source">
		Les Syllabes tombent des noms restés entiers : <b>+25</b> par Prismatique tirée,
		<b>+75</b> si vous la possédiez déjà — le doublon résonne plus fort, mais la carte reste
		dans votre Registre —, <b>+15</b> par SP et <b>+8</b> par Full Art. Jamais cumulé : une
		Prismatique compte pour une Prismatique.
	</p>

	<div class="bourse">
		<span class="solde">
			<span class="syl" aria-hidden="true"></span>
			<b>{eco.syllabes}</b> Syllabe{eco.syllabes > 1 ? 's' : ''}
		</span>
		<span class="portee">{aPortee} nom{aPortee > 1 ? 's' : ''} à votre portée</span>
	</div>
</header>

{#if message}
	<p class="message" role="status">{message}</p>
{/if}

<div class="filtres">
	<button class="jeton" class:on={faction === 'all'} onclick={() => (faction = 'all')}>Tous</button>
	{#each FACTIONS as f (f)}
		<button
			class="jeton"
			class:on={faction === f}
			onclick={() => (faction = f)}
			title={charter.factions[f].name}
		>
			<span style="color: {charter.factions[f].color}"><FactionSigil faction={f} flat /></span>
		</button>
	{/each}

	<span class="sep" aria-hidden="true"></span>

	<button class="jeton texte" class:on={rarete === 'all'} onclick={() => (rarete = 'all')}>
		Toutes raretés
	</button>
	{#each RARETES as r (r)}
		<button class="jeton texte" class:on={rarete === r} onclick={() => (rarete = r)}>
			{charter.rarities[r].name}
		</button>
	{/each}

	<input class="rech" type="search" placeholder="Rechercher un nom…" bind:value={recherche} />

	<label class="bascule">
		<input type="checkbox" bind:checked={masquerPossedes} />
		Masquer ce que je possède
	</label>
	<label class="bascule">
		<input type="checkbox" bind:checked={abordablesSeules} />
		À ma portée seulement
	</label>
</div>

<p class="compteur">{liste.length} nom{liste.length > 1 ? 's' : ''}</p>

<div class="grille">
	{#each liste as n (n.key)}
		{@const possede = (collection[n.key] ?? 0) > 0}
		{@const abordable = eco.syllabes >= n.prix}
		<article class="etal" class:hors-portee={!possede && !abordable}>
			<button class="vue" onclick={() => (apercu = n)} title="Voir « {n.base.name} » en grand">
				<Card card={n.view} fullArt={n.fullArt} interactive={false} thumb />
			</button>
			<p class="nom">{n.base.name}</p>
			<p class="finition">{n.label}</p>
			<p class="frequence">{frequence(n.taux)}</p>
			{#if possede}
				<span class="acquis">Possédé</span>
			{:else}
				<button class="acheter" disabled={!abordable} onclick={() => reconstituer(n)}>
					{n.prix}
					<span class="syl" aria-hidden="true"></span>
				</button>
			{/if}
		</article>
	{/each}
</div>

{#if liste.length === 0}
	<p class="vide">Aucun nom ne répond à ces filtres.</p>
{/if}

{#if apercu}
	{@const possede = (collection[apercu.key] ?? 0) > 0}
	{@const abordable = eco.syllabes >= apercu.prix}
	<div class="loupe" role="dialog" aria-modal="true" aria-label={apercu.base.name}>
		<button class="loupe-fond" aria-label="Fermer" onclick={fermer}></button>
		<div class="loupe-boite">
			<!-- jamais de grisé ici : c'est le produit, on le montre tel qu'il est -->
			<div class="loupe-carte">
				<Card card={apercu.view} fullArt={apercu.fullArt} />
			</div>
			<div class="loupe-fiche">
				<p class="lf-peuple">
					<span style="color: {charter.factions[apercu.base.faction].color}">
						<FactionSigil faction={apercu.base.faction} flat />
					</span>
					{charter.factions[apercu.base.faction].name}
					<span class="lf-sep">//</span>
					{charter.rarities[apercu.rarity].name}
				</p>
				<h2>{apercu.base.name}</h2>
				<p class="lf-finition">{apercu.label} · {frequence(apercu.taux)}</p>

				<div class="lf-stats">
					<span class="lf-chip">Volonté {apercu.base.cost}</span>
					{#if apercu.base.kind === 'etre'}
						<span class="lf-chip">{apercu.base.attack} ATQ</span>
						<span class="lf-chip">{apercu.base.health} INT</span>
					{/if}
				</div>

				{#if apercu.base.text}
					<p class="lf-titre">Effet</p>
					<p class="lf-texte">{apercu.base.text}</p>
				{/if}
				{#if apercu.base.prononcer}
					<p class="lf-titre">Prononcer {apercu.base.prononcer.cost}</p>
					<p class="lf-texte">{apercu.base.prononcer.text}</p>
				{/if}
				{#if apercu.base.flavor}
					<p class="lf-flavor">« {apercu.base.flavor} »</p>
				{/if}

				{#if possede}
					<span class="acquis">Possédé</span>
				{:else}
					<button class="acheter grand" disabled={!abordable} onclick={() => reconstituer(apercu!)}>
						Reconstituer · {apercu.prix}
						<span class="syl" aria-hidden="true"></span>
					</button>
					{#if !abordable}
						<p class="lf-manque">
							Il vous manque {apercu.prix - eco.syllabes} Syllabe{apercu.prix - eco.syllabes > 1
								? 's'
								: ''}.
						</p>
					{/if}
				{/if}
				<a class="lf-lien" href="/card/{apercu.base.id}{apercu.key === apercu.base.id ? '' : `?v=${apercu.key}`}">
					Fiche complète →
				</a>
			</div>
		</div>
		<button class="loupe-x" aria-label="Fermer" onclick={fermer}>✕</button>
	</div>
{/if}

<svelte:window onkeydown={auClavier} />

<style>
	.tete {
		margin: 2.4rem 0 2rem;
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
		font-size: clamp(2.4rem, 6vw, 4rem);
		font-weight: 400;
		line-height: 1;
	}
	.chapo {
		margin: 0 0 0.7rem;
		font-size: 0.98rem;
		line-height: 1.7;
		color: rgba(242, 240, 234, 0.62);
	}
	.chapo.source {
		font-size: 0.85rem;
		color: rgba(242, 240, 234, 0.42);
	}
	.chapo b {
		color: #d5b25e;
		font-variant-numeric: tabular-nums;
	}

	.bourse {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem 1.2rem;
		margin-top: 1.4rem;
		padding: 0.7rem 1.2rem;
		width: fit-content;
		background: rgba(213, 178, 94, 0.06);
		border: 1px solid rgba(213, 178, 94, 0.22);
		border-radius: 999px;
	}
	.solde {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.92rem;
		color: rgba(242, 240, 234, 0.75);
	}
	.solde b {
		color: #d5b25e;
		font-size: 1.1rem;
		font-variant-numeric: tabular-nums;
	}
	.portee {
		font-size: 0.8rem;
		color: rgba(242, 240, 234, 0.4);
	}
	/* la Syllabe : un éclat vertical, comme un trait de voix */
	.syl {
		width: 0.42rem;
		height: 0.72rem;
		border-radius: 40% 40% 45% 45%;
		background: linear-gradient(180deg, #fff6dc, #a97f2c);
		box-shadow: 0 0 6px rgba(213, 178, 94, 0.65);
		flex: none;
	}

	.message {
		margin: 0 0 1.2rem;
		padding: 0.6rem 1.1rem;
		width: fit-content;
		font-size: 0.85rem;
		color: #f0e6cf;
		background: rgba(213, 178, 94, 0.12);
		border: 1px solid rgba(213, 178, 94, 0.35);
		border-radius: 10px;
	}

	.filtres {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}
	.jeton {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.38rem 0.75rem;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 550;
		color: rgba(242, 240, 234, 0.55);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 999px;
		cursor: pointer;
	}
	.jeton:hover {
		color: #f2f0ea;
	}
	.jeton.on {
		color: #0a0a0d;
		background: #f2f0ea;
		border-color: transparent;
	}
	.sep {
		width: 1px;
		height: 1.4rem;
		background: rgba(255, 255, 255, 0.12);
		margin: 0 0.3rem;
	}
	.rech {
		min-width: 180px;
		padding: 0.42rem 0.9rem;
		font-family: inherit;
		font-size: 0.84rem;
		color: var(--ink);
		background: rgba(140, 170, 220, 0.07);
		border: 1px solid var(--panel-line);
		border-radius: 999px;
	}
	.rech:focus {
		outline: none;
		border-color: rgba(213, 178, 94, 0.5);
	}
	.bascule {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: rgba(242, 240, 234, 0.5);
		cursor: pointer;
	}

	.compteur {
		margin: 0 0 1.2rem;
		font-size: 0.8rem;
		color: rgba(242, 240, 234, 0.38);
	}

	.grille {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 2rem 1.3rem;
		margin-bottom: 4rem;
	}
	.etal {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		--card-w: min(200px, 100%);
	}
	.etal.hors-portee .vue {
		filter: grayscale(0.85) brightness(0.6);
		opacity: 0.7;
	}
	.vue {
		display: block;
		width: 100%;
		padding: 0;
		background: none;
		border: none;
		cursor: zoom-in;
	}

	/* ---------- la loupe ---------- */
	.loupe {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: grid;
		place-items: center;
		padding: 2rem 1.2rem;
		/* si le contenu dépasse, c'est TOUTE la loupe qui défile — jamais la boîte
		   autour de la carte, qui la rognerait dès qu'elle s'incline */
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.loupe-fond {
		/* fixed, sinon le fond défilerait avec le contenu */
		position: fixed;
		inset: 0;
		border: none;
		cursor: zoom-out;
		background: rgba(4, 5, 9, 0.86);
		-webkit-backdrop-filter: blur(8px);
		backdrop-filter: blur(8px);
	}
	.loupe-boite {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		margin: auto;
		/* aucun rognage : la carte bascule en 3D et doit pouvoir déborder */
		overflow: visible;
	}
	.loupe-carte {
		--card-w: min(320px, 74vw);
		flex: none;
		/* de l'air autour, pour que l'inclinaison ne touche jamais un bord */
		padding: 1.2rem;
		margin: -1.2rem;
	}
	.loupe-fiche {
		max-width: 24rem;
		min-width: 15rem;
	}
	.lf-peuple {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.5rem;
		font-size: 0.76rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.5);
	}
	.lf-sep {
		opacity: 0.4;
	}
	.loupe-fiche h2 {
		margin: 0 0 0.35rem;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: 2.1rem;
		font-weight: 400;
		line-height: 1.05;
	}
	.lf-finition {
		margin: 0 0 1rem;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		color: #d5b25e;
	}
	.lf-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}
	.lf-chip {
		padding: 0.28rem 0.7rem;
		font-size: 0.78rem;
		color: rgba(242, 240, 234, 0.75);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 999px;
	}
	.lf-titre {
		margin: 0 0 0.2rem;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.35);
	}
	.lf-texte {
		margin: 0 0 0.9rem;
		font-size: 0.92rem;
		line-height: 1.6;
		color: rgba(242, 240, 234, 0.85);
	}
	.lf-flavor {
		margin: 0 0 1.2rem;
		font-style: italic;
		font-size: 0.85rem;
		line-height: 1.6;
		color: rgba(242, 240, 234, 0.42);
	}
	.acheter.grand {
		font-size: 0.95rem;
		padding: 0.6rem 1.4rem;
	}
	.lf-manque {
		margin: 0.5rem 0 0;
		font-size: 0.78rem;
		color: rgba(242, 240, 234, 0.45);
	}
	.lf-lien {
		display: inline-block;
		margin-top: 1rem;
		font-size: 0.8rem;
		color: rgba(242, 240, 234, 0.45);
		text-decoration: none;
	}
	.lf-lien:hover {
		color: #d5b25e;
	}
	.loupe-x {
		position: absolute;
		top: 1rem;
		right: 1.2rem;
		width: 2.4rem;
		height: 2.4rem;
		font-size: 1rem;
		color: rgba(242, 240, 234, 0.6);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 50%;
		cursor: pointer;
	}
	.loupe-x:hover {
		color: #f2f0ea;
	}
	.nom {
		margin: 0.3rem 0 0;
		text-align: center;
		font-size: 0.84rem;
		font-weight: 600;
		line-height: 1.3;
	}
	.finition {
		margin: 0;
		font-size: 0.72rem;
		color: rgba(242, 240, 234, 0.42);
	}
	/* la fréquence justifie le prix : on voit ce qu'on paie */
	.frequence {
		margin: 0 0 0.15rem;
		font-size: 0.66rem;
		font-variant-numeric: tabular-nums;
		color: rgba(242, 240, 234, 0.28);
	}
	.acheter {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 1rem;
		font-family: inherit;
		font-size: 0.84rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: #0a0a0d;
		background: linear-gradient(180deg, #f0d68a, #c9a445);
		border: none;
		border-radius: 999px;
		cursor: pointer;
		transition: filter 0.16s ease;
	}
	.acheter:hover:not(:disabled) {
		filter: brightness(1.08);
	}
	.acheter:disabled {
		color: rgba(242, 240, 234, 0.35);
		background: rgba(255, 255, 255, 0.06);
		cursor: default;
	}
	.acquis {
		padding: 0.35rem 0.9rem;
		font-size: 0.76rem;
		font-weight: 600;
		color: rgba(242, 240, 234, 0.45);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 999px;
	}
	.vide {
		margin: 3rem 0 5rem;
		text-align: center;
		color: rgba(242, 240, 234, 0.4);
	}
</style>
