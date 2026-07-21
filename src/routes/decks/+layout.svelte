<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const onglets = [
		{ href: '/decks', label: 'Atelier' },
		{ href: '/decks/recommandes', label: 'Decks recommandés' }
	];
</script>

<nav class="onglets" aria-label="Section Decks">
	{#each onglets as o (o.href)}
		<a href={o.href} class:actif={page.url.pathname === o.href}>{o.label}</a>
	{/each}
</nav>

{@render children()}

<style>
	.onglets {
		display: flex;
		gap: 0.4rem;
		margin: 2.2rem 0 0;
		padding: 0.3rem;
		border: 1px solid var(--panel-line);
		border-radius: 999px;
		background: var(--panel);
		width: fit-content;
	}
	.onglets a {
		padding: 0.5rem 1.3rem;
		border-radius: 999px;
		font-size: 0.84rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-decoration: none;
		color: rgba(238, 240, 245, 0.55);
		transition:
			background 0.16s ease,
			color 0.16s ease;
	}
	.onglets a:hover {
		color: var(--ink);
	}
	.onglets a.actif {
		background: rgba(213, 178, 94, 0.14);
		color: #f0e6cf;
		box-shadow: inset 0 0 0 1px rgba(213, 178, 94, 0.45);
	}
</style>
