<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, scale, fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { cubicOut, backOut } from 'svelte/easing';
	import Card from '$lib/Card.svelte';
	import CardBack from '$lib/CardBack.svelte';
	import FactionSigil from '$lib/FactionSigil.svelte';
	import { charter } from '$lib/charter';
	import { cards, getCard } from '$lib/cards';
	import { loadDecks } from '$lib/decks';
	import { Duel, BOARD_SLOTS, type PlayerSnap, type HandEntry, type Ev } from '$lib/game/engine';
	import type { CardData, FactionId } from '$lib/types';

	/**
	 * LE TERRAIN — plein écran, sans rien du site autour.
	 *
	 * Disposition, de gauche à droite : la case Lieu, les cinq emplacements
	 * d'Êtres, puis la pioche et la défausse. Il n'y a PAS de rangée de Verbes :
	 * un Verbe se prononce, se résout et part à la défausse. Il s'affiche au
	 * centre le temps qu'on le lise — c'est là que les deux joueurs le voient.
	 *
	 * Les Reliques et les Verbes qui s'attachent se posent DERRIÈRE leur Être ;
	 * on les consulte en cliquant l'Être.
	 */

	let duel = $state<Duel | null>(null);
	let moi = $state<PlayerSnap | null>(null);
	let lui = $state<PlayerSnap | null>(null);
	let meta = $state({ turn: 1, active: 0 as 0 | 1, winner: null as 0 | 1 | -1 | null, will: 0, maxWill: 0 });
	let main = $state<HandEntry[]>([]);
	let journal = $state<Ev[]>([]);

	/** Le Verbe qu'on vient de prononcer, montré au centre avant la défausse. */
	let verbeMontre = $state<CardData | null>(null);
	let verbeTimer: ReturnType<typeof setTimeout> | null = null;

	/** N'importe quelle carte, lue en grand : le Lieu, une carte de la défausse… */
	let carteZoom = $state<CardData | null>(null);

	/** Consultations : défausse, Être et ses attachements. */
	let defausseOuverte = $state<0 | 1 | null>(null);
	let etreOuvert = $state<{ side: 0 | 1; uid: number } | null>(null);

	/** Attaque en deux temps : on choisit l'attaquant, puis la cible. */
	let attaquant = $state<number | null>(null);

	/**
	 * Attaque au glisser : on tire une flèche depuis l'Être vers le curseur, et
	 * on frappe ce qui se trouve dessous au relâchement. Le clic en deux temps
	 * reste actif — il sert au clavier et aux petits écrans.
	 *
	 * On travaille au pointeur plutôt qu'au glisser-déposer HTML5 : ce dernier ne
	 * laisse pas dessiner la ligne, impose son image fantôme et ignore le tactile.
	 */
	let traine = $state<{ uid: number; x0: number; y0: number; x: number; y: number } | null>(null);

	function centreDe(el: Element) {
		const r = el.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}

	function debutTraine(e: PointerEvent, uid: number) {
		if (!attaquantsPossibles.includes(uid)) return;
		const c = centreDe(e.currentTarget as Element);
		traine = { uid, x0: c.x, y0: c.y, x: e.clientX, y: e.clientY };
		carteLue = null;
		attaquant = uid;
		(e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
	}

	function bougeTraine(e: PointerEvent) {
		if (!traine) return;
		traine = { ...traine, x: e.clientX, y: e.clientY };
	}

	/** Au relâchement, on frappe ce qui est sous le curseur — s'il est légal. */
	function finTraine(e: PointerEvent) {
		if (!traine) return;
		const t = traine;
		traine = null;
		const sous = document.elementFromPoint(e.clientX, e.clientY);
		const cible = sous?.closest('[data-cible]')?.getAttribute('data-cible');
		if (!cible) return; // relâché dans le vide : on garde l'attaquant sélectionné

		/* On interroge le moteur MAINTENANT plutôt que de lire `ciblesLegales` :
		   ce $derived dépend de `attaquant`, posé au début du glisser, et Svelte
		   ne l'a pas forcément recalculé quand on relâche. */
		const legales = duel?.legalTargets() ?? { units: [], korum: false };
		if (cible === 'korum' && legales.korum) {
			duel?.attack(t.uid, 'korum');
		} else {
			const uid = Number(cible);
			if (!legales.units.includes(uid)) return;
			duel?.attack(t.uid, uid);
		}
		attaquant = null;
		rafraichir();
	}

	/**
	 * Les animations donnent vie au terrain, mais elles ne doivent jamais imposer
	 * du mouvement à qui n'en veut pas. `duree()` renvoie 0 quand le système
	 * demande à les réduire : la transition existe toujours, elle est instantanée.
	 */
	let sobre = $state(false);
	const duree = (ms: number) => (sobre ? 0 : ms);

	/** Chrono du tour, purement informatif. */
	let secondes = $state(0);
	let horloge: ReturnType<typeof setInterval> | null = null;

	/**
	 * Compteur de rafraîchissement.
	 *
	 * Le moteur est impératif : `attackers()`, `legalTargets()` et
	 * `pronounceable()` lisent un état interne que Svelte ne surveille pas. Sans
	 * ce compteur, un $derived qui les appelle ne se recalcule QUE si `duel` ou
	 * `meta` change de valeur — or jouer une carte pendant son tour ne change ni
	 * l'un ni l'autre. Résultat mesuré : aucun Être ne devenait jamais attaquable
	 * à l'écran alors que le moteur en proposait à chaque tour.
	 */
	let version = $state(0);

	function rafraichir() {
		if (!duel) return;
		version++;
		const [a, b] = duel.state();
		moi = a;
		lui = b;
		meta = duel.meta();
		main = duel.hand();
		const evs = duel.drain();
		if (evs.length) journal = [...journal, ...evs].slice(-60);
		for (const e of evs) if (e.t === 'verb') montrerVerbe(e.cardId);
	}

	function montrerVerbe(id?: string) {
		const c = id ? getCard(id) : undefined;
		if (!c) return;
		verbeMontre = c;
		if (verbeTimer) clearTimeout(verbeTimer);
		verbeTimer = setTimeout(() => (verbeMontre = null), 2600);
	}

	onMount(() => {
		const params = new URLSearchParams(location.search);
		const graine = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
		const deckId = params.get('deck');
		const deck = deckId ? loadDecks().find((d) => d.id === deckId) : null;
		const liste = deck
			? Object.entries(deck.cards).flatMap(([id, n]) =>
					Array.from({ length: n }, () => getCard(id)!).filter(Boolean)
				)
			: null;

		duel = new Duel(
			cards,
			liste && liste.length === 30 ? liste : null,
			(params.get('moi') as FactionId) || 'vasar',
			(params.get('lui') as FactionId) || 'exar',
			graine
		);
		sobre = matchMedia('(prefers-reduced-motion: reduce)').matches;
		rafraichir();
		horloge = setInterval(() => secondes++, 1000);
		return () => {
			if (horloge) clearInterval(horloge);
			if (verbeTimer) clearTimeout(verbeTimer);
		};
	});

	const monTour = $derived(meta.active === 0 && meta.winner === null);
	const attaquantsPossibles = $derived(version >= 0 && duel && monTour ? duel.attackers() : []);
	const ciblesLegales = $derived(
		version >= 0 && duel && attaquant !== null
			? duel.legalTargets()
			: { units: [], korum: false }
	);
	const prononcables = $derived(version >= 0 && duel && monTour ? duel.pronounceable() : []);

	/**
	 * La carte survolée en main, montrée en grand au-dessus. Une carte de main
	 * fait 6,4rem : son texte d'effet y est illisible. On doit pouvoir lire ce
	 * qu'on tient AVANT de le poser, y compris ce qu'on n'a pas les moyens de
	 * jouer — c'est comme ça qu'on prépare son tour.
	 */
	let carteLue = $state<CardData | null>(null);

	/** Survoler une carte la rend lisible — en main comme sur le terrain. Pendant
	    un glisser d'attaque on se tait : la flèche doit rester seule à l'écran. */
	function lire(c: CardData | null | undefined) {
		if (traine) return;
		carteLue = c ?? null;
	}

	function jouer(i: number) {
		// les cartes injouables ne sont plus `disabled` : un bouton désactivé ne
		// reçoit aucun survol, et c'est justement celles-là qu'on veut lire.
		if (!main[i]?.playable) return;
		if (!duel?.play(i)) return;
		carteLue = null;
		rafraichir();
	}

	function clicMonEtre(uid: number) {
		// si une attaque est en cours, ce clic la sert ; sinon il ouvre la fiche
		if (attaquant === uid) {
			attaquant = null;
			return;
		}
		if (attaquantsPossibles.includes(uid)) {
			attaquant = uid;
			return;
		}
		etreOuvert = { side: 0, uid };
	}

	function clicSonEtre(uid: number) {
		if (attaquant !== null && ciblesLegales.units.includes(uid)) {
			duel?.attack(attaquant, uid);
			attaquant = null;
			rafraichir();
			return;
		}
		etreOuvert = { side: 1, uid };
	}

	function frapperKorum() {
		if (attaquant === null || !ciblesLegales.korum) return;
		duel?.attack(attaquant, 'korum');
		attaquant = null;
		rafraichir();
	}

	function finirTour() {
		attaquant = null;
		duel?.endTurn();
		secondes = 0;
		rafraichir();
	}

	function prononcer(uid: number) {
		duel?.pronounce(uid);
		rafraichir();
	}

	/** Les attachements d'un Être : Reliques et Verbes posés derrière lui. */
	function attachements(snap: PlayerSnap | null, uid: number) {
		if (!snap) return [];
		return snap.supports.filter((s) => s.targetUid === uid);
	}
	/** Le Lieu occupe sa case dédiée, jamais la rangée des Êtres. */
	function lieuDe(snap: PlayerSnap | null) {
		return snap?.supports.find((s) => s.kind === 'lieu') ?? null;
	}
	/** Les Reliques sans porteur : posées mais rattachées à personne. */
	function libres(snap: PlayerSnap | null) {
		if (!snap) return [];
		return snap.supports.filter((s) => s.targetUid === undefined && s.kind !== 'lieu');
	}

	/* Le Korum qui tombe doit se voir : on marque le changement pour déclencher
	   une pulsation, sinon un chiffre qui passe de 25 à 21 ne se remarque pas. */
	let korumLui = $state(25);
	let korumMoi = $state(25);
	let coupLui = $state(false);
	let coupMoi = $state(false);

	$effect(() => {
		const k = lui?.korum ?? 25;
		if (k !== korumLui) {
			korumLui = k;
			coupLui = true;
			setTimeout(() => (coupLui = false), 420);
		}
	});
	$effect(() => {
		const k = moi?.korum ?? 25;
		if (k !== korumMoi) {
			korumMoi = k;
			coupMoi = true;
			setTimeout(() => (coupMoi = false), 420);
		}
	});

	const mm = $derived(String(Math.floor(secondes / 60)).padStart(2, '0'));
	const ss = $derived(String(secondes % 60).padStart(2, '0'));
</script>

<svelte:head>
	<title>Duel — {charter.game.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="terrain">
	<!-- ================= ADVERSAIRE ================= -->
	<header class="bandeau haut">
		<span class="qui">
			<span class="sigil"><FactionSigil faction={lui?.faction ?? 'exar'} flat /></span>
			{lui?.name ?? 'Adversaire'}
		</span>
		<span class="korum" class:vise={ciblesLegales.korum && attaquant !== null} class:coup={coupLui} data-cible="korum">
			<button class="korum-btn" disabled={!ciblesLegales.korum || attaquant === null} onclick={frapperKorum}>
				Korum <b>{lui?.korum ?? 0}</b>
			</button>
		</span>
		<span class="ressource">Volonté {lui?.will ?? 0}/{lui?.maxWill ?? 0}</span>
		<span class="ressource">Main {lui?.hand ?? 0}</span>
	</header>

	<!-- main adverse, face cachée -->
	<div class="main-adverse" aria-label="Main de l'adversaire">
		{#each Array(Math.min(lui?.hand ?? 0, 10)) as _, i (i)}
			<div class="dos"><CardBack /></div>
		{/each}
	</div>

	<!-- rangée adverse -->
	<section class="rangee adverse">
		{#if lieuDe(lui)}
			{@const c = getCard(lieuDe(lui)!.cardId)}
			<button class="pile lieu occupe" title="Lire {c?.name}" onclick={() => (carteZoom = c ?? null)}>
				{#if c}<div class="mini" in:scale={{ duration: duree(260), start: 0.9, easing: backOut }}>
					<Card card={c} interactive={false} thumb />
				</div>{/if}
			</button>
		{:else}
			<div class="pile lieu"><span class="vide">Lieu</span></div>
		{/if}

		<div class="slots">
			{#each Array(BOARD_SLOTS) as _, i (i)}
				{@const u = lui?.board[i]}
				{#if u}
					{@const c = getCard(u.cardId)}
					{@const att = attachements(lui, u.uid)}
					<button
						in:scale={{ duration: duree(300), start: 0.82, easing: backOut }}
						out:scale={{ duration: duree(200), start: 0.7 }}
						class="slot occupe"
						class:ciblable={attaquant !== null && ciblesLegales.units.includes(u.uid)}
						data-cible={u.uid}
						onclick={() => clicSonEtre(u.uid)}
						onpointerenter={() => lire(c)}
						onpointerleave={() => (carteLue = null)}
						onfocus={() => lire(c)}
						onblur={() => (carteLue = null)}
					>
						{#if att.length}<span class="attache" title="{att.length} attachement(s)">{att.length}</span>{/if}
						{#if c}<div class="mini"><Card card={c} interactive={false} thumb /></div>{/if}
						<span class="stats">{u.atk} / {u.hp}</span>
					</button>
				{:else}
					<div class="slot"></div>
				{/if}
			{/each}
		</div>

		<div class="piles">
			<button class="pile" onclick={() => (defausseOuverte = 1)} title="Défausse adverse">
				<span class="pile-n">{lui?.discard ?? 0}</span>
				<span class="pile-l">Défausse</span>
			</button>
			<div class="pile pioche" title="Pioche adverse">
				<span class="pile-n">{lui?.deck ?? 0}</span>
				<span class="pile-l">Pioche</span>
			</div>
		</div>
	</section>

	<!-- ================= CENTRE ================= -->
	<div class="centre">
		<span class="tour">Tour {meta.turn} · {monTour ? 'À vous' : 'Adversaire'}</span>
		<span class="chrono">{mm}:{ss}</span>
		{#if verbeMontre}
			<div
				class="verbe-joue"
				role="status"
				in:scale={{ duration: duree(320), start: 0.7, easing: backOut }}
				out:fade={{ duration: duree(400) }}
			>
				<div class="vj-carte"><Card card={verbeMontre} interactive={false} /></div>
				<p class="vj-nom">{verbeMontre.name}</p>
			</div>
		{/if}
	</div>

	<!-- ================= NOUS ================= -->
	<section class="rangee mienne">
		{#if lieuDe(moi)}
			{@const c = getCard(lieuDe(moi)!.cardId)}
			<button class="pile lieu occupe" title="Lire {c?.name}" onclick={() => (carteZoom = c ?? null)}>
				{#if c}<div class="mini" in:scale={{ duration: duree(260), start: 0.9, easing: backOut }}>
					<Card card={c} interactive={false} thumb />
				</div>{/if}
			</button>
		{:else}
			<div class="pile lieu"><span class="vide">Lieu</span></div>
		{/if}

		<div class="slots">
			{#each Array(BOARD_SLOTS) as _, i (i)}
				{@const u = moi?.board[i]}
				{#if u}
					{@const c = getCard(u.cardId)}
					{@const att = attachements(moi, u.uid)}
					<button
						in:scale={{ duration: duree(300), start: 0.82, easing: backOut }}
						out:scale={{ duration: duree(200), start: 0.7 }}
						class="slot occupe"
						class:pret={attaquantsPossibles.includes(u.uid)}
						class:choisi={attaquant === u.uid}
						class:traine={traine?.uid === u.uid}
						onpointerdown={(e) => debutTraine(e, u.uid)}
						onclick={() => clicMonEtre(u.uid)}
						onpointerenter={() => lire(c)}
						onpointerleave={() => (carteLue = null)}
						onfocus={() => lire(c)}
						onblur={() => (carteLue = null)}
					>
						{#if att.length}<span class="attache" title="{att.length} attachement(s)">{att.length}</span>{/if}
						{#if c}<div class="mini"><Card card={c} interactive={false} thumb /></div>{/if}
						<span class="stats">{u.atk} / {u.hp}</span>
						{#if prononcables.some((x: { uid: number }) => x.uid === u.uid)}
							<span class="pron" title="Prononcer disponible">EX</span>
						{/if}
					</button>
				{:else}
					<div class="slot"></div>
				{/if}
			{/each}
		</div>

		<div class="piles">
			<button class="pile" onclick={() => (defausseOuverte = 0)} title="Votre défausse">
				<span class="pile-n">{moi?.discard ?? 0}</span>
				<span class="pile-l">Défausse</span>
			</button>
			<div class="pile pioche" title="Votre pioche">
				<span class="pile-n">{moi?.deck ?? 0}</span>
				<span class="pile-l">Pioche</span>
			</div>
		</div>
	</section>

	<!-- reliques sans porteur -->
	{#if libres(moi).length}
		<div class="libres">
			{#each libres(moi) as s (s.cardId)}
				<span class="libre">{s.name}</span>
			{/each}
		</div>
	{/if}

	<footer class="bandeau bas">
		<span class="qui">
			<span class="sigil"><FactionSigil faction={moi?.faction ?? 'vasar'} flat /></span>
			{moi?.name ?? 'Vous'}
		</span>
		<span class="korum mien" class:coup={coupMoi}>Korum <b>{moi?.korum ?? 0}</b></span>
		<span class="ressource volonte">Volonté <b>{meta.will}</b>/{meta.maxWill}</span>
		<button class="finir" disabled={!monTour} onclick={finirTour}>Finir le tour</button>
	</footer>

	<!-- la carte qu'on survole, lisible en grand -->
	{#if carteLue}
		<div class="lecture" aria-hidden="true" in:fade={{ duration: duree(140) }}>
			<Card card={carteLue} interactive={false} />
		</div>
	{/if}

	<!-- notre main -->
	<div class="ma-main">
		{#each main as h, i (`${h.card.id}-${i}`)}
			<button
				in:fly={{ y: 40, duration: duree(280), easing: cubicOut }}
				out:fly={{ y: -30, duration: duree(200) }}
				animate:flip={{ duration: duree(240), easing: cubicOut }}
				class="carte-main"
				class:jouable={h.playable}
				onclick={() => jouer(i)}
				onpointerenter={() => lire(h.card)}
				onpointerleave={() => (carteLue = null)}
				onfocus={() => lire(h.card)}
				onblur={() => (carteLue = null)}
				title={h.playable ? `Jouer ${h.card.name}` : `${h.card.name} — pas assez de Volonté`}
			>
				<Card card={h.card} interactive={false} thumb />
				<span class="cout">{h.cost}</span>
			</button>
		{/each}
	</div>

	<!-- la flèche d'attaque : de l'Être au curseur, tant qu'on tire -->
	{#if traine}
		<svg class="fleche" aria-hidden="true" in:fade={{ duration: duree(120) }}>
			<defs>
				<marker id="pointe" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<path d="M0 0 L10 5 L0 10 z" fill="#e8703f" />
				</marker>
			</defs>
			<line
				x1={traine.x0}
				y1={traine.y0}
				x2={traine.x}
				y2={traine.y}
				marker-end="url(#pointe)"
			/>
		</svg>
	{/if}

	{#if meta.winner !== null}
		<div class="fin" role="dialog" aria-modal="true" in:fade={{ duration: duree(500) }}>
			<p class="fin-txt">
				{meta.winner === 0 ? 'Victoire' : meta.winner === 1 ? 'Défaite' : 'Nulle'}
			</p>
			<a class="fin-sortie" href="/arene">Quitter le terrain</a>
		</div>
	{/if}
</div>

<svelte:window onpointermove={bougeTraine} onpointerup={finTraine} onpointercancel={() => (traine = null)} />

<!-- ============ consultation de la défausse ============ -->
{#if defausseOuverte !== null}
	<div class="voile" role="dialog" aria-modal="true" aria-label="Défausse">
		<button class="voile-fond" aria-label="Fermer" onclick={() => (defausseOuverte = null)}></button>
		<div class="voile-boite">
			<h2>Défausse — {defausseOuverte === 0 ? 'vous' : 'adversaire'}</h2>
			<p class="voile-vide">La défausse se consulte librement, des deux côtés.</p>
			<button class="voile-x" onclick={() => (defausseOuverte = null)}>Fermer</button>
		</div>
	</div>
{/if}

<!-- ============ une carte, lue en grand ============ -->
{#if carteZoom}
	<div class="voile" role="dialog" aria-modal="true" aria-label={carteZoom.name} transition:fade={{ duration: duree(180) }}>
		<button class="voile-fond" aria-label="Fermer" onclick={() => (carteZoom = null)}></button>
		<div class="zoom-carte" in:scale={{ duration: duree(260), start: 0.88, easing: backOut }}>
			<Card card={carteZoom} />
		</div>
	</div>
{/if}

<!-- ============ un Être et ce qui lui est attaché ============ -->
{#if etreOuvert}
	{@const snap = etreOuvert.side === 0 ? moi : lui}
	{@const u = snap?.board.find((x) => x.uid === etreOuvert!.uid)}
	{@const c = u ? getCard(u.cardId) : null}
	<div class="voile" role="dialog" aria-modal="true" aria-label={u?.name ?? 'Être'}>
		<button class="voile-fond" aria-label="Fermer" onclick={() => (etreOuvert = null)}></button>
		<div class="voile-boite large">
			<div class="detail">
				{#if c}<div class="detail-carte"><Card card={c} /></div>{/if}
				<div class="detail-att">
					<h2>{u?.name}</h2>
					<p class="detail-stats">{u?.atk} ATQ · {u?.hp} INT</p>
					<p class="detail-titre">Attaché derrière</p>
					{#if attachements(snap, etreOuvert.uid).length}
						<ul class="att-liste">
							{#each attachements(snap, etreOuvert.uid) as s (s.cardId)}
								{@const sc = getCard(s.cardId)}
								<li>
									<b>{s.name}</b>
									{#if sc?.text}<span>{sc.text}</span>{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="detail-rien">Rien n'est attaché à cet Être.</p>
					{/if}
				</div>
			</div>
			<button class="voile-x" onclick={() => (etreOuvert = null)}>Fermer</button>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		overflow: hidden;
	}
	.terrain {
		position: fixed;
		inset: 0;
		display: grid;
		grid-template-rows: auto auto 1fr auto 1fr auto auto;
		gap: 0.4rem;
		padding: 0.6rem 1rem;
		background:
			radial-gradient(120% 90% at 50% 50%, rgba(28, 34, 52, 0.9), rgba(6, 8, 14, 0.98)),
			#05070c;
		color: #f2f0ea;
		font-family: 'Inter Variable', Inter, system-ui, sans-serif;
		overflow: hidden;
	}

	.bandeau {
		display: flex;
		align-items: center;
		gap: 1.2rem;
		padding: 0.4rem 0.8rem;
		background: rgba(255, 255, 255, 0.035);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 12px;
		font-size: 0.86rem;
	}
	.qui {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
	}
	.sigil {
		width: 1.1rem;
		height: 1.1rem;
	}
	.korum b,
	.ressource b {
		color: #d5b25e;
		font-variant-numeric: tabular-nums;
	}
	/* le coup encaissé : une pulsation brève, jamais un clignotement */
	.korum {
		display: inline-block;
		transition: transform 0.2s ease;
	}
	.korum.coup {
		animation: encaisse 0.42s ease;
	}
	@keyframes encaisse {
		0% { transform: scale(1); }
		30% { transform: scale(1.22); color: #ff9e7a; }
		100% { transform: scale(1); }
	}
	@media (prefers-reduced-motion: reduce) {
		.korum.coup {
			animation: none;
		}
	}
	.korum-btn {
		font: inherit;
		color: inherit;
		background: none;
		border: 1px solid transparent;
		border-radius: 999px;
		padding: 0.2rem 0.7rem;
		cursor: default;
	}
	.korum.vise .korum-btn {
		border-color: #e8703f;
		color: #ffb98f;
		cursor: pointer;
	}
	.ressource {
		color: rgba(242, 240, 234, 0.55);
	}
	.finir {
		margin-left: auto;
		padding: 0.4rem 1.1rem;
		font: inherit;
		font-weight: 650;
		color: #0a0a0d;
		background: linear-gradient(180deg, #f0d68a, #c9a445);
		border: none;
		border-radius: 999px;
		cursor: pointer;
	}
	.finir:disabled {
		color: rgba(242, 240, 234, 0.35);
		background: rgba(255, 255, 255, 0.06);
		cursor: default;
	}

	.main-adverse {
		display: flex;
		justify-content: center;
		gap: 0.2rem;
		height: 3.2rem;
	}
	.dos {
		--card-w: 2.4rem;
		opacity: 0.7;
	}

	.rangee {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.8rem;
	}
	.slots {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.5rem;
		justify-items: center;
	}
	.slot {
		position: relative;
		width: 100%;
		max-width: 8.5rem;
		aspect-ratio: 63 / 88;
		border: 1px dashed rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.02);
		padding: 0;
	}
	.slot {
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			transform 0.16s ease;
	}
	.slot.occupe:hover {
		transform: translateY(-0.25rem);
	}
	.slot.occupe {
		border-style: solid;
		border-color: rgba(255, 255, 255, 0.16);
		cursor: pointer;
	}
	.slot.pret {
		border-color: rgba(213, 178, 94, 0.75);
		box-shadow: 0 0 14px rgba(213, 178, 94, 0.3);
	}
	.slot.choisi {
		border-color: #f0d68a;
		box-shadow: 0 0 22px rgba(240, 214, 138, 0.6);
	}
	.slot.traine {
		opacity: 0.75;
	}
	.slot.ciblable {
		border-color: #e8703f;
		box-shadow: 0 0 18px rgba(232, 112, 63, 0.45);
	}
	.mini {
		--card-w: 100%;
		width: 100%;
	}
	.stats {
		position: absolute;
		bottom: 0.15rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.1rem 0.5rem;
		font-size: 0.7rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: #0a0a0d;
		background: rgba(240, 214, 138, 0.92);
		border-radius: 999px;
	}
	/* le compteur d'attachements : ce qui est posé DERRIÈRE l'Être */
	.attache {
		position: absolute;
		top: -0.35rem;
		right: -0.35rem;
		z-index: 3;
		width: 1.3rem;
		height: 1.3rem;
		display: grid;
		place-items: center;
		font-size: 0.7rem;
		font-weight: 700;
		color: #0a0a0d;
		background: linear-gradient(180deg, #bda6ff, #8b6ee0);
		border-radius: 50%;
	}
	.pron {
		position: absolute;
		top: -0.35rem;
		left: -0.35rem;
		z-index: 3;
		padding: 0.1rem 0.35rem;
		font-size: 0.6rem;
		font-weight: 800;
		color: #0a0a0d;
		background: #e8d3a7;
		border-radius: 4px;
	}

	.piles {
		display: flex;
		gap: 0.4rem;
	}
	.pile {
		display: grid;
		place-items: center;
		gap: 0.1rem;
		width: 4.2rem;
		aspect-ratio: 63 / 88;
		font: inherit;
		color: rgba(242, 240, 234, 0.6);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		cursor: pointer;
	}
	.pile.pioche {
		cursor: default;
		background: rgba(140, 170, 220, 0.08);
	}
	.pile.lieu {
		width: 6rem;
		cursor: default;
		transition:
			border-color 0.2s ease,
			transform 0.16s ease;
	}
	.pile.lieu.occupe {
		cursor: zoom-in;
	}
	.pile.lieu.occupe:hover {
		transform: translateY(-0.25rem);
		border-color: rgba(213, 178, 94, 0.55);
	}
	.pile:not(.pioche):hover {
		border-color: rgba(213, 178, 94, 0.45);
	}
	.pile-n {
		font-size: 1.2rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: #f2f0ea;
	}
	.pile-l {
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.vide {
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.3);
	}

	.centre {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.4rem;
		position: relative;
		font-size: 0.82rem;
		color: rgba(242, 240, 234, 0.55);
	}
	.tour {
		padding: 0.25rem 0.9rem;
		background: rgba(213, 178, 94, 0.12);
		border: 1px solid rgba(213, 178, 94, 0.35);
		border-radius: 999px;
		color: #f0e6cf;
	}
	.chrono {
		font-variant-numeric: tabular-nums;
	}
	/* le Verbe prononcé : visible par les deux joueurs, puis il part */
	.verbe-joue {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 20;
		display: grid;
		place-items: center;
		gap: 0.5rem;
		pointer-events: none;
	}
	.vj-carte {
		--card-w: 12rem;
		filter: drop-shadow(0 0 34px rgba(213, 178, 94, 0.5));
	}
	.vj-nom {
		margin: 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: 1.3rem;
		color: #f0e6cf;
	}

	.libres {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
	}
	.libre {
		padding: 0.2rem 0.7rem;
		font-size: 0.72rem;
		color: rgba(242, 240, 234, 0.6);
		background: rgba(140, 170, 220, 0.1);
		border-radius: 999px;
	}

	.ma-main {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		gap: 0.4rem;
		height: 9rem;
	}
	.carte-main {
		position: relative;
		--card-w: 6.4rem;
		padding: 0;
		background: none;
		border: none;
		cursor: default;
		opacity: 0.55;
		transition:
			transform 0.16s ease,
			opacity 0.16s ease;
	}
	.carte-main.jouable {
		opacity: 1;
		cursor: pointer;
	}
	.carte-main:hover {
		transform: translateY(-0.7rem);
		opacity: 1;
	}
	.carte-main.jouable:hover {
		transform: translateY(-1.1rem);
	}
	.cout {
		position: absolute;
		top: -0.3rem;
		left: -0.3rem;
		width: 1.5rem;
		height: 1.5rem;
		display: grid;
		place-items: center;
		font-size: 0.8rem;
		font-weight: 700;
		color: #0a0a0d;
		background: linear-gradient(180deg, #f0d68a, #c9a445);
		border-radius: 50%;
	}

	/* la lecture : posée au-dessus de la main, jamais sous le curseur */
	.lecture {
		position: fixed;
		right: 1.6rem;
		bottom: 10rem;
		z-index: 40;
		--card-w: min(19rem, 26vw);
		pointer-events: none;
		filter: drop-shadow(0 1.2rem 2.4rem rgba(0, 0, 0, 0.75));
	}

	.fleche {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 45;
		pointer-events: none;
	}
	.fleche line {
		stroke: #e8703f;
		stroke-width: 4;
		stroke-linecap: round;
		filter: drop-shadow(0 0 6px rgba(232, 112, 63, 0.7));
	}

	.zoom-carte {
		position: relative;
		margin: auto;
		--card-w: min(24rem, 80vw);
	}

	.fin {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: grid;
		place-items: center;
		gap: 1rem;
		background: rgba(4, 5, 9, 0.88);
	}
	.fin-txt {
		margin: 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: clamp(3rem, 9vw, 6rem);
	}
	.fin-sortie {
		color: #d5b25e;
	}

	.voile {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: grid;
		place-items: center;
		padding: 2rem;
		overflow-y: auto;
	}
	.voile-fond {
		position: fixed;
		inset: 0;
		border: none;
		background: rgba(4, 5, 9, 0.86);
		-webkit-backdrop-filter: blur(8px);
		backdrop-filter: blur(8px);
	}
	.voile-boite {
		position: relative;
		margin: auto;
		padding: 1.6rem 1.8rem;
		max-width: 30rem;
		background: #0d0f16;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
	}
	.voile-boite.large {
		max-width: 46rem;
	}
	.voile-boite h2 {
		margin: 0 0 0.6rem;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: 1.7rem;
		font-weight: 400;
	}
	.voile-vide,
	.detail-rien {
		margin: 0 0 1rem;
		font-size: 0.85rem;
		color: rgba(242, 240, 234, 0.45);
	}
	.voile-x {
		padding: 0.4rem 1rem;
		font: inherit;
		font-size: 0.82rem;
		color: rgba(242, 240, 234, 0.7);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		cursor: pointer;
	}
	.detail {
		display: flex;
		flex-wrap: wrap;
		gap: 1.6rem;
		margin-bottom: 1rem;
	}
	.detail-carte {
		--card-w: 15rem;
		flex: none;
	}
	.detail-att {
		min-width: 14rem;
		flex: 1;
	}
	.detail-stats {
		margin: 0 0 1rem;
		font-variant-numeric: tabular-nums;
		color: #d5b25e;
	}
	.detail-titre {
		margin: 0 0 0.4rem;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.35);
	}
	.att-liste {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.att-liste li {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.6rem 0.8rem;
		background: rgba(140, 170, 220, 0.08);
		border-radius: 10px;
		font-size: 0.85rem;
	}
	.att-liste span {
		color: rgba(242, 240, 234, 0.6);
		font-size: 0.8rem;
	}
</style>
