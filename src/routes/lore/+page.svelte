<script lang="ts">
	import { onMount } from 'svelte';
	import { cards } from '$lib/cards';
	import { charter } from '$lib/charter';
	import { LIVRES, QUESTION_FINALE, type Livre } from '$lib/lore';
	import { NOTICES } from '$lib/notices';

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
				"Premiers-nés de KOR, les Vasar maintiennent les mots qui donnent forme au monde. Ils ne créent plus : ils préservent. Leurs halos intacts et leurs cathédrales d’or dissimulent une peur — celle de voir la Création s’éteindre avec la dernière récitation."
		},
		{
			cle: 'exar',
			carte: 'rasen',
			devise: 'Le dehors est à nous',
			texte:
				"Bannis par le Vasis, les Exar ont fait de leurs chaînes des insignes. Ils veulent prononcer EX jusqu’au bout et découvrir ce qui attend au-delà du monde. Leurs halos brisés ne marquent plus une honte, mais un serment."
		},
		{
			cle: 'eshar',
			carte: 'eshel',
			devise: 'Rien de dit ne se perd tout à fait',
			texte:
				"Les Eshar sont ceux que le monde a cessé de prononcer. À moitié effacés, ils recueillent les syllabes perdues et préservent la mémoire des disparus. Certains possèdent désormais de quoi recomposer un nom entier."
		},
		{
			cle: 'morar',
			carte: 'moras',
			devise: 'Je tombais du bon côté',
			texte:
				"Les Morar ont refusé la colère d’Exen comme la nostalgie de Vasen. Dans le monde humain, ils ont transformé leur chute en nouveau départ et leur mutation en liberté."
		},
		{
			cle: 'velar',
			carte: 'velna',
			devise: 'La Volonté suffit',
			texte:
				"Les Velar n’ont pas été expulsés : ils ont choisi de sauter. Ils vivent comme si la Volonté suffisait, avec l’éclat dangereux de ceux qui préfèrent une vie brève à une éternité soumise."
		}
	].map((p) => ({ ...p, ...charter.factions[p.cle as keyof typeof charter.factions] }));

	/* ---------------------------------------------------------------- notices
	   Chaque carte du set a sa place dans le récit. On les range par peuple, et
	   dans chaque peuple du plus haut nom au plus commun : c'est l'ordre dans
	   lequel un lecteur les cherche. */
	const ORDRE_RARETE = ['prism', 'legendary', 'epic', 'rare', 'common'];
	const PEUPLE_ORDRE = ['vasar', 'exar', 'morar', 'eshar', 'velar'];

	const REPERTOIRE = PEUPLE_ORDRE.map((cle) => ({
		cle,
		...charter.factions[cle as keyof typeof charter.factions],
		entrees: cards
			.filter((c) => c.faction === cle && NOTICES[c.id])
			.sort(
				(a, b) =>
					ORDRE_RARETE.indexOf(a.rarity) - ORDRE_RARETE.indexOf(b.rarity) ||
					a.name.localeCompare(b.name)
			)
			.map((c) => ({ carte: c, notice: NOTICES[c.id] }))
	}));

	// filtre par peuple ; null = tout le répertoire
	let peupleActif = $state<string | null>(null);
	let pagesOuvertes = $state<Record<string, number>>({});
	const repertoireVu = $derived(
		peupleActif ? REPERTOIRE.filter((p) => p.cle === peupleActif) : REPERTOIRE
	);

	function titreLivre(id: string) {
		const l = LIVRES.find((x) => x.id === id);
		return l ? `Livre ${l.num} · ${l.titre}` : '';
	}
	function pageDe(livre: Livre) {
		return pagesOuvertes[livre.id] ?? 0;
	}
	function tourner(livre: Livre, direction: -1 | 1) {
		const prochaine = Math.max(0, Math.min(livre.pages.length - 1, pageDe(livre) + direction));
		pagesOuvertes = { ...pagesOuvertes, [livre.id]: prochaine };
	}
	function ouvrirPage(livre: Livre, index: number) {
		pagesOuvertes = { ...pagesOuvertes, [livre.id]: index };
	}

	/* ------------------------------------------------------------ navigation */
	// Le rail suit la lecture : la section la plus proche du haut de l'écran gagne.
	let actif = $state(LIVRES[0].id);
	let sections: HTMLElement[] = [];
	let railEl = $state<HTMLElement | null>(null);

	// En frise horizontale, le chapitre courant sort vite du cadre : on le ramène.
	$effect(() => {
		const id = actif;
		// le défileur est le rail lui-même : en frise, les <ol> sont en display:contents
		const b = railEl?.querySelector<HTMLElement>(`[data-cible="${id}"]`);
		if (!b || !railEl || railEl.scrollWidth <= railEl.clientWidth) return;
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
		sections = [...LIVRES.map((l) => l.id), 'peuples', 'repertoire', 'fin']
			.map((id) => document.getElementById(id))
			.filter(Boolean) as HTMLElement[];

		// rootMargin haut négatif : une section ne « prend » qu'une fois arrivée
		// sous la barre de nav, sinon le rail change de ligne trop tôt.
		/* La bonne règle est « la dernière section commencée », pas « la plus haute
		   visible » : quand deux sections se chevauchent à l'écran, la précédente
		   commence forcément plus haut et gagnerait toujours. Un IntersectionObserver
		   se prête mal à ça — il ne rapporte que les changements d'état — donc on lit
		   les positions au défilement, en se limitant à une mesure par frame. */
		const ANCRE = 0.3; // la ligne de lecture, à 30 % du haut de l'écran
		let prevu = false;
		function relire() {
			prevu = false;
			const ligne = window.innerHeight * ANCRE;
			let gagnant = sections[0]?.id ?? '';
			for (const s of sections) {
				if (s.getBoundingClientRect().top <= ligne) gagnant = s.id;
			}
			/* En bas de page, la dernière section n'atteint jamais la ligne de lecture
			   — le pied la retient. Sans ça, « La question » ne s'allume jamais. */
			const fond = window.scrollY + window.innerHeight >= document.body.scrollHeight - 4;
			if (fond) gagnant = sections[sections.length - 1]?.id ?? gagnant;
			if (gagnant) actif = gagnant;
		}
		function planifier() {
			if (prevu) return;
			prevu = true;
			requestAnimationFrame(relire);
		}
		addEventListener('scroll', planifier, { passive: true });
		addEventListener('resize', planifier);
		relire();

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
			removeEventListener('scroll', planifier);
			removeEventListener('resize', planifier);
			ctx?.revert();
		};
	});
</script>

<svelte:head>
	<title>Lore — {charter.game.name}</title>
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
		<p class="kicker">Lore</p>
		<h1>Le Korum</h1>
		<p class="hero-sub">
			J’écris ce que j’ai vu. Je distingue ce que l’on m’a confié. Quant aux mots disparus, je
			laisse leur absence témoigner.
		</p>
		<p class="hero-sig">— Eshel, gardien des registres</p>
	</div>
</header>

<section class="cosmographie" aria-labelledby="cosmo-titre">
	<div class="cosmo-intro">
		<p class="kicker">Cosmographie du Silence</p>
		<h2 id="cosmo-titre">Le monde de KOR</h2>
		<p>
			Une lecture du monde après la Fracture : Vasen se tient dans la lumière de l’Origine,
			Xenen vit au centre sans connaître la langue qui le soutient, et Exen grandit sous la
			Création, dans l’ombre de ceux qu’elle a rejetés.
		</p>
		<p class="cosmo-note">Peinture conservée dans les archives d’Eshel · auteur inconnu</p>
	</div>
	<figure class="cosmo-cadre">
		<picture>
			<source srcset="/art/world-of-kor.avif" type="image/avif" />
			<img src="/art/world-of-kor.webp" alt="Peinture cosmologique du monde de KOR, organisé autour d’un immense cercle entre Vasen, Xenen et Exen" />
		</picture>
		<span class="cosmo-label cosmo-vasen">Vasen <small>la parole maintenue</small></span>
		<span class="cosmo-label cosmo-xenen">Xenen <small>le monde humain</small></span>
		<span class="cosmo-label cosmo-exen">Exen <small>l’Envers</small></span>
	</figure>
</section>

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
				<button
					data-cible="peuples"
					class:on={actif === 'peuples'}
					onclick={() => versSection('peuples')}
				>
					<span class="rail-num">·</span><span class="rail-t">Les cinq peuples</span>
				</button>
			</li>
			<li>
				<button
					data-cible="repertoire"
					class:on={actif === 'repertoire'}
					onclick={() => versSection('repertoire')}
				>
					<span class="rail-num">·</span><span class="rail-t">Les soixante noms</span>
				</button>
			</li>
			<li>
				<button data-cible="fin" class:on={actif === 'fin'} onclick={() => versSection('fin')}>
					<span class="rail-num">·</span><span class="rail-t">La question</span>
				</button>
			</li>
		</ol>
	</nav>

	<!-- ============================ LIVRES ============================ -->
	<main class="texte">
		{#each LIVRES as l, i (l.id)}
			{@const pageIndex = pageDe(l)}
			{@const pageLore = l.pages[pageIndex]}
			<section class="chap" class:inverse={i % 2 === 1} id={l.id}>
				<figure class="chap-fig anim">
					<button class="chap-loupe" onclick={() => ouvrir(l)} title="Voir l'illustration en grand">
						<img class="chap-img" src={vignette(l.carte)} alt={nom(l.carte)} loading="lazy" />
						<span class="chap-agrandir">Agrandir</span>
					</button>
					<figcaption>{nom(l.carte)}</figcaption>
				</figure>

				<div class="chap-txt" aria-live="polite">
					<p class="chap-num anim">Livre {l.num}</p>
					<h2 class="anim">{l.titre}</h2>
					<p class="chap-sous anim">{l.sousTitre}</p>

					{#key pageIndex}
					<article class="feuillet anim" class:feuillet-fin={pageIndex === l.pages.length - 1}>
						<div class="folio-haut">
							<span>{pageLore.surtitre ?? l.titre}</span>
							<span>{String(pageIndex + 1).padStart(2, '0')}</span>
						</div>
						{#if pageLore.titre}<h3>{pageLore.titre}</h3>{/if}
						<div class="prose">
							{#each pageLore.paragraphes as p}
								<p>{p}</p>
							{/each}
						</div>
						{#if pageLore.citation}<blockquote>{pageLore.citation}</blockquote>{/if}
						{#if l.liste && pageIndex === 1}
							<dl class="mots">
								{#each l.liste as m}
									<div><dt>{m.terme}</dt><dd>{m.sens}</dd></div>
								{/each}
							</dl>
						{/if}
						<div class="folio-bas">— {pageIndex + 1} / {l.pages.length} —</div>
					</article>
					{/key}

					<div class="pagination anim" aria-label="Pages du livre {l.num}">
						<button
							class="tourner tourner-prev"
							disabled={pageIndex === 0}
							onclick={() => tourner(l, -1)}
							aria-label="Page précédente"
						>← <span>Précédente</span></button>
						<div class="pages-dots">
							{#each l.pages as _, p}
								<button
									class:on={p === pageIndex}
									onclick={() => ouvrirPage(l, p)}
									aria-label="Page {p + 1}"
									aria-current={p === pageIndex ? 'page' : undefined}
								></button>
							{/each}
						</div>
						<button
							class="tourner tourner-next"
							disabled={pageIndex === l.pages.length - 1}
							onclick={() => tourner(l, 1)}
							aria-label="Page suivante"
						><span>Suivante</span> →</button>
					</div>

					<!-- La note d'illustration : ce que l'image montre, et pourquoi elle est
					     posée sur ce chapitre plutôt qu'un autre. -->
					<aside class="note anim">
						<p class="note-h">Lire l'illustration</p>
						<p>{l.lecture}</p>
					</aside>

					{#if l.renvois?.length}
						<div class="renvois anim">
							<span class="renvois-h">Dans la galerie</span>
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
				Une même Origine. Cinq réponses au silence. Aucun peuple ne détient toute la vérité — mais
				chacun en possède assez pour entrer en guerre.
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

		<!-- =========================== RÉPERTOIRE ===========================
		     Une notice par carte. Elle ne redit pas la citation — celle-ci est la
		     voix du personnage, la notice est celle du copiste : elle situe le nom
		     dans l'histoire au lieu de le faire parler. -->
		<section class="repertoire" id="repertoire">
			<p class="chap-num">Galerie des cartes</p>
			<h2>Les soixante noms</h2>
			<p class="peuples-intro">
				Chaque nom conserve la trace d’un choix, d’une faute ou d’un serment. Cette galerie rassemble
				ce que le Korum a préservé de leur histoire.
			</p>

			<div class="filtres">
				<button class:on={peupleActif === null} onclick={() => (peupleActif = null)}>
					Tous les peuples
				</button>
				{#each REPERTOIRE as p (p.cle)}
					<button
						class:on={peupleActif === p.cle}
						style="--f:{p.color}"
						onclick={() => (peupleActif = peupleActif === p.cle ? null : p.cle)}
					>
						<span aria-hidden="true">{p.sigil}</span>
						{p.name}
					</button>
				{/each}
			</div>

			{#each repertoireVu as p (p.cle)}
				<div class="rep-groupe" style="--f:{p.color}">
					<h3 class="rep-h"><span aria-hidden="true">{p.sigil}</span> {p.name}</h3>
					<ul class="rep-liste">
						{#each p.entrees as e (e.carte.id)}
							<li class="fiche">
								<a class="fiche-art" href="/card/{e.carte.id}">
									<img src={vignette(e.carte.id)} alt="" loading="lazy" />
								</a>
								<div class="fiche-txt">
									<a class="fiche-nom" href="/card/{e.carte.id}">{e.carte.name}</a>
									<p class="fiche-note">{e.notice.texte}</p>
									<div class="fiche-pieds">
										<button class="fiche-livre" onclick={() => versSection(e.notice.livre)}>
											{titreLivre(e.notice.livre)}
										</button>
										{#if e.carte.flavor}
											<p class="fiche-cit">« {e.carte.flavor.replace(/^«\s*|\s*»$/g, '')} »</p>
										{/if}
									</div>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</section>

		<!-- ============================= FIN ============================= -->
		<section class="fin" id="fin">
			<p class="chap-num">Le copiste referme son livre</p>
			<p class="fin-q">{QUESTION_FINALE}</p>
			<p class="fin-note">
				Je l’ignore. J’écris pour que la question me survive.
			</p>
			<div class="fin-actions">
				<a class="btn-plein" href="/registre">Voir la galerie</a>
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
	.cosmographie {
		width: 100vw;
		margin-left: calc(50% - 50vw);
		padding: clamp(4rem, 9vw, 8rem) max(clamp(1.5rem, 6vw, 7rem), calc((100% - 1540px) / 2));
		display: grid;
		grid-template-columns: minmax(16rem, 0.52fr) minmax(24rem, 1fr);
		gap: clamp(2.5rem, 7vw, 8rem);
		align-items: center;
		background:
			radial-gradient(circle at 72% 40%, rgba(211, 178, 94, 0.08), transparent 34%),
			#060a12;
		border-bottom: 1px solid var(--panel-line);
	}
	.cosmo-intro { max-width: 31rem; }
	.cosmo-intro h2 {
		margin: 0 0 1.5rem;
		font-family: Cinzel, Georgia, serif;
		font-size: clamp(2.2rem, 5vw, 4.5rem);
		line-height: 0.98;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.cosmo-intro > p:not(.kicker):not(.cosmo-note) {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: 1.28rem;
		line-height: 1.65;
		color: rgba(238, 240, 245, 0.74);
	}
	.cosmo-note {
		margin-top: 2rem;
		font-family: var(--display);
		font-size: 0.67rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.38);
	}
	.cosmo-cadre {
		position: relative;
		width: min(100%, 31rem, 53vh);
		justify-self: center;
		margin: 0;
		padding: clamp(0.55rem, 1vw, 0.9rem);
		background: #cdbb95;
		box-shadow: 0 38px 100px rgba(0, 0, 0, 0.55);
		transform: rotate(0.35deg);
	}
	.cosmo-cadre::before {
		content: '';
		position: absolute;
		inset: 1.2rem;
		z-index: 1;
		border: 1px solid rgba(53, 35, 20, 0.42);
		pointer-events: none;
	}
	.cosmo-cadre img {
		display: block;
		width: 100%;
		height: auto;
		object-fit: contain;
		filter: saturate(0.88) contrast(1.02);
	}
	.cosmo-label {
		position: absolute;
		z-index: 2;
		right: clamp(1.3rem, 3vw, 3rem);
		display: grid;
		padding: 0.45rem 0.7rem;
		font-family: Cinzel, Georgia, serif;
		font-size: clamp(0.7rem, 1vw, 0.9rem);
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #2e2117;
		background: rgba(235, 221, 190, 0.82);
		border-left: 2px solid #8a3027;
		backdrop-filter: blur(5px);
	}
	.cosmo-label small {
		margin-top: 0.15rem;
		font-family: var(--display);
		font-size: 0.55rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		color: rgba(46, 33, 23, 0.66);
	}
	.cosmo-vasen { top: 16%; }
	.cosmo-xenen { top: 46%; }
	.cosmo-exen { top: 78%; }

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
	.feuillet {
		position: relative;
		min-height: 34rem;
		margin-top: var(--spacing-25);
		padding: clamp(2rem, 4vw, 3.8rem);
		padding-bottom: 3.6rem;
		color: #241d16;
		background:
			linear-gradient(90deg, rgba(67, 45, 26, 0.12), transparent 8%),
			repeating-linear-gradient(0deg, transparent 0 27px, rgba(95, 70, 45, 0.028) 28px),
			#e9dec7;
		box-shadow:
			0 28px 70px rgba(0, 0, 0, 0.38),
			inset 1px 0 rgba(255, 255, 255, 0.52),
			inset 18px 0 36px rgba(67, 45, 26, 0.09);
		clip-path: polygon(0.5% 0, 99.4% 0.3%, 100% 99.1%, 0 100%);
		animation: page-in 0.36s cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	.feuillet::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			radial-gradient(circle at 8% 12%, rgba(98, 65, 36, 0.07), transparent 23%),
			radial-gradient(circle at 92% 88%, rgba(98, 65, 36, 0.06), transparent 24%);
		mix-blend-mode: multiply;
	}
	.feuillet-fin {
		background:
			linear-gradient(90deg, rgba(67, 45, 26, 0.13), transparent 8%),
			repeating-linear-gradient(0deg, transparent 0 27px, rgba(95, 70, 45, 0.03) 28px),
			#e5d5b8;
	}
	.folio-haut {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.7rem;
		border-bottom: 1px solid rgba(67, 45, 26, 0.28);
		font-family: var(--display);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #756149;
	}
	.feuillet h3 {
		position: relative;
		z-index: 1;
		margin: 1.7rem 0 1.4rem;
		font-family: Cinzel, Georgia, serif;
		font-size: clamp(1.35rem, 2.5vw, 2rem);
		line-height: 1.15;
		letter-spacing: 0.02em;
		color: #211912;
	}
	.feuillet .prose {
		position: relative;
		z-index: 1;
	}
	.feuillet .prose p {
		margin: 0 0 1.15rem;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: clamp(1.12rem, 1.7vw, 1.28rem);
		line-height: 1.62;
		color: #30261d;
	}
	.feuillet .prose p:first-child::first-letter {
		float: left;
		margin: 0.05em 0.12em -0.08em 0;
		font-family: Cinzel, Georgia, serif;
		font-size: 3.5em;
		line-height: 0.82;
		color: #7d2922;
	}
	.feuillet blockquote {
		position: relative;
		z-index: 1;
		margin: 1.8rem 0 0;
		padding: 1rem 0 0 1.2rem;
		border-left: 2px solid #8a3027;
		border-top: 1px solid rgba(67, 45, 26, 0.18);
		font-size: 1.12rem;
		font-style: italic;
		color: #4b3326;
	}
	.feuillet .mots {
		position: relative;
		z-index: 1;
		margin-bottom: 0;
		border-color: rgba(67, 45, 26, 0.24);
	}
	.feuillet .mots dt { color: #7d2922; }
	.feuillet .mots dd { color: #4b3d31; }
	.folio-bas {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 1.3rem;
		text-align: center;
		font-family: Cinzel, Georgia, serif;
		font-size: 0.68rem;
		letter-spacing: 0.16em;
		color: #806c53;
	}
	.pagination {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}
	.tourner {
		border: 0;
		padding: 0.7rem 0;
		background: none;
		font-family: var(--display);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--gold);
		cursor: pointer;
	}
	.tourner-prev { text-align: left; }
	.tourner-next { text-align: right; }
	.tourner:disabled { opacity: 0.2; cursor: default; }
	.pages-dots { display: flex; gap: 0.55rem; }
	.pages-dots button {
		width: 1.8rem;
		height: 0.22rem;
		padding: 0;
		border: 0;
		background: rgba(238, 240, 245, 0.18);
		cursor: pointer;
		transition: background 0.2s ease, transform 0.2s ease;
	}
	.pages-dots button.on { background: var(--gold); transform: scaleX(1.15); }
	@keyframes page-in {
		from { opacity: 0; transform: translateX(14px) rotateY(-2deg); }
		to { opacity: 1; transform: none; }
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

	/* ============================== RÉPERTOIRE ============================== */
	.repertoire {
		padding: clamp(3.5rem, 8vw, 6rem) 0;
		border-bottom: 1px solid var(--panel-line);
		scroll-margin-top: 6rem;
	}
	.repertoire h2 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(1.8rem, 4vw, 2.9rem);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.filtres {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: var(--spacing-40);
	}
	.filtres button {
		padding: 0.5rem 0.95rem;
		border: 1px solid var(--panel-line);
		background: none;
		border-radius: 0;
		font-family: var(--display);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.6);
		cursor: pointer;
		transition:
			border-color 0.16s ease,
			color 0.16s ease;
	}
	.filtres button:hover {
		color: var(--ink);
	}
	.filtres button.on {
		color: var(--f, var(--gold));
		border-color: var(--f, var(--gold));
	}

	.rep-groupe + .rep-groupe {
		margin-top: var(--spacing-55);
	}
	.rep-h {
		margin: 0 0 var(--spacing-20);
		padding-bottom: var(--spacing-10);
		border-bottom: 1px solid var(--panel-line);
		font-family: Cinzel, Georgia, serif;
		font-size: 1.1rem;
		letter-spacing: 0.2em;
		color: var(--f);
	}
	.rep-liste {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		/* `min()` sinon le minmax impose 26rem même sur un écran plus étroit, et la
		   fiche déborde au lieu de se replier. */
		grid-template-columns: repeat(auto-fill, minmax(min(26rem, 100%), 1fr));
		gap: var(--spacing-20);
	}
	.fiche {
		display: grid;
		grid-template-columns: 6.5rem minmax(0, 1fr);
		gap: var(--spacing-20);
		padding: var(--spacing-15);
		border: 1px solid var(--panel-line);
		border-left: 2px solid var(--f);
		background: rgba(255, 255, 255, 0.02);
	}
	.fiche-art img {
		width: 100%;
		aspect-ratio: 3 / 4;
		object-fit: cover;
		display: block;
		filter: saturate(0.8);
		transition: filter 0.25s ease;
	}
	.fiche-art:hover img {
		filter: saturate(1);
	}
	.fiche-nom {
		font-family: Cinzel, Georgia, serif;
		font-size: 1rem;
		letter-spacing: 0.03em;
		color: var(--ink);
		text-decoration: none;
	}
	.fiche-nom:hover {
		color: var(--f);
	}
	.fiche-note {
		margin: var(--spacing-10) 0 0;
		font-size: 0.9rem;
		line-height: 1.6;
		color: rgba(238, 240, 245, 0.72);
	}
	.fiche-pieds {
		margin-top: var(--spacing-15);
	}
	.fiche-livre {
		padding: 0;
		border: none;
		background: none;
		font-family: var(--display);
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--gold);
		cursor: pointer;
	}
	.fiche-livre:hover {
		text-decoration: underline;
	}
	/* la citation reste présente mais en retrait : c'est la voix de la carte,
	   pas celle du copiste — les confondre était justement le risque */
	.fiche-cit {
		margin: var(--spacing-8) 0 0;
		font-size: 0.84rem;
		font-style: italic;
		color: rgba(238, 240, 245, 0.42);
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
		.rail-h,
		.rail-h2 {
			display: none;
		}
		/* Les deux listes deviennent UN seul défilement : `display: contents` fait
		   remonter les <li> dans le flex du rail, sinon « Les soixante noms » et
		   « La question » restaient hors d'atteinte sur mobile. */
		.rail {
			display: flex;
			gap: 0.4rem;
			overflow-x: auto;
			scrollbar-width: none;
		}
		.rail::-webkit-scrollbar {
			display: none;
		}
		.rail ol {
			display: contents;
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
		.cosmographie {
			grid-template-columns: minmax(0, 1fr);
			padding-inline: 1.25rem;
		}
		.cosmo-intro { max-width: none; }
		.cosmo-cadre { width: min(100%, 25rem, 51vh); }
		.cosmo-cadre img { height: auto; }
		.cosmo-label { right: 1.1rem; }
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
		.feuillet {
			min-height: 0;
			padding: 1.6rem 1.35rem 3.4rem;
			clip-path: none;
		}
		.feuillet .prose p {
			font-size: 1.12rem;
			line-height: 1.58;
		}
		.tourner span { display: none; }
		.pages-dots button { width: 1.25rem; }
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
