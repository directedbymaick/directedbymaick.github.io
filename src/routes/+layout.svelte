<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import logo from '$lib/assets/logo.svg';
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
		{ href: '/profil', label: 'Mon Nom' },
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
			<a class="brand" href="/">
				<img class="emblem" src={logo} alt="" aria-hidden="true" />
				<span class="brand-txt">
					<b>{charter.game.name}</b>
					<i>Le Silence · Set 01</i>
				</span>
			</a>
			<div class="links">
				{#each links as l (l.href)}
					<a href={l.href} class:active={page.url.pathname === l.href}>{l.label}</a>
				{/each}
			</div>
			<span class="setcount">Indexées <b>{cards.length}</b>/60</span>
		</div>
	</nav>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>{charter.game.tagline}</p>
	</footer>

	<span class="uid" aria-hidden="true">UID : KOR-701606888</span>

	<!-- grain de pellicule : unifie toutes les surfaces, très discret -->
	<div class="grain" aria-hidden="true"></div>
</div>

<style>
	:global(:root) {
		--bg: #070d1a;
		--bg-2: #0b1528;
		--panel: rgba(13, 22, 42, 0.62);
		--panel-line: rgba(140, 170, 220, 0.14);
		--ink: #eef0f5;
		--ink-dim: rgba(238, 240, 245, 0.55);
		--gold: #d5b25e;
		--gold-deep: #c9a445;
		--cream: #efe8d8;
	}
	:global(html) {
		scroll-behavior: smooth;
		overflow-x: clip;
	}
	:global(body) {
		margin: 0;
		min-height: 100vh;
		overflow-x: clip;
		color: var(--ink);
		font-family: 'Inter Variable', Inter, system-ui, sans-serif;
		font-size: 1rem;
		-webkit-font-smoothing: antialiased;
		text-rendering: optimizeLegibility;
		/* le cosmos HSR : nébuleuses bleues sur nuit profonde, étoiles fixes */
		background:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 900'%3E%3Cg fill='%23ffffff'%3E%3Ccircle cx='40' cy='120' r='1.1' opacity='.55'/%3E%3Ccircle cx='190' cy='60' r='.8' opacity='.4'/%3E%3Ccircle cx='330' cy='210' r='1.3' opacity='.6'/%3E%3Ccircle cx='520' cy='90' r='.9' opacity='.35'/%3E%3Ccircle cx='700' cy='160' r='1.1' opacity='.5'/%3E%3Ccircle cx='840' cy='40' r='.8' opacity='.4'/%3E%3Ccircle cx='90' cy='330' r='.9' opacity='.4'/%3E%3Ccircle cx='260' cy='420' r='1.2' opacity='.55'/%3E%3Ccircle cx='450' cy='300' r='.8' opacity='.3'/%3E%3Ccircle cx='620' cy='380' r='1.4' opacity='.6'/%3E%3Ccircle cx='790' cy='300' r='.9' opacity='.4'/%3E%3Ccircle cx='150' cy='560' r='1.2' opacity='.5'/%3E%3Ccircle cx='360' cy='620' r='.8' opacity='.35'/%3E%3Ccircle cx='540' cy='540' r='1.1' opacity='.55'/%3E%3Ccircle cx='730' cy='600' r='.9' opacity='.4'/%3E%3Ccircle cx='860' cy='500' r='1.2' opacity='.5'/%3E%3Ccircle cx='60' cy='760' r='.9' opacity='.4'/%3E%3Ccircle cx='240' cy='840' r='1.3' opacity='.55'/%3E%3Ccircle cx='430' cy='780' r='.8' opacity='.35'/%3E%3Ccircle cx='610' cy='860' r='1.1' opacity='.5'/%3E%3Ccircle cx='800' cy='760' r='.9' opacity='.4'/%3E%3C/g%3E%3Cg fill='%23d5b25e'%3E%3Ccircle cx='470' cy='170' r='1.2' opacity='.5'/%3E%3Ccircle cx='120' cy='470' r='1' opacity='.45'/%3E%3Ccircle cx='690' cy='470' r='1.2' opacity='.4'/%3E%3Ccircle cx='320' cy='740' r='1' opacity='.45'/%3E%3C/g%3E%3C/svg%3E")
				repeat,
			radial-gradient(60% 45% at 18% 8%, rgba(38, 70, 130, 0.4), transparent 65%),
			radial-gradient(55% 40% at 85% 30%, rgba(24, 52, 105, 0.35), transparent 65%),
			radial-gradient(70% 50% at 50% 100%, rgba(16, 34, 70, 0.45), transparent 70%),
			linear-gradient(180deg, #050a14 0%, var(--bg) 40%, #081020 100%);
		background-attachment: fixed;
	}
	:global(::selection) {
		background: rgba(213, 178, 94, 0.9);
		color: #081020;
	}
	:global(a) {
		color: inherit;
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	/* ---------- nav : barre de jeu, verre bleuté ---------- */
	nav {
		position: sticky;
		top: 0;
		z-index: 100;
		background: rgba(7, 12, 24, 0.7);
		backdrop-filter: blur(18px) saturate(1.5);
		border-bottom: 1px solid rgba(140, 170, 220, 0.12);
	}
	.nav-inner {
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 2rem;
		height: 3.9rem;
		display: flex;
		align-items: center;
		gap: 2rem;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		text-decoration: none;
	}
	.emblem {
		width: 2.6rem;
		height: 2.6rem;
		filter: drop-shadow(0 0 10px rgba(213, 178, 94, 0.45));
	}
	.brand-txt {
		display: flex;
		flex-direction: column;
		line-height: 1.15;
	}
	.brand-txt b {
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 0.92rem;
		letter-spacing: 0.26em;
		color: var(--ink);
	}
	.brand-txt i {
		font-style: normal;
		font-size: 0.66rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.42);
	}
	.links {
		display: flex;
		gap: 0.4rem;
		margin-left: 1rem;
	}
	.links a {
		text-decoration: none;
		font-size: 0.84rem;
		font-weight: 550;
		padding: 0.42rem 1rem;
		border-radius: 999px;
		color: rgba(238, 240, 245, 0.6);
		transition:
			color 0.18s ease,
			background 0.18s ease;
	}
	.links a:hover {
		color: var(--ink);
		background: rgba(140, 170, 220, 0.1);
	}
	/* l'onglet actif : pill crème, texte nuit — le code HSR */
	.links a.active {
		color: #171b10;
		background: var(--cream);
		box-shadow: 0 0 16px rgba(213, 178, 94, 0.25);
	}
	.setcount {
		margin-left: auto;
		font-size: 0.82rem;
		font-variant-numeric: tabular-nums;
		color: rgba(238, 240, 245, 0.5);
	}
	.setcount b {
		font-weight: 650;
		color: var(--gold);
	}

	main {
		flex: 1;
		width: 100%;
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 2rem 4rem;
		box-sizing: border-box;
	}

	.grain {
		position: fixed;
		inset: 0;
		z-index: 200;
		pointer-events: none;
		opacity: 0.045;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		background-size: 240px 240px;
	}

	/* l'estampille UID, comme en jeu */
	.uid {
		position: fixed;
		left: 1.1rem;
		bottom: 0.9rem;
		z-index: 150;
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		font-variant-numeric: tabular-nums;
		color: rgba(238, 240, 245, 0.3);
		pointer-events: none;
	}
	@media (max-width: 700px) {
		.uid {
			display: none;
		}
	}

	footer {
		position: relative;
		padding: 5rem 2rem 3rem;
	}
	footer::before {
		content: '';
		position: absolute;
		top: 0;
		left: 20%;
		right: 20%;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(213, 178, 94, 0.4), transparent);
	}
	footer p {
		max-width: 1280px;
		margin: 0 auto;
		text-align: center;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 1.05rem;
		color: rgba(238, 240, 245, 0.42);
	}
</style>
