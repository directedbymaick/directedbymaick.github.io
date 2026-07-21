<script lang="ts">
	import { onMount } from 'svelte';
	import { cards } from '$lib/cards';
	import { charter } from '$lib/charter';
	import { LIVRES, QUESTION_FINALE, type Livre } from '$lib/lore';

	/* Deux résolutions : la vignette 640 pour la lecture au fil du texte, l'original
	   pour la visionneuse. Inutile de décoder du 1200 dans un bandeau, inutile de
	   servir du 640 quand le lecteur demande justement à regarder l'image. */
	function carte(id: string) {
		return cards.find((x) => x.id === id);
	}
	function vignette(id: string) {
		const c = carte(id);
		return c ? c.art.replace('/art/', '/art/w640/') : '';
	}
	function plein(id: string) {
		return carte(id)?.art ?? '';
	}
	function nom(id: string) {
		return carte(id)?.name ?? id;
	}

	/* ---------------------------------------------------------------- peuples */
	const PEUPLES = [
		{
			cle: 'vasar',
			carte: 'koren',
			devise: 'Ce qui fut dit doit être redit',
			texte:
				"Les premiers prononcés, chargés de tenir ouverts les mots déjà dits. Ils ne créent pas : ils entretiennent. Halos intacts, ors et ivoires, cathédrales de grammaire."
		},
		{
			cle: 'exar',
			carte: 'rasen',
			devise: 'Le dehors est à nous',
			texte:
				"Les bannis qui ont repris leur chaîne comme un titre. Ils veulent prononcer EX jusqu'au bout et voir ce qu'il y a de l'autre côté. Halos brisés, rouges et os."
		},
		{
			cle: 'eshar',
			carte: 'eshel',
			devise: 'Rien de dit ne se perd tout à fait',
			texte:
				"Ceux qu'on a cessé de prononcer, tombés lentement, arrivés en bas à moitié dits. Ils collectionnent les syllabes perdues ; certains en ont reconstitué des noms entiers."
		},
		{
			cle: 'morar',
			carte: 'moras',
			devise: 'Je tombais du bon côté',
			texte:
				"Ceux qui ont fait de la chute une arrivée. Ni la colère d'Exen ni la nostalgie du retour : Xenen, le monde humain, et la mutation portée comme une fierté."
		},
		{
			cle: 'velar',
			carte: 'velna',
			devise: 'La Volonté suffit',
			texte:
				"Ceux qui n'ont pas été jetés : ils ont sauté. Ils brûlent leurs jours comme des torches et tiennent le Bord du monde. Ors francs, ailes de verre, joie féroce."
		}
	].map((p) => ({ ...p, ...charter.factions[p.cle as keyof typeof charter.factions] }));

	/* ------------------------------------------------------------ navigation */
	// Le rail suit la lecture : la section la plus proche du haut de l'écran gagne.
	let actif = $state(LIVRES[0].id);
	let sections: HTMLElement[] = [];
	let railEl = $state<HTMLElement | null>(null);

	// En frise horizontale, le chapitre courant sort vite du cadre : on le ramène.
	$effect(() => {
		const id = actif;
		const b = railEl?.querySelector<HTMLElement>(`[data-cible="${id}"]`);
		const ol = b?.closest('ol');
		if (!b || !ol || ol.scrollWidth <= ol.clientWidth) return;
		b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
	});

	function versSection(id: string) {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	/* ----------------------------------------------------------- visionneuse */
	let loupe = $state<{ livre: Livre } | null>(null);

	function ouvrir(livre: Livre) {
		loupe = { livre };
	}
	function fermer() {
		loupe = null;
	}
	function touche(e: KeyboardEvent) {
		if (e.key === 'Escape') fermer();
	}

	onMount(() => {
		// le rail couvre les livres ET les deux sections de clôture
		sections = [...LIVRES.map((l) => l.id), 'peuples', 'fin']
			.map((id) => document.getElementById(id))
			.filter(Boolean) as HTMLElement[];

		// rootMargin haut négatif : une section ne « prend » qu'une fois arrivée
		// sous la barre de nav, sinon le rail change de ligne trop tôt.
		const spy = new IntersectionObserver(
			(entrees) => {
				const vus = entrees.filter((e) => e.isIntersecting);
				if (vus.length === 0) return;
				vus.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				actif = vus[0].target.id;
			},
			{ rootMargin: '-25% 0px -60% 0px', threshold: 0 }
		);
		sections.forEach((s) => spy.observe(s));

		let ctx: { revert(): void } | undefined;
		(async () => {
			const { gsap } = await import('gsap');
			const { ScrollTrigger } = await import('gsap/ScrollTrigger');
			gsap.registerPlugin(ScrollTrigger);
			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

			ctx = gsap.context(() => {
				document.querySelectorAll<HTMLElement>('.chap').forEach((ch) => {
					gsap.from(ch.querySelectorAll('.anim'), {
						y: 34,
						autoAlpha: 0,
						duration: 0.85,
						stagger: 0.1,
						ease: 'power3.out',
						scrollTrigger: { trigger: ch, start: 'top 72%' }
					});
					const img = ch.querySelector('.chap-img');
					if (img) {
						gsap.fromTo(
							img,
							{ yPercent: -5 },
							{
								yPercent: 5,
								ease: 'none',
								scrollTrigger: { trigger: ch, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
							}
						);
					}
				});
			});
		})();

		return () => {
			spy.disconnect();
			ctx?.revert();
		};
	});
</script>

<svelte:head>
	<title>Le Korum · le récit — {charter.game.name}</title>
	<meta
		name="description"
		content="Le récit d'Eshel : la Prononciation, la Fracture, les Sentences, et les cinq peuples nés du silence."
	/>
</svelte:head>

<svelte:window onkeydown={touche} />

<!-- ============================== OUVERTURE ============================== -->
<header class="hero">
	<img class="hero-fond" src={vignette('rasen')} alt="" aria-hidden="true" />
	<div class="hero-voile"></div>
	<div class="hero-txt">
		<p class="kicker">Le récit</p>
		<h1>Le Korum</h1>
		<p class="hero-sub">
			Ce que j'ai vu, je l'écris. Ce que je n'ai pas vu, je le dis comme on me l'a rapporté, et je le
			marque. Ce qui manque, je le laisse manquer.
		</p>
		<p class="hero-sig">— Eshel, gardien des registres</p>
	</div>
</header>

<div class="corps">
	<!-- ============================ RAIL ============================ -->
	<nav class="rail" aria-label="Chapitres" bind:this={railEl}>
		<p class="rail-h">Les livres</p>
		<ol>
			{#each LIVRES as l (l.id)}
				<li>
					<button data-cible={l.id} class:on={actif === l.id} onclick={() => versSection(l.id)}>
						<span class="rail-num">{l.num}</span>
						<span class="rail-t">{l.titre}</span>
					</button>
				</li>
			{/each}
		</ol>
		<p class="rail-h rail-h2">Puis</p>
		<ol class="rail-fin">
			<li>
				<button class:on={actif === 'peuples'} onclick={() => versSection('peuples')}>
					<span class="rail-num">·</span><span class="rail-t">Les cinq peuples</span>
				</button>
			</li>
			<li>
				<button class:on={actif === 'fin'} onclick={() => versSection('fin')}>
					<span class="rail-num">·</span><span class="rail-t">La question</span>
				</button>
			</li>
		</ol>
	</nav>

	<!-- ============================ LIVRES ============================ -->
	<main class="texte">
		{#each LIVRES as l, i (l.id)}
			<section class="chap" class:inverse={i % 2 === 1} id={l.id}>
				<figure class="chap-fig anim">
					<button class="chap-loupe" onclick={() => ouvrir(l)} title="Voir l'illustration en grand">
						<img class="chap-img" src={vignette(l.carte)} alt={nom(l.carte)} loading="lazy" />
						<span class="chap-agrandir">Agrandir</span>
					</button>
					<figcaption>{nom(l.carte)}</figcaption>
				</figure>

				<div class="chap-txt">
					<p class="chap-num anim">Livre {l.num}</p>
					<h2 class="anim">{l.titre}</h2>
					<p class="chap-sous anim">{l.sousTitre}</p>

					{#each l.paragraphes as p}
						<p class="anim">{p}</p>
					{/each}

					{#if l.liste}
						<dl class="mots anim">
							{#each l.liste as m}
								<div>
									<dt>{m.terme}</dt>
									<dd>{m.sens}</dd>
								</div>
							{/each}
						</dl>
					{/if}

					{#if l.exergue}
						<blockquote class="anim">{l.exergue}</blockquote>
					{/if}

					<!-- La note d'illustration : ce que l'image montre, et pourquoi elle est
					     posée sur ce chapitre plutôt qu'un autre. -->
					<aside class="note anim">
						<p class="note-h">Lire l'illustration</p>
						<p>{l.lecture}</p>
					</aside>

					{#if l.renvois?.length}
						<div class="renvois anim">
							<span class="renvois-h">Au Registre</span>
							{#each l.renvois as r}
								{#if carte(r)}
									<a href="/card/{r}">{nom(r)}</a>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			</section>
		{/each}

		<!-- =========================== PEUPLES =========================== -->
		<section class="peuples" id="peuples">
			<p class="chap-num">Après la chute</p>
			<h2>Les cinq peuples</h2>
			<p class="peuples-intro">
				Une même Origine, cinq réponses au silence. Chacun a raison depuis l'endroit où il se tient
				— c'est ce qui rend la guerre insoluble.
			</p>
			<div class="grille-p">
				{#each PEUPLES as p (p.cle)}
					<article class="peuple" style="--f:{p.color}">
						<img src={vignette(p.carte)} alt="" loading="lazy" />
						<div class="peuple-txt">
							<span class="peuple-sigil" aria-hidden="true">{p.sigil}</span>
							<h3>{p.name}</h3>
							<p class="peuple-devise">« {p.devise} »</p>
							<p>{p.texte}</p>
						</div>
					</article>
				{/each}
			</div>
		</section>

		<!-- ============================= FIN ============================= -->
		<section class="fin" id="fin">
			<p class="chap-num">Le copiste referme son livre</p>
			<p class="fin-q">{QUESTION_FINALE}</p>
			<p class="fin-note">
				Je ne le sais pas. J'écris pour que la question reste posée quand je ne serai plus là pour la
				poser.
			</p>
			<div class="fin-actions">
				<a class="btn-plein" href="/registre">Parcourir le Registre</a>
				<a class="btn-contour" href="/packs">Ouvrir un booster</a>
			</div>
		</section>
	</main>
</div>

<!-- =========================== VISIONNEUSE =========================== -->
{#if loupe}
	<div
		class="loupe"
		role="dialog"
		aria-modal="true"
		aria-label="Illustration en grand"
		tabindex="-1"
	>
		<button class="loupe-fond" onclick={fermer} aria-label="Fermer"></button>
		<div class="loupe-boite">
			<img src={plein(loupe.livre.carte)} alt={nom(loupe.livre.carte)} />
			<div class="loupe-txt">
				<p class="chap-num">Livre {loupe.livre.num} · {loupe.livre.titre}</p>
				<h3>{nom(loupe.livre.carte)}</h3>
				<p>{loupe.livre.lecture}</p>
				<a class="btn-contour" href="/card/{loupe.livre.carte}">Voir la carte</a>
			</div>
			<button class="loupe-x" onclick={fermer} aria-label="Fermer">×</button>
		</div>
	</div>
{/if}

<style>
	/* ============================== OUVERTURE ============================== */
	/* Le <main> du layout plafonne à 1280px : les pleines largeurs doivent s'en
	   échapper, comme le fait l'accueil. */
	.hero {
		position: relative;
		width: 100vw;
		margin-left: calc(50% - 50vw);
		box-sizing: border-box;
		min-height: 68vh;
		display: flex;
		align-items: flex-end;
		padding: clamp(3rem, 9vw, 7rem) var(--spacing-20);
		overflow: hidden;
	}
	.hero-fond {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 32%;
		filter: saturate(0.75) brightness(0.62);
	}
	.hero-voile {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to top, rgba(3, 6, 12, 0.97) 6%, rgba(3, 6, 12, 0.25) 60%),
			radial-gradient(120% 90% at 50% 100%, rgba(3, 6, 12, 0.8), transparent 70%);
	}
	.hero-txt {
		position: relative;
		max-width: 46rem;
		margin: 0 auto;
		text-align: center;
	}
	.kicker {
		margin: 0 0 var(--spacing-20);
		font-family: var(--display);
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.hero h1 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(3rem, 10vw, 7rem);
		line-height: 0.95;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.hero-sub {
		margin: var(--spacing-30) auto 0;
		max-width: 34rem;
		font-size: 1.05rem;
		line-height: 1.65;
		color: rgba(238, 240, 245, 0.72);
		font-style: italic;
	}
	.hero-sig {
		margin: var(--spacing-15) 0 0;
		font-family: var(--display);
		font-size: 0.76rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.42);
	}

	/* ================================ GRILLE ================================ */
	.corps {
		width: 100vw;
		margin-left: calc(50% - 50vw);
		box-sizing: border-box;
		display: grid;
		grid-template-columns: 16rem minmax(0, 1fr);
		gap: clamp(2rem, 6vw, 6rem);
		/* Centrage par le padding, pas par `margin-inline: auto` — ce dernier
		   écraserait le margin-left qui sert à sortir du <main>. Au-delà de
		   1760px le rail décrocherait trop loin du texte. */
		padding: clamp(3rem, 7vw, 6rem) max(clamp(1.5rem, 5vw, 5rem), calc((100% - 1760px) / 2)) 0;
	}

	/* ================================= RAIL ================================= */
	.rail {
		position: sticky;
		top: 6.5rem;
		align-self: start;
		max-height: calc(100vh - 9rem);
		overflow-y: auto;
	}
	.rail-h {
		margin: 0 0 var(--spacing-15);
		font-family: var(--display);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.rail-h2 {
		margin-top: var(--spacing-30);
	}
	.rail ol {
		list-style: none;
		margin: 0;
		padding: 0;
		border-left: 1px solid var(--panel-line);
	}
	.rail button {
		display: flex;
		gap: 0.7rem;
		width: 100%;
		padding: 0.5rem 0 0.5rem 0.9rem;
		margin-left: -1px;
		border: none;
		border-left: 2px solid transparent;
		background: none;
		text-align: left;
		font: inherit;
		font-size: 0.86rem;
		line-height: 1.35;
		color: rgba(238, 240, 245, 0.48);
		cursor: pointer;
		transition:
			color 0.18s ease,
			border-color 0.18s ease;
	}
	.rail button:hover {
		color: var(--ink);
	}
	.rail button.on {
		color: var(--gold);
		border-left-color: var(--gold);
	}
	.rail-num {
		flex: none;
		width: 1.6rem;
		font-family: Cinzel, Georgia, serif;
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		opacity: 0.75;
	}

	/* ================================ LIVRES ================================ */
	.chap {
		display: grid;
		grid-template-columns: minmax(0, 0.85fr) minmax(0, 1fr);
		gap: clamp(2rem, 4vw, 4rem);
		align-items: start;
		padding: clamp(3rem, 7vw, 6rem) 0;
		border-bottom: 1px solid var(--panel-line);
		scroll-margin-top: 6rem;
	}
	.chap.inverse .chap-fig {
		order: 2;
	}

	.chap-fig {
		position: sticky;
		top: 6.5rem;
		margin: 0;
	}
	.chap-loupe {
		display: block;
		width: 100%;
		position: relative;
		padding: 0;
		border: 1px solid var(--panel-line);
		background: none;
		overflow: hidden;
		cursor: zoom-in;
		aspect-ratio: 3 / 4;
	}
	.chap-img {
		width: 100%;
		height: 110%;
		object-fit: cover;
		display: block;
		filter: saturate(0.85) contrast(1.04);
		transition: filter 0.35s ease;
	}
	.chap-loupe:hover .chap-img {
		filter: saturate(1) contrast(1.04);
	}
	.chap-agrandir {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 0.8rem;
		font-family: var(--display);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--gold);
		background: linear-gradient(to top, rgba(3, 6, 12, 0.9), transparent);
		opacity: 0;
		transition: opacity 0.25s ease;
	}
	.chap-loupe:hover .chap-agrandir,
	.chap-loupe:focus-visible .chap-agrandir {
		opacity: 1;
	}
	figcaption {
		margin-top: var(--spacing-10);
		font-family: var(--display);
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.45);
	}

	.chap-num {
		margin: 0 0 var(--spacing-10);
		font-family: var(--display);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.chap-txt h2 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(1.8rem, 4vw, 2.9rem);
		line-height: 1.05;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.chap-sous {
		margin: var(--spacing-10) 0 var(--spacing-30);
		font-style: italic;
		color: rgba(238, 240, 245, 0.55);
	}
	/* La colonne peut grandir, la ligne non : au-delà d'une cinquantaine de
	   signes l'œil perd le début de la ligne suivante. Le surplus va à l'image. */
	.chap-txt {
		max-width: 44rem;
	}
	.chap-txt p {
		font-size: 1.02rem;
		line-height: 1.72;
		color: rgba(238, 240, 245, 0.8);
	}

	/* la liste des Prononcés / des états du halo : un lexique, pas un paragraphe */
	.mots {
		margin: var(--spacing-30) 0;
		padding: var(--spacing-25) 0;
		border-top: 1px solid var(--panel-line);
		border-bottom: 1px solid var(--panel-line);
		display: grid;
		gap: 0.55rem;
	}
	.mots div {
		display: grid;
		grid-template-columns: 5.5rem minmax(0, 1fr);
		gap: 1rem;
		align-items: baseline;
	}
	.mots dt {
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: var(--gold);
	}
	.mots dd {
		margin: 0;
		color: rgba(238, 240, 245, 0.78);
	}

	blockquote {
		margin: var(--spacing-30) 0;
		padding-left: var(--spacing-25);
		border-left: 2px solid var(--gold);
		font-family: Cinzel, Georgia, serif;
		font-size: clamp(1.05rem, 2vw, 1.35rem);
		line-height: 1.45;
		color: var(--ink);
	}

	.note {
		margin-top: var(--spacing-35);
		padding: var(--spacing-25);
		background: rgba(255, 255, 255, 0.035);
		border-left: 2px solid rgba(213, 178, 94, 0.55);
	}
	.note-h {
		margin: 0 0 var(--spacing-10) !important;
		font-family: var(--display);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--gold) !important;
	}
	.note p {
		margin: 0;
		font-size: 0.94rem !important;
		line-height: 1.65;
		color: rgba(238, 240, 245, 0.68) !important;
	}

	.renvois {
		margin-top: var(--spacing-25);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.renvois-h {
		font-family: var(--display);
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.35);
		margin-right: 0.3rem;
	}
	.renvois a {
		padding: 0.35rem 0.7rem;
		border: 1px solid var(--panel-line);
		font-size: 0.8rem;
		color: rgba(238, 240, 245, 0.7);
		text-decoration: none;
		transition:
			border-color 0.16s ease,
			color 0.16s ease;
	}
	.renvois a:hover {
		border-color: var(--gold);
		color: var(--gold);
	}

	/* =============================== PEUPLES =============================== */
	.peuples {
		padding: clamp(3.5rem, 8vw, 6rem) 0;
		border-bottom: 1px solid var(--panel-line);
		scroll-margin-top: 6rem;
	}
	.peuples h2 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(1.8rem, 4vw, 2.9rem);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.peuples-intro {
		margin: var(--spacing-15) 0 var(--spacing-40);
		max-width: 40rem;
		line-height: 1.7;
		color: rgba(238, 240, 245, 0.7);
	}
	/* En pleine largeur, une seule colonne étirerait les fiches sur 1200px pour
	   quatre lignes de texte. Deux colonnes dès qu'il y a la place. */
	.grille-p {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(26rem, 1fr));
		gap: var(--spacing-20);
	}
	.peuple {
		display: grid;
		grid-template-columns: 8rem minmax(0, 1fr);
		align-content: start;
		gap: var(--spacing-25);
		align-items: center;
		padding: var(--spacing-20);
		border: 1px solid var(--panel-line);
		border-left: 3px solid var(--f);
		background: rgba(255, 255, 255, 0.02);
	}
	.peuple img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		display: block;
		filter: saturate(0.8);
	}
	.peuple-sigil {
		font-size: 1.1rem;
		color: var(--f);
	}
	.peuple h3 {
		margin: 0.2rem 0 0;
		font-family: Cinzel, Georgia, serif;
		font-size: 1.2rem;
		letter-spacing: 0.16em;
		color: var(--f);
	}
	.peuple-devise {
		margin: 0.25rem 0 0.6rem;
		font-style: italic;
		color: rgba(238, 240, 245, 0.55);
	}
	.peuple p:last-child {
		margin: 0;
		line-height: 1.65;
		color: rgba(238, 240, 245, 0.75);
	}

	/* ================================= FIN ================================= */
	.fin {
		padding: clamp(4rem, 10vw, 8rem) 0;
		text-align: center;
		scroll-margin-top: 6rem;
	}
	.fin-q {
		margin: 0 auto;
		max-width: 40rem;
		font-family: Cinzel, Georgia, serif;
		font-size: clamp(1.4rem, 3.4vw, 2.3rem);
		line-height: 1.35;
	}
	.fin-note {
		margin: var(--spacing-25) auto var(--spacing-40);
		max-width: 32rem;
		font-style: italic;
		color: rgba(238, 240, 245, 0.55);
	}
	.fin-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--spacing-15);
	}
	.btn-plein,
	.btn-contour {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 13rem;
		padding: 1rem 2rem;
		font-family: var(--display);
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-decoration: none;
		border-radius: 0;
		transition:
			background 0.18s ease,
			color 0.18s ease;
	}
	.btn-plein {
		color: #14120c;
		background: var(--gold);
		border: 2px solid var(--gold);
	}
	.btn-plein:hover {
		background: #fff;
		border-color: #fff;
	}
	.btn-contour {
		color: var(--ink);
		background: none;
		border: 2px solid rgba(238, 240, 245, 0.35);
	}
	.btn-contour:hover {
		color: #14120c;
		background: var(--ink);
		border-color: var(--ink);
	}

	/* ============================= VISIONNEUSE ============================= */
	.loupe {
		position: fixed;
		inset: 0;
		z-index: 90;
		display: grid;
		place-items: center;
		padding: var(--spacing-20);
	}
	.loupe-fond {
		position: absolute;
		inset: 0;
		border: none;
		background: rgba(3, 6, 12, 0.92);
		backdrop-filter: blur(6px);
		cursor: zoom-out;
	}
	.loupe-boite {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
		gap: var(--spacing-30);
		align-items: center;
		max-width: 1080px;
		width: 100%;
		max-height: 88vh;
		padding: var(--spacing-25);
		background: rgba(8, 12, 20, 0.96);
		border: 1px solid var(--panel-line);
	}
	.loupe-boite img {
		width: 100%;
		max-height: 78vh;
		object-fit: contain;
		display: block;
	}
	.loupe-txt h3 {
		margin: 0.3rem 0 var(--spacing-15);
		font-family: Cinzel, Georgia, serif;
		font-size: 1.6rem;
		letter-spacing: 0.06em;
	}
	.loupe-txt p {
		line-height: 1.7;
		color: rgba(238, 240, 245, 0.75);
	}
	.loupe-txt .btn-contour {
		margin-top: var(--spacing-20);
		min-width: 0;
		padding: 0.8rem 1.6rem;
	}
	.loupe-x {
		position: absolute;
		top: 0.4rem;
		right: 0.7rem;
		border: none;
		background: none;
		font-size: 2rem;
		line-height: 1;
		color: rgba(238, 240, 245, 0.6);
		cursor: pointer;
	}
	.loupe-x:hover {
		color: var(--ink);
	}

	/* =============================== ÉTROIT =============================== */
	@media (max-width: 1040px) {
		.corps {
			grid-template-columns: minmax(0, 1fr);
		}
		/* le rail devient une frise horizontale collée sous la nav */
		.rail {
			position: sticky;
			top: 4.2rem;
			z-index: 5;
			max-height: none;
			/* la frise doit toucher les deux bords : elle annule le padding du corps */
			margin: 0 calc(-1 * clamp(1.5rem, 5vw, 5rem));
			padding: 0.6rem clamp(1.5rem, 5vw, 5rem);
			background: rgba(7, 12, 24, 0.92);
			backdrop-filter: blur(14px);
			border-bottom: 1px solid var(--panel-line);
		}
		/* .rail ol vaut (0,1,1) : sans le ol ici, la règle ne passait pas et la
		   frise gardait une seconde ligne vide. */
		.rail-h,
		.rail-h2 {
			display: none;
		}
		.rail ol.rail-fin {
			display: none;
		}
		.rail ol {
			display: flex;
			gap: 0.4rem;
			overflow-x: auto;
			border-left: none;
			scrollbar-width: none;
		}
		.rail ol::-webkit-scrollbar {
			display: none;
		}
		.rail button {
			width: auto;
			white-space: nowrap;
			padding: 0.4rem 0.7rem;
			border-left: none;
			border-bottom: 2px solid transparent;
		}
		.rail button.on {
			border-left-color: transparent;
			border-bottom-color: var(--gold);
		}
		.rail-num {
			width: auto;
			opacity: 0.55;
		}
	}
	@media (max-width: 820px) {
		.chap {
			grid-template-columns: minmax(0, 1fr);
		}
		.chap.inverse .chap-fig {
			order: 0;
		}
		.chap-fig {
			position: static;
		}
		.chap-loupe {
			aspect-ratio: 16 / 10;
		}
		.peuple {
			grid-template-columns: minmax(0, 1fr);
		}
		.peuple img {
			aspect-ratio: 16 / 9;
		}
		.loupe-boite {
			grid-template-columns: minmax(0, 1fr);
			max-height: 92vh;
			overflow-y: auto;
		}
		.loupe-boite img {
			max-height: 46vh;
		}
	}
</style>
