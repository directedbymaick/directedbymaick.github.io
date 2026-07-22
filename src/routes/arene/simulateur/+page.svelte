<script lang="ts">
	import { onMount } from 'svelte';
	import { charter } from '$lib/charter';
	import { cards, getCard } from '$lib/cards';
	import { simulate, buildDeck, MAX_COPIES } from '$lib/game/engine';
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


	/* ---- lancer : la partie se joue sur le VRAI terrain ----
	   La table miniature reproduite ici a été retirée : une partie IA contre IA
	   s'ouvre sur /duel en mode spectateur, le même plateau plein écran que les
	   parties du joueur. Les deux listes voyagent dans l'URL pour que le terrain
	   rejoue EXACTEMENT le duel configuré (mêmes decks, même graine). */
	let fenetreBloquee = $state(false);

	function launch() {
		const seed = seedOf();
		const a = sideDeck(srcA, forceA, forceNA, lcg(seed));
		const b = sideDeck(srcB, forceB, forceNB, lcg(seed ^ 0x9e3779b9));
		const q = new URLSearchParams({
			mode: 'ia',
			seed: String(seed),
			moi: a.faction,
			lui: b.faction
		});
		/* un deck auto n'a pas de liste : le terrain le reconstruira avec la même
		   graine — même partie. Une liste imposée voyage dans l'URL. */
		if (a.list) q.set('da', a.list.map((c) => c.id).join(','));
		if (b.list) q.set('db', b.list.map((c) => c.id).join(','));
		const f = window.open(
			`/duel?${q}`,
			'expelled-terrain',
			`popup=yes,width=${screen.availWidth},height=${screen.availHeight},left=0,top=0`
		);
		if (!f || f.closed) {
			fenetreBloquee = true;
			return;
		}
		fenetreBloquee = false;
		f.focus();
	}

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
	const fcolor = (f: string) => charter.factions[f as FactionId]?.color ?? '#8892a6';
</script>

<svelte:head>
	<title>Arène — {charter.game.name}</title>
	<meta name="description" content="Simulez des duels et mesurez l’équilibre des decks et des cartes." />
</svelte:head>

<header class="hero">
	<p class="kicker"><span class="k-diamond">◯</span> Simulateur</p>
	<h1>Tester l’équilibre du jeu</h1>
	<p class="tagline">
		Opposez deux decks contrôlés par l’IA, observez un duel en direct ou lancez une série de
		parties pour comparer leurs performances. Vous pouvez imposer une carte et une graine pour
		reproduire précisément un test.
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
		<button class="primary" onclick={launch}>⚔ Lancer un duel — sur le terrain</button>
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
	{#if fenetreBloquee}
		<p class="bloquee">
			Votre navigateur a bloqué la fenêtre du terrain — autorisez les fenêtres pour ce site, puis
			relancez.
		</p>
	{/if}
</section>


<!-- ============ STATS D'ÉQUILIBRAGE ============ -->
{#if batch}
	<section class="stats">
		<h2><span class="tab">Résultats sur {batch.games} parties</span><span class="rule"></span></h2>
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
		<h3>Taux de victoire lorsque la carte est jouée <small>(au moins 5 apparitions)</small></h3>
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

	.bloquee {
		margin: 0.9rem 0 0;
		font-size: 0.85rem;
		color: #e0a13d;
	}

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
	}
	@media (max-width: 760px) {
		.crow { grid-template-columns: 130px 1fr 44px 40px; }
	}
</style>
