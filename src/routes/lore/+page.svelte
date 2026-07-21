<script lang="ts">
	import { onMount } from 'svelte';
	import { cards } from '$lib/cards';
	import { charter } from '$lib/charter';

	/* Les illustrations du set servent de gravures : chaque chapitre du Korum
	   s'appuie sur la carte du personnage qu'il raconte. Servies en 640px —
	   inutile de décoder du 1200 pour un bandeau. */
	function art(id: string) {
		const c = cards.find((x) => x.id === id);
		return c ? c.art.replace('/art/', '/art/w640/') : '';
	}

	const chapitres = [
		{
			n: 'I',
			titre: 'La Prononciation',
			carte: 'koren',
			legende: 'Koren, voix du Vasis',
			texte:
				"Au commencement, KOR dit les noms. Chaque être reçut le sien — une syllabe de l'Origine, dite une fois pour toutes. Un nom prononcé était un nom qui tenait. Les chœurs le répétaient, et tant qu'ils le répétaient, celui qui le portait existait."
		},
		{
			n: 'II',
			titre: 'Le mot que nul n’avait dit',
			carte: 'thalen',
			legende: 'Thalen, qui entendit EX',
			texte:
				"Thalen entendit sous les chœurs un mot que les chœurs ne chantaient pas : EX. Hors. Il l'entendit comme une fêlure dans une cloche — non pas un autre son, mais le même son devenu faux. Le mot était impossible : la Création contient tout ce qui est. Un mot qui signifie « hors » affirme qu'il existe un dehors. Donc une limite. Donc une fin."
		},
		{
			n: 'III',
			titre: 'La Fracture',
			carte: 'exen',
			legende: "Exen, l'Envers",
			texte:
				"EX entra dans KOR. L'Origine ne fut pas détruite : elle fut fêlée. Le cercle garda sa forme et perdit son intégrité. Comme tous les noms descendaient de KOR, la fêlure courut dans les noms. Tous les halos vacillèrent. Puis KOR se tut."
		},
		{
			n: 'IV',
			titre: 'Les Sentences',
			carte: 'doran',
			legende: 'Doran, sentence incarnée',
			texte:
				"Doran comprit d'un seul coup. Sa peur cessa d'être une prudence : elle devint une fondation. On jugea. On enchaîna. Chaque sentence prononcée en haut livrait une recrue en bas — et l'Envers grandissait de ce que l'Ordre rejetait."
		},
		{
			n: 'V',
			titre: 'La question sans réponse',
			carte: 'rasen',
			legende: 'Rasen, question sans réponse',
			texte:
				"Rasen posa la question que personne n'osait formuler : et dans celui qui juge, le mot n'est pas ? On ne lui répondit pas. On le condamna. Sa chaîne fut la première ; on dit qu'elle est revenue d'Exen par une route que nul ne connaît, et que Doran la regarde longtemps."
		},
		{
			n: 'VI',
			titre: 'Ceux qui tombèrent',
			carte: 'velna',
			legende: 'Velna, soleil en chute',
			texte:
				"Velna ne tomba pas : elle sauta. D'autres furent brisés d'un coup, d'autres encore s'usèrent syllabe après syllabe parce qu'on cessa simplement de les prononcer — un nom qu'on ne dit plus ternit, puis s'efface. Ils arrivèrent en bas à moitié dits."
		},
		{
			n: 'VII',
			titre: 'L’âge du Silence',
			carte: 'eshel',
			legende: 'Eshel, mémoire intacte',
			texte:
				"Voici le monde à l'heure où j'écris. En haut, les chœurs chantent plus fort que jamais — on croit qu'un doute se noie sous le volume. En bas, Exen grandit. Entre les mondes, les Eshar comptent les syllabes mortes, et le compte monte. Et parfois, le soir, un enfant prononce un mot qui porte. Alors cinq peuples retiennent leur souffle."
		}
	];

	let container: HTMLElement;
	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let ctx: { revert: () => void } | undefined;
		(async () => {
			const { gsap } = await import('gsap');
			const { ScrollTrigger } = await import('gsap/ScrollTrigger');
			gsap.registerPlugin(ScrollTrigger);
			ctx = gsap.context(() => {
				gsap.utils.toArray<HTMLElement>('.chap').forEach((c) => {
					gsap.from(c.querySelectorAll('.chap-txt > *, .chap-fig'), {
						autoAlpha: 0,
						y: 30,
						duration: 1.1,
						ease: 'expo.out',
						stagger: 0.09,
						scrollTrigger: { trigger: c, start: 'top 76%', once: true }
					});
					// l'illustration dérive lentement : la page respire au défilement
					gsap.fromTo(
						c.querySelector('.chap-fig img'),
						{ yPercent: -6 },
						{
							yPercent: 6,
							ease: 'none',
							scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: 1 }
						}
					);
				});
			}, container);
		})();
		return () => ctx?.revert();
	});
</script>

<svelte:head>
	<title>Le Korum — {charter.game.name}</title>
	<meta
		name="description"
		content="Le récit du Silence : la Prononciation, la Fracture, les Sentences et l'âge où KOR se tait."
	/>
</svelte:head>

<div bind:this={container}>
	<header class="hero-lore">
		<div class="hero-fond" aria-hidden="true"><img src={art('rasen')} alt="" /></div>
		<div class="hero-inner">
			<p class="kick">Le Korum · recueil d'Eshel</p>
			<h1>Le récit du Silence</h1>
			<p class="chapo">
				« J'écris pour toi, enfant de Xenen. Tu as prononcé un mot, un seul, et le mot a porté. Tu
				ignores encore ce que cela signifie. Les cinq peuples, eux, le savent. Ils te cherchent
				déjà. »
			</p>
		</div>
	</header>

	{#each chapitres as c, i (c.n)}
		<section class="chap" class:sombre={i % 2 === 1} class:inverse={i % 2 === 1}>
			<div class="chap-inner">
				<figure class="chap-fig">
					<img src={art(c.carte)} alt={c.legende} loading="lazy" />
					<figcaption>{c.legende}</figcaption>
				</figure>
				<div class="chap-txt">
					<p class="chap-n">Livre {c.n}</p>
					<h2>{c.titre}</h2>
					<p class="chap-p">{c.texte}</p>
				</div>
			</div>
		</section>
	{/each}

	<section class="fin">
		<div class="fin-inner">
			<p class="kick">La question laissée ouverte</p>
			<h2>Le silence d’un créateur est-il un abandon,<br />une punition, une attente&nbsp;?</h2>
			<p class="fin-txt">Ou une place laissée libre.</p>
			<div class="fin-actions">
				<a class="btn-plein" href="/registre">Voir les soixante noms</a>
				<a class="btn-contour" href="/packs">Ouvrir un booster</a>
			</div>
		</div>
	</section>
</div>

<style>
	/* ============ HERO DU RÉCIT ============ */
	.hero-lore {
		position: relative;
		width: 100vw;
		margin-left: calc(50% - 50vw);
		min-height: 62vh;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: clamp(4rem, 10vw, 8rem) var(--spacing-20);
		overflow: hidden;
	}
	.hero-fond {
		position: absolute;
		inset: 0;
	}
	.hero-fond img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 25%;
	}
	.hero-fond::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(5, 9, 18, 0.78) 0%,
			rgba(5, 9, 18, 0.6) 50%,
			var(--bg) 100%
		);
	}
	.hero-inner {
		position: relative;
		z-index: 2;
		max-width: 52rem;
	}
	.kick {
		margin: 0 0 var(--spacing-20);
		font-family: var(--display);
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--gold);
	}
	h1 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(2.2rem, 6vw, 4.4rem);
		line-height: 1.02;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #f5f3ec;
		text-shadow: 0 4px 40px rgba(0, 0, 0, 0.8);
	}
	.chapo {
		max-width: 46ch;
		margin: var(--spacing-30) auto 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: clamp(1.05rem, 2vw, 1.35rem);
		line-height: 1.55;
		color: rgba(238, 240, 245, 0.8);
	}

	/* ============ LES CHAPITRES ============
	   Illustration d'un côté, texte de l'autre, et l'ordre s'inverse d'un
	   chapitre à l'autre : c'est cette alternance qui rythme la lecture. */
	.chap {
		width: 100vw;
		margin-left: calc(50% - 50vw);
		padding-block: clamp(3.5rem, 8vw, 6.5rem);
	}
	.chap.sombre {
		background: rgba(4, 8, 16, 0.55);
		border-block: 1px solid var(--panel-line);
	}
	.chap-inner {
		max-width: 1180px;
		margin: 0 auto;
		padding-inline: var(--spacing-20);
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: center;
		gap: clamp(2rem, 5vw, var(--spacing-60));
	}
	.chap.inverse .chap-fig {
		order: 2;
	}
	.chap-fig {
		margin: 0;
		position: relative;
		overflow: hidden;
		border: 1px solid var(--panel-line);
	}
	.chap-fig img {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		opacity: 0.85;
	}
	.chap-fig figcaption {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: var(--spacing-25) var(--spacing-15) var(--spacing-10);
		font-family: var(--display);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.85);
		background: linear-gradient(180deg, transparent, rgba(3, 6, 12, 0.9));
	}
	.chap-n {
		margin: 0 0 var(--spacing-10);
		font-family: var(--display);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.chap-txt h2 {
		margin: 0 0 var(--spacing-20);
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(1.5rem, 3.2vw, 2.3rem);
		line-height: 1.1;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: #f5f3ec;
	}
	.chap-p {
		margin: 0;
		max-width: 54ch;
		font-size: 1rem;
		line-height: 1.7;
		color: rgba(238, 240, 245, 0.72);
	}

	@media (max-width: 820px) {
		.chap-inner {
			grid-template-columns: 1fr;
		}
		.chap.inverse .chap-fig {
			order: 0;
		}
	}

	/* ============ LA QUESTION FINALE ============ */
	.fin {
		width: 100vw;
		margin-left: calc(50% - 50vw);
		padding-block: clamp(4rem, 9vw, 7rem);
		text-align: center;
		border-top: 1px solid var(--panel-line);
	}
	.fin-inner {
		max-width: 54rem;
		margin: 0 auto;
		padding-inline: var(--spacing-20);
	}
	.fin-inner h2 {
		margin: 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 400;
		font-size: clamp(1.6rem, 3.6vw, 2.6rem);
		line-height: 1.25;
		color: #f5f3ec;
	}
	.fin-txt {
		margin: var(--spacing-20) 0 var(--spacing-40);
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 1.2rem;
		color: var(--gold);
	}
	.fin-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--spacing-15);
	}
	/* mêmes boutons que l'accueil : angle vif, capitales */
	.btn-plein,
	.btn-contour {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 15rem;
		padding: 1.1rem 2.3rem;
		font-family: var(--display);
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-decoration: none;
		border-radius: 0;
		transition:
			background 0.18s ease,
			color 0.18s ease,
			border-color 0.18s ease;
	}
	.btn-plein {
		color: #14120c;
		background: var(--gold);
		border: 2px solid var(--gold);
	}
	.btn-plein:hover {
		background: var(--cream);
		border-color: var(--cream);
	}
	.btn-contour {
		color: #f5f3ec;
		background: none;
		border: 2px solid #f5f3ec;
	}
	.btn-contour:hover {
		color: #14120c;
		background: #f5f3ec;
	}
</style>
