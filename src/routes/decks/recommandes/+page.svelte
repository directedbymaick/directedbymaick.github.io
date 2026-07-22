<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/Card.svelte';
	import FactionSigil from '$lib/FactionSigil.svelte';
	import { charter } from '$lib/charter';
	import { getCard } from '$lib/cards';
	import { META_DECKS, type MetaDeck } from '$lib/metadecks';
	import { loadDecks, saveDecks, newDeck, validateDeckOwnership } from '$lib/decks';
	import { loadCollection } from '$lib/gacha';
	import type { CardData, Rarity } from '$lib/types';

	const STARS: Record<Rarity, number> = { common: 2, rare: 3, epic: 4, legendary: 5, prism: 5 };
	const KIND_LABEL = { etre: 'Êtres', verbe: 'Verbes', relique: 'Reliques', lieu: 'Lieux' } as const;
	const KINDS = ['etre', 'verbe', 'relique', 'lieu'] as const;

	let zoomed = $state<CardData | null>(null);
	let imported = $state<Record<string, boolean>>({});
	let collection = $state<Record<string, number>>({});

	onMount(() => {
		collection = loadCollection();
	});

	function missingCards(d: MetaDeck): number {
		const deck = { id: d.id, name: d.name, cards: d.cards, updatedAt: 0 };
		return validateDeckOwnership(deck, collection).errors.length;
	}

	function rowsOf(d: MetaDeck, kind: (typeof KINDS)[number]) {
		return Object.entries(d.cards)
			.map(([id, n]) => ({ card: getCard(id)!, n }))
			.filter((r) => r.card && r.card.kind === kind)
			.sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name));
	}

	function curveOf(d: MetaDeck): number[] {
		const buckets = new Array(8).fill(0);
		for (const [id, n] of Object.entries(d.cards)) {
			const c = getCard(id);
			if (c) buckets[Math.min(c.cost, 7)] += n;
		}
		return buckets;
	}

	function nameOf(id: string): string {
		return getCard(id)?.name ?? id;
	}

	function importDeck(d: MetaDeck) {
		if (missingCards(d) > 0) return;
		const decks = loadDecks();
		const copy = newDeck(d.name);
		copy.cards = { ...d.cards };
		decks.push(copy);
		saveDecks(decks);
		imported[d.id] = true;
	}
</script>

<svelte:head>
	<title>Decks recommandés — {charter.game.name}</title>
	<meta name="description" content="Découvrez des decks prêts à jouer avec leur stratégie, leurs forces et leurs principales combinaisons." />
</svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') zoomed = null;
	}}
/>

<header class="hero">
	<p class="kicker">◯ Listes prêtes à jouer</p>
	<h1>Decks recommandés</h1>
	<p class="tagline">
		Choisissez un style de jeu, découvrez son plan de bataille et importez la liste dans
		<a href="/profil">votre espace</a>. Vous pourrez ensuite la personnaliser avant de jouer dans
		<a href="/arene">l’Arène</a> ou en <a href="/arene/salons">duel en ligne</a>.
	</p>
</header>

{#each META_DECKS as d (d.id)}
	{@const curve = curveOf(d)}
	{@const curveMax = Math.max(1, ...curve)}
	{@const missing = missingCards(d)}
	<article class="deck" style="--fc: {charter.factions[d.faction].color}">
		<header class="dhead">
			<span class="dsigil"><FactionSigil faction={d.faction} /></span>
			<div class="dtitle">
				<h2>{d.name}</h2>
				<p class="dtag">{d.tagline}</p>
			</div>
			<div class="dmeta">
				<span class="dstyle">{d.style}</span>
				<span class="ddiff" title="Difficulté de pilotage">
					{#each Array(3) as _, i (i)}<i class:on={i < d.difficulty}></i>{/each}
				</span>
				{#if imported[d.id]}
					<span class="dimported">✓ Ajouté à vos decks</span>
				{:else}
					<button class="dimport" disabled={missing > 0} onclick={() => importDeck(d)}>
						{missing > 0 ? `${missing} carte(s) manquante(s)` : 'Ajouter à mes decks'}
					</button>
				{/if}
			</div>
		</header>

		<div class="dbody">
			<!-- la liste -->
			<section class="dlist">
				{#each KINDS as kind (kind)}
					{@const rows = rowsOf(d, kind)}
					{#if rows.length > 0}
						<h4>{KIND_LABEL[kind]} <small>({rows.reduce((s, r) => s + r.n, 0)})</small></h4>
						<ul>
							{#each rows as r (r.card.id)}
								<li>
									<button class="crow" onclick={() => (zoomed = r.card)} title="Cliquer pour agrandir">
										<span class="cthumb"
											><img
												src={r.card.art}
												alt=""
												loading="lazy"
												style="object-position: {r.card.artPosition ?? 'center 12%'}"
											/></span
										>
										<span class="ccost">{r.card.cost}</span>
										<span class="cname">{r.card.name}</span>
										<span class="cstars" class:prism={r.card.rarity === 'prism'}
											>{'★'.repeat(STARS[r.card.rarity])}</span
										>
										<span class="cmult">×{r.n}</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				{/each}
				<div class="curve" aria-label="Courbe de Volonté">
					{#each curve as n, i (i)}
						<div class="bucket">
							<i style="height: {(n / curveMax) * 100}%" class:zero={n === 0}></i>
							<small>{i === 7 ? '7+' : i}</small>
						</div>
					{/each}
				</div>
			</section>

			<!-- le guide -->
			<section class="dguide">
				<p class="gresume">{d.guide.resume}</p>

				<h4>Le plan de jeu</h4>
				<ol>
					{#each d.guide.plan as step, i (i)}
						<li>{step}</li>
					{/each}
				</ol>

				<div class="ff">
					<div>
						<h4>Forces</h4>
						<ul>
							{#each d.guide.forces as f, i (i)}<li class="plus">{f}</li>{/each}
						</ul>
					</div>
					<div>
						<h4>Faiblesses</h4>
						<ul>
							{#each d.guide.faiblesses as f, i (i)}<li class="minus">{f}</li>{/each}
						</ul>
					</div>
				</div>

				<h4>Les combos</h4>
				{#each d.guide.combos as combo, i (i)}
					<div class="combo">
						<p class="combo-cards">
							{#each combo.cards as id, j (id)}
								<button class="combo-chip" onclick={() => (zoomed = getCard(id) ?? null)}
									>{nameOf(id)}</button
								>{#if j < combo.cards.length - 1}<span class="combo-plus">+</span>{/if}
							{/each}
						</p>
						<p class="combo-text">{combo.text}</p>
					</div>
				{/each}

				<h4>Main de départ</h4>
				<p class="mull">
					Gardez :
					{#each d.guide.garder as id, i (id)}
						<button class="combo-chip" onclick={() => (zoomed = getCard(id) ?? null)}
							>{nameOf(id)}</button
						>{#if i < d.guide.garder.length - 1}·{/if}
					{/each}
				</p>
			</section>
		</div>
	</article>
{/each}

<!-- la loupe -->
{#if zoomed}
	<div class="zoom" role="dialog" aria-modal="true" aria-label={zoomed.name}>
		<button class="zoom-backdrop" aria-label="Fermer" onclick={() => (zoomed = null)}></button>
		<div class="zoom-card"><Card card={zoomed} /></div>
		<button class="zoom-close" aria-label="Fermer" onclick={() => (zoomed = null)}>✕</button>
	</div>
{/if}

<style>
	.hero {
		margin: 4rem 0 3rem;
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
		max-width: 64ch;
		color: rgba(238, 240, 245, 0.55);
		line-height: 1.6;
	}
	.tagline a {
		color: var(--gold);
	}

	/* ---------- le deck ---------- */
	.deck {
		margin-bottom: 2.4rem;
		background: var(--panel);
		border: 1px solid var(--panel-line);
		border-radius: 20px;
		backdrop-filter: blur(12px);
		overflow: hidden;
	}
	.dhead {
		display: flex;
		align-items: center;
		gap: 1.2rem;
		flex-wrap: wrap;
		padding: 1.4rem 1.8rem;
		border-bottom: 1px solid var(--panel-line);
		background: linear-gradient(90deg, color-mix(in srgb, var(--fc) 10%, transparent), transparent 60%);
	}
	.dsigil {
		font-size: 2.6rem;
		color: var(--fc);
		filter: drop-shadow(0 0 10px color-mix(in srgb, var(--fc) 55%, transparent));
	}
	.dtitle {
		min-width: 0;
	}
	.dtitle h2 {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 600;
		font-size: 1.5rem;
	}
	.dtag {
		margin: 0.2rem 0 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 1.05rem;
		color: rgba(238, 240, 245, 0.55);
	}
	.dmeta {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.dstyle {
		font-size: 0.78rem;
		color: rgba(238, 240, 245, 0.5);
	}
	.ddiff {
		display: inline-flex;
		gap: 4px;
	}
	.ddiff i {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: rgba(140, 170, 220, 0.2);
	}
	.ddiff i.on {
		background: radial-gradient(circle at 35% 30%, #f2d98a, #c9a445);
	}
	.dimport {
		padding: 0.5rem 1.1rem;
		border: none;
		border-radius: 999px;
		background: var(--cream);
		color: #171b10;
		font-family: inherit;
		font-size: 0.82rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 0 14px rgba(213, 178, 94, 0.25);
	}
	.dimport:hover {
		background: #f7edd6;
	}
	.dimported {
		font-size: 0.82rem;
		font-weight: 650;
		color: var(--gold);
	}

	.dbody {
		display: grid;
		grid-template-columns: minmax(280px, 360px) 1fr;
		gap: 0;
	}
	@media (max-width: 860px) {
		.dbody {
			grid-template-columns: 1fr;
		}
	}

	/* liste */
	.dlist {
		padding: 1.3rem 1.6rem;
		border-right: 1px solid var(--panel-line);
	}
	@media (max-width: 860px) {
		.dlist {
			border-right: none;
			border-bottom: 1px solid var(--panel-line);
		}
	}
	.dlist h4 {
		margin: 1rem 0 0.5rem;
		font-size: 0.78rem;
		font-weight: 650;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.45);
	}
	.dlist h4:first-child {
		margin-top: 0;
	}
	.dlist h4 small {
		font-weight: 450;
		color: rgba(238, 240, 245, 0.3);
	}
	.dlist ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.crow {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.35rem 0.6rem;
		border: 1px solid transparent;
		border-radius: 9px;
		background: rgba(140, 170, 220, 0.05);
		font-family: inherit;
		color: var(--ink);
		cursor: zoom-in;
		text-align: left;
		transition:
			background 0.14s ease,
			border-color 0.14s ease;
	}
	.crow:hover {
		background: rgba(213, 178, 94, 0.09);
		border-color: rgba(213, 178, 94, 0.35);
	}
	.crow:hover .cthumb {
		border-color: rgba(213, 178, 94, 0.6);
	}
	/* vignette de l'illustration : reconnaître la carte d'un coup d'œil */
	.cthumb {
		flex: none;
		width: 2.1rem;
		height: 2.1rem;
		border-radius: 7px;
		overflow: hidden;
		border: 1px solid rgba(140, 170, 220, 0.25);
		background: #0c1324;
	}
	.cthumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.ccost {
		flex: none;
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		border: 1px solid rgba(213, 178, 94, 0.45);
		font-size: 0.74rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: var(--gold);
	}
	.cname {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.84rem;
		font-weight: 550;
	}
	.cstars {
		font-size: 0.58rem;
		color: var(--gold);
		white-space: nowrap;
	}
	.cstars.prism {
		background: linear-gradient(90deg, #e8a7b8, #e8d3a7, #a7e8c6, #a7c6e8, #c9a7e8);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.cmult {
		font-size: 0.78rem;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: var(--gold);
	}
	.curve {
		display: flex;
		align-items: flex-end;
		gap: 0.35rem;
		height: 64px;
		margin-top: 1.4rem;
	}
	.bucket {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 0.3rem;
		height: 100%;
	}
	.bucket i {
		width: 100%;
		min-height: 2px;
		border-radius: 3px 3px 0 0;
		background: linear-gradient(180deg, #f0d68a, var(--gold-deep));
	}
	.bucket i.zero {
		background: rgba(140, 170, 220, 0.15);
	}
	.bucket small {
		font-size: 0.6rem;
		color: rgba(238, 240, 245, 0.4);
		font-variant-numeric: tabular-nums;
	}

	/* guide */
	.dguide {
		padding: 1.3rem 1.8rem 1.6rem;
	}
	.dguide h4 {
		margin: 1.3rem 0 0.5rem;
		font-size: 0.78rem;
		font-weight: 650;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(238, 240, 245, 0.45);
	}
	.gresume {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.62;
		color: rgba(238, 240, 245, 0.8);
	}
	.dguide ol {
		margin: 0;
		padding-left: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.dguide ol li {
		font-size: 0.88rem;
		line-height: 1.5;
		color: rgba(238, 240, 245, 0.68);
	}
	.ff {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.2rem;
	}
	@media (max-width: 640px) {
		.ff {
			grid-template-columns: 1fr;
		}
	}
	.ff ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.ff li {
		position: relative;
		padding-left: 1.2rem;
		font-size: 0.85rem;
		line-height: 1.45;
		color: rgba(238, 240, 245, 0.65);
	}
	.ff li::before {
		position: absolute;
		left: 0;
		font-weight: 700;
	}
	.ff li.plus::before {
		content: '+';
		color: #8fe0a0;
	}
	.ff li.minus::before {
		content: '−';
		color: #e58a8a;
	}
	.combo {
		margin-bottom: 0.9rem;
		padding: 0.8rem 1rem;
		background: rgba(213, 178, 94, 0.05);
		border: 1px solid rgba(213, 178, 94, 0.2);
		border-radius: 12px;
	}
	.combo-cards {
		margin: 0 0 0.4rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.combo-chip {
		padding: 0.18rem 0.65rem;
		border: 1px solid rgba(213, 178, 94, 0.4);
		border-radius: 999px;
		background: rgba(213, 178, 94, 0.1);
		color: var(--gold);
		font-family: inherit;
		font-size: 0.76rem;
		font-weight: 650;
		cursor: zoom-in;
	}
	.combo-chip:hover {
		background: rgba(213, 178, 94, 0.22);
	}
	.combo-plus {
		color: rgba(238, 240, 245, 0.4);
		font-weight: 700;
	}
	.combo-text {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.5;
		color: rgba(238, 240, 245, 0.65);
	}
	.mull {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
		font-size: 0.85rem;
		color: rgba(238, 240, 245, 0.55);
	}

	/* loupe */
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
</style>
