<script lang="ts">
	import Card from '$lib/Card.svelte';
	import type { CardData } from '$lib/types';

	/**
	 * Une carte qui ne se monte que lorsqu'elle approche de l'écran.
	 *
	 * Une grille de collection porte deux cents cartes ; chacune est un arbre de
	 * ~31 nœuds avec ses dégradés, ses masques et ses couches holo. Toutes montées
	 * en même temps, le défilement tombe à 18 ms par trame. Or on n'en voit jamais
	 * plus d'une douzaine à la fois.
	 *
	 * Le substitut occupe EXACTEMENT la place de la carte (même ratio, même
	 * largeur), donc rien ne saute au montage ni au démontage. La marge est large
	 * pour que la carte soit prête bien avant d'entrer dans le champ.
	 */
	let {
		card,
		fullArt = false,
		interactive = true,
		thumb = false,
		/** distance d'anticipation, en pixels */
		marge = 900
	}: {
		card: CardData;
		fullArt?: boolean;
		interactive?: boolean;
		thumb?: boolean;
		marge?: number;
	} = $props();

	let hote: HTMLElement;
	let visible = $state(false);

	$effect(() => {
		if (!hote) return;
		// pas d'IntersectionObserver (très vieux navigateur, tests) : on montre tout
		if (typeof IntersectionObserver === 'undefined') {
			visible = true;
			return;
		}
		const io = new IntersectionObserver((entries) => (visible = entries[0].isIntersecting), {
			rootMargin: `${marge}px 0px`
		});
		io.observe(hote);
		return () => io.disconnect();
	});
</script>

<div class="hote" bind:this={hote}>
	{#if visible}
		<Card {card} {fullArt} {interactive} {thumb} />
	{:else}
		<div class="attente" aria-hidden="true"></div>
	{/if}
</div>

<style>
	.hote {
		width: var(--card-w, 320px);
	}
	/* même géométrie que .card : la place est tenue, le défilement ne saute pas */
	.attente {
		width: 100%;
		aspect-ratio: 63 / 88;
		border-radius: 4.6cqw;
		background: rgba(255, 255, 255, 0.03);
	}
</style>
