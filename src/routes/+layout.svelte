<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { charter } from '$lib/charter';
	import { cards } from '$lib/cards';
	import { page } from '$app/state';

	let { children } = $props();

	const links = [
		{ href: '/', label: 'Le mur' },
		{ href: '/lab', label: 'Lab' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	<nav>
		<a class="brand" href="/">
			<span class="brand-mark">◆</span>
			{charter.game.name}
		</a>
		<div class="links">
			{#each links as l (l.href)}
				<a href={l.href} class:active={page.url.pathname === l.href}>{l.label}</a>
			{/each}
		</div>
		<div class="setchip">
			<span class="setchip-label">Set 01</span>
			<span class="setchip-count">{cards.length}<em>/60</em></span>
		</div>
	</nav>

	<main>
		{@render children()}
	</main>

	<footer>
		<span class="f-diamond">◆</span>
		<span>{charter.game.tagline}</span>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		min-height: 100vh;
		background:
			radial-gradient(1400px 700px at 75% -12%, #182430 0%, transparent 60%),
			radial-gradient(900px 500px at -10% 110%, #161b26 0%, transparent 55%),
			#0f1923;
		color: #ece8e1;
		font-family: 'Segoe UI', system-ui, sans-serif;
	}
	:global(::selection) {
		background: #c23b4e;
		color: #ece8e1;
	}
	:global(a) {
		color: inherit;
	}

	.app {
		max-width: 1240px;
		margin: 0 auto;
		padding: 0 1.5rem 2rem;
	}

	/* ---------- nav : barre HUD ---------- */

	nav {
		display: flex;
		align-items: stretch;
		gap: 2.2rem;
		padding: 0;
		margin-bottom: 2.6rem;
		border-bottom: 1px solid rgba(236, 232, 225, 0.12);
	}
	nav a {
		text-decoration: none;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 1.1rem 0;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-stretch: 82%;
		font-weight: 700;
		font-size: 1.18rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.brand-mark {
		color: #c23b4e;
		font-size: 0.8em;
	}
	.links {
		display: flex;
		align-items: stretch;
		gap: 0.4rem;
	}
	.links a {
		position: relative;
		display: flex;
		align-items: center;
		padding: 0 1.1rem;
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.82rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.6);
		transition: color 0.15s ease;
	}
	.links a:hover {
		color: #ece8e1;
	}
	.links a.active {
		color: #ece8e1;
	}
	.links a.active::after {
		content: '';
		position: absolute;
		left: 1.1rem;
		right: 1.1rem;
		bottom: -1px;
		height: 3px;
		background: #c23b4e;
		clip-path: polygon(0 0, 100% 0, calc(100% - 3px) 100%, 3px 100%);
	}
	.setchip {
		margin-left: auto;
		align-self: center;
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0.4rem 0.9rem;
		background: rgba(236, 232, 225, 0.06);
		clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
	}
	.setchip-label {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.55);
	}
	.setchip-count {
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
		font-weight: 700;
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
	}
	.setchip-count em {
		font-style: normal;
		color: rgba(236, 232, 225, 0.45);
		font-size: 0.8em;
	}

	/* ---------- footer ---------- */

	footer {
		margin-top: 4rem;
		padding-top: 1.2rem;
		border-top: 1px solid rgba(236, 232, 225, 0.1);
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.78rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.4);
		font-family: Bahnschrift, 'Arial Narrow', sans-serif;
	}
	.f-diamond {
		color: #c23b4e;
		font-size: 0.7em;
	}
</style>
