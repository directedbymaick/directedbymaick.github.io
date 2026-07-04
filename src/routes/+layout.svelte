<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { charter } from '$lib/charter';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	<nav>
		<a class="brand" href="/">{charter.game.name}</a>
		<a href="/lab">Lab</a>
	</nav>
	{@render children()}
</div>

<style>
	:global(body) {
		margin: 0;
		min-height: 100vh;
		background:
			radial-gradient(1200px 600px at 70% -10%, #1d2030 0%, transparent 60%),
			#0d0e14;
		color: #e8e6df;
		font-family: 'Segoe UI', system-ui, sans-serif;
	}
	:global(a) {
		color: inherit;
	}

	.app {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	nav {
		display: flex;
		align-items: baseline;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	nav a {
		text-decoration: none;
		opacity: 0.75;
	}
	nav a:hover {
		opacity: 1;
	}
	.brand {
		font-family: Georgia, serif;
		font-size: 1.3rem;
		letter-spacing: 0.03em;
		opacity: 1;
	}
</style>
