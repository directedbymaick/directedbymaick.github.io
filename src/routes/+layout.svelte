<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import logo from '$lib/assets/logo.svg';
	import { charter } from '$lib/charter';
	import { cards } from '$lib/cards';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { session, initSession, signIn, signOut, isValidEmail } from '$lib/account.svelte';
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
		{ href: '/arene', label: 'Arène' },
		{ href: '/regles', label: 'Règles' },
		{ href: '/tuto', label: 'Tuto' },
		{ href: '/lab', label: 'Lab' }
	];

	/* ---- le compte : icône, menu, modale de connexion ---- */
	const account = $derived(session.account);
	let menuOpen = $state(false);
	let loginOpen = $state(false);
	let email = $state('');
	let loginErr = $state('');

	onMount(() => {
		initSession();
	});

	function acctClick() {
		if (account) menuOpen = !menuOpen;
		else {
			loginErr = '';
			loginOpen = true;
		}
	}
	function doLogin(e: SubmitEvent) {
		e.preventDefault();
		if (!isValidEmail(email)) {
			loginErr = 'Cet e-mail ne semble pas valide.';
			return;
		}
		signIn(email);
		loginOpen = false;
		email = '';
		goto('/profil');
	}
	function doLogout() {
		signOut();
		menuOpen = false;
		if (page.url.pathname === '/profil') goto('/');
	}
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

			<!-- le compte -->
			<div class="acct">
				<button
					class="acct-btn"
					class:in={!!account}
					onclick={acctClick}
					aria-label={account ? `Compte : ${account.email}` : 'Se connecter'}
					title={account ? account.email : 'Se connecter'}
				>
					{#if account}
						<span class="avatar">{account.email.charAt(0).toUpperCase()}</span>
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
							<circle cx="12" cy="8.2" r="3.6" />
							<path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" stroke-linecap="round" />
						</svg>
					{/if}
				</button>
				{#if menuOpen && account}
					<button class="menu-veil" aria-label="Fermer" onclick={() => (menuOpen = false)}></button>
					<div class="acct-menu">
						<p class="am-mail">{account.email}</p>
						<a href="/profil" onclick={() => (menuOpen = false)}>Mon espace</a>
						<button class="am-out" onclick={doLogout}>Se déconnecter</button>
					</div>
				{/if}
			</div>
		</div>
	</nav>

	<!-- modale de connexion -->
	{#if loginOpen}
		<div class="login" role="dialog" aria-modal="true" aria-label="Connexion">
			<button class="login-backdrop" aria-label="Fermer" onclick={() => (loginOpen = false)}></button>
			<form class="login-panel" onsubmit={doLogin}>
				<img src={logo} alt="" aria-hidden="true" />
				<h3>Rejoindre le Silence</h3>
				<p class="lp-sub">Entrez votre e-mail pour ouvrir votre espace : collection, decks, Arène.</p>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					type="email"
					bind:value={email}
					placeholder="vous@exemple.com"
					autocomplete="email"
					autofocus
					required
				/>
				{#if loginErr}<p class="lp-err">{loginErr}</p>{/if}
				<button class="lp-submit" type="submit">Se connecter</button>
				<p class="lp-note">
					Votre espace est stocké dans ce navigateur — pas encore de vérification d'e-mail ni de
					synchronisation entre appareils.
				</p>
			</form>
		</div>
	{/if}

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

	/* ---------- le compte ---------- */
	.acct {
		position: relative;
	}
	.acct-btn {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		border: 1px solid rgba(140, 170, 220, 0.3);
		background: rgba(140, 170, 220, 0.08);
		color: rgba(238, 240, 245, 0.7);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			box-shadow 0.15s ease;
	}
	.acct-btn svg {
		width: 1.25rem;
		height: 1.25rem;
	}
	.acct-btn:hover {
		border-color: rgba(213, 178, 94, 0.55);
		color: var(--ink);
	}
	.acct-btn.in {
		border-color: rgba(213, 178, 94, 0.65);
		box-shadow: 0 0 12px rgba(213, 178, 94, 0.25);
	}
	.avatar {
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 1rem;
		color: var(--gold);
	}
	.menu-veil {
		position: fixed;
		inset: 0;
		z-index: 110;
		border: none;
		background: transparent;
		cursor: default;
	}
	.acct-menu {
		position: absolute;
		right: 0;
		top: calc(100% + 0.6rem);
		z-index: 120;
		min-width: 14rem;
		padding: 0.7rem;
		background: rgba(9, 14, 27, 0.95);
		border: 1px solid var(--panel-line);
		border-radius: 14px;
		backdrop-filter: blur(14px);
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.am-mail {
		margin: 0 0 0.35rem;
		padding: 0 0.6rem;
		font-size: 0.72rem;
		color: rgba(238, 240, 245, 0.45);
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.acct-menu a,
	.am-out {
		padding: 0.5rem 0.6rem;
		border: none;
		border-radius: 9px;
		background: none;
		font-family: inherit;
		font-size: 0.86rem;
		font-weight: 550;
		color: rgba(238, 240, 245, 0.8);
		text-decoration: none;
		text-align: left;
		cursor: pointer;
	}
	.acct-menu a:hover,
	.am-out:hover {
		background: rgba(213, 178, 94, 0.1);
		color: var(--ink);
	}
	.am-out {
		color: rgba(255, 150, 150, 0.75);
	}
	.am-out:hover {
		color: #ffb3b3;
		background: rgba(220, 90, 90, 0.1);
	}

	/* ---------- modale de connexion ---------- */
	.login {
		position: fixed;
		inset: 0;
		z-index: 300;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.login-backdrop {
		position: absolute;
		inset: 0;
		border: none;
		background: rgba(4, 7, 14, 0.8);
		backdrop-filter: blur(10px);
		cursor: pointer;
	}
	.login-panel {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.7rem;
		width: min(400px, 92vw);
		padding: 2.4rem 2.2rem 1.8rem;
		background: rgba(10, 16, 30, 0.95);
		border: 1px solid rgba(213, 178, 94, 0.35);
		border-radius: 20px;
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
		animation: lpop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes lpop {
		from {
			opacity: 0;
			transform: translateY(16px) scale(0.96);
		}
	}
	.login-panel img {
		width: 4.2rem;
		filter: drop-shadow(0 0 16px rgba(213, 178, 94, 0.45));
	}
	.login-panel h3 {
		margin: 0.4rem 0 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 600;
		font-size: 1.35rem;
		letter-spacing: 0.06em;
	}
	.lp-sub {
		margin: 0;
		text-align: center;
		font-size: 0.85rem;
		line-height: 1.5;
		color: rgba(238, 240, 245, 0.55);
	}
	.login-panel input {
		width: 100%;
		box-sizing: border-box;
		margin-top: 0.6rem;
		padding: 0.7rem 1rem;
		font-family: inherit;
		font-size: 0.95rem;
		color: var(--ink);
		background: rgba(140, 170, 220, 0.08);
		border: 1px solid var(--panel-line);
		border-radius: 11px;
	}
	.login-panel input:focus {
		outline: none;
		border-color: rgba(213, 178, 94, 0.6);
	}
	.lp-err {
		margin: 0;
		font-size: 0.8rem;
		color: #ff9d9d;
	}
	.lp-submit {
		width: 100%;
		margin-top: 0.3rem;
		padding: 0.75rem 1.4rem;
		border: none;
		border-radius: 999px;
		background: var(--cream);
		color: #171b10;
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 0 18px rgba(213, 178, 94, 0.25);
	}
	.lp-submit:hover {
		background: #f7edd6;
	}
	.lp-note {
		margin: 0.5rem 0 0;
		text-align: center;
		font-size: 0.7rem;
		line-height: 1.45;
		color: rgba(238, 240, 245, 0.35);
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
