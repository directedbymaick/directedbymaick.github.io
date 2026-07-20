<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { getCard } from '$lib/cards';

	const source = getCard('doran')!;
	const haloCard = structuredClone(source);
	haloCard.rarity = 'prism';
	haloCard.gene.foilPreset = 'secret';
</script>

<svelte:head>
	<title>Lab — L’Auréole</title>
</svelte:head>

<header class="hero">
	<p class="kicker">Lab · Direction retenue</p>
	<h1>L’Auréole</h1>
	<p>
		Une seule variante décorative, réservée aux cartes full-art prismatiques. Le format Expelled
		<strong>63 × 88</strong>, la hiérarchie de jeu et le foil prismatique propre sont conservés.
	</p>
</header>

<section class="showcase">
	<div class="card-stage">
		<Card card={haloCard} fullArt />
	</div>
	<div class="notes">
		<span>PRISM · FULL ART</span>
		<h2>Une présence, pas une boîte.</h2>
		<p>
			Le coût est surmonté d’un halo fin. Le nom et le texte reposent directement sur l’image,
			protégés uniquement par un dégradé sombre. L’or reste concentré sur l’auréole et sur
			l’action Prononcer.
		</p>
		<ul>
			<li>Aucun cartouche opaque</li>
			<li>Aucun nouveau foil expérimental</li>
			<li>Bord et dimensions Expelled inchangés</li>
			<li>Application exclusive aux prismatiques</li>
		</ul>
	</div>
</section>

<style>
	.hero { margin: 7rem 0 4rem; max-width: 760px; }
	.kicker { margin: 0 0 1rem; font: 600 .68rem 'Inter Variable',sans-serif; letter-spacing: .3em; text-transform: uppercase; color: #c9a445; }
	h1 { margin: 0; font: 400 clamp(3rem,8vw,6.5rem)/.95 Cinzel,serif; }
	.hero > p:last-child { max-width: 58ch; margin: 1.5rem 0 0; font-size: 1.08rem; line-height: 1.55; color: rgba(242,240,234,.55); }
	.showcase { display: grid; grid-template-columns: minmax(280px,420px) minmax(280px,1fr); align-items: center; gap: clamp(3rem,8vw,9rem); min-height: 70vh; }
	.card-stage { --card-w: min(390px,88vw); }
	.notes { max-width: 520px; }
	.notes > span { font: 600 .62rem 'Inter Variable',sans-serif; letter-spacing: .26em; color: #c9a445; }
	.notes h2 { margin: 1.2rem 0; font: 400 clamp(2rem,4vw,3.4rem)/1.08 Cinzel,serif; }
	.notes p,.notes li { line-height: 1.55; color: rgba(242,240,234,.55); }
	.notes ul { margin: 2rem 0 0; padding: 1.5rem 0 0; list-style: none; border-top: 1px solid rgba(201,164,69,.25); }
	.notes li { padding: .45rem 0; }
	.notes li::before { content: '◯'; margin-right: .8rem; color: #c9a445; }
	@media (max-width:760px) { .showcase { grid-template-columns: 1fr; } .card-stage { justify-self:center; } }
</style>
