<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	/* Arène et Salons sont deux façons de jouer une partie : contre l'IA, ou
	   contre quelqu'un. Elles vivaient dans deux entrées de nav distinctes alors
	   qu'elles mènent au même terrain — les réunir libère une place en haut et
	   rend le choix explicite au moment où on le fait. */
	const onglets = [
		{ href: '/arene', label: 'Contre l’IA' },
		{ href: '/arene/salons', label: 'Salons' },
		{ href: '/arene/simulateur', label: 'Simulateur' }
	];
</script>

<nav class="onglets" aria-label="Section Arène">
	{#each onglets as o (o.href)}
		<a href={o.href} class:actif={page.url.pathname === o.href}>{o.label}</a>
	{/each}
</nav>

{@render children()}

<style>
	.onglets {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-30);
		max-width: var(--page-max);
		margin: var(--spacing-40) auto 0;
		padding-bottom: var(--spacing-15);
		border-bottom: 1px solid var(--panel-line);
	}
	/* micro-libellés : le soulignement actif est tout le traitement */
	.onglets a {
		position: relative;
		padding-bottom: var(--spacing-15);
		margin-bottom: calc(-1 * var(--spacing-15) - 1px);
		font-family: var(--font-grotesque);
		font-size: var(--text-caption);
		font-weight: var(--fw-550);
		letter-spacing: var(--tracking-caption);
		text-transform: uppercase;
		text-decoration: none;
		color: var(--ink-dim);
		border-bottom: 2px solid transparent;
		transition:
			color 0.18s ease,
			border-color 0.18s ease;
	}
	.onglets a:hover {
		color: var(--ink);
	}
	.onglets a.actif {
		color: var(--gold);
		border-bottom-color: var(--gold);
	}
</style>
