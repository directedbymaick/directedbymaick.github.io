<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { charter } from '$lib/charter';
	import { cards } from '$lib/cards';
	import { page } from '$app/state';
	import '@fontsource/cinzel/400.css';
	import '@fontsource/cinzel/600.css';
	import '@fontsource/cinzel/700.css';
	import '@fontsource/cormorant-garamond/400.css';
	import '@fontsource/cormorant-garamond/400-italic.css';
	import '@fontsource/cormorant-garamond/600.css';

	let { children } = $props();

	const links = [
		{ href: '/', label: 'Le Registre' },
		{ href: '/packs', label: 'Boosters' },
		{ href: '/regles', label: 'Règles' },
		{ href: '/tuto', label: 'Tuto' },
		{ href: '/lab', label: 'Lab' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	<nav>
		<a class="brand" href="/">
			<span class="brand-ring">◯</span>
			{charter.game.name}
		</a>
		<div class="links">
			{#each links as l (l.href)}
				<a href={l.href} class:active={page.url.pathname === l.href}>{l.label}</a>
			{/each}
		</div>
		<div class="setchip">
			<span class="setchip-label">Le Silence</span>
			<span class="setchip-count">{cards.length}<em>/60</em></span>
		</div>
	</nav>

	<main>
		{@render children()}
	</main>

	<footer>
		<span class="orn">─────</span>
		<span class="f-ring">◯</span>
		<span class="orn">─────</span>
		<p>{charter.game.tagline}</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		min-height: 100vh;
		background:
			radial-gradient(1200px 800px at 50% -18%, #1c1531 0%, transparent 62%),
			radial-gradient(900px 560px at 88% 112%, #181128 0%, transparent 55%),
			radial-gradient(700px 500px at -8% 100%, #14101f 0%, transparent 50%),
			#0c0a13;
		color: #ece5d3;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: 1.06rem;
	}
	:global(::selection) {
		background: #c9a445;
		color: #0c0a13;
	}
	:global(a) {
		color: inherit;
	}

	.app {
		max-width: 1240px;
		margin: 0 auto;
		padding: 0 1.6rem;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 2rem;
		padding: 1.3rem 0.2rem 1.1rem;
		border-bottom: 1px solid rgba(201, 164, 69, 0.22);
	}
	.brand {
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
		text-decoration: none;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 1.15rem;
		letter-spacing: 0.22em;
	}
	.brand-ring {
		color: #c9a445;
		font-size: 0.85em;
	}
	.links {
		display: flex;
		align-items: baseline;
		gap: 1.7rem;
		margin-left: 1rem;
	}
	.links a {
		position: relative;
		text-decoration: none;
		font-family: Cinzel, Georgia, serif;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(236, 229, 211, 0.62);
		padding: 0.3rem 0;
		transition: color 0.18s ease;
	}
	.links a:hover {
		color: #ece5d3;
	}
	.links a.active {
		color: #c9a445;
	}
	.links a.active::after {
		content: '';
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		bottom: -0.35rem;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #c9a445;
	}
	.setchip {
		margin-left: auto;
		display: flex;
		align-items: baseline;
		gap: 0.7rem;
		padding: 0.35rem 1.1rem;
		border: 1px solid rgba(201, 164, 69, 0.3);
		border-radius: 999px;
	}
	.setchip-label {
		font-family: Cinzel, Georgia, serif;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: rgba(236, 229, 211, 0.55);
	}
	.setchip-count {
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 0.95rem;
		color: #c9a445;
	}
	.setchip-count em {
		font-style: normal;
		font-size: 0.75em;
		color: rgba(236, 229, 211, 0.45);
	}

	main {
		flex: 1;
		padding: 1.4rem 0 3rem;
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.9rem;
		flex-wrap: wrap;
		padding: 2.2rem 0 2.6rem;
		border-top: 1px solid rgba(201, 164, 69, 0.18);
	}
	.orn {
		color: rgba(201, 164, 69, 0.35);
		letter-spacing: 0.2em;
		font-size: 0.7rem;
	}
	.f-ring {
		color: #c9a445;
		font-size: 0.8rem;
	}
	footer p {
		width: 100%;
		text-align: center;
		margin: 0.4rem 0 0;
		font-style: italic;
		font-size: 1.05rem;
		color: rgba(236, 229, 211, 0.5);
	}
</style>
