<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import FactionSigil from '$lib/FactionSigil.svelte';
	import { charter } from '$lib/charter';
	import { cards, getCard } from '$lib/cards';
	import { simulate, buildDeck, MAX_COPIES, type Ev } from '$lib/game/engine';
	import { META_DECKS } from '$lib/metadecks';
	import { loadDecks, type Deck } from '$lib/decks';
	import type { CardData, FactionId } from '$lib/types';

	/* ---- configuration du duel : les modulations du Laboratoire ---- */
	let srcA = $state('auto-vasar');
	let srcB = $state('auto-exar');
	let forceA = $state(''); // carte imposée au camp A ('' = aucune)
	let forceB = $state('');
	let forceNA = $state(2); // copies imposées
	let forceNB = $state(2);
	let games = $state(100); // taille du lot statistique
	let seedInput = $state(''); // graine fixe ('' = aléatoire)
	/* Rythme de relecture, en ms par événement.
	   420 ms enchaînait trop vite pour suivre ce qui se passe : on voyait le
	   résultat, pas la partie. 700 ms laisse le temps de lire chaque ligne sans
	   que le match s'éternise — les moments forts respirent encore plus. */
	let speed = $state(700);

	let myDecks = $state<Deck[]>([]);
	onMount(() => {
		myDecks = loadDecks().filter((d) => Object.values(d.cards).reduce((a, b) => a + b, 0) === 30);
	});

	const CARD_OPTIONS = [...cards].sort(
		(a, b) => a.faction.localeCompare(b.faction) || a.cost - b.cost || a.name.localeCompare(b.name)
	);

	/* petit générateur déterministe pour matérialiser les decks auto côté page */
	function lcg(seed: number) {
		let s = seed >>> 0 || 1;
		return () => {
			s = (s * 1664525 + 1013904223) >>> 0;
			return s / 4294967296;
		};
	}

	function expand(rec: Record<string, number>): CardData[] {
		const list: CardData[] = [];
		for (const [id, n] of Object.entries(rec)) {
			const c = getCard(id);
			if (c) for (let i = 0; i < n; i++) list.push(c);
		}
		return list;
	}
	function dominant(list: CardData[]): FactionId {
		const count: Partial<Record<FactionId, number>> = {};
		for (const c of list) count[c.faction] = (count[c.faction] ?? 0) + 1;
		return (Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'vasar') as FactionId;
	}

	/** Construit le deck d'un camp selon la source + la carte imposée. */
	function sideDeck(
		src: string,
		forcedId: string,
		forcedN: number,
		rng: () => number
	): { list: CardData[] | null; faction: FactionId } {
		let list: CardData[] | null = null;
		let faction: FactionId = 'vasar';
		if (src.startsWith('auto-')) {
			faction = src.slice(5) as FactionId;
		} else if (src.startsWith('meta-')) {
			const d = META_DECKS.find((x) => x.id === src.slice(5));
			if (d) {
				list = expand(d.cards);
				faction = d.faction;
			}
		} else if (src.startsWith('user-')) {
			const d = myDecks.find((x) => x.id === src.slice(5));
			if (d) {
				list = expand(d.cards);
				faction = dominant(list);
			}
		}
		const target = forcedId ? getCard(forcedId) : undefined;
		if (target) {
			if (!list) list = buildDeck(cards, faction, rng);
			const want = Math.min(forcedN, MAX_COPIES[target.rarity] ?? 1);
			let have = list.filter((c) => c.id === target.id).length;
			for (let i = list.length - 1; i >= 0 && have < want; i--) {
				if (list[i].id !== target.id) {
					list.splice(i, 1);
					list.push(target);
					have++;
				}
			}
		}
		return { list, faction };
	}

	function seedOf(offset = 0): number {
		const n = parseInt(seedInput, 10);
		return (Number.isFinite(n) ? n : Math.floor(Math.random() * 1e9)) + offset;
	}

	function sideLabel(src: string): string {
		if (src.startsWith('auto-'))
			return `${charter.factions[src.slice(5) as FactionId]?.name ?? src} (auto)`;
		if (src.startsWith('meta-')) return META_DECKS.find((d) => d.id === src.slice(5))?.name ?? src;
		return myDecks.find((d) => d.id === src.slice(5))?.name ?? src;
	}
	function sideFaction(src: string): FactionId {
		if (src.startsWith('auto-')) return src.slice(5) as FactionId;
		if (src.startsWith('meta-'))
			return META_DECKS.find((d) => d.id === src.slice(5))?.faction ?? 'vasar';
		const d = myDecks.find((x) => x.id === src.slice(5));
		return d ? dominant(expand(d.cards)) : 'vasar';
	}

	/* ---- état du replay ---- */
	let events: Ev[] = $state([]);
	let cursor = $state(-1);
	let running = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const current = $derived(cursor >= 0 ? events[cursor] : undefined);
	const boardState = $derived(current?.state);
	const finished = $derived(cursor >= events.length - 1 && events.length > 0);

	function launch() {
		pause();
		const seed = seedOf();
		const a = sideDeck(srcA, forceA, forceNA, lcg(seed));
		const b = sideDeck(srcB, forceB, forceNB, lcg(seed ^ 0x9e3779b9));
		const sim = simulate(cards, a.faction, b.faction, seed, [a.list, b.list]);
		events = sim.events;
		cursor = 0;
		running = true;
		tick();
	}
	function tick() {
		clearTimeout(timer);
		if (!running) return;
		if (cursor >= events.length - 1) {
			running = false;
			return;
		}
		timer = setTimeout(() => {
			cursor += 1;
			tick();
		}, speedFor(events[cursor + 1]));
	}
	function speedFor(e: Ev | undefined): number {
		if (!e) return speed;
		// les moments forts respirent, la pioche file
		if (e.t === 'attack' || e.t === 'prononcer' || e.t === 'win') return speed * 1.8;
		// une pause franche au changement de tour : c'est le repère qui manquait
		// le plus pour suivre le déroulé
		if (e.t === 'turn') return speed * 1.5;
		if (e.t === 'draw' || e.t === 'heal') return speed * 0.55;
		return speed;
	}
	function pause() {
		running = false;
		clearTimeout(timer);
	}
	function resume() {
		if (events.length === 0 || finished) return;
		running = true;
		tick();
	}
	function step() {
		pause();
		if (cursor < events.length - 1) cursor += 1;
	}
	onDestroy(() => clearTimeout(timer));

	/* ---- journal : les derniers événements ---- */
	const log = $derived(events.slice(Math.max(0, cursor - 18), cursor + 1));

	/* ---- mode batch : la statistique d'équilibrage ---- */
	interface Batch {
		games: number;
		wins: [number, number];
		draws: number;
		avgTurns: number;
		cardRows: { id: string; name: string; faction: string; plays: number; winrate: number }[];
	}
	let batch: Batch | null = $state(null);
	let batching = $state(false);

	async function runBatch(n = games) {
		pause();
		batching = true;
		batch = null;
		const wins: [number, number] = [0, 0];
		let draws = 0;
		let turns = 0;
		const base = seedOf();
		const plays = new Map<string, { plays: number; wins: number }>();
		for (let i = 0; i < n; i++) {
			const gs = base + i * 7919 + 13;
			const a = sideDeck(srcA, forceA, forceNA, lcg(gs));
			const b = sideDeck(srcB, forceB, forceNB, lcg(gs ^ 0x9e3779b9));
			const sim = simulate(cards, a.faction, b.faction, gs, [a.list, b.list]);
			if (sim.winner === -1) draws += 1;
			else wins[sim.winner] += 1;
			turns += sim.turns;
			for (const side of [0, 1] as const) {
				for (const [id, count] of Object.entries(sim.played[side])) {
					const rec = plays.get(id) ?? { plays: 0, wins: 0 };
					rec.plays += count;
					if (sim.winner === side) rec.wins += count;
					plays.set(id, rec);
				}
			}
			if (i % 10 === 9) await new Promise((r) => setTimeout(r)); // laisse respirer l'UI
		}
		batch = {
			games: n,
			wins,
			draws,
			avgTurns: turns / n,
			cardRows: [...plays.entries()]
				.filter(([, r]) => r.plays >= 5)
				.map(([id, r]) => ({
					id,
					name: getCard(id)?.name ?? id,
					faction: getCard(id)?.faction ?? '',
					plays: r.plays,
					winrate: r.wins / r.plays
				}))
				.sort((a, b) => b.winrate - a.winrate)
		};
		batching = false;
	}

	const FACTIONS: FactionId[] = ['vasar', 'exar'];
	const SIDES = [1, 0] as const; // camp B en haut, camp A en bas
	const fcolor = (f: string) => charter.factions[f as FactionId]?.color ?? '#8892a6';
	const artOf = (id: string) => getCard(id)?.art ?? '';
	const artPosOf = (id: string) => getCard(id)?.artPosition ?? 'center 12%';
</script>

<svelte:head>
	<title>Arène — {charter.game.name}</title>
	<meta name="description" content="IA contre IA : le set se teste en duel réel." />
</svelte:head>

<header class="hero">
	<p class="kicker"><span class="k-diamond">◯</span> Le Laboratoire</p>
	<h1>IA contre IA</h1>
	<p class="tagline">
		Deux IA jouent le set en duel réel — règles v1, tout le set, effets compris. Modulez les
		decks, imposez une carte à tester, fixez la graine, puis regardez un duel en direct ou lancez
		un lot de parties pour mesurer son taux de victoire.
	</p>
</header>

<!-- ============ CONTRÔLES ============ -->
<section class="controls">
	<div class="pick">
		{#each [0, 1] as sideIdx (sideIdx)}
			<div class="sidecfg">
				<span class="sidename">Camp {sideIdx === 0 ? 'A' : 'B'}</span>
				<label>
					<span>Deck</span>
					{#if sideIdx === 0}
						<select bind:value={srcA}>
							<optgroup label="Automatiques">
								{#each FACTIONS as f (f)}<option value="auto-{f}">{charter.factions[f].name} (auto)</option>{/each}
							</optgroup>
							<optgroup label="Decks recommandés">
								{#each META_DECKS as d (d.id)}<option value="meta-{d.id}">{d.name}</option>{/each}
							</optgroup>
							{#if myDecks.length > 0}
								<optgroup label="Vos decks">
									{#each myDecks as d (d.id)}<option value="user-{d.id}">{d.name}</option>{/each}
								</optgroup>
							{/if}
						</select>
					{:else}
						<select bind:value={srcB}>
							<optgroup label="Automatiques">
								{#each FACTIONS as f (f)}<option value="auto-{f}">{charter.factions[f].name} (auto)</option>{/each}
							</optgroup>
							<optgroup label="Decks recommandés">
								{#each META_DECKS as d (d.id)}<option value="meta-{d.id}">{d.name}</option>{/each}
							</optgroup>
							{#if myDecks.length > 0}
								<optgroup label="Vos decks">
									{#each myDecks as d (d.id)}<option value="user-{d.id}">{d.name}</option>{/each}
								</optgroup>
							{/if}
						</select>
					{/if}
				</label>
				<label>
					<span>Carte à tester</span>
					{#if sideIdx === 0}
						<select bind:value={forceA}>
							<option value="">— aucune —</option>
							{#each CARD_OPTIONS as c (c.id)}
								<option value={c.id}>{charter.factions[c.faction].name} · {c.cost} · {c.name}</option>
							{/each}
						</select>
					{:else}
						<select bind:value={forceB}>
							<option value="">— aucune —</option>
							{#each CARD_OPTIONS as c (c.id)}
								<option value={c.id}>{charter.factions[c.faction].name} · {c.cost} · {c.name}</option>
							{/each}
						</select>
					{/if}
				</label>
				<label class="copies">
					<span>Copies</span>
					{#if sideIdx === 0}
						<select bind:value={forceNA} disabled={!forceA}>
							{#each [1, 2, 3] as n (n)}<option value={n}>{n}</option>{/each}
						</select>
					{:else}
						<select bind:value={forceNB} disabled={!forceB}>
							{#each [1, 2, 3] as n (n)}<option value={n}>{n}</option>{/each}
						</select>
					{/if}
				</label>
			</div>
		{/each}
	</div>
	<div class="actions">
		<button class="primary" onclick={launch}>⚔ Lancer un duel</button>
		{#if events.length > 0 && !finished}
			{#if running}<button class="ghost" onclick={pause}>Pause</button>
			{:else}<button class="ghost" onclick={resume}>Reprendre</button>{/if}
			<button class="ghost" onclick={step}>Pas à pas</button>
		{/if}
		<label class="speedctl">
			<span>Rythme</span>
			<!-- plus de direction: rtl — un curseur qui va à l'envers ne se devine
			     pas. Ici : à gauche ça défile, à droite ça se laisse suivre. -->
			<input type="range" min="200" max="1600" step="50" bind:value={speed} />
			<small class="speedval">{(speed / 1000).toFixed(2).replace('.', ',')} s</small>
		</label>
		<label class="gamesctl">
			<span>Lot</span>
			<select bind:value={games}>
				{#each [20, 50, 100, 200, 500] as n (n)}<option value={n}>{n} parties</option>{/each}
			</select>
		</label>
		<label class="seedctl">
			<span>Graine</span>
			<input type="text" bind:value={seedInput} placeholder="aléatoire" inputmode="numeric" />
		</label>
		<button class="ghost" onclick={() => runBatch(games)} disabled={batching}>
			{batching ? 'Simulation…' : `☍ Lancer ${games} parties`}
		</button>
	</div>
</section>

<!-- ============ LA TABLE DE DUEL ============ -->
{#if boardState}
	<section class="table" class:over={finished}>
		<div class="mat">
			<div class="mat-ring" aria-hidden="true"></div>
			<div class="midline" aria-hidden="true"></div>

			{#each SIDES as side (side)}
				{@const p = boardState[side]}
				{@const isTop = side === 1}
				{@const active = current?.side === side}
				{@const korumHit = current?.targetKorum === true && current?.t === 'hit' && current?.side === side}
				<div class="half" class:top={isTop} class:active style="--fc: {fcolor(p.faction)}">
					<!-- rail identité : médaillon du Korum, Volonté, nom -->
					<div class="idrail">
						<div class="medallion" class:hurt={korumHit}>
							<span class="msigil"><FactionSigil faction={p.faction} /></span>
							<b class="mval">{Math.max(0, p.korum)}</b>
							<svg class="mgauge" viewBox="0 0 40 40" aria-hidden="true">
								<circle cx="20" cy="20" r="17.5" pathLength="100" class="mtrack" />
								<circle
									cx="20"
									cy="20"
									r="17.5"
									pathLength="100"
									class="mfill"
									style="stroke-dasharray: {Math.max(0, (p.korum / 25) * 100)} 100"
								/>
							</svg>
						</div>
						<div class="will" title="Volonté {p.will}/{p.maxWill}">
							{#each Array(p.maxWill) as _, i (i)}<i class:on={i < p.will}></i>{/each}
						</div>
						<span class="pname">{p.name}</span>
					</div>

					<!-- champ de bataille : les vraies cartes -->
					<div class="field">
						{#each p.board as u (u.uid)}
							<div
								class="bcard"
								class:acting={current?.uid === u.uid}
								class:targeted={current?.targetUid === u.uid}
								class:asleep={!u.canAct && !u.locked}
								class:locked={u.locked}
								class:token={u.token}
								style="--uc: {fcolor(u.faction)}"
								title={getCard(u.cardId)?.text || u.name}
							>
								{#if artOf(u.cardId)}
									<img
										class="bart"
										src={artOf(u.cardId)}
										alt=""
										style="object-position: {artPosOf(u.cardId)}"
										draggable="false"
									/>
								{:else}
									<div class="tokenface"><FactionSigil faction={u.faction} /></div>
								{/if}
								<div class="bscrim" aria-hidden="true"></div>
								<span class="bcost">{u.cost}</span>
								<span class="bname">{u.name}</span>
								<span class="bstat batk">{u.atk}</span>
								<span class="bstat bhp">{u.hp}</span>
								<span class="btags">
									{#if u.serment}<em title="Serment">⛨</em>{/if}
									{#if u.elan}<em title="Élan">»</em>{/if}
								</span>
								{#if u.locked}<span class="bchains" title="Neutralisé / enchaîné">⛓</span>{/if}
							</div>
						{:else}
							<span class="emptyfield">—</span>
						{/each}
					</div>

					<!-- rail des piles : deck, défausse, exil, Lieux & Reliques -->
					<div class="piles">
						<div class="pile" title="Deck">
							<img src="/card-back.webp" alt="" draggable="false" />
							<b>{p.deck}</b>
						</div>
						<div class="pile flat" title="Défausse"><b>{p.discard}</b><span>déf.</span></div>
						{#if p.exile > 0}
							<div class="pile flat exiled" title="Exil"><b>{p.exile}</b><span>exil</span></div>
						{/if}
						{#each p.supports as s, i (i)}
							<div class="plaque" title={getCard(s.cardId)?.text || s.name}>{s.name}</div>
						{/each}
					</div>

					<!-- la main : un éventail de dos -->
					<div class="hand" style="--n: {p.hand}">
						{#each Array(p.hand) as _, i (i)}
							<img class="hback" src="/card-back.webp" alt="" style="--i: {i}" draggable="false" />
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<aside class="journal">
			<h3>Journal du duel</h3>
			<div class="jscroll">
				{#each log as e, i (cursor - log.length + 1 + i)}
					<p
						class="lentry"
						class:latest={i === log.length - 1}
						class:major={e.t === 'attack' || e.t === 'prononcer' || e.t === 'death' || e.t === 'win' || e.t === 'turn'}
						style="--lc: {fcolor(boardState[e.side].faction)}"
					>
						{e.msg}
					</p>
				{/each}
			</div>
		</aside>
	</section>
{:else}
	<section class="table empty">
		<p>Choisis les camps et lance un duel — les IA jouent, tu regardes.</p>
	</section>
{/if}

<!-- ============ STATS D'ÉQUILIBRAGE ============ -->
{#if batch}
	<section class="stats">
		<h2><span class="tab">Verdict sur {batch.games} parties</span><span class="rule"></span></h2>
		<div class="verdict">
			<div class="vcard" style="--fc: {fcolor(sideFaction(srcA))}">
				<span class="vname">{sideLabel(srcA)} (A)</span>
				<span class="vpct">{Math.round((batch.wins[0] / batch.games) * 100)}%</span>
				<span class="vsub">{batch.wins[0]} victoires</span>
			</div>
			<div class="vcard" style="--fc: {fcolor(sideFaction(srcB))}">
				<span class="vname">{sideLabel(srcB)} (B)</span>
				<span class="vpct">{Math.round((batch.wins[1] / batch.games) * 100)}%</span>
				<span class="vsub">{batch.wins[1]} victoires</span>
			</div>
			<div class="vcard">
				<span class="vname">Durée moyenne</span>
				<span class="vpct">{batch.avgTurns.toFixed(1)}</span>
				<span class="vsub">tours · {batch.draws} nulle{batch.draws > 1 ? 's' : ''}</span>
			</div>
		</div>
		<h3>Winrate quand la carte est jouée <small>(≥ 5 apparitions — les extrêmes désignent les cartes à retoucher)</small></h3>
		<div class="cardstats">
			{#each batch.cardRows as row (row.id)}
				<a
					class="crow"
					class:forced={row.id === forceA || row.id === forceB}
					href="/card/{row.id.replace(/--.*$/, '')}"
					style="--fc: {fcolor(row.faction)}"
				>
					<span class="cname"
						>{row.name}{#if row.id === forceA || row.id === forceB}
							<em class="ftesttag">testée</em>{/if}</span
					>
					<span class="cbar"><span style="width: {row.winrate * 100}%"></span></span>
					<span class="cpct">{Math.round(row.winrate * 100)}%</span>
					<span class="cplays">×{row.plays}</span>
				</a>
			{/each}
		</div>
	</section>
{/if}

<style>
	.hero { margin: 4rem 0 2.4rem; }
	.kicker {
		display: flex; align-items: center; gap: 0.55rem; margin: 0 0 1rem;
		font-size: 0.78rem; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase;
		color: rgba(242, 240, 234, 0.4);
	}
	.k-diamond { color: #c9a445; font-size: 0.75em; }
	h1 { margin: 0; font-weight: 800; font-size: clamp(2.8rem, 6.5vw, 4.6rem); letter-spacing: -0.03em; line-height: 1; }
	.tagline { margin: 1.2rem 0 0; max-width: 60ch; font-size: 1.05rem; line-height: 1.6; color: rgba(242, 240, 234, 0.55); }

	/* ---------- contrôles ---------- */
	.controls {
		display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem;
		margin-bottom: 1.6rem; padding: 1rem 1.4rem;
		background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px;
	}
	.pick { display: flex; align-items: stretch; gap: 0.9rem; flex-wrap: wrap; }
	.sidecfg {
		display: flex; align-items: flex-end; gap: 0.7rem; flex-wrap: wrap;
		padding: 0.8rem 1rem; border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px; background: rgba(255, 255, 255, 0.025);
	}
	.sidename {
		align-self: center; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.2em;
		text-transform: uppercase; color: #c9a445; writing-mode: vertical-rl; rotate: 180deg;
	}
	.copies select { min-width: 3.4rem; }
	.gamesctl, .seedctl {
		display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem;
		letter-spacing: 0.12em; text-transform: uppercase; color: rgba(242, 240, 234, 0.45);
	}
	.gamesctl select, .seedctl input {
		font-family: inherit; font-size: 0.85rem; padding: 0.4rem 0.7rem;
		color: #f2f0ea; background: #14161c; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px;
	}
	.seedctl input { width: 7.5rem; }
	.crow.forced { border-color: rgba(213, 178, 94, 0.55) !important; background: rgba(213, 178, 94, 0.07); }
	.ftesttag {
		margin-left: 0.5em; padding: 0.05rem 0.5rem; border-radius: 999px; font-style: normal;
		font-size: 0.66rem; font-weight: 700; color: #171b10;
		background: linear-gradient(180deg, #f0d68a, #c9a445);
	}
	.pick label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(242, 240, 234, 0.45); }
	.pick select {
		font-family: inherit; font-size: 0.9rem; padding: 0.45rem 0.8rem;
		color: #f2f0ea; background: #14161c; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px;
	}
	.actions { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; }
	.primary, .ghost {
		font-family: inherit; font-size: 0.88rem; font-weight: 600; padding: 0.6rem 1.2rem;
		border: none; cursor: pointer; border-radius: 999px; transition: background 0.18s ease, color 0.18s ease;
	}
	.primary { color: #0a0a0d; background: #f2f0ea; }
	.primary:hover { background: #c9a445; }
	.ghost { color: rgba(242, 240, 234, 0.65); background: rgba(255, 255, 255, 0.07); }
	.ghost:hover { color: #f2f0ea; background: rgba(255, 255, 255, 0.12); }
	.ghost:disabled { opacity: 0.5; cursor: default; }
	.speedval {
		min-width: 3.2rem;
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		color: rgba(238, 240, 245, 0.5);
	}
	.speedctl { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(242, 240, 234, 0.45); }
	.speedctl input { accent-color: #c9a445; width: 110px; }

	/* ---------- la table ---------- */
	.table {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 1rem;
		margin-bottom: 2.4rem;
		align-items: stretch;
	}
	.table.empty {
		display: block; padding: 3.4rem; text-align: center; color: rgba(242, 240, 234, 0.4);
		background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 20px;
	}

	/* le tapis : matière sombre, l'anneau de KOR gravé au centre */
	.mat {
		position: relative;
		overflow: hidden;
		padding: 0.4rem 1.2rem;
		border-radius: 20px;
		background:
			radial-gradient(90% 70% at 50% 50%, rgba(201, 164, 69, 0.05), transparent 65%),
			radial-gradient(140% 100% at 50% 0%, rgba(20, 24, 34, 0.9), transparent 60%),
			radial-gradient(140% 100% at 50% 100%, rgba(26, 20, 28, 0.9), transparent 60%),
			repeating-linear-gradient(45deg, #101218 0 3px, #0c0e14 3px 6px),
			#0c0e14;
		border: 1px solid rgba(201, 164, 69, 0.14);
		box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.55);
	}
	.mat-ring {
		position: absolute;
		left: 50%;
		top: 50%;
		width: min(46vw, 420px);
		aspect-ratio: 1;
		translate: -50% -50%;
		border-radius: 50%;
		border: 1px solid rgba(201, 164, 69, 0.14);
		box-shadow:
			inset 0 0 0 8px rgba(201, 164, 69, 0.03),
			0 0 0 14px rgba(201, 164, 69, 0.025);
		pointer-events: none;
	}
	.midline {
		position: absolute;
		left: 4%;
		right: 4%;
		top: 50%;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(201, 164, 69, 0.35), transparent);
		pointer-events: none;
	}

	/* une moitié de table : identité | champ | piles, la main en bordure */
	.half {
		position: relative;
		display: grid;
		grid-template-columns: 150px 1fr 150px;
		gap: 1rem;
		align-items: center;
		min-height: 218px;
		padding: 1.5rem 0 1.1rem;
	}
	.half.top { padding: 1.1rem 0 1.5rem; }
	/* le camp actif respire : un souffle de sa couleur monte de son bord */
	.half::before {
		content: '';
		position: absolute;
		left: -1.2rem;
		right: -1.2rem;
		bottom: -0.4rem;
		height: 55%;
		background: linear-gradient(0deg, color-mix(in srgb, var(--fc) 10%, transparent), transparent);
		opacity: 0;
		transition: opacity 0.5s ease;
		pointer-events: none;
	}
	.half.top::before { bottom: auto; top: -0.4rem; background: linear-gradient(180deg, color-mix(in srgb, var(--fc) 10%, transparent), transparent); }
	.half.active::before { opacity: 1; }

	/* ---------- médaillon du Korum ---------- */
	.idrail { display: flex; flex-direction: column; align-items: center; gap: 0.45rem; }
	.medallion {
		position: relative;
		width: 84px;
		height: 84px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--fc) 22%, #171a22), #0d0f15 72%);
		border: 1px solid color-mix(in srgb, var(--fc) 45%, transparent);
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
		transition: box-shadow 0.3s ease;
	}
	.medallion.hurt {
		box-shadow: 0 0 22px rgba(232, 95, 107, 0.55), inset 0 0 12px rgba(232, 95, 107, 0.3);
		animation: quake 0.35s ease;
	}
	@keyframes quake {
		25% { transform: translateX(-3px); }
		50% { transform: translateX(3px); }
		75% { transform: translateX(-2px); }
	}
	.msigil { position: absolute; top: 10px; font-size: 0.85rem; opacity: 0.9; }
	.mval { font-size: 1.65rem; font-weight: 800; margin-top: 0.55rem; font-variant-numeric: tabular-nums; }
	.mgauge { position: absolute; inset: -5px; width: calc(100% + 10px); height: calc(100% + 10px); transform: rotate(-90deg); }
	.mgauge circle { fill: none; stroke-width: 2.4; }
	.mtrack { stroke: rgba(255, 255, 255, 0.07); }
	.mfill { stroke: var(--fc); stroke-linecap: round; transition: stroke-dasharray 0.5s ease; }

	.will { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; max-width: 120px; }
	.will i {
		width: 9px; height: 9px; rotate: 45deg; border-radius: 2px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid color-mix(in srgb, var(--fc) 35%, transparent);
		transition: background 0.3s ease, box-shadow 0.3s ease;
	}
	.will i.on { background: var(--fc); box-shadow: 0 0 6px color-mix(in srgb, var(--fc) 60%, transparent); }
	.pname { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: color-mix(in srgb, var(--fc) 65%, #f2f0ea); }

	/* ---------- champ de bataille : les vraies cartes ---------- */
	.field {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		justify-content: center;
		align-items: center;
		min-height: 150px;
	}
	.emptyfield { color: rgba(242, 240, 234, 0.18); font-size: 1.2rem; }
	.bcard {
		--bw: clamp(86px, 8.4vw, 112px);
		position: relative;
		width: var(--bw);
		aspect-ratio: 63 / 88;
		border-radius: 8px;
		overflow: hidden;
		background: #14161c;
		border: 1px solid color-mix(in srgb, var(--uc) 45%, transparent);
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
		transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease, opacity 0.3s ease, filter 0.3s ease;
	}
	.bcard.token { border-style: dashed; }
	.bcard.asleep { filter: brightness(0.6); }
	.bcard.locked { filter: brightness(0.45) saturate(0.35); }
	/* l'attaquant s'élance vers la ligne de front */
	.half:not(.top) .bcard.acting { transform: translateY(-14px) scale(1.06); }
	.half.top .bcard.acting { transform: translateY(14px) scale(1.06); }
	.bcard.acting { box-shadow: 0 10px 26px color-mix(in srgb, var(--uc) 40%, rgba(0, 0, 0, 0.6)); z-index: 3; }
	.bcard.targeted {
		box-shadow: 0 0 0 2px #e85f6b, 0 0 22px rgba(232, 95, 107, 0.5);
		animation: struck 0.35s ease;
		z-index: 2;
	}
	@keyframes struck {
		30% { transform: translateX(-3px) rotate(-1.2deg); }
		60% { transform: translateX(3px) rotate(1.2deg); }
	}
	.bart { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
	.tokenface {
		position: absolute; inset: 0; display: grid; place-items: center; font-size: 2rem;
		background:
			radial-gradient(80% 60% at 50% 35%, color-mix(in srgb, var(--uc) 18%, transparent), transparent),
			repeating-linear-gradient(45deg, #171a21 0 3px, #12141b 3px 6px);
	}
	.bscrim {
		position: absolute; inset: 0;
		background: linear-gradient(180deg, rgba(5, 6, 9, 0.25) 0%, transparent 26%, transparent 52%, rgba(5, 6, 9, 0.88) 100%);
	}
	.bcost {
		position: absolute; top: 3px; left: 3px; width: 1.15rem; height: 1.15rem;
		display: grid; place-items: center; font-size: 0.66rem; font-weight: 800;
		color: #0a0a0d; background: #e9cf8d; border-radius: 50%;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
	}
	.bname {
		position: absolute; left: 5px; right: 5px; bottom: 1.35rem;
		font-size: 0.56rem; font-weight: 650; line-height: 1.12; letter-spacing: 0.01em;
		text-shadow: 0 1px 2px #000;
		display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
	}
	.bstat {
		position: absolute; bottom: 3px; min-width: 1.15rem; height: 1.15rem;
		display: grid; place-items: center; padding: 0 0.25rem;
		font-size: 0.68rem; font-weight: 800; font-variant-numeric: tabular-nums;
		border-radius: 999px; color: #f2f0ea; background: rgba(10, 11, 15, 0.85);
		border: 1px solid color-mix(in srgb, var(--uc) 55%, transparent);
	}
	.batk { left: 3px; }
	.bhp { right: 3px; }
	.btags { position: absolute; top: 3px; right: 4px; display: flex; gap: 2px; }
	.btags em { font-style: normal; font-size: 0.7rem; color: color-mix(in srgb, var(--uc) 70%, #fff); text-shadow: 0 1px 2px #000; }
	.bchains {
		position: absolute; inset: 0; display: grid; place-items: center;
		font-size: 1.3rem; color: rgba(242, 240, 234, 0.85); text-shadow: 0 1px 4px #000;
		background: rgba(10, 11, 15, 0.35);
	}

	/* ---------- piles ---------- */
	.piles { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
	.pile { position: relative; width: 52px; }
	.pile img {
		width: 100%; border-radius: 5px; display: block;
		box-shadow: 0 2px 0 #0a0b0f, 0 3px 0 #14161c, 0 4px 0 #0a0b0f, 0 6px 10px rgba(0, 0, 0, 0.5);
	}
	.pile b {
		position: absolute; right: -6px; bottom: -6px; min-width: 1.2rem; height: 1.2rem;
		display: grid; place-items: center; padding: 0 0.25rem;
		font-size: 0.66rem; font-weight: 800; color: #0a0a0d; background: #e9cf8d; border-radius: 999px;
	}
	.pile.flat {
		display: flex; align-items: baseline; gap: 0.3rem; width: auto; padding: 0.15rem 0.55rem;
		background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 999px;
	}
	.pile.flat b { position: static; background: none; color: #f2f0ea; min-width: 0; height: auto; font-size: 0.78rem; }
	.pile.flat span { font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(242, 240, 234, 0.4); }
	.pile.exiled { border-color: rgba(141, 108, 184, 0.4); }
	.pile.exiled b { color: #cbb8ff; }
	.plaque {
		max-width: 140px; padding: 0.24rem 0.6rem;
		font-size: 0.6rem; letter-spacing: 0.05em; text-align: center; line-height: 1.2;
		color: color-mix(in srgb, var(--fc) 70%, #fff);
		background: color-mix(in srgb, var(--fc) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--fc) 35%, transparent);
		border-radius: 6px;
	}

	/* ---------- la main : éventail de dos ---------- */
	.hand {
		position: absolute;
		left: 50%;
		bottom: -1.15rem;
		translate: -50% 0;
		display: flex;
		pointer-events: none;
	}
	.half.top .hand { bottom: auto; top: -1.15rem; }
	.hback {
		width: 44px;
		border-radius: 4px;
		margin: 0 -9px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
		transform: rotate(calc((var(--i) - (var(--n) - 1) / 2) * 5deg))
			translateY(calc(max(var(--i) - (var(--n) - 1) / 2, (var(--n) - 1) / 2 - var(--i)) * max(var(--i) - (var(--n) - 1) / 2, (var(--n) - 1) / 2 - var(--i)) * 1.1px));
		transition: transform 0.3s ease;
	}
	.half.top .hback {
		transform: rotate(calc((var(--i) - (var(--n) - 1) / 2) * -5deg))
			translateY(calc(max(var(--i) - (var(--n) - 1) / 2, (var(--n) - 1) / 2 - var(--i)) * max(var(--i) - (var(--n) - 1) / 2, (var(--n) - 1) / 2 - var(--i)) * -1.1px));
	}

	/* ---------- journal ---------- */
	.journal {
		display: flex;
		flex-direction: column;
		padding: 1rem 1.1rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 20px;
		min-height: 0;
	}
	.journal h3 {
		margin: 0 0 0.7rem;
		font-size: 0.68rem; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
		color: rgba(242, 240, 234, 0.4);
	}
	.jscroll {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		overflow: hidden;
		font-size: 0.8rem;
		line-height: 1.45;
	}
	.lentry { margin: 0.12rem 0; color: rgba(242, 240, 234, 0.4); border-left: 2px solid color-mix(in srgb, var(--lc) 50%, transparent); padding-left: 0.65rem; }
	.lentry.major { color: rgba(242, 240, 234, 0.72); }
	.lentry.latest { color: #f2f0ea; }

	/* ---------- stats ---------- */
	.stats { margin-bottom: 3.5rem; }
	.stats h2 { display: flex; align-items: center; gap: 1rem; margin: 0 0 1.2rem; }
	.tab { font-size: 1.15rem; font-weight: 650; white-space: nowrap; }
	.rule { flex: 1; height: 1px; background: rgba(255, 255, 255, 0.07); }
	.verdict { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.6rem; }
	.vcard {
		padding: 1rem 1.2rem; border-radius: 14px;
		background: color-mix(in srgb, var(--fc, #8892a6) 8%, rgba(255, 255, 255, 0.02));
		border: 1px solid color-mix(in srgb, var(--fc, #8892a6) 25%, transparent);
	}
	.vname { display: block; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(242, 240, 234, 0.5); }
	.vpct { display: block; margin-top: 0.2rem; font-size: 1.9rem; font-weight: 800; }
	.vsub { font-size: 0.78rem; color: rgba(242, 240, 234, 0.45); }
	.stats h3 { margin: 0 0 0.8rem; font-size: 0.95rem; font-weight: 600; }
	.stats h3 small { font-weight: 400; color: rgba(242, 240, 234, 0.4); }
	.cardstats { display: flex; flex-direction: column; gap: 0.3rem; }
	.crow {
		display: grid; grid-template-columns: 220px 1fr 48px 44px; align-items: center; gap: 0.8rem;
		padding: 0.35rem 0.6rem; border-radius: 8px; text-decoration: none; color: inherit;
		transition: background 0.15s ease;
	}
	.crow:hover { background: rgba(255, 255, 255, 0.04); }
	.cname { font-size: 0.82rem; color: color-mix(in srgb, var(--fc) 60%, #f2f0ea); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.cbar { height: 5px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
	.cbar span { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, color-mix(in srgb, var(--fc) 60%, #666), var(--fc)); }
	.cpct { font-size: 0.82rem; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
	.cplays { font-size: 0.72rem; color: rgba(242, 240, 234, 0.4); text-align: right; font-variant-numeric: tabular-nums; }

	@media (max-width: 1080px) {
		.table { grid-template-columns: 1fr; }
		.journal { max-height: 220px; }
	}
	@media (max-width: 760px) {
		.half { grid-template-columns: 92px 1fr; }
		.piles { display: none; }
		.crow { grid-template-columns: 130px 1fr 44px 40px; }
	}
</style>
