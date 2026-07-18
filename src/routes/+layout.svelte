<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { charter } from '$lib/charter';
	import { cards } from '$lib/cards';
	import { page } from '$app/state';
	import '@fontsource-variable/inter/index.css';
	import '@fontsource/cinzel/400.css';
	import '@fontsource/cinzel/600.css';
	import '@fontsource/cinzel/700.css';
	import '@fontsource/cormorant-garamond/400.css';
	import '@fontsource/cormorant-garamond/400-italic.css';

	let { children } = $props();

	// Lenis : le poids du scroll (cf. IZANAMI-CODES.md §2) — piloté par le ticker GSAP.
	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let cleanup = () => {};
		(async () => {
			const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
				import('lenis'),
				import('gsap'),
				import('gsap/ScrollTrigger')
			]);
			gsap.registerPlugin(ScrollTrigger);
			const lenis = new Lenis({ lerp: 0.09 });
			lenis.on('scroll', ScrollTrigger.update);
			const tick = (time: number) => lenis.raf(time * 1000);
			gsap.ticker.add(tick);
			gsap.ticker.lagSmoothing(0);
			cleanup = () => {
				gsap.ticker.remove(tick);
				lenis.destroy();
			};
		})();
		return () => cleanup();
	});

	const links = [
		{ href: '/', label: 'Registre' },
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
		<div class="nav-inner">
			<a class="brand" href="/">{charter.game.name}</a>
			<div class="links">
				{#each links as l (l.href)}
					<a href={l.href} class:active={page.url.pathname === l.href}>{l.label}</a>
				{/each}
			</div>
			<span class="setcount">{cards.length}<em>/60</em></span>
		</div>
	</nav>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>{charter.game.tagline}</p>
	</footer>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
	:global(body) {
		margin: 0;
		min-height: 100vh;
		background: #0a0a0d;
		color: #f2f0ea;
		font-family: 'Inter Variable', Inter, system-ui, sans-serif;
		font-size: 1rem;
		-webkit-font-smoothing: antialiased;
		text-rendering: optimizeLegibility;
	}
	:global(::selection) {
		background: rgba(201, 164, 69, 0.9);
		color: #0a0a0d;
	}
	:global(a) {
		color: inherit;
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	/* ---------- nav : verre dépoli, fixe ---------- */
	nav {
		position: sticky;
		top: 0;
		z-index: 100;
		background: rgba(10, 10, 13, 0.72);
		backdrop-filter: blur(20px) saturate(1.6);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.nav-inner {
		max-width: 1240px;
		margin: 0 auto;
		padding: 0 2rem;
		height: 3.4rem;
		display: flex;
		align-items: center;
		gap: 2.4rem;
	}
	.brand {
		text-decoration: none;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 0.95rem;
		letter-spacing: 0.3em;
		color: #f2f0ea;
	}
	.links {
		display: flex;
		gap: 1.8rem;
		margin-left: 0.6rem;
	}
	.links a {
		text-decoration: none;
		font-size: 0.82rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		color: rgba(242, 240, 234, 0.55);
		transition: color 0.18s ease;
	}
	.links a:hover {
		color: rgba(242, 240, 234, 0.85);
	}
	.links a.active {
		color: #f2f0ea;
	}
	.setcount {
		margin-left: auto;
		font-size: 0.82rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: #c9a445;
	}
	.setcount em {
		font-style: normal;
		font-weight: 400;
		color: rgba(242, 240, 234, 0.35);
	}

	main {
		flex: 1;
		width: 100%;
		max-width: 1240px;
		margin: 0 auto;
		padding: 0 2rem 4rem;
		box-sizing: border-box;
	}

	footer {
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		padding: 2.4rem 2rem 3rem;
	}
	footer p {
		max-width: 1240px;
		margin: 0 auto;
		text-align: center;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 1.05rem;
		color: rgba(242, 240, 234, 0.4);
	}
</style>
