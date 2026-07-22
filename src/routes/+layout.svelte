<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import logo from '$lib/assets/logo.svg';
	import { charter } from '$lib/charter';
	import { cards } from '$lib/cards';
	import { page } from '$app/state';
	import { dev } from '$app/environment';
	import { session, initSession, signOut } from '$lib/account.svelte';
	import { pushCloudNow } from '$lib/store';
	import AuthPanel from '$lib/AuthPanel.svelte';
	import MailPanel from '$lib/MailPanel.svelte';
	import { initMail, unreadCountFor } from '$lib/mail.svelte';
	import { eco, initEconomy } from '$lib/economy.svelte';
	import '@fontsource-variable/inter/index.css';
	import '@fontsource/cinzel/400.css';
	import '@fontsource/cinzel/600.css';
	import '@fontsource/cinzel/700.css';
	import '@fontsource/cormorant-garamond/400.css';
	import '@fontsource/cormorant-garamond/400-italic.css';
	// display condensé façon MTG (substitut libre de Gotham Narrow) pour titres de section + nav
	import '@fontsource/barlow-semi-condensed/600.css';
	import '@fontsource/barlow-semi-condensed/700.css';
	import '@fontsource/barlow-semi-condensed/800.css';

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

	/* Le Lab est un outil d'auteur : présent en local, absent du site publié.
	   `dev` est résolu au build, donc le lien disparaît ET la page n'est plus
	   atteignable par le crawler de prerender (cf. src/routes/lab/+layout.ts). */
	const links = [
		{ href: '/registre', label: 'Galerie' },
		{ href: '/packs', label: 'Boosters' },
		{ href: '/raretes', label: 'Raretés' },
		{ href: '/lore', label: 'Lore' },
		{ href: '/arene', label: 'Arène' },
		{ href: '/decks', label: 'Decks' },
		{ href: '/regles', label: 'Règles' },
		{ href: '/tuto', label: 'Tutoriel' },
		...(dev ? [{ href: '/lab', label: 'Lab' }] : [])
	];

	/* ---- le compte : icône, menu, modale de connexion ---- */
	const account = $derived(session.account);
	let menuOpen = $state(false);
	let loginOpen = $state(false);
	let mailOpen = $state(false);
	const unreadMail = $derived(unreadCountFor(session.account?.email ?? null));

	onMount(() => {
		initSession();
		initEconomy();
		initMail();
		// ceinture de sécurité : pousser la sauvegarde avant de quitter/masquer l'onglet
		const flush = () => {
			if (document.visibilityState === 'hidden') pushCloudNow();
		};
		addEventListener('visibilitychange', flush);
		addEventListener('pagehide', () => pushCloudNow());
		return () => removeEventListener('visibilitychange', flush);
	});

	// recharge le courrier dès que le compte est prêt / change de compte
	$effect(() => {
		void session.account?.email;
		if (session.ready) initMail();
	});

	/* toast de gain d'Éclats */
	let gainShown = $state<{ amount: number; reason: string } | null>(null);
	let gainTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const g = eco.lastGain;
		if (!g) return;
		gainShown = { amount: g.amount, reason: g.reason };
		clearTimeout(gainTimer);
		gainTimer = setTimeout(() => (gainShown = null), 3200);
	});

	/* Le terrain de duel s'affiche nu : plein écran, sans chrome du site. */
	const plateau = $derived(page.url.pathname.startsWith('/duel'));


	function acctClick() {
		if (account) menuOpen = !menuOpen;
		else loginOpen = true;
	}
	async function doLogout() {
		menuOpen = false;
		await signOut();
		if (typeof location !== 'undefined') location.assign('/');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#05070c" />
	<meta property="og:site_name" content={charter.game.name} />
	<meta property="og:locale" content="fr_FR" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{#if plateau}
	<!-- Le terrain occupe l'écran entier : ni barre, ni pied, ni marges. Le duel
	     doit pouvoir se jouer sans qu'aucun élément du site ne vole de la place. -->
	{@render children()}
{:else}
<div class="app">
	<a class="skip-link" href="#contenu">Aller au contenu</a>
	<nav>
		<div class="nav-inner">
			<a class="brand" href="/">
				<img class="emblem" src={logo} alt="" aria-hidden="true" />
				<span class="brand-txt">
					<b>{charter.game.name}</b>
					<i>Nés du silence · Set 01</i>
				</span>
			</a>
			<div class="links">
				{#each links as l (l.href)}
					<a href={l.href} class:active={page.url.pathname === l.href}>{l.label}</a>
				{/each}
			</div>
			<span class="setcount">Collection <b>{cards.length}</b>/60</span>

			<!-- les Éclats -->
			<a class="wallet" href="/packs" title="Éclats — la monnaie du Silence">
				<i class="shard" aria-hidden="true"></i><b>{eco.balance}</b>
			</a>

			<!-- le courrier -->
			<div class="mailbtn-wrap">
				<button
					class="mailbtn"
					onclick={() => (mailOpen = true)}
					aria-label="Courrier"
					title="Courrier"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
						<rect x="3" y="5" width="18" height="14" rx="2.5" />
						<path d="M3.5 7l8.5 6 8.5-6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					{#if unreadMail > 0}
						<span class="badge">{unreadMail}</span>
					{/if}
				</button>
			</div>

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

	<!-- boîte de réception -->
	{#if mailOpen}
		<div class="login" role="dialog" aria-modal="true" aria-label="Courrier">
			<button class="login-backdrop" aria-label="Fermer" onclick={() => (mailOpen = false)}></button>
			<MailPanel close={() => (mailOpen = false)} />
		</div>
	{/if}

	<!-- modale de connexion -->
	{#if loginOpen}
		<div class="login" role="dialog" aria-modal="true" aria-label="Connexion">
			<button class="login-backdrop" aria-label="Fermer" onclick={() => (loginOpen = false)}></button>
			<div class="login-panel"><AuthPanel /></div>
		</div>
	{/if}

	<main id="contenu">
		{@render children()}
	</main>

	<!-- ============ PIED ============
	     Surface plus profonde que la toile, marque en tête, colonnes de
	     micro-libellés. Aucun panneau, aucune ombre : la structure vient de la
	     typographie et des filets. -->

	<footer>
		<div class="foot-inner">
			<div class="foot-marque">
				<img class="foot-emblem" src={logo} alt="" aria-hidden="true" />
				<p class="foot-word">{charter.game.name}</p>
			</div>

			<div class="foot-cols">
				<nav class="foot-col">
					<p class="foot-h">Le jeu</p>
					{#each links as l (l.href)}
						<a href={l.href}>{l.label}</a>
					{/each}
				</nav>
				<nav class="foot-col">
					<p class="foot-h">Apprendre</p>
					<a href="/regles">Règles</a>
					<a href="/tuto">Tutoriel</a>
					<a href="/decks/recommandes">Decks recommandés</a>
					<a href="/profil">Mon espace</a>
				</nav>
				<nav class="foot-col">
					<p class="foot-h">Univers</p>
					<a href="/lore">Lore</a>
					<a href="/registre">Galerie · Set 01</a>
					<a href="/packs">Boosters</a>
					<a href="/raretes">Raretés</a>
					<a href="/arene">Arène</a>
					<a href="/arene/salons">Duel en ligne</a>
				</nav>
			</div>
		</div>

		<div class="foot-bar">
			<span>© 2026 {charter.game.name}</span>
			<span>Set 01 · 1ʳᵉ Édition</span>
		</div>
	</footer>

	<span class="uid" aria-hidden="true">UID : KOR-701606888</span>

	<!-- toast de gain -->
	{#if gainShown}
		<div class="gain-toast" role="status">
			<i class="shard" aria-hidden="true"></i>
			<b>+{gainShown.amount}</b>
			<span>{gainShown.reason}</span>
		</div>
	{/if}

	<!-- grain de pellicule : unifie toutes les surfaces, très discret -->
	<div class="grain" aria-hidden="true"></div>
</div>
{/if}

<style>
	:global(:focus-visible) {
		outline: 2px solid #e5c568;
		outline-offset: 3px;
	}
	.skip-link {
		position: fixed;
		left: 1rem;
		top: 1rem;
		z-index: 1000;
		padding: .65rem 1rem;
		color: #080a0e;
		background: #f2d989;
		transform: translateY(-180%);
	}
	.skip-link:focus { transform: translateY(0); }
	:global(:root) {
		/* tokens motion (cf. Expelled/PACKSCOM-CODES.md §2.6) : ressorts CSS linear() */
		--ease-spring: linear(
			0, 0.009 1.1%, 0.038 2.3%, 0.084 3.5%, 0.155 4.9%, 0.315 7.4%, 0.788 14%,
			1.007 17.8%, 1.089 19.7%, 1.149 21.5%, 1.192 23.3%, 1.22 25.2%, 1.231 27.9%,
			1.213 31%, 1.175 34%, 1.059 41%, 1.01 44.5%, 0.971 48.4%, 0.951 52.3%,
			0.951 58.6%, 0.996 71.6%, 1.01 78.5%, 1
		);
		--ease-out-overshoot: linear(
			0, 0.528 7%, 0.921 14.4%, 1.07 18.3%, 1.19 22.4%, 1.28 26.7%, 1.34 31.2%,
			1.366 34.5%, 1.378 38%, 1.377 41.7%, 1.363 45.6%, 1.308 53.3%, 1.13 71.3%,
			1.059 80.1%, 1.013 89.7%, 1
		);
		--ease-out-cubic: cubic-bezier(0.33, 1, 0.68, 1);
		--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
		--bg: #070d1a;
		--bg-2: #0b1528;
		--panel: rgba(13, 22, 42, 0.62);
		--panel-line: rgba(140, 170, 220, 0.14);
		--ink: #eef0f5;
		--ink-dim: rgba(238, 240, 245, 0.55);
		--gold: #d5b25e;
		--gold-deep: #c9a445;
		--cream: #efe8d8;
		/* le papier : blanc os chaud, jamais du blanc pur — c'est la nuance tiède
		   qui sépare une page imprimée d'une surface d'application. */
		--paper: #faf8f2;
		/* DA MTG (hybride) : display condensé + rouge flamme en accent secondaire */
		--display: 'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif;
		--accent-red: #d3202a;
		--accent-red-deep: #a5151d;

		/* ============================================================
		   LANGAGE ÉDITORIAL — broadsheet imprimé, transposé en nuit et or.

		   Système repris de la référence « New Form ». Deux transpositions
		   assumées, tout le reste est conservé à l'identique :
		     — la toile n'est pas le papier clair mais la nuit d'Expelled ;
		     — l'accent n'est pas le vert surligneur mais l'or du set.
		   Le principe, lui, est le même : UN seul ton chromatique posé
		   comme un trait de marqueur sur une page autrement monochrome.

		   Polices : les substituts documentés par la référence, déjà
		   chargés par le projet. Inter Variable tient le rôle de TWK
		   Lausanne (grotesque UI), Cormorant Garamond celui de PP Mondwest
		   et d'Editorial New (serif de titraille). Les originaux sont sous
		   licence commerciale et ne sont pas redistribuables.
		   ============================================================ */

		--font-grotesque: 'Inter Variable', Inter, system-ui, sans-serif;
		--font-editorial: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
		--font-mono-serif: Georgia, 'Times New Roman', serif;

		/* Échelle typographique — l'écart entre 18px de texte et 96px+ de
		   display EST le rythme de la page. Rien ne vit entre les deux. */
		--text-caption: 11px;
		--leading-caption: 1.1;
		--tracking-caption: 0.11px;
		--text-body-sm: 14px;
		--leading-body-sm: 1.1;
		--tracking-body-sm: 0.14px;
		--text-body: 18px; /* plafond absolu du texte courant */
		--leading-body: 1;
		--tracking-body: -0.36px;
		--text-subheading: 60px;
		--leading-subheading: 0.9;
		--tracking-subheading: -1.2px;
		--text-heading-sm: 72px;
		--leading-heading-sm: 1;
		--tracking-heading-sm: -1.44px;
		--text-heading: 96px;
		--leading-heading: 1;
		--tracking-heading: -1.92px;
		--text-heading-lg: 155px;
		--leading-heading-lg: 1;
		--tracking-heading-lg: -6.2px;
		--text-display: 295px;
		--leading-display: 0.9;
		--tracking-display: -11.8px;

		/* Graisses */
		--fw-extralight: 200;
		--fw-light: 300;
		--fw-350: 350;
		--fw-regular: 400;
		--fw-550: 550;

		/* Échelle d'espacement, reprise telle quelle */
		--spacing-4: 4px;
		--spacing-8: 8px;
		--spacing-10: 10px;
		--spacing-15: 15px;
		--spacing-20: 20px;
		--spacing-25: 25px;
		--spacing-30: 30px;
		--spacing-32: 32px;
		--spacing-35: 35px;
		--spacing-40: 40px;
		--spacing-45: 45px;
		--spacing-50: 50px;
		--spacing-55: 55px;
		--spacing-60: 60px;
		--spacing-120: 120px;
		--spacing-190: 190px;

		/* Mise en page */
		--page-max: 1400px;
		--section-gap: 80px;
		--card-padding: 0px;
		--element-gap: 20px;

		/* Rayons — l'action principale reste anguleuse, jamais en pilule */
		--radius-action: 5px;
		--radius-ghost: 10px;
		--radius-image: 14px;
		--radius-full: 9999px;

		/* La seule élévation du site, teintée d'or comme l'accent —
		   jamais une ombre grise générique. */
		--shadow-action: rgba(120, 92, 20, 0.45) 1px 8px 20px 0;
		--shadow-action-soft: rgba(160, 124, 32, 0.25) 1px 8px 20px 0;

		/* Surfaces — l'inverse de la référence : la nuit est la toile,
		   et le bloc de rupture est un noir plus profond encore. */
		--surface-canvas: #070d1a;
		--surface-deep: #04060c;
		--surface-accent: #d5b25e;

		/* Duotone éditorial. La référence pousse ses photos vers le vert
		   par hue-rotate(80deg) après une inversion partielle ; ici le
		   sépia amène déjà le chaud et la rotation ne fait que caler la
		   teinte sur l'or du set. À poser via .ed-photo — JAMAIS
		   globalement sur les <img>, ce qui dénaturerait les cartes. */
		--filter-duotone: grayscale(1) sepia(0.62) saturate(2.4) hue-rotate(-8deg)
			brightness(0.92) contrast(1.06);
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
	/* ============================================================
	   COMPOSANTS ÉDITORIAUX — utilisables depuis n'importe quelle page.
	   ============================================================ */

	/* Le micro-libellé : capitales 11px. Remplace tout habillage de bouton,
	   d'onglet ou d'étiquette. La typographie EST le chrome. */
	:global(.ed-label) {
		font-family: var(--display);
		font-size: var(--text-caption);
		font-weight: 550;
		text-transform: uppercase;
		letter-spacing: var(--tracking-caption);
		color: var(--ink-dim);
	}

	/* L'action principale : le seul aplat saturé du site, et la seule élévation.
	   Rayon 5px — jamais une pilule, l'angle vif est ce qui garde le ton
	   imprimé. L'ombre est teintée d'or pour appartenir à l'accent, pas au gris. */
	:global(.ed-action) {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 20px 30px;
		font-family: var(--display);
		font-size: var(--text-caption);
		font-weight: 550;
		text-transform: uppercase;
		letter-spacing: var(--tracking-caption);
		color: #0a0a0d;
		background: var(--gold);
		border: none;
		border-radius: var(--radius-action);
		box-shadow: var(--shadow-action);
		cursor: pointer;
		text-decoration: none;
		transition:
			background 0.18s ease,
			transform 0.18s var(--ease-out-cubic);
	}
	:global(.ed-action:hover) {
		background: var(--cream);
		transform: translateY(-2px);
	}
	:global(.ed-action:disabled) {
		color: var(--ink-dim);
		background: rgba(255, 255, 255, 0.06);
		box-shadow: none;
		cursor: default;
		transform: none;
	}

	/* L'action secondaire : contour d'un filet, aucun fond, aucune ombre.
	   Le rembourrage vertical généreux la fait lire comme une entrée de menu
	   plutôt que comme un bouton compact. */
	:global(.ed-ghost) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 26px 20px;
		font-family: var(--display);
		font-size: var(--text-caption);
		font-weight: 550;
		text-transform: uppercase;
		letter-spacing: var(--tracking-caption);
		color: var(--ink);
		background: none;
		border: 1px solid var(--ink);
		border-radius: var(--radius-ghost);
		cursor: pointer;
		text-decoration: none;
		transition:
			border-color 0.18s ease,
			color 0.18s ease;
	}
	:global(.ed-ghost:hover) {
		border-color: var(--gold);
		color: var(--gold);
	}

	/* Le lien courant : un filet sous la ligne de base, rien d'autre. Il ne
	   change ni de graisse ni de couleur — le soulignement est tout le traitement. */
	:global(.ed-link) {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 1rem;
		text-decoration: none;
		border-bottom: 1px solid currentColor;
		transition: opacity 0.18s ease;
	}
	:global(.ed-link:hover) {
		opacity: 0.6;
	}

	/* Le titre monumental : c'est l'écart entre 18px de texte et 96px+ de
	   display qui donne le rythme. Rien ne vit entre les deux. */
	:global(.ed-display) {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 400;
		font-size: clamp(3.5rem, 11vw, var(--text-heading-lg));
		line-height: var(--leading-display);
		letter-spacing: var(--tracking-display);
		margin: 0;
	}
	:global(.ed-heading) {
		font-family: var(--display);
		font-weight: 550;
		font-size: clamp(2.2rem, 6vw, var(--text-heading));
		line-height: 1;
		letter-spacing: var(--tracking-heading);
		margin: 0;
	}

	/* Une section éditoriale : respiration large, filet en haut, jamais d'ombre. */
	:global(.ed-section) {
		max-width: var(--page-max);
		margin: 0 auto;
		padding-block: var(--section-gap);
		border-top: 1px solid var(--panel-line);
	}

	/* L'insert photographique : petite tuile rectangulaire, rayon 14px, posée
	   DANS le flux du texte et non dans une grille — c'est ce qui donne la
	   mise en page de journal. Le duotone est opt-in : les illustrations de
	   cartes ne doivent jamais le subir. */
	:global(.ed-photo) {
		border-radius: var(--radius-image);
		filter: var(--filter-duotone);
		display: block;
	}

	/* L'étiquette de rubrique : un mot teinté, sans fond ni cadre. */
	:global(.ed-tag) {
		font-family: var(--font-grotesque);
		font-size: var(--text-body-sm);
		font-weight: var(--fw-350);
		letter-spacing: var(--tracking-body-sm);
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.55);
	}

	/* Le chiffre éditorial : grande taille, couleur sourde. C'est la
	   couleur éteinte qui le fait lire comme une donnée de journal plutôt
	   que comme un chiffre de vitrine. */
	:global(.ed-stat) {
		font-family: var(--font-grotesque);
		font-size: clamp(2.5rem, 7vw, var(--text-heading-sm));
		font-weight: var(--fw-550);
		line-height: var(--leading-heading-sm);
		letter-spacing: var(--tracking-heading-sm);
		color: rgba(140, 170, 220, 0.55);
	}

	/* Le bloc de rupture : un noir plus profond que la toile, où les
	   actions passent en contour. */
	:global(.ed-deep) {
		background: var(--surface-deep);
		border-block: 1px solid var(--panel-line);
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
	/* La barre du haut UNIQUEMENT. Un sélecteur `nav` nu attrapait aussi les
	   colonnes du pied et les barres d'onglets, qui sont elles aussi des <nav> :
	   elles héritaient d'un fond de panneau et d'un flou d'arrière-plan. Le
	   symptôme est réapparu deux fois — le combinateur enfant direct le règle
	   pour de bon. */
	.app > nav {
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
	/* Micro-libellé éditorial : 11px, capitales, +0.01em. C'est cette
	   micro-typographie qui fait office de chrome — pas de fond, pas de cadre. */
	.links a {
		position: relative;
		text-decoration: none;
		font-family: var(--display);
		font-size: var(--text-caption);
		font-weight: 550;
		text-transform: uppercase;
		letter-spacing: var(--tracking-caption);
		padding: 0.42rem 0.8rem;
		color: rgba(238, 240, 245, 0.62);
		transition: color 0.18s ease;
	}
	.links a:hover {
		color: var(--ink);
	}
	/* l'onglet actif façon MTG : texte or, filet or dessous (plus de pill) */
	.links a.active {
		color: var(--gold);
	}
	.links a.active::after {
		content: '';
		position: absolute;
		left: 0.7rem;
		right: 0.7rem;
		bottom: -0.05rem;
		height: 2px;
		background: var(--gold);
		box-shadow: 0 0 10px rgba(213, 178, 94, 0.55);
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

	/* ---------- les Éclats ---------- */
	.wallet {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.35rem 0.85rem;
		border: 1px solid rgba(213, 178, 94, 0.35);
		border-radius: 999px;
		background: rgba(213, 178, 94, 0.07);
		text-decoration: none;
		font-size: 0.84rem;
		font-variant-numeric: tabular-nums;
		transition: border-color 0.15s ease;
	}
	.wallet:hover {
		border-color: rgba(213, 178, 94, 0.6);
	}
	.wallet b {
		font-weight: 650;
		color: var(--gold);
	}
	.shard {
		display: inline-block;
		width: 0.62rem;
		height: 0.62rem;
		rotate: 45deg;
		border-radius: 2px;
		background: linear-gradient(135deg, #f2d98a, #a97f2c);
		box-shadow: 0 0 8px rgba(213, 178, 94, 0.5);
	}

	.gain-toast {
		position: fixed;
		right: 1.4rem;
		bottom: 1.4rem;
		z-index: 250;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 1.2rem;
		background: rgba(9, 14, 27, 0.95);
		border: 1px solid rgba(213, 178, 94, 0.5);
		border-radius: 999px;
		box-shadow: 0 12px 34px rgba(0, 0, 0, 0.5), 0 0 20px rgba(213, 178, 94, 0.2);
		animation: gt 3.2s ease forwards;
		pointer-events: none;
	}
	.gain-toast b {
		font-size: 0.95rem;
		color: var(--gold);
		font-variant-numeric: tabular-nums;
	}
	.gain-toast span {
		font-size: 0.8rem;
		color: rgba(238, 240, 245, 0.65);
		max-width: 40vw;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	@keyframes gt {
		0% {
			opacity: 0;
			transform: translateY(12px);
		}
		8%,
		82% {
			opacity: 1;
			transform: translateY(0);
		}
		100% {
			opacity: 0;
			transform: translateY(-6px);
		}
	}

	/* ---------- le courrier ---------- */
	.mailbtn-wrap {
		position: relative;
	}
	.mailbtn {
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
			color 0.15s ease;
	}
	.mailbtn svg {
		width: 1.25rem;
		height: 1.25rem;
	}
	.mailbtn:hover {
		border-color: rgba(213, 178, 94, 0.55);
		color: var(--ink);
	}
	.badge {
		position: absolute;
		top: -0.3rem;
		right: -0.3rem;
		min-width: 1.15rem;
		height: 1.15rem;
		padding: 0 0.3rem;
		box-sizing: border-box;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: linear-gradient(135deg, #f2d98a, #c9a445);
		color: #171b10;
		font-size: 0.68rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		box-shadow: 0 0 10px rgba(213, 178, 94, 0.5);
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

	/* ---------- modales : connexion et courrier ---------- */
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

	/* ============ PIED ============
	   Centré comme le reste, marque en tête, colonnes régulières dessous.
	   Aucun fond de colonne, aucune ombre : des filets et de l'espace. */
	footer {
		position: relative;
		padding: clamp(3rem, 7vw, 5rem) var(--spacing-20) var(--spacing-30);
		background: rgba(3, 6, 12, 0.85);
		border-top: 1px solid var(--panel-line);
	}
	.foot-inner {
		max-width: 1240px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-55);
	}
	.foot-marque {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-10);
	}
	.foot-emblem {
		width: 2.6rem;
		height: 2.6rem;
		filter: drop-shadow(0 0 12px rgba(213, 178, 94, 0.45));
	}
	.foot-word {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: 1rem;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--ink);
	}
	.foot-cols {
		width: 100%;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--spacing-40);
		text-align: center;
	}
	.foot-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-15);
	}
	.foot-h {
		margin: 0 0 var(--spacing-8);
		font-family: var(--display);
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.foot-col a {
		font-size: 0.92rem;
		color: rgba(238, 240, 245, 0.62);
		text-decoration: none;
		transition: color 0.16s ease;
	}
	.foot-col a:hover {
		color: var(--ink);
	}
	.foot-bar {
		max-width: 1240px;
		margin: var(--spacing-55) auto 0;
		padding-top: var(--spacing-20);
		border-top: 1px solid var(--panel-line);
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-15);
		justify-content: space-between;
		font-family: var(--display);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.4);
	}

	@media (max-width: 900px) {
		.foot-inner {
			grid-template-columns: 1fr;
		}
		.foot-cols {
			grid-template-columns: 1fr 1fr;
		}
		.foot-bar {
			flex-direction: column;
			gap: 0.4rem;
			text-align: center;
		}
	}

	/* ===== Utilitaires DA « hybride MTG » — vocabulaire partagé des pages =====
	   .mtg-eyebrow  : petit label or majuscule au-dessus d'un titre
	   .mtg-title    : titre de section condensé bold majuscule (Gotham-like)
	   .mtg-tag      : pastille de catégorie (or par défaut, .red pour le rouge flamme) */
	:global(.mtg-eyebrow) {
		font-family: var(--display);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-size: 0.78rem;
		color: var(--gold);
	}
	:global(.mtg-title) {
		font-family: var(--display);
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.01em;
		line-height: 0.98;
		font-size: clamp(1.9rem, 4vw, 2.8rem);
		color: var(--ink);
		margin: 0;
	}
	:global(.mtg-tag) {
		display: inline-block;
		font-family: var(--display);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-size: 0.68rem;
		padding: 0.22rem 0.6rem;
		border-radius: 3px;
		background: var(--gold);
		color: #171b10;
	}
	:global(.mtg-tag.red) {
		background: var(--accent-red);
		color: #fff;
	}
</style>
