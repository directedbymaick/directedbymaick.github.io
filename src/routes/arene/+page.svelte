<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/Card.svelte';
	import FactionSigil from '$lib/FactionSigil.svelte';
	import logo from '$lib/assets/logo.svg';
	import { charter } from '$lib/charter';
	import { cards, getCard } from '$lib/cards';
	import { loadDecks, type Deck } from '$lib/decks';
	import { initEconomy, earn, track, MATCH_REWARD } from '$lib/economy.svelte';
	import {
		Duel,
		MAJORS,
		type PlayerSnap,
		type UnitSnap,
		type HandEntry,
		type DuelMeta
	} from '$lib/game/engine';
	import type { CardData, FactionId } from '$lib/types';

	/* ============ SETUP ============ */

	type Phase = 'setup' | 'play';
	let phase = $state<Phase>('setup');

	let myDecks = $state<Deck[]>([]);
	let deckChoice = $state<string>('auto-vasar'); // 'auto-<faction>' ou l'id d'un deck perso
	let aiFaction = $state<FactionId>('exar');

	onMount(() => {
		initEconomy();
		myDecks = loadDecks().filter((d) => Object.values(d.cards).reduce((a, b) => a + b, 0) === 30);
	});

	function expandDeck(d: Deck): CardData[] {
		const list: CardData[] = [];
		for (const [id, n] of Object.entries(d.cards)) {
			const c = getCard(id);
			if (c) for (let i = 0; i < n; i++) list.push(c);
		}
		return list;
	}
	function dominantFaction(list: CardData[]): FactionId {
		const count: Partial<Record<FactionId, number>> = {};
		for (const c of list) count[c.faction] = (count[c.faction] ?? 0) + 1;
		return (Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'vasar') as FactionId;
	}

	/* ============ DUEL ============ */

	let duel: Duel | null = null;
	let view = $state<[PlayerSnap, PlayerSnap] | null>(null);
	let handV = $state<HandEntry[]>([]);
	let meta = $state<DuelMeta | null>(null);
	let attackers = $state<number[]>([]);
	let legal = $state<{ units: number[]; korum: boolean }>({ units: [], korum: false });
	let pron = $state<{ uid: number; cost: number; text: string }[]>([]);
	let log = $state<string[]>([]);
	let sel = $state<number | null>(null);
	let replaying = $state(false);
	let showLog = $state(false);
	let flash = $state('');

	const myTurn = $derived(!!meta && meta.active === 0 && meta.winner === null && !replaying);
	const winner = $derived(meta?.winner ?? null);

	/* récompense de fin de partie : une seule fois par duel */
	let rewarded = $state(false);
	const gainAmount = $derived(winner === 0 ? MATCH_REWARD.win : MATCH_REWARD.loss);
	$effect(() => {
		if (winner === null || rewarded || phase !== 'play') return;
		rewarded = true;
		if (winner === 0) {
			earn(MATCH_REWARD.win, 'Victoire en Arène');
			track('win');
		} else {
			earn(MATCH_REWARD.loss, 'Défaite honorable');
			track('loss');
		}
	});

	function refresh() {
		if (!duel) return;
		view = duel.state();
		handV = duel.hand();
		meta = duel.meta();
		attackers = duel.attackers();
		legal = duel.legalTargets();
		pron = duel.pronounceable();
	}

	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

	/* ---- annonces de phase ---- */
	let banner = $state<{ title: string; sub: string } | null>(null);
	let bannerN = $state(0);
	let aiActing = $state(false);

	async function pump(fast: boolean) {
		if (!duel) return;
		const evs = duel.drain();
		for (const e of evs) {
			log.push(e.msg);
			view = e.state;
			// chaque tour et chaque phase s'annonce en bannière centrale
			if (e.t === 'turn') {
				aiActing = e.side === 1;
				banner = {
					title: e.side === 0 ? 'Votre tour' : "Tour de l'IA",
					sub: e.msg.replace(/^[—\s]+|[—\s]+$/g, '')
				};
				bannerN++;
				await sleep(1100);
				continue;
			}
			if (e.t === 'phase') {
				banner = { title: e.msg, sub: '' };
				bannerN++;
				await sleep(950);
				continue;
			}
			if (e.t === 'win') aiActing = false;
			flash = e.msg;
			await sleep(fast ? 150 : 560);
		}
		refresh();
	}

	function start() {
		rewarded = false;
		const seed = Math.floor(Math.random() * 1e9);
		let humanDeck: CardData[] | null = null;
		let humanFaction: FactionId = 'vasar';
		if (deckChoice.startsWith('auto-')) {
			humanFaction = deckChoice.slice(5) as FactionId;
		} else {
			const d = myDecks.find((x) => x.id === deckChoice);
			if (d) {
				humanDeck = expandDeck(d);
				humanFaction = dominantFaction(humanDeck);
			}
		}
		duel = new Duel(cards, humanDeck, humanFaction, aiFaction, seed);
		log = [];
		sel = null;
		phase = 'play';
		replaying = true;
		pump(true).then(() => (replaying = false));
	}

	/**
	 * Le terrain s'ouvre dans SA fenêtre : plein écran, sans rien du site autour.
	 * Le deck et les peuples voyagent par l'URL, la graine aussi — sans elle, un
	 * rechargement re-tirerait une partie différente.
	 */
	function ouvrirTerrain() {
		// 'auto-<peuple>' choisit un deck genere ; sinon deckChoice est un id de deck
		const auto = deckChoice.startsWith('auto-');
		const q = new URLSearchParams({
			seed: String(Math.floor(Math.random() * 1e9)),
			moi: auto ? deckChoice.slice(5) : dominantFaction(expandDeck(myDecks.find((d) => d.id === deckChoice)!)),
			lui: aiFaction
		});
		if (!auto) q.set('deck', deckChoice);
		window.open(
			`/duel?${q}`,
			'expelled-terrain',
			`popup=yes,width=${screen.availWidth},height=${screen.availHeight},left=0,top=0`
		);
	}

	async function doPlay(i: number) {
		if (!duel || !myTurn) return;
		if (!duel.play(i)) return;
		track('cardPlayed');
		sel = null;
		replaying = true;
		await pump(true);
		replaying = false;
	}

	function clickMyUnit(u: UnitSnap) {
		if (!myTurn) return;
		if (sel === u.uid) sel = null;
		else if (attackers.includes(u.uid)) sel = u.uid;
	}

	async function clickEnemyUnit(u: UnitSnap) {
		if (!duel || !myTurn || sel === null) return;
		if (!legal.units.includes(u.uid)) return;
		const a = sel;
		sel = null;
		if (!duel.attack(a, u.uid)) return;
		replaying = true;
		await pump(true);
		replaying = false;
	}

	async function clickEnemyKorum() {
		if (!duel || !myTurn || sel === null || !legal.korum) return;
		const a = sel;
		sel = null;
		if (!duel.attack(a, 'korum')) return;
		replaying = true;
		await pump(true);
		replaying = false;
	}

	async function doPronounce(uid: number) {
		if (!duel || !myTurn) return;
		sel = null;
		if (!duel.pronounce(uid)) return;
		track('prononcer');
		replaying = true;
		await pump(true);
		replaying = false;
	}

	async function endTurn() {
		if (!duel || !myTurn) return;
		sel = null;
		duel.endTurn();
		replaying = true;
		await pump(false);
		replaying = false;
	}

	function rematch() {
		phase = 'setup';
		duel = null;
		view = null;
		meta = null;
	}

	/* ---- la loupe : lire une carte en grand ---- */
	let zoomed = $state<CardData | null>(null);

	/* ---- drag & drop : glisser une carte de la main vers le plateau ---- */
	let handEl: HTMLElement | undefined = $state();
	let dragIdx = $state<number | null>(null);
	let dragOn = $state(false); // le seuil de mouvement est franchi
	let dragXY = $state({ x: 0, y: 0 });
	let pressPos = { x: 0, y: 0 };

	function handDown(e: PointerEvent, i: number) {
		if (e.button !== 0) return;
		pressPos = { x: e.clientX, y: e.clientY };
		dragIdx = i;
		dragOn = false;
		dragXY = { x: 0, y: 0 };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function handMove(e: PointerEvent, i: number) {
		if (dragIdx !== i) return;
		const dx = e.clientX - pressPos.x;
		const dy = e.clientY - pressPos.y;
		if (!dragOn && Math.hypot(dx, dy) > 8) dragOn = true;
		if (dragOn && handV[i]?.playable && myTurn) dragXY = { x: dx, y: dy };
	}
	function handUp(e: PointerEvent, i: number) {
		if (dragIdx !== i) return;
		const wasDrag = dragOn;
		dragIdx = null;
		dragOn = false;
		dragXY = { x: 0, y: 0 };
		if (!wasDrag) {
			// simple clic : on lit la carte
			zoomed = handV[i]?.card ?? null;
			return;
		}
		// dépôt : au-dessus de la main = sur le plateau
		if (!handV[i]?.playable || !myTurn) return;
		const rect = handEl?.getBoundingClientRect();
		if (rect && e.clientY < rect.top - 8) doPlay(i);
	}

	/** La vraie carte du registre — ou une carte reconstituée pour les jetons. */
	function cardOf(u: UnitSnap): CardData {
		return (
			getCard(u.cardId) ?? {
				id: u.cardId,
				name: u.name,
				kind: 'etre',
				cost: u.cost,
				attack: u.atk,
				health: u.maxHp,
				text: '',
				rarity: 'common',
				faction: u.faction as FactionId,
				art: '/card-back.webp',
				gene: {
					palette: [],
					foilPreset: 'mat',
					accent: charter.factions[u.faction as FactionId]?.color ?? '#c9a445',
					seed: 1
				}
			}
		);
	}
</script>

<svelte:head>
	<title>Arène — {charter.game.name}</title>
	<meta name="description" content="L'Arène : affrontez l'IA d'Expelled en duel, règles du Silence." />
</svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			zoomed = null;
			sel = null;
		}
	}}
/>

{#if phase === 'setup'}
	<!-- ============ ÉCRAN DE MISE EN JEU ============ -->
	<header class="setup-hero">
		<p class="kicker">◯ L'Arène</p>
		<h1>Duel d'entraînement</h1>
		<p class="tagline">
			Trente cartes, 25 d'Intégrité au Korum. Jouez vos cartes, choisissez vos cibles, prononcez au
			bon moment — l'IA du Silence ne pardonne pas grand-chose.
		</p>
	</header>
	<div class="setup">
		<section class="spanel">
			<h2>Votre deck</h2>
			<div class="choices">
				{#each MAJORS as f (f)}
					<button
						class="choice"
						class:on={deckChoice === `auto-${f}`}
						style="--fc: {charter.factions[f].color}"
						onclick={() => (deckChoice = `auto-${f}`)}
					>
						<span class="c-sigil"><FactionSigil faction={f} /></span>
						<span class="c-name">{charter.factions[f].name} <small>deck auto</small></span>
					</button>
				{/each}
				{#each myDecks as d (d.id)}
					<button class="choice" class:on={deckChoice === d.id} onclick={() => (deckChoice = d.id)}>
						<span class="c-sigil deck">🂠</span>
						<span class="c-name">{d.name} <small>votre deck · 30 cartes</small></span>
					</button>
				{/each}
			</div>
			{#if myDecks.length === 0}
				<p class="note">Vos decks complets (30 cartes) de <a href="/profil">Mon Nom</a> apparaîtront ici.</p>
			{/if}
		</section>
		<section class="spanel">
			<h2>L'adversaire</h2>
			<div class="choices">
				{#each MAJORS as f (f)}
					<button
						class="choice"
						class:on={aiFaction === f}
						style="--fc: {charter.factions[f].color}"
						onclick={() => (aiFaction = f)}
					>
						<span class="c-sigil"><FactionSigil faction={f} /></span>
						<span class="c-name">IA·{charter.factions[f].name}</span>
					</button>
				{/each}
			</div>
			<button class="startbtn" onclick={start}>Entrer dans l'Arène</button>
			<button class="terrainbtn" onclick={ouvrirTerrain}>
				Ouvrir le terrain — plein écran ↗
			</button>
			<p class="note"><a href="/arene/simulateur">Le simulateur IA contre IA</a> reste disponible.</p>
		</section>
	</div>
{:else if view && meta}
	{@const me = view[0]}
	{@const foe = view[1]}
	<!-- ============ LE PLATEAU ============ -->
	<div class="duel" class:replaying>
		<!-- rail gauche : les deux Korum + journal -->
		<div class="rail-left">
			<button
				class="gem foe"
				class:targetable={sel !== null && legal.korum}
				disabled={!(sel !== null && legal.korum)}
				onclick={clickEnemyKorum}
				title="Le Korum adverse"
			>
				<i></i><b>{Math.max(0, foe.korum)}</b>
			</button>
			<span class="midline-orb" aria-hidden="true"></span>
			<div class="gem mine"><i></i><b>{Math.max(0, me.korum)}</b></div>
			<button class="logbtn" class:on={showLog} onclick={() => (showLog = !showLog)} title="Journal">☰</button>
		</div>

		<!-- rail droit : Volonté + fin de tour -->
		<div class="rail-right">
			<div class="willbox foe" title="Volonté adverse">
				<b>{foe.will}</b><small>/{foe.maxWill}</small>
			</div>
			<button class="passbtn" disabled={!myTurn} onclick={endTurn}>
				{#if winner !== null}Terminé{:else if aiActing}Tour<br />adverse{:else if replaying}…{:else}Fin de<br />tour{/if}
			</button>
			<div class="willbox mine" title="Votre Volonté">
				<b>{me.will}</b><small>/{me.maxWill}</small>
				<span class="pips" aria-hidden="true">
					{#each Array(me.maxWill) as _, i (i)}<i class:full={i < me.will}></i>{/each}
				</span>
			</div>
		</div>

		<!-- bandeau adverse : identité + main cachée -->
		<div class="foehead">
			<span class="foe-id" style="--fc: {charter.factions[foe.faction].color}">
				<FactionSigil faction={foe.faction} />
				{foe.name}
			</span>
			<div class="foe-hand" aria-label="{foe.hand} cartes en main adverse">
				{#each Array(Math.min(foe.hand, 10)) as _, i (i)}
					<span class="back"><img src={logo} alt="" /></span>
				{/each}
			</div>
			<span class="foe-deck">{foe.deck} au deck</span>
		</div>

		<!-- plateau adverse -->
		<div class="lane foe-lane">
			{#each foe.board as u (u.uid)}
				<button
					class="slot"
					class:targetable={sel !== null && legal.units.includes(u.uid)}
					class:locked={u.locked}
					disabled={!(sel !== null && legal.units.includes(u.uid))}
					onclick={() => clickEnemyUnit(u)}
					oncontextmenu={(e) => {
						e.preventDefault();
						zoomed = cardOf(u);
					}}
					title="{u.name} — clic droit pour lire"
				>
					<Card card={cardOf(u)} interactive={false} />
					<span class="ov-atk">{u.atk}</span>
					<span class="ov-hp" class:hurt={u.hp < u.maxHp}>{u.hp}</span>
					{#if u.serment}<span class="ov-tag">Serment</span>{/if}
					{#if u.locked}<span class="ov-lock">⛓</span>{/if}
				</button>
			{/each}
			{#if foe.board.length === 0}<span class="lane-empty">—</span>{/if}
		</div>

		<div class="centerline" aria-hidden="true"><i></i></div>

		<!-- votre plateau -->
		<div class="lane my-lane" class:dropready={dragOn && dragIdx !== null && handV[dragIdx]?.playable}>
			{#each me.board as u (u.uid)}
				<div class="unitwrap">
					<button
						class="slot mine"
						class:ready={attackers.includes(u.uid)}
						class:selected={sel === u.uid}
						class:locked={u.locked}
						onclick={() => clickMyUnit(u)}
						oncontextmenu={(e) => {
							e.preventDefault();
							zoomed = cardOf(u);
						}}
						title="{u.name} — clic droit pour lire"
					>
						<Card card={cardOf(u)} interactive={false} />
						<span class="ov-atk">{u.atk}</span>
						<span class="ov-hp" class:hurt={u.hp < u.maxHp}>{u.hp}</span>
						{#if u.serment}<span class="ov-tag">Serment</span>{/if}
						{#if u.locked}<span class="ov-lock">⛓</span>{/if}
						{#if u.elan}<span class="ov-elan">⚡</span>{/if}
					</button>
					{#each pron.filter((p) => p.uid === u.uid) as p (p.uid)}
						<button class="pronbtn" title={p.text} onclick={() => doPronounce(p.uid)}
							>◯ Prononcer {p.cost}</button
						>
					{/each}
				</div>
			{/each}
			{#if me.board.length === 0}<span class="lane-empty">—</span>{/if}
		</div>

		<!-- la main : glisser pour jouer, cliquer pour lire -->
		<div class="hand" bind:this={handEl}>
			{#each handV as h, i (i)}
				<button
					class="hslot"
					class:playable={h.playable}
					class:unplayable={!h.playable}
					class:dragging={dragIdx === i && dragOn}
					style="--i: {i - (handV.length - 1) / 2}; --dx: {dragIdx === i ? dragXY.x : 0}px; --dy: {dragIdx === i ? dragXY.y : 0}px"
					onpointerdown={(e) => handDown(e, i)}
					onpointermove={(e) => handMove(e, i)}
					onpointerup={(e) => handUp(e, i)}
					onpointercancel={() => {
						dragIdx = null;
						dragOn = false;
						dragXY = { x: 0, y: 0 };
					}}
					title="{h.card.name} — glisser sur le plateau pour jouer, cliquer pour lire"
				>
					<Card card={h.card} interactive={false} />
					{#if h.cost !== h.card.cost}
						<span class="ov-cost" title="Coût réduit">{h.cost}</span>
					{/if}
				</button>
			{/each}
		</div>
		<p class="handhint">Glissez une carte sur le plateau pour la jouer · cliquez pour l'examiner</p>

		<!-- fil d'action -->
		{#if flash}
			<p class="flash">{flash}</p>
		{/if}

		{#if showLog}
			<aside class="log">
				{#each log.slice(-40) as line, i (i)}
					<p>{line}</p>
				{/each}
			</aside>
		{/if}

		<!-- l'annonce de phase -->
		{#if banner}
			{#key bannerN}
				<div class="phase-banner" aria-live="polite">
					<span class="pb-line"></span>
					<div class="pb-txt">
						<h3>{banner.title}</h3>
						{#if banner.sub}<p>{banner.sub}</p>{/if}
					</div>
					<span class="pb-line flip"></span>
				</div>
			{/key}
		{/if}

		<!-- la loupe -->
		{#if zoomed}
			<div class="zoom" role="dialog" aria-modal="true" aria-label={zoomed.name}>
				<button class="zoom-backdrop" aria-label="Fermer" onclick={() => (zoomed = null)}></button>
				<div class="zoom-card"><Card card={zoomed} /></div>
				<button class="zoom-close" aria-label="Fermer" onclick={() => (zoomed = null)}>✕</button>
			</div>
		{/if}

		<!-- fin de partie -->
		{#if winner !== null}
			<div class="endveil">
				<img src={logo} alt="" />
				<h2>
					{winner === 0 ? 'Le Korum adverse se tait.' : winner === 1 ? 'Votre Korum se tait.' : 'Double chute.'}
				</h2>
				<p>{winner === 0 ? 'Victoire — votre parole tient.' : winner === 1 ? 'Défaite — l’Arène retiendra votre nom.' : 'Match nul.'}</p>
				<p class="gain"><i class="shard" aria-hidden="true"></i> +{gainAmount} Éclats</p>
				<button class="startbtn" onclick={rematch}>Rejouer</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* ============ setup ============ */
	.setup-hero {
		margin: 4rem 0 2.5rem;
	}
	.kicker {
		margin: 0 0 1rem;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--gold);
	}
	h1 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 400;
		font-size: clamp(2.6rem, 6vw, 4.4rem);
	}
	.tagline {
		margin: 1.2rem 0 0;
		max-width: 60ch;
		color: rgba(238, 240, 245, 0.55);
		line-height: 1.6;
	}
	.setup {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.6rem;
	}
	.spanel {
		padding: 1.6rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 18px;
		backdrop-filter: blur(12px);
	}
	.spanel h2 {
		margin: 0 0 1rem;
		font-size: 1.05rem;
		font-weight: 650;
	}
	.choices {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.choice {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.7rem 0.9rem;
		border: 1px solid var(--panel-line);
		border-radius: 12px;
		background: rgba(140, 170, 220, 0.05);
		font-family: inherit;
		color: rgba(238, 240, 245, 0.75);
		cursor: pointer;
		text-align: left;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.choice:hover {
		border-color: rgba(213, 178, 94, 0.4);
	}
	.choice.on {
		border-color: rgba(213, 178, 94, 0.6);
		background: rgba(213, 178, 94, 0.1);
		color: var(--ink);
	}
	.c-sigil {
		width: 1.8rem;
		height: 1.8rem;
		color: var(--fc, var(--gold));
	}
	.c-sigil.deck {
		display: grid;
		place-items: center;
		font-size: 1.3rem;
		color: var(--gold);
	}
	.c-name {
		display: flex;
		flex-direction: column;
		font-weight: 600;
		font-size: 0.95rem;
	}
	.c-name small {
		font-weight: 450;
		font-size: 0.72rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.terrainbtn {
		margin-left: 0.6rem;
		padding: 0.7rem 1.4rem;
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		color: rgba(242, 240, 234, 0.8);
		background: rgba(140, 170, 220, 0.1);
		border: 1px solid var(--panel-line);
		border-radius: 999px;
		cursor: pointer;
	}
	.terrainbtn:hover {
		color: var(--ink);
		border-color: rgba(213, 178, 94, 0.5);
	}
	.startbtn {
		margin-top: 1.2rem;
		width: 100%;
		padding: 0.85rem 1.4rem;
		border: none;
		border-radius: 999px;
		background: var(--cream);
		color: #171b10;
		font-family: inherit;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 0 22px rgba(213, 178, 94, 0.3);
	}
	.startbtn:hover {
		background: #f7edd6;
	}
	.note {
		margin: 1rem 0 0;
		font-size: 0.82rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.note a {
		color: var(--gold);
	}

	/* ============ plateau ============ */
	.duel {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - 5.9rem);
		padding: 0.6rem 5.5rem 0.4rem;
		margin: 0 -2rem;
		box-sizing: border-box;
		/* le champ : pierre sombre bordée d'or, façon LoR en nuit Expelled */
		background:
			radial-gradient(70% 60% at 50% 50%, rgba(34, 56, 40, 0.34), transparent 75%),
			radial-gradient(90% 80% at 50% -10%, rgba(24, 42, 84, 0.4), transparent 60%);
	}

	/* rails */
	.rail-left,
	.rail-right {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.2rem;
		width: 5rem;
		z-index: 5;
	}
	.rail-left {
		left: 0.4rem;
	}
	.rail-right {
		right: 0.4rem;
	}

	.gem {
		position: relative;
		display: grid;
		place-items: center;
		width: 3.6rem;
		height: 3.6rem;
		border: none;
		background: none;
		cursor: default;
		filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6));
	}
	.gem i {
		position: absolute;
		inset: 0;
		border-radius: 32% 68% 55% 45% / 40% 45% 55% 60%;
		border: 2px solid rgba(255, 255, 255, 0.25);
	}
	.gem.foe i {
		background: radial-gradient(circle at 35% 30%, #ff8f8f, #c22333 55%, #6c0f1c);
	}
	.gem.mine i {
		background: radial-gradient(circle at 35% 30%, #9fc4ff, #2b62c2 55%, #123063);
	}
	.gem b {
		position: relative;
		font-family: Cinzel, Georgia, serif;
		font-size: 1.15rem;
		color: #fff;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
	}
	.gem.targetable {
		cursor: crosshair;
	}
	.gem.targetable i {
		box-shadow: 0 0 0 3px rgba(255, 120, 90, 0.8), 0 0 24px rgba(255, 120, 90, 0.7);
		animation: pulse-t 1s ease-in-out infinite;
	}
	.midline-orb {
		width: 0.9rem;
		height: 0.9rem;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #f2d98a, #a97f2c);
	}
	.logbtn {
		margin-top: 0.8rem;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 10px;
		border: 1px solid var(--panel-line);
		background: var(--panel);
		color: rgba(238, 240, 245, 0.7);
		cursor: pointer;
	}
	.logbtn.on {
		border-color: rgba(213, 178, 94, 0.6);
		color: var(--gold);
	}

	.passbtn {
		width: 5rem;
		height: 5rem;
		border-radius: 50%;
		border: 3px solid rgba(213, 178, 94, 0.65);
		background: radial-gradient(circle at 35% 30%, #3f76d4, #1c3f88 60%, #0d2250);
		color: #fff;
		font-family: inherit;
		font-size: 0.82rem;
		font-weight: 700;
		line-height: 1.15;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		cursor: pointer;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55), inset 0 2px 6px rgba(255, 255, 255, 0.25);
		transition: filter 0.15s ease;
	}
	.passbtn:hover:not(:disabled) {
		filter: brightness(1.15);
	}
	.passbtn:disabled {
		filter: grayscale(0.6) brightness(0.7);
		cursor: default;
	}
	.willbox {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-variant-numeric: tabular-nums;
		color: rgba(238, 240, 245, 0.75);
	}
	.willbox b {
		font-size: 1.05rem;
		color: var(--gold);
	}
	.willbox small {
		font-size: 0.7rem;
		color: rgba(238, 240, 245, 0.4);
	}
	.pips {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 3px;
		max-width: 4.4rem;
		margin-top: 0.4rem;
	}
	.pips i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(140, 170, 220, 0.2);
	}
	.pips i.full {
		background: radial-gradient(circle at 35% 30%, #f2d98a, #c9a445);
	}

	/* bandeau adverse */
	.foehead {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.2rem;
		padding: 0.2rem 0 0.5rem;
	}
	.foe-id {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: color-mix(in srgb, var(--fc) 70%, #fff);
	}
	.foe-id :global(svg) {
		width: 1.2rem;
		height: 1.2rem;
	}
	.foe-hand {
		display: flex;
		gap: 0.2rem;
	}
	.back {
		display: grid;
		place-items: center;
		width: 1.7rem;
		height: 2.4rem;
		border-radius: 4px;
		background: linear-gradient(160deg, #10182c, #0a101f);
		border: 1px solid rgba(213, 178, 94, 0.35);
	}
	.back img {
		width: 1.1rem;
		opacity: 0.8;
	}
	.foe-deck {
		font-size: 0.72rem;
		color: rgba(238, 240, 245, 0.4);
		font-variant-numeric: tabular-nums;
	}

	/* lanes */
	.lane {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.1rem;
		flex-wrap: wrap;
		padding: 0.7rem 0;
		min-height: 13rem;
	}
	.lane-empty {
		color: rgba(238, 240, 245, 0.18);
		font-size: 1.4rem;
	}
	.centerline {
		position: relative;
		height: 2px;
		margin: 0 1rem;
		background: linear-gradient(90deg, transparent, #c9a445 12%, #f2d98a 50%, #c9a445 88%, transparent);
	}
	.centerline i {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 1.1rem;
		height: 1.1rem;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #f2d98a, #a97f2c);
		box-shadow: 0 0 14px rgba(213, 178, 94, 0.6);
	}

	/* unités : les vraies cartes, avec stats vivantes en médaillons */
	.unitwrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}
	.slot {
		position: relative;
		padding: 0;
		border: none;
		background: none;
		font-family: inherit;
		cursor: default;
		border-radius: 12px;
		--card-w: clamp(122px, 17vh, 168px);
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease,
			filter 0.15s ease;
	}
	.slot.locked {
		filter: grayscale(0.7) brightness(0.7);
	}
	/* médaillons de stats vivantes (buffs et dégâts inclus) */
	.ov-atk,
	.ov-hp {
		position: absolute;
		bottom: -0.45rem;
		z-index: 6;
		display: grid;
		place-items: center;
		min-width: 1.7rem;
		height: 1.7rem;
		padding: 0 0.25rem;
		border-radius: 50%;
		border: 1.5px solid rgba(255, 255, 255, 0.35);
		font-size: 0.9rem;
		font-weight: 750;
		font-variant-numeric: tabular-nums;
		color: #fff;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.55);
	}
	.ov-atk {
		left: -0.35rem;
		background: radial-gradient(circle at 35% 30%, #f0b45a, #b06a12);
	}
	.ov-hp {
		right: -0.35rem;
		background: radial-gradient(circle at 35% 30%, #e86a6a, #8f1d1d);
	}
	.ov-hp.hurt {
		box-shadow: 0 0 0 2px #ff9d9d, 0 3px 8px rgba(0, 0, 0, 0.55);
	}
	.ov-tag {
		position: absolute;
		top: -0.45rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 6;
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		background: linear-gradient(180deg, #f0d68a, #c9a445);
		color: #171b10;
		font-size: 0.62rem;
		font-weight: 700;
		white-space: nowrap;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
	}
	.ov-lock {
		position: absolute;
		top: -0.35rem;
		right: -0.2rem;
		z-index: 6;
		font-size: 1rem;
		filter: drop-shadow(0 1px 2px #000);
	}
	.ov-elan {
		position: absolute;
		top: -0.35rem;
		left: -0.2rem;
		z-index: 6;
		font-size: 0.95rem;
		filter: drop-shadow(0 1px 2px #000);
	}
	/* les états d'action : anneaux autour de la vraie carte */
	.slot.mine.ready {
		cursor: pointer;
		box-shadow: 0 0 0 2.5px rgba(120, 220, 140, 0.75), 0 0 20px rgba(120, 220, 140, 0.35);
	}
	.slot.mine.selected {
		transform: translateY(-8px);
		box-shadow: 0 0 0 3px rgba(242, 217, 138, 0.9), 0 0 28px rgba(213, 178, 94, 0.65);
	}
	.slot.targetable {
		cursor: crosshair;
		box-shadow: 0 0 0 3px rgba(255, 120, 90, 0.7), 0 0 24px rgba(255, 120, 90, 0.55);
		animation: pulse-t 1s ease-in-out infinite;
	}
	@keyframes pulse-t {
		0%,
		100% {
			filter: brightness(1);
		}
		50% {
			filter: brightness(1.25);
		}
	}
	.pronbtn {
		padding: 0.2rem 0.7rem;
		border: 1px solid rgba(213, 178, 94, 0.6);
		border-radius: 999px;
		background: rgba(213, 178, 94, 0.12);
		color: var(--gold);
		font-family: inherit;
		font-size: 0.68rem;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
	}
	.pronbtn:hover {
		background: rgba(213, 178, 94, 0.25);
	}

	/* main : les vraies cartes en éventail */
	.hand {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		padding: 1rem 0 0.5rem;
		min-height: 15.5rem;
	}
	.hslot {
		position: relative;
		padding: 0;
		border: none;
		background: none;
		font-family: inherit;
		margin: 0 -1.1rem;
		border-radius: 12px;
		--card-w: clamp(140px, 21vh, 190px);
		touch-action: none;
		cursor: zoom-in;
		transform: rotate(calc(var(--i) * 2.6deg)) translateY(calc(var(--i) * var(--i) * 3px));
		transform-origin: bottom center;
		transition:
			transform 0.18s ease,
			box-shadow 0.18s ease,
			filter 0.18s ease;
	}
	.hslot.unplayable {
		filter: grayscale(0.55) brightness(0.6);
	}
	.hslot.playable {
		cursor: grab;
		box-shadow: 0 0 0 2px rgba(120, 200, 255, 0.55), 0 0 18px rgba(120, 200, 255, 0.3);
	}
	.hslot.playable:hover:not(.dragging) {
		transform: rotate(0deg) translateY(-3.2rem) scale(1.32);
		z-index: 10;
		box-shadow: 0 18px 44px rgba(0, 0, 0, 0.65), 0 0 22px rgba(120, 200, 255, 0.45);
	}
	/* la carte suit le curseur pendant le glisser */
	.hslot.dragging {
		cursor: grabbing;
		z-index: 20;
		transition: box-shadow 0.18s ease;
		transform: translate(var(--dx), var(--dy)) rotate(0deg) scale(1.12);
		box-shadow: 0 24px 50px rgba(0, 0, 0, 0.7), 0 0 26px rgba(120, 200, 255, 0.5);
	}
	.handhint {
		margin: 0.2rem 0 0;
		text-align: center;
		font-size: 0.7rem;
		letter-spacing: 0.06em;
		color: rgba(238, 240, 245, 0.32);
	}
	/* zone de dépôt pendant le drag */
	.my-lane.dropready {
		outline: 2px dashed rgba(213, 178, 94, 0.55);
		outline-offset: -6px;
		border-radius: 18px;
		background: radial-gradient(60% 80% at 50% 50%, rgba(213, 178, 94, 0.07), transparent 75%);
	}

	/* l'annonce de phase : bannière centrale qui traverse puis s'efface */
	.phase-banner {
		position: absolute;
		left: 0;
		right: 0;
		top: 43%;
		z-index: 25;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.4rem;
		pointer-events: none;
		animation: pb 1.5s ease forwards;
	}
	.pb-line {
		flex: 1;
		max-width: 240px;
		height: 1.5px;
		background: linear-gradient(90deg, transparent, #f2d98a 70%, #c9a445);
	}
	.pb-line.flip {
		background: linear-gradient(270deg, transparent, #f2d98a 70%, #c9a445);
	}
	.pb-txt {
		text-align: center;
		padding: 0.5rem 1.6rem;
		background: rgba(6, 10, 20, 0.78);
		border: 1px solid rgba(213, 178, 94, 0.35);
		border-radius: 14px;
		backdrop-filter: blur(6px);
	}
	.pb-txt h3 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 600;
		font-size: clamp(1.2rem, 2.6vw, 1.9rem);
		letter-spacing: 0.12em;
		color: #f5f0dd;
		text-shadow: 0 0 24px rgba(213, 178, 94, 0.45);
		white-space: nowrap;
	}
	.pb-txt p {
		margin: 0.15rem 0 0;
		font-size: 0.74rem;
		color: rgba(238, 240, 245, 0.55);
		white-space: nowrap;
	}
	@keyframes pb {
		0% {
			opacity: 0;
			transform: translateY(12px) scale(0.97);
		}
		12% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		78% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateY(-8px);
		}
	}

	/* la loupe */
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
	}
	.zoom-card {
		position: relative;
		--card-w: min(440px, 88vw, 58vh);
		animation: zpop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
	}
	.zoom-close:hover {
		border-color: rgba(213, 178, 94, 0.6);
		color: #fff;
	}
	@keyframes zpop {
		from {
			opacity: 0;
			transform: scale(0.9) translateY(14px);
		}
	}
	/* chip de coût réduit (Tours de grammaire, Moren…) */
	.ov-cost {
		position: absolute;
		top: -0.4rem;
		left: -0.4rem;
		z-index: 6;
		display: grid;
		place-items: center;
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #9fe0a8, #1f7a3a);
		border: 1.5px solid rgba(255, 255, 255, 0.45);
		color: #fff;
		font-size: 0.9rem;
		font-weight: 750;
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.55);
	}

	/* fil + journal + fin */
	.flash {
		position: absolute;
		left: 50%;
		bottom: 16.6rem;
		transform: translateX(-50%);
		margin: 0;
		max-width: 70%;
		padding: 0.3rem 1rem;
		border-radius: 999px;
		background: rgba(7, 12, 24, 0.8);
		border: 1px solid var(--panel-line);
		font-size: 0.78rem;
		color: rgba(238, 240, 245, 0.8);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		pointer-events: none;
	}
	.log {
		position: absolute;
		left: 5.4rem;
		top: 1rem;
		bottom: 1rem;
		width: min(300px, 40vw);
		overflow-y: auto;
		padding: 0.9rem 1rem;
		background: rgba(7, 12, 24, 0.88);
		border: 1px solid var(--panel-line);
		border-radius: 14px;
		backdrop-filter: blur(10px);
		z-index: 20;
	}
	.log p {
		margin: 0 0 0.45rem;
		font-size: 0.74rem;
		line-height: 1.35;
		color: rgba(238, 240, 245, 0.7);
	}
	.endveil {
		position: absolute;
		inset: 0;
		z-index: 30;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		background: rgba(4, 7, 14, 0.86);
		backdrop-filter: blur(8px);
		text-align: center;
	}
	.endveil img {
		width: 5.4rem;
		filter: drop-shadow(0 0 20px rgba(213, 178, 94, 0.5));
	}
	.endveil h2 {
		margin: 0.6rem 0 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 400;
		font-size: clamp(1.6rem, 4vw, 2.6rem);
	}
	.endveil p {
		margin: 0;
		color: rgba(238, 240, 245, 0.6);
	}
	.endveil .gain {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.4rem;
		font-size: 1.05rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: #d5b25e;
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
	.endveil .startbtn {
		width: auto;
		margin-top: 1.2rem;
		padding: 0.7rem 2.2rem;
	}

	@media (max-width: 760px) {
		.duel {
			padding: 0.6rem 3.4rem 0.4rem;
		}
		.slot {
			--card-w: clamp(96px, 13vh, 128px);
		}
		.hslot {
			--card-w: clamp(108px, 16vh, 150px);
			margin: 0 -1.4rem;
		}
	}
</style>
