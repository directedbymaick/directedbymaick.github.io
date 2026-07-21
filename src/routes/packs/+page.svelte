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
		isGodPack,
		loadCollection,
		saveCollection,
		addToCollection,
		collectionStats,
		SLOT_ODDS,
		PACK_SIZE,
		FULLART_RATE,
		loadPity,
		savePity,
		PITY_PRISM,
		PITY_FULLART,
		type Pity,
		type Pull
	} from '$lib/gacha';
	import type { Rarity } from '$lib/types';
	import { paliers, frequence } from '$lib/paliers';
	import {
		eco,
		initEconomy,
		spend,
		earn,
		track,
		PACK_PRICE,
		SELL_KEEP,
		SELL_VALUE
	} from '$lib/economy.svelte';

	type Stage = 'idle' | 'reveal' | 'recap';
	/** Palier d'effets du reveal : la rareté, ou 'fullart' — le cran au-dessus de tout. */
	/* `apex` = la SP, l'illustration détourée : le sommet de l'échelle, quelle que
	   soit la rareté de la carte. C'est la finition qui fait l'evenement, pas le cadre. */
	type FxTier = Rarity | 'fullart' | 'apex';

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

	/* L'échelle complète : mêmes paliers et mêmes taux que /raretes, dérivés du
	   tirage lui-même. La publier ici, c'est publier les vraies probabilités. */
	const ECHELLE = paliers();

	/* ---- pitié ----
	   Le booster suivant est pré-tiré pour que le sachet soit prêt à l'écran. Ses
	   compteurs ne doivent pourtant avancer QUE s'il est réellement ouvert : on
	   tire donc sur une copie, et on ne la valide qu'au paiement. Sans ça, quitter
	   la page brûlerait de la pitié pour rien. */
	let pity = $state<Pity>({ sansPrism: 0, sansFullArt: 0 });
	let pityEnAttente: Pity | null = null;

	function preparer() {
		const copie = { ...pity };
		pending = openPack(copie);
		pityEnAttente = copie;
	}

	function validerPity() {
		if (pityEnAttente) {
			pity = pityEnAttente;
			pityEnAttente = null;
			savePity($state.snapshot(pity));
		}
	}

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
		initEconomy();
		pity = loadPity();
		preparer();
		reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!reduced) {
			(async () => {
				try {
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
				} catch {
					/* GSAP indisponible : on retombe sur l'affichage sans animation */
				}
			})();
		}
		return () => fx?.destroy();
	});

	/* Le sachet est pré-tiré : la fuite de lumière et la déflagration prennent
	   la couleur du meilleur tirage qui dort dedans. */
	let pending: Pull[] = $state([]);
	/* Le Full Art d'une Commune ne vaut pas une Prismatique : le rang suit la
	   VRAIE rareté, et le sommet est réservé à l'apex. */
	const TIER_RANK: Record<FxTier, number> = {
		common: 0, rare: 1, epic: 2, legendary: 3, fullart: 3.5, prism: 4, apex: 5
	};
	/* la couleur de l'aura selon le meilleur tirage : argent → or → prismatique */
	const TIER_GLOW: Record<FxTier, string> = {
		common: '#d7dde7', // argent
		rare: '#e6ecf5', // argent clair
		epic: '#ecc878', // or
		legendary: '#ffd977', // or riche
		prism: '#cbb8ff', // prismatique
		fullart: '#cbb8ff',
		apex: '#e6d8ff'
	};
	const bestTier = $derived(
		pending.reduce<FxTier>((best, p) => (TIER_RANK[fxOf(p)] > TIER_RANK[best] ? fxOf(p) : best), 'common')
	);
	const packPrisma = $derived(bestTier === 'prism' || bestTier === 'fullart' || bestTier === 'apex');

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
		},
		/* APEX — la SP, l'illustration détourée. Volontairement d'une autre nature :
		   trois vagues de lumière au lieu d'une, et une rémanence deux fois plus
		   longue. Le palier ne monte pas d'un cran, il change de catégorie. */
		apex: {
			fx: {
				colors: ['#ffffff', '#e6d8ff', '#bda6ff', '#ffe9c4'],
				orbs: 34,
				streaks: 12,
				power: 300,
				swells: 3,
				linger: 2
			},
			shake: 12
		}
	};

	/**
	 * L'apex est la SP — illustration détourée, le sommet de l'échelle. Toute autre
	 * carte garde son effet habituel, Prismatique comprise.
	 *
	 * La forme Full Art force `rarity: 'prism'` : c'est `sourceRarity` qui porte la
	 * vraie rareté. Sans ça, une Commune Full Art passait pour une Prismatique.
	 */
	const fxOf = (p: Pull): FxTier => {
		if (p.card.gene.foilPreset === 'showcase' && p.card.cutout) return 'apex';
		const vraie = p.card.sourceRarity ?? p.card.rarity;
		return p.fullArt ? 'fullart' : vraie;
	};


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

	const canAfford = $derived(eco.balance >= PACK_PRICE);

	async function onTorn() {
		// le booster se paye en Éclats — dernier garde-fou si l'UI a laissé passer
		if (!spend(PACK_PRICE)) return;
		track('packOpened');
		if (pending.length) {
			pulls = pending;
			validerPity();
		} else {
			pulls = openPack(pity);
			savePity($state.snapshot(pity));
		}
		track('pull', pulls.length);
		freshIds = addToCollection(collection, pulls);
		// revente automatique du surplus (option de l'espace utilisateur)
		if (eco.autoSell) {
			let total = 0;
			let count = 0;
			for (const p of pulls) {
				const id = p.card.id;
				const n = (collection[id] ?? 0) - SELL_KEEP;
				if (n > 0) {
					collection[id] = SELL_KEEP;
					total += n * (SELL_VALUE[p.card.rarity] ?? 5);
					count += n;
				}
			}
			if (count > 0) {
				saveCollection(collection);
				earn(total, `Revente auto : ${count} copie${count > 1 ? 's' : ''} en trop`);
			}
		}
		collection = { ...collection };
		godHit = isGodPack(pulls);
		bulk = false;
		flipped = pulls.map(() => false);

		stage = 'reveal';
		// l'entrée des dos est en CSS pur (.fc-pop, keyframes rise-in) :
		// sortie du sachet sobre — fondu + légère montée, ressort linear().
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

		// l'apex a sa propre mise en scène, et surtout son propre voile : le laisser
		// traverser le .dim ci-dessous superposerait deux assombrissements.
		if (tier === 'apex') return flipApex(btn, pop, inner, c, spec);

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

	/**
	 * L'APEX — la Prismatique.
	 *
	 * Les autres paliers montent par degrés : un peu plus de matière, un peu plus
	 * de secousse. Celui-ci devait changer de NATURE, pas de réglage. Il ouvre donc
	 * par ce que le jeu raconte : le silence. La scène s'éteint, tout s'arrête une
	 * demi-seconde, et c'est ce vide qui rend l'éclat suivant spectaculaire — pas
	 * le nombre de particules. Puis la carte tourne deux fois plus lentement, la
	 * lumière respire en trois vagues, et la rémanence met deux secondes à mourir.
	 */
	function flipApex(
		btn: HTMLElement,
		pop: Element | null,
		inner: Element | null,
		c: { x: number; y: number },
		spec: { fx: BurstSpec; shake?: number }
	) {
		const g = gsap!;
		const voile = document.createElement('div');
		voile.className = 'hush';
		fxLayer!.insertBefore(voile, fxLayer!.firstChild);

		const halo = document.createElement('div');
		halo.className = 'apex-halo';
		fxLayer!.appendChild(halo);
		const r = btn.getBoundingClientRect();
		const fr = fxLayer!.getBoundingClientRect();
		halo.style.left = `${r.left + r.width / 2 - fr.left}px`;
		halo.style.top = `${r.top + r.height / 2 - fr.top}px`;

		const tl = g.timeline({ onComplete: () => voile.remove() });

		// 1. le silence : la scène s'éteint et RETIENT
		tl.to(voile, { opacity: 1, duration: 0.42, ease: 'power2.inOut' })
			.to(pop, { y: -26, scale: 1.09, duration: 0.5, ease: 'power2.out' }, 0)
			.to({}, { duration: 0.45 }) // le temps mort — c'est lui qui fait tout

			// 2. la révélation : deux fois plus lente que les autres paliers
			.fromTo(inner, { rotationY: 0 }, { rotationY: 180, duration: 1.15, ease: 'power4.inOut' })

			// 3. la lumière, au point mort haut de la rotation
			.call(
				() => {
					fx!.burst(c.x, c.y, spec.fx);
					if (stageEl)
						g.fromTo(stageEl, { x: 0 }, { x: spec.shake ?? 12, duration: 0.9, ease: 'packShake', clearProps: 'x' });
				},
				[],
				'-=0.58'
			)
			.to(voile, { opacity: 0, duration: 1.1, ease: 'power2.out' }, '<')
			.fromTo(halo, { opacity: 0, scale: 0.35 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, '<')

			// 4. la retombée, et une rémanence qui met deux secondes à mourir
			.to(pop, { y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.1)' }, '<0.1')
			.to(halo, { opacity: 0, scale: 1.5, duration: 2, ease: 'power2.out', onComplete: () => halo.remove() }, '<0.3');
	}

	function revealAll() {
		pulls.forEach((_, i) => setTimeout(() => flip(i), i * 240));
	}

	function again() {
		stage = 'idle';
		pulls = [];
		flipped = [];
		godHit = false;
		preparer();
	}

	/* ---- ouverture groupée : 5 boosters d'un coup, récap direct ---- */
	let godHit = $state(false);
	let bulk = $state(false); // le récap vient d'une ouverture ×5
	const BULK_N = 5;
	const canAffordBulk = $derived(eco.balance >= PACK_PRICE * BULK_N);

	async function bulkOpen() {
		const cost = PACK_PRICE * BULK_N;
		if (!spend(cost)) return;
		track('packOpened', BULK_N);
		const all: Pull[] = [];
		let god = false;
		pityEnAttente = null; // l'ouverture groupée ignore le sachet pré-tiré
		for (let k = 0; k < BULK_N; k++) {
			const pk = openPack(pity);
			if (isGodPack(pk)) god = true;
			all.push(...pk);
		}
		track('pull', all.length);
		freshIds = addToCollection(collection, all);
		if (eco.autoSell) {
			let total = 0;
			let count = 0;
			for (const p of all) {
				const id = p.card.id;
				const n = (collection[id] ?? 0) - SELL_KEEP;
				if (n > 0) {
					collection[id] = SELL_KEEP;
					total += n * (SELL_VALUE[p.card.rarity] ?? 5);
					count += n;
				}
			}
			if (count > 0) {
				saveCollection(collection);
				earn(total, `Revente auto : ${count} copie${count > 1 ? 's' : ''} en trop`);
			}
		}
		collection = { ...collection };
		pulls = all;
		godHit = god;
		bulk = true;
		savePity($state.snapshot(pity));
		preparer();
		stage = 'recap';
		await tick();
		// une seule note de lumière au point du sachet — le reste est en CSS
		// (cascade sobre : fondu + scale .92→1, ressort linear(), cf. PACKSCOM-CODES.md §3.3)
		if (fx && fxLayer && stageEl) {
			const fr = fxLayer.getBoundingClientRect();
			const sr = stageEl.getBoundingClientRect();
			const prisma = god || all.some((p) => fxOf(p) === 'prism' || fxOf(p) === 'fullart');
			const colors = prisma ? BURST.prism.fx.colors : ['#ffedc0', '#e9c96a', '#fff8e6'];
			fx.burst(sr.left + sr.width / 2 - fr.left, sr.top + 90 - fr.top, {
				colors,
				orbs: 14,
				streaks: 5,
				power: 210
			});
		}
	}

	/* loupe : une carte révélée se clique pour être examinée en grand */
	let zoomed = $state<Pull | null>(null);
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') zoomed = null;
	}}
/>

<svelte:head>
	<title>Réquisition — {charter.game.name}</title>
	<meta name="description" content="Ouvrez des sachets du Silence : cinq cartes, probabilités publiques et collection persistante." />
</svelte:head>

<header class="hero">
	<p class="kicker"><span class="k-diamond">◆</span> Archives scellées</p>
	<h1>Réquisition</h1>
	<p class="tagline">
		Chaque sceau contient {PACK_SIZE} cartes. Les probabilités sont publiques ; chaque tirage
		rejoint votre Registre.
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
			<p class="price">
				<i class="shard" aria-hidden="true"></i> Booster — <b>{PACK_PRICE}</b> Éclats · solde
				<b>{eco.balance}</b>
			</p>
			{#if canAfford}
				<p class="hint">⠿ Tire la languette pour ouvrir</p>
				<PackVisual bind:this={packRef} ontorn={onTorn} glow={TIER_GLOW[bestTier]} prisma={packPrisma} />
				<div class="openrow">
					<button class="ghost" onclick={() => packRef?.tear()}>⚡ Ouverture rapide</button>
					<button class="ghost bulk" disabled={!canAffordBulk} onclick={bulkOpen}>
						×5 boosters — <i class="shard" aria-hidden="true"></i> {PACK_PRICE * BULK_N}
					</button>
				</div>
			{:else}
				<div class="broke-pack">
					<PackVisual glow={TIER_GLOW[bestTier]} prisma={false} />
				</div>
				<p class="broke">
					Éclats insuffisants — gagnez-en en <a href="/arene">Arène</a> et via vos
					<a href="/profil">quêtes</a>.
				</p>
			{/if}
		</div>
	{:else if stage === 'reveal'}
		<div class="stage-inner">
			<div
					class="reveal-glow"
					class:prisma={packPrisma}
					aria-hidden="true"
					style="--rglow: {TIER_GLOW[bestTier]}"
				></div>
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
						style="--i: {i}; {slotStyle(i, pulls.length)}"
						aria-label={flipped[i] ? p.card.name : `Révéler la carte ${i + 1}`}
						title={flipped[i] ? 'Agrandir' : undefined}
						onclick={() => (flipped[i] ? (zoomed = p) : flip(i))}
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
			{#if godHit}
				<div class="godbanner">
					<span class="god-em">✦</span> Booster EXPELLED <span class="god-em">✦</span>
					<small>Le Silence s'est ouvert — cinq cartes en Full Art prismatique.</small>
				</div>
			{/if}
			<h2 class="recap-title">{bulk ? `Ton ouverture · ${pulls.length} cartes` : 'Ton tirage'}</h2>
			<div class="recap-grid">
				{#each pulls as p, i (i)}
					<div class="recap-cell" style="--i: {i}">
						{#if p.fullArt}
							<span class="fabadge">Full Art</span>
						{:else if freshIds.includes(p.card.id) && pulls.findIndex((q) => q.card.id === p.card.id) === i}
							<span class="newbadge">Nouvelle !</span>
						{/if}
						<button class="zoombtn" title="Agrandir" onclick={() => (zoomed = p)}>
							<Card card={p.card} fullArt={p.fullArt} />
						</button>
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
	<h2><span class="tab">Probabilités</span><span class="rule"></span></h2>
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
	<div class="pitie">
		<h3>Garanties</h3>
		<p class="pitie-txt">
			Deux compteurs indépendants, parce que la rareté et le Full Art sont deux tirages séparés :
			une Prismatique garantie sans Full Art resterait une Prismatique Raw.
		</p>
		<div class="jauges">
			<div class="jauge">
				<p class="j-nom">Prismatique garantie</p>
				<div class="j-barre">
					<i style="width: {Math.min(100, (pity.sansPrism / PITY_PRISM) * 100)}%"></i>
				</div>
				<p class="j-cpt">
					{pity.sansPrism} / {PITY_PRISM}
					<span>— dans {Math.max(1, PITY_PRISM - pity.sansPrism)} booster{PITY_PRISM - pity.sansPrism > 1 ? 's' : ''} au plus tard</span>
				</p>
			</div>
			<div class="jauge">
				<p class="j-nom">Full Art garanti</p>
				<div class="j-barre">
					<i style="width: {Math.min(100, (pity.sansFullArt / PITY_FULLART) * 100)}%"></i>
				</div>
				<p class="j-cpt">
					{pity.sansFullArt} / {PITY_FULLART}
					<span>— dans {Math.max(1, PITY_FULLART - pity.sansFullArt)} booster{PITY_FULLART - pity.sansFullArt > 1 ? 's' : ''} au plus tard</span>
				</p>
			</div>
		</div>
	</div>

	<h3 class="paliers-titre">
		Par palier — finition et détourage compris
		<a class="paliers-lien" href="/raretes">voir l'échelle en cartes →</a>
	</h3>
	<div class="paliers-tab">
		<table>
			<thead>
				<tr><th>Palier</th><th>Par booster</th><th>Fréquence</th></tr>
			</thead>
			<tbody>
				{#each ECHELLE as p (p.key)}
					<tr>
						<td>{p.label}</td>
						<td class="num">
							{p.taux >= 1
								? `×${p.taux.toFixed(1).replace('.', ',')}`
								: `${(p.taux * 100).toFixed(p.taux < 0.01 ? 3 : 2).replace('.', ',')} %`}
						</td>
						<td class="freq">{frequence(p.taux)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<p class="odds-note">
		Les taux ci-dessus sont ceux du tirage seul, <strong>avant</strong> les garanties : à l'usage,
		les compteurs les relèvent à 4,5&nbsp;% de boosters avec Prismatique (contre 3,4&nbsp;%) et
		10&nbsp;% avec Full Art (contre 9&nbsp;%), et bornent la pire disette à
		{PITY_PRISM} et {PITY_FULLART} boosters au lieu de 245 et 99.
		Si une rareté tirée n'a aucune carte forgée, le tirage se replie sur la rareté la plus proche.
		Pas de doublon à l'intérieur d'un même booster tant que le pool le permet. Chaque carte épique
		ou au-delà a {Math.round(FULLART_RATE * 100)}&nbsp;% de chance de sortir en version
		<strong>Full Art</strong> — collectionnée à part. Et dans de très rares cas, le sachet est un
		<strong>booster EXPELLED</strong> : ses cinq cartes sortent toutes en Full Art prismatique.
	</p>
</section>

<!-- ============ LA LOUPE : examiner une carte en grand ============ -->
{#if zoomed}
	<div class="zoom" role="dialog" aria-modal="true" aria-label={zoomed.card.name}>
		<button class="zoom-backdrop" aria-label="Fermer" onclick={() => (zoomed = null)}></button>
		<div class="zoom-card">
			<Card card={zoomed.card} fullArt={zoomed.fullArt} />
		</div>
		<button class="zoom-close" aria-label="Fermer" onclick={() => (zoomed = null)}>✕</button>
		<p class="zoom-name">
			{zoomed.card.name}{zoomed.fullArt ? ' · Full Art' : ''} —
			{charter.rarities[zoomed.card.rarity].name}
		</p>
	</div>
{/if}

<style>
	/* ---------- la loupe ---------- */
	.zoom {
		position: fixed;
		inset: 0;
		z-index: 150;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.zoom-backdrop {
		position: absolute;
		inset: 0;
		border: none;
		cursor: zoom-out;
		background: rgba(4, 7, 14, 0.82);
		backdrop-filter: blur(10px);
		animation: zfade 0.25s ease;
	}
	.zoom-card {
		position: relative;
		--card-w: min(440px, 88vw, 58vh);
		animation: zpop 0.32s cubic-bezier(0.16, 1, 0.3, 1);
		filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.6));
	}
	.zoom-close {
		position: absolute;
		top: 1.2rem;
		right: 1.4rem;
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border: 1px solid rgba(238, 240, 245, 0.25);
		border-radius: 50%;
		background: rgba(10, 16, 30, 0.6);
		color: rgba(238, 240, 245, 0.8);
		font-size: 1rem;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease;
	}
	.zoom-close:hover {
		border-color: rgba(213, 178, 94, 0.6);
		color: #fff;
	}
	.zoom-name {
		position: absolute;
		bottom: 1.6rem;
		left: 50%;
		transform: translateX(-50%);
		margin: 0;
		font-size: 0.85rem;
		color: rgba(238, 240, 245, 0.6);
		white-space: nowrap;
		pointer-events: none;
	}
	@keyframes zfade {
		from {
			opacity: 0;
		}
	}
	@keyframes zpop {
		from {
			opacity: 0;
			transform: scale(0.9) translateY(14px);
		}
	}

	/* les cartes révélées deviennent des loupes */
	.fan-card.flipped {
		cursor: zoom-in;
	}
	.zoombtn {
		display: block;
		width: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: zoom-in;
	}
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
	.price {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-size: 0.9rem;
		color: rgba(238, 240, 245, 0.6);
	}
	.price b {
		color: #d5b25e;
		font-variant-numeric: tabular-nums;
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
	.broke-pack {
		filter: grayscale(0.8) brightness(0.55);
		pointer-events: none;
	}
	.broke {
		margin: 0;
		font-size: 0.9rem;
		color: rgba(238, 240, 245, 0.55);
	}
	.broke a {
		color: #d5b25e;
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

	/* ---------- calque d'effets : flash, particules, ondes de choc ----------
	   Plafonné à la zone haute du stage : les particules naissent et vivent
	   près du sachet. Sans ce plafond, un récap ×5 (25 cartes) étirerait le
	   canvas sur des milliers de px — coûteux et il masquerait les cartes. */
	.fx {
		position: absolute;
		inset: 0 0 auto 0;
		height: min(100%, 760px);
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
	/* le silence de l'apex : plus dense que le .dim des autres paliers, et surtout
	   il DURE — c'est le noir qui fait la valeur de l'éclat qui suit */
	.fx :global(.hush) {
		position: absolute;
		inset: 0;
		opacity: 0;
		background:
			radial-gradient(85% 85% at 50% 45%, rgba(2, 2, 5, 0.55) 20%, rgba(2, 2, 5, 0.94) 100%),
			rgba(2, 2, 5, 0.6);
	}
	/* la rémanence : une nappe prismatique qui s'attarde derrière la carte */
	.fx :global(.apex-halo) {
		position: absolute;
		width: 460px;
		height: 460px;
		margin: -230px 0 0 -230px;
		border-radius: 50%;
		pointer-events: none;
		mix-blend-mode: screen;
		background: radial-gradient(
			circle,
			rgba(255, 255, 255, 0.5) 0%,
			rgba(198, 168, 255, 0.38) 28%,
			rgba(150, 120, 255, 0.16) 52%,
			transparent 72%
		);
	}
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

	/* ---------- reveal : apparition soignée — lumière douce qui monte ---------- */
	.reveal-glow {
		position: absolute;
		left: 50%;
		top: 34%;
		width: min(720px, 82%);
		height: 60%;
		translate: -50% -50%;
		z-index: 0;
		pointer-events: none;
		/* très diffuse : aucune forme, aucun bord — juste une chaleur qui sourd */
		background: radial-gradient(
			50% 50% at 50% 50%,
			color-mix(in srgb, var(--rglow, #e9c96a) 34%, transparent) 0%,
			color-mix(in srgb, var(--rglow, #e9c96a) 12%, transparent) 42%,
			transparent 74%
		);
		filter: blur(34px);
		mix-blend-mode: screen;
		animation: reveal-swell 0.9s var(--ease-out-cubic, cubic-bezier(0.33, 1, 0.68, 1)) both;
	}
	.reveal-glow.prisma {
		background: radial-gradient(
			50% 50% at 50% 50%,
			rgba(203, 184, 255, 0.32) 0%,
			rgba(168, 200, 255, 0.12) 42%,
			transparent 74%
		);
	}
	/* la montée : fondu + léger gonflement, puis respiration lente — pas un flash */
	@keyframes reveal-swell {
		0% {
			opacity: 0;
			scale: 0.86;
		}
		60% {
			opacity: 1;
			scale: 1.03;
		}
		100% {
			opacity: 0.82;
			scale: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reveal-glow {
			animation: none;
			opacity: 0.7;
		}
	}

	/* ---------- reveal : l'éventail de dos à retourner ---------- */
	.fan {
		position: relative;
		z-index: 1;
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
		/* sortie du sachet : montée douce + fondu, ressort CSS (compositor-friendly,
		   insensible aux gels de requestAnimationFrame). `backwards` : caché pendant
		   le délai, puis relâché — le hover et le flip reprennent la main après. */
		animation: rise-in 0.65s var(--ease-spring) backwards;
		animation-delay: calc(var(--i, 0) * 75ms);
	}
	@keyframes rise-in {
		from {
			opacity: 0;
			transform: translateY(26px) scale(0.94);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.fc-pop {
			animation: none;
		}
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

	/* ---------- ouverture : rangée de boutons ---------- */
	.openrow {
		display: flex;
		gap: 0.7rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.bulk {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-variant-numeric: tabular-nums;
	}
	.bulk:disabled {
		opacity: 0.4;
		cursor: default;
	}

	/* ---------- recap ---------- */
	.recap-title {
		margin: 0;
		font-weight: 750;
		font-size: clamp(1.5rem, 3.5vw, 2.2rem);
		letter-spacing: -0.02em;
	}
	/* la bannière du booster EXPELLED : l'événement rarissime */
	.godbanner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.8rem 2rem;
		text-align: center;
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		font-size: clamp(1.1rem, 2.6vw, 1.6rem);
		letter-spacing: 0.18em;
		text-transform: uppercase;
		background: linear-gradient(90deg, #e8a7b8, #e8d3a7, #a7e8c6, #a7c6e8, #c9a7e8, #e8a7b8);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		filter: drop-shadow(0 0 14px rgba(203, 184, 255, 0.4));
		animation: godsheen 5s linear infinite;
	}
	.godbanner small {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-weight: 400;
		font-style: italic;
		font-size: 0.9rem;
		letter-spacing: 0.02em;
		text-transform: none;
		background: none;
		-webkit-background-clip: border-box;
		background-clip: border-box;
		color: rgba(226, 212, 255, 0.85);
		filter: none;
	}
	.god-em {
		font-size: 0.7em;
	}
	@keyframes godsheen {
		to {
			background-position: 200% 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.godbanner {
			animation: none;
		}
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
		/* la cascade du récap : le reveal packs.com — fondu + scale .92→1, en vague.
		   38 ms d'écart : 25 cartes se déploient en ~1 s sans jamais s'agiter. */
		animation: recap-in 0.55s var(--ease-spring) backwards;
		animation-delay: calc(var(--i, 0) * 38ms);
	}
	@keyframes recap-in {
		from {
			opacity: 0;
			transform: translateY(14px) scale(0.92);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.recap-cell {
			animation: none;
		}
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
	/* ---------- les garanties ---------- */
	.pitie {
		margin: 2rem 0 0;
		padding: 1.3rem 1.5rem;
		background: rgba(213, 178, 94, 0.05);
		border: 1px solid rgba(213, 178, 94, 0.18);
		border-radius: 16px;
	}
	.pitie h3 {
		margin: 0 0 0.5rem;
		font-size: 0.95rem;
		font-weight: 600;
	}
	.pitie-txt {
		margin: 0 0 1.1rem;
		max-width: 70ch;
		font-size: 0.84rem;
		line-height: 1.6;
		color: rgba(242, 240, 234, 0.5);
	}
	.jauges {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.2rem;
	}
	.j-nom {
		margin: 0 0 0.45rem;
		font-size: 0.84rem;
		font-weight: 550;
	}
	.j-barre {
		height: 5px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}
	.j-barre i {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, rgba(213, 178, 94, 0.5), #d5b25e);
		transition: width 0.3s ease;
	}
	.j-cpt {
		margin: 0.45rem 0 0;
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
		color: #d5b25e;
	}
	.j-cpt span {
		color: rgba(242, 240, 234, 0.38);
	}

	/* ---------- l'échelle des paliers ---------- */
	.paliers-titre {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem 1rem;
		margin: 2.2rem 0 0.9rem;
		font-size: 0.95rem;
		font-weight: 600;
	}
	.paliers-lien {
		font-size: 0.8rem;
		font-weight: 500;
		color: #d5b25e;
		text-decoration: none;
	}
	.paliers-lien:hover {
		text-decoration: underline;
	}
	/* 33 lignes : on borne la hauteur et on laisse défiler dans le bloc */
	.paliers-tab {
		max-height: 26rem;
		overflow: auto;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
	}
	.paliers-tab table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.paliers-tab th {
		position: sticky;
		top: 0;
		z-index: 1;
		padding: 0.7rem 1.1rem;
		text-align: left;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.45);
		background: #12131a;
	}
	.paliers-tab td {
		padding: 0.6rem 1.1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}
	.paliers-tab .num,
	.paliers-tab .freq {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.paliers-tab .num {
		color: #d5b25e;
	}
	.paliers-tab .freq {
		color: rgba(242, 240, 234, 0.45);
	}
	.odds-note {
		margin: 1.2rem 0 0;
		font-size: 0.88rem;
		color: rgba(242, 240, 234, 0.45);
		max-width: 70ch;
	}
</style>
