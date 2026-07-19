<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Card from '$lib/Card.svelte';
	import CardBack from '$lib/CardBack.svelte';
	import PackVisual from '$lib/PackVisual.svelte';
	import { createPackFx, type PackFx, type BurstSpec } from '$lib/effects/packfx';
	import { charter } from '$lib/charter';
	import { cards } from '$lib/cards';
	import {
		openPack,
		loadCollection,
		addToCollection,
		collectionStats,
		SLOT_ODDS,
		PACK_SIZE,
		FULLART_RATE,
		type Pull
	} from '$lib/gacha';
	import type { Rarity } from '$lib/types';

	type Stage = 'idle' | 'reveal' | 'recap';
	/** Palier d'effets du reveal : la rareté, ou 'fullart' — le cran au-dessus de tout. */
	type FxTier = Rarity | 'fullart';

	let stage: Stage = $state('idle');
	let pulls: Pull[] = $state([]);
	let freshIds: string[] = $state([]);
	let flipped: boolean[] = $state([]);
	let packRef: PackVisual | undefined = $state();
	let stageEl: HTMLElement | undefined = $state();
	let fxLayer: HTMLElement | undefined = $state();

	let collection = $state<Record<string, number>>({});
	$effect(() => {
		collection = loadCollection();
	});
	const stats = $derived(collectionStats(collection));
	const flippedCount = $derived(flipped.filter(Boolean).length);
	const allFlipped = $derived(flipped.length > 0 && flipped.every(Boolean));

	const RARITY_TINT: Record<Rarity, string> = {
		common: '#8b95a5',
		rare: '#e8e4da',
		epic: '#b8c4d6',
		legendary: '#c9a445',
		prism: '#c9a2e8'
	};

	/* ---- moteur d'effets : GSAP + plugins pro, particules canvas additif ---- */
	let gsap: typeof import('gsap').gsap | undefined;
	let fx: PackFx | undefined;
	let fxCanvas: HTMLCanvasElement | undefined = $state();
	let reduced = false;
	onMount(() => {
		pending = openPack();
		reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!reduced) {
			(async () => {
				const [{ gsap: g }, { CustomEase }, { CustomWiggle }] = await Promise.all([
					import('gsap'),
					import('gsap/CustomEase'),
					import('gsap/CustomWiggle')
				]);
				g.registerPlugin(CustomEase, CustomWiggle);
				// secousse pro : oscillation amortie, pas un yoyo linéaire
				CustomWiggle.create('packShake', { wiggles: 8, type: 'easeOut' });
				gsap = g;
				if (fxCanvas) fx = createPackFx(fxCanvas);
			})();
		}
		return () => fx?.destroy();
	});

	/* Le sachet est pré-tiré : la fuite de lumière et la déflagration prennent
	   la couleur du meilleur tirage qui dort dedans. */
	let pending: Pull[] = $state([]);
	const TIER_RANK: Record<FxTier, number> = { common: 0, rare: 1, epic: 2, legendary: 3, prism: 4, fullart: 5 };
	const TIER_GLOW: Record<FxTier, string> = {
		common: '#ffcd6e',
		rare: '#ffcd6e',
		epic: '#cfe0f4',
		legendary: '#ffd977',
		prism: '#cbb8ff',
		fullart: '#cbb8ff'
	};
	const bestTier = $derived(
		pending.reduce<FxTier>((best, p) => (TIER_RANK[fxOf(p)] > TIER_RANK[best] ? fxOf(p) : best), 'common')
	);
	const packPrisma = $derived(bestTier === 'prism' || bestTier === 'fullart');

	/* Retenue : peu de matière, lente, sans forme lisible. Le palier monte surtout
	   par la lumière (bloom, vignette, rémanence), pas par le nombre de particules. */
	const BURST: Record<FxTier, { fx: BurstSpec; shake?: number }> = {
		common: { fx: { colors: ['#cfd6e0', '#9aa4b5'], orbs: 6, streaks: 3, power: 170, bloom: false } },
		rare: { fx: { colors: ['#e8e4da', '#ffffff'], orbs: 10, streaks: 4, power: 200, bloom: false } },
		epic: { fx: { colors: ['#c8d4e4', '#eef4fb'], orbs: 14, streaks: 5, power: 220 } },
		legendary: {
			fx: { colors: ['#e9c96a', '#ffedc0', '#fff8e6'], orbs: 18, streaks: 7, power: 250 },
			shake: 7
		},
		/* prismatique : blanc glacial, violet pâle — une lumière d'un autre monde */
		prism: {
			fx: { colors: ['#f4f0ff', '#cbb8ff', '#ffffff'], orbs: 22, streaks: 8, power: 265 },
			shake: 8
		},
		/* full art : champagne — blanc chaud, or pâle */
		fullart: {
			fx: { colors: ['#fff6e2', '#ffe3a1', '#ffffff'], orbs: 26, streaks: 9, power: 280 },
			shake: 9
		}
	};

	const fxOf = (p: Pull): FxTier => (p.fullArt ? 'fullart' : p.card.rarity);


	function centerOf(el: Element) {
		const fr = fxLayer!.getBoundingClientRect();
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width / 2 - fr.left, y: r.top + r.height / 2 - fr.top };
	}

	/* ---- l'éventail : position de chaque carte ---- */
	function slotStyle(i: number, n: number) {
		const off = i - (n - 1) / 2;
		return `--rot: ${(off * 4.5).toFixed(1)}deg; --ty: ${(off * off * 9).toFixed(0)}px`;
	}

	async function onTorn() {
		pulls = pending.length ? pending : openPack();
		freshIds = addToCollection(collection, pulls);
		collection = { ...collection };
		flipped = pulls.map(() => false);

		// flash + déflagration à l'emplacement du sachet, aux couleurs du meilleur tirage
		if (gsap && fx && fxLayer && stageEl) {
			const c = centerOf(stageEl.querySelector('.stage-inner') ?? stageEl);
			const colors = packPrisma
				? BURST.prism.fx.colors
				: bestTier === 'epic'
					? BURST.epic.fx.colors
					: ['#ffedc0', '#e9c96a', '#fff8e6'];
			fx.burst(c.x, c.y, { colors, orbs: 30, streaks: 12, power: 330 });
			const f = document.createElement('div');
			f.className = packPrisma ? 'flash prisma' : 'flash';
			fxLayer.appendChild(f);
			gsap.fromTo(
				f,
				{ opacity: 0 },
				{ opacity: 1, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut', onComplete: () => f.remove() }
			);
		}

		stage = 'reveal';
		await tick();
		// les 5 dos jaillissent du point d'explosion vers leurs places dans l'éventail
		if (gsap && stageEl) {
			gsap.fromTo(
				stageEl.querySelectorAll('.fc-pop'),
				{ y: 150, scale: 0.55, autoAlpha: 0, rotate: -6 },
				{
					y: 0,
					scale: 1,
					autoAlpha: 1,
					rotate: 0,
					duration: 0.85,
					ease: 'back.out(1.5)',
					stagger: 0.07
				}
			);
		}
	}

	function flip(i: number) {
		if (flipped[i] || stage !== 'reveal') return;
		flipped[i] = true;
		const tier = fxOf(pulls[i]);
		const spec = BURST[tier];
		const btn = stageEl?.querySelectorAll('.fan-card')[i] as HTMLElement | undefined;
		if (!btn || !gsap || !fx || !fxLayer) return; // fallback : flip CSS instantané (reduced motion)

		const pop = btn.querySelector('.fc-pop');
		const inner = btn.querySelector('.fc-inner');
		const c = centerOf(btn);

		// les grosses pioches : le stage retient son souffle avant l'éclat
		if (spec.shake) {
			const d = document.createElement('div');
			d.className = 'dim';
			fxLayer.insertBefore(d, fxLayer.firstChild);
			gsap.fromTo(
				d,
				{ opacity: 0 },
				{ opacity: 1, duration: 0.2, ease: 'power1.in', yoyo: true, repeat: 1, repeatDelay: 0.3, onComplete: () => d.remove() }
			);
		}

		// anticipation → rotation → lumière au point mort haut → retombée physique
		// (un seul léger dépassement — jamais d'élastique qui rebondit)
		const tl = gsap.timeline();
		tl.to(pop, { y: -14, scale: 1.04, duration: 0.18, ease: 'power3.out' })
			.fromTo(inner, { rotationY: 0 }, { rotationY: 180, duration: 0.62, ease: 'power4.inOut' }, '<0.05')
			.call(
				() => {
					fx!.burst(c.x, c.y, spec.fx);
					if (spec.shake && stageEl)
						gsap!.fromTo(stageEl, { x: 0 }, { x: spec.shake, duration: 0.55, ease: 'packShake', clearProps: 'x' });
				},
				[],
				0.36
			)
			.to(pop, { y: 0, scale: 1, duration: 0.48, ease: 'back.out(1.15)' }, 0.58);
	}

	function revealAll() {
		pulls.forEach((_, i) => setTimeout(() => flip(i), i * 240));
	}

	function again() {
		stage = 'idle';
		pulls = [];
		flipped = [];
		pending = openPack();
	}
</script>

<svelte:head>
	<title>Packs — {charter.game.name}</title>
	<meta name="description" content="Ouvre des boosters du Silence : 5 cartes, odds publiées, collection locale." />
</svelte:head>

<header class="hero">
	<p class="kicker"><span class="k-diamond">◆</span> Réquisition de matériel</p>
	<h1>Packs</h1>
	<p class="tagline">
		Le booster du Silence : {PACK_SIZE} cartes par sachet, odds publiées, zéro compte. Ta
		collection vit dans ce navigateur.
	</p>
	<p class="colstat">
		<span class="colstat-n">{stats.unique}</span>/{cards.length} cartes uniques ·
		{stats.total} tirées au total
	</p>
</header>

<!-- ============ LE STAGE ============ -->
<section class="stage" data-stage={stage} bind:this={stageEl}>
	<div class="fx" bind:this={fxLayer} aria-hidden="true">
		<canvas class="fxc" bind:this={fxCanvas}></canvas>
	</div>
	{#if stage === 'idle'}
		<div class="stage-inner">
			<p class="hint">⠿ Tire la languette pour ouvrir</p>
			<PackVisual bind:this={packRef} ontorn={onTorn} glow={TIER_GLOW[bestTier]} prisma={packPrisma} />
			<button class="ghost" onclick={() => packRef?.tear()}>⚡ Ouverture rapide</button>
		</div>
	{:else if stage === 'reveal'}
		<div class="stage-inner">
			<div class="fan">
				<!-- couche de lueurs : derrière TOUT l'éventail, jamais coupée par une carte voisine.
				     La lueur ne s'allume qu'APRÈS la révélation — le dos d'une carte ne trahit rien. -->
				<div class="glowrail" aria-hidden="true">
					{#each pulls as p, i (i)}
						<div
							class="glow-slot"
							class:on={flipped[i]}
							data-fx={fxOf(p)}
							style={slotStyle(i, pulls.length)}
						></div>
					{/each}
				</div>
				{#each pulls as p, i (i)}
					<button
						class="fan-card"
						class:flipped={flipped[i]}
						data-fx={fxOf(p)}
						style={slotStyle(i, pulls.length)}
						aria-label={flipped[i] ? p.card.name : `Révéler la carte ${i + 1}`}
						onclick={() => flip(i)}
					>
						<div class="fc-pop">
							<div class="fc-inner">
								<div class="fc-back"><CardBack /></div>
								<div class="fc-front"><Card card={p.card} fullArt={p.fullArt} interactive={flipped[i]} /></div>
							</div>
							{#if flipped[i] && p.fullArt}
								<span class="fabadge">Full Art</span>
							{:else if flipped[i] && freshIds.includes(p.card.id) && pulls.findIndex((q) => q.card.id === p.card.id) === i}
								<span class="newbadge">Nouvelle !</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
			<div class="reveal-controls">
				<span class="counter">{flippedCount} / {pulls.length}</span>
				{#if !allFlipped}
					<button class="ghost" onclick={revealAll}>Tout révéler</button>
				{:else}
					<button class="primary" onclick={() => (stage = 'recap')}>Voir le récap</button>
				{/if}
			</div>
		</div>
	{:else if stage === 'recap'}
		<div class="stage-inner recap">
			<h2 class="recap-title">Ton tirage</h2>
			<div class="recap-grid">
				{#each pulls as p, i (i)}
					<div class="recap-cell">
						{#if p.fullArt}
							<span class="fabadge">Full Art</span>
						{:else if freshIds.includes(p.card.id) && pulls.findIndex((q) => q.card.id === p.card.id) === i}
							<span class="newbadge">Nouvelle !</span>
						{/if}
						<Card card={p.card} fullArt={p.fullArt} />
						<a class="recap-link" href="/card/{p.baseId}{p.fullArt ? '?v=fullart' : ''}">{p.card.name}</a>
					</div>
				{/each}
			</div>
			<div class="reveal-controls">
				<button class="primary" onclick={again}>Ouvrir un autre booster</button>
				<a class="ghost" href="/">Retour au mur</a>
			</div>
		</div>
	{/if}
</section>

<!-- ============ ODDS PUBLIÉES ============ -->
<section class="odds">
	<h2><span class="tab">Odds publiées</span><span class="rule"></span></h2>
	<div class="odds-grid">
		{#each SLOT_ODDS as slot (slot.label)}
			<div class="odds-card">
				<p class="odds-slot">{slot.label}</p>
				<ul>
					{#each Object.entries(slot.odds) as [rarity, p] (rarity)}
						<li>
							<span class="odds-rarity" style="--tint: {RARITY_TINT[rarity as Rarity]}"
								>{charter.rarities[rarity as Rarity].name}</span
							>
							<span class="odds-p">{Math.round(p * 100)}%</span>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
	<p class="odds-note">
		Si une rareté tirée n'a aucune carte forgée, le tirage se replie sur la rareté la plus proche.
		Pas de doublon à l'intérieur d'un même booster tant que le pool le permet. Chaque carte épique
		ou au-delà a {Math.round(FULLART_RATE * 100)}&nbsp;% de chance de sortir en version
		<strong>Full Art</strong> — collectionnée à part.
	</p>
</section>

<style>
	.hero {
		margin: 4rem 0 3rem;
	}
	.kicker {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin: 0 0 1rem;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.4);
	}
	.k-diamond {
		color: #c9a445;
		font-size: 0.75em;
	}
	h1 {
		margin: 0;
		font-weight: 800;
		font-size: clamp(2.8rem, 6.5vw, 4.6rem);
		letter-spacing: -0.03em;
		line-height: 1;
	}
	.tagline {
		margin: 1.2rem 0 0;
		max-width: 56ch;
		font-size: 1.05rem;
		line-height: 1.6;
		color: rgba(242, 240, 234, 0.55);
	}
	.colstat {
		margin: 1rem 0 0;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		color: rgba(242, 240, 234, 0.45);
	}
	.colstat-n {
		color: #c9a445;
		font-weight: 650;
	}

	/* ---------- stage ---------- */
	.stage {
		position: relative;
		overflow: hidden; /* rien ne déborde du cadre : particules, cartes, secousses */
		margin-bottom: 4rem;
		padding: 3.5rem 1.5rem;
		background:
			radial-gradient(60% 80% at 50% 30%, rgba(201, 164, 69, 0.05), transparent 70%),
			rgba(255, 255, 255, 0.025);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 24px;
	}
	.stage-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}
	.hint {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(201, 164, 69, 0.8);
		animation: pulse 2.4s ease-in-out infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.55;
		}
		50% {
			opacity: 1;
		}
	}

	/* ---------- calque d'effets : flash, particules, ondes de choc ---------- */
	.fx {
		position: absolute;
		inset: 0;
		z-index: 50;
		border-radius: inherit;
		overflow: hidden;
		pointer-events: none;
	}
	/* le canvas de particules : blending additif, toute la scène */
	.fxc {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	/* la vignette qui retient son souffle avant une grosse pioche */
	.fx :global(.dim) {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(90% 90% at 50% 45%, rgba(4, 5, 8, 0) 30%, rgba(4, 5, 8, 0.72) 100%),
			rgba(4, 5, 8, 0.32);
	}
	.fx :global(.flash) {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			60% 55% at 50% 45%,
			rgba(255, 244, 214, 0.8),
			rgba(255, 214, 128, 0.4) 42%,
			transparent 75%
		);
	}
	/* déflagration spectrale : un prismatique / full art était dans le sachet */
	.fx :global(.flash.prisma) {
		background: radial-gradient(
			60% 55% at 50% 45%,
			rgba(240, 228, 255, 0.95),
			rgba(178, 143, 255, 0.55) 38%,
			rgba(120, 176, 255, 0.32) 58%,
			transparent 78%
		);
	}

	/* ---------- reveal : l'éventail de dos à retourner ---------- */
	.fan {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		perspective: 1400px;
		padding: 1.2rem 0 0.6rem;
	}
	.fan-card {
		position: relative;
		width: clamp(150px, 19vw, 215px);
		--card-w: 100%;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		transform: rotate(var(--rot, 0deg)) translateY(var(--ty, 0px));
		transform-origin: 50% 130%;
	}
	.fan-card + .fan-card {
		margin-left: -1.7rem;
	}
	.fan-card:hover,
	.fan-card:focus-visible {
		z-index: 6;
	}
	.fan-card.flipped {
		cursor: default;
	}
	.fc-pop {
		transition: transform 0.25s ease;
	}
	/* dès le flip, GSAP pilote .fc-pop en inline : la transition CSS ne doit plus interférer */
	.fan-card.flipped .fc-pop {
		transition: none;
	}
	.fan-card:not(.flipped):hover .fc-pop,
	.fan-card:not(.flipped):focus-visible .fc-pop {
		transform: translateY(-12px) scale(1.03);
	}
	.fc-inner {
		position: relative;
		transform-style: preserve-3d;
	}
	/* fallback sans GSAP (reduced motion) : le flip est instantané.
	   Avec GSAP, la rotation est pilotée en inline par la timeline (prioritaire). */
	.fan-card.flipped .fc-inner {
		transform: rotateY(180deg);
	}
	.fc-back {
		backface-visibility: hidden;
	}
	.fc-front {
		position: absolute;
		inset: 0;
		transform: rotateY(180deg);
		backface-visibility: hidden;
	}
	/* ---------- couche de lueurs : les hautes raretés irradient AVANT le flip ----------
	   Un calque dédié, DERRIÈRE tout l'éventail : aucune carte voisine ne coupe une lueur,
	   et chaque nappe est un dégradé radial à retombée longue — zéro bord visible. */
	.glowrail {
		position: absolute;
		inset: 0;
		padding: 1.2rem 0 0.6rem;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		pointer-events: none;
	}
	.glow-slot {
		position: relative;
		flex: none;
		width: clamp(150px, 19vw, 215px);
		aspect-ratio: 63 / 88;
		transform: rotate(var(--rot, 0deg)) translateY(var(--ty, 0px));
		transform-origin: 50% 130%;
	}
	.glow-slot + .glow-slot {
		margin-left: -1.7rem;
	}
	.glow-slot::after {
		content: '';
		position: absolute;
		inset: -38%;
		opacity: 0;
		transition: opacity 0.9s ease 0.35s; /* s'allume avec la face, en douceur */
	}
	/* légendaire révélée : nappe d'or qui respire */
	.glow-slot.on[data-fx='legendary']::after {
		background: radial-gradient(
			50% 50% at 50% 50%,
			rgba(255, 214, 120, 0.4),
			rgba(230, 178, 80, 0.2) 34%,
			rgba(201, 164, 69, 0.08) 56%,
			rgba(201, 164, 69, 0.025) 70%,
			transparent 82%
		);
		opacity: 1;
		animation: breathe 2.4s ease-in-out 0.35s infinite;
	}
	/* prismatique révélée : lumière froide, blanc-violet */
	.glow-slot.on[data-fx='prism']::after {
		background: radial-gradient(
			50% 50% at 50% 50%,
			rgba(240, 234, 255, 0.38),
			rgba(203, 184, 255, 0.18) 36%,
			rgba(168, 200, 255, 0.07) 58%,
			rgba(168, 200, 255, 0.02) 72%,
			transparent 84%
		);
		opacity: 1;
		animation: breathe 2s ease-in-out 0.35s infinite;
	}
	/* full art révélée : champagne — blanc chaud, à peine doré */
	.glow-slot.on[data-fx='fullart']::after {
		background: radial-gradient(
			50% 50% at 50% 50%,
			rgba(255, 246, 220, 0.42),
			rgba(255, 227, 161, 0.2) 36%,
			rgba(226, 212, 255, 0.07) 58%,
			rgba(226, 212, 255, 0.02) 72%,
			transparent 84%
		);
		opacity: 1;
		animation: breathe 2s ease-in-out 0.35s infinite;
	}
	@keyframes breathe {
		0%, 100% { opacity: 0.6; transform: scale(0.98); }
		50% { opacity: 1; transform: scale(1.02); }
	}

	/* sweep de lumière sur la face au moment du reveal — monte avec la rareté.
	   Rayon calé sur la silhouette exacte de la carte (4.6cqw → 4.6% / 3.3%) :
	   la lumière ne déborde jamais du cadre. */
	.fc-front::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 9;
		pointer-events: none;
		opacity: 0;
		border-radius: 4.6% / 3.3%;
	}
	.fan-card.flipped[data-fx='epic'] .fc-front::before {
		background: linear-gradient(115deg, transparent 32%, rgba(223, 233, 245, 0.5) 50%, transparent 68%);
		background-size: 280% 100%;
		animation: sweep 0.9s ease-out 0.36s both;
	}
	.fan-card.flipped[data-fx='legendary'] .fc-front::before {
		background: linear-gradient(115deg, transparent 30%, rgba(255, 217, 119, 0.55) 50%, transparent 70%);
		background-size: 280% 100%;
		animation: sweep 1.1s ease-out 0.36s both;
	}
	/* reflet de verre : cœur blanc, franges de dispersion bleu/violet à peine visibles */
	.fan-card.flipped[data-fx='prism'] .fc-front::before,
	.fan-card.flipped[data-fx='fullart'] .fc-front::before {
		background: linear-gradient(
			115deg,
			transparent 30%,
			rgba(168, 200, 255, 0.28) 42%,
			rgba(255, 255, 255, 0.6) 50%,
			rgba(203, 184, 255, 0.28) 58%,
			transparent 70%
		);
		background-size: 300% 100%;
		mix-blend-mode: screen;
		animation: sweep 1.35s ease-out 0.36s both;
	}
	@keyframes sweep {
		from { opacity: 1; background-position: 120% 0; }
		to { opacity: 0; background-position: -60% 0; }
	}

	/* badge Full Art : champagne et lavande, pas un arc-en-ciel */
	.fabadge {
		position: absolute;
		top: -0.7rem;
		left: 50%;
		translate: -50% 0;
		z-index: 6;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 0.24rem 0.7rem;
		color: #0a0a0d;
		background: linear-gradient(100deg, #fff3d6, #ffffff 45%, #e2d4ff);
		border-radius: 999px;
		box-shadow: 0 0 14px rgba(203, 184, 255, 0.45);
	}
	@media (max-width: 700px) {
		.fan {
			flex-wrap: wrap;
			gap: 0.9rem;
		}
		.glowrail {
			flex-wrap: wrap;
			gap: 0.9rem;
		}
		.fan-card,
		.glow-slot {
			width: clamp(120px, 27vw, 160px);
			transform: none;
		}
		.fan-card + .fan-card,
		.glow-slot + .glow-slot {
			margin-left: 0;
		}
	}

	.reveal-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.counter {
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		color: rgba(242, 240, 234, 0.45);
	}
	.primary,
	.ghost {
		font-family: inherit;
		font-size: 0.88rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		text-decoration: none;
		padding: 0.65rem 1.4rem;
		border: none;
		cursor: pointer;
		border-radius: 999px;
		transition:
			background 0.18s ease,
			color 0.18s ease;
	}
	.primary {
		color: #0a0a0d;
		background: #f2f0ea;
	}
	.primary:hover {
		background: #c9a445;
	}
	.ghost {
		color: rgba(242, 240, 234, 0.65);
		background: rgba(255, 255, 255, 0.07);
	}
	.ghost:hover {
		color: #f2f0ea;
		background: rgba(255, 255, 255, 0.12);
	}

	/* ---------- recap ---------- */
	.recap-title {
		margin: 0;
		font-weight: 750;
		font-size: clamp(1.5rem, 3.5vw, 2.2rem);
		letter-spacing: -0.02em;
	}
	.recap-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 200px));
		justify-content: center;
		gap: 1.6rem 1rem;
		width: 100%;
	}
	.recap-cell {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		--card-w: 100%;
	}
	.newbadge {
		position: absolute;
		top: -0.6rem;
		z-index: 5;
		font-size: 0.7rem;
		font-weight: 650;
		padding: 0.22rem 0.65rem;
		color: #0a0a0d;
		background: #c9a445;
		border-radius: 999px;
	}
	.recap-link {
		font-size: 0.78rem;
		font-weight: 550;
		text-decoration: none;
		color: rgba(242, 240, 234, 0.5);
		transition: color 0.15s ease;
	}
	.recap-link:hover {
		color: #f2f0ea;
	}

	/* ---------- odds ---------- */
	.odds {
		margin-bottom: 3rem;
	}
	.odds h2 {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0 0 1.4rem;
	}
	.tab {
		font-size: 1.15rem;
		font-weight: 650;
		letter-spacing: 0.01em;
		white-space: nowrap;
	}
	.rule {
		flex: 1;
		height: 1px;
		background: rgba(255, 255, 255, 0.07);
	}
	.odds-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}
	.odds-card {
		padding: 1.2rem 1.4rem;
		background: rgba(255, 255, 255, 0.035);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
	}
	.odds-slot {
		margin: 0 0 0.7rem;
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}
	.odds-card ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.odds-card li {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
	}
	.odds-rarity {
		color: var(--tint, #f2f0ea);
	}
	.odds-p {
		font-variant-numeric: tabular-nums;
		color: rgba(242, 240, 234, 0.65);
	}
	.odds-note {
		margin: 1.2rem 0 0;
		font-size: 0.88rem;
		color: rgba(242, 240, 234, 0.45);
		max-width: 70ch;
	}
</style>
