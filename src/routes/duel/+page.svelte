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

	/**
	 * Qui vient d'encaisser. On compare les PV d'un rafraîchissement à l'autre
	 * plutôt que de se fier au nom d'un événement : ça capte toutes les sources
	 * de dégâts — attaque, Verbe, effet déclenché — sans rien coder pour chacune.
	 */
	let pvPrecedents = new Map<number, number>();
	let blesses = $state(new Set<number>());

	function marquerBlesses(snaps: [PlayerSnap, PlayerSnap]) {
		const nouveaux = new Set<number>();
		const pv = new Map<number, number>();
		for (const s of snaps)
			for (const u of s.board) {
				pv.set(u.uid, u.hp);
				const avant = pvPrecedents.get(u.uid);
				if (avant !== undefined && u.hp < avant) nouveaux.add(u.uid);
			}
		pvPrecedents = pv;
		if (!nouveaux.size) return;
		blesses = new Set([...blesses, ...nouveaux]);
		setTimeout(() => {
			blesses = new Set([...blesses].filter((x) => !nouveaux.has(x)));
		}, 440);
	}

	/**
	 * La mort d'un Être : secousse, parasitage rouge et noir, puis effacement.
	 * Écrite comme transition Svelte plutôt qu'en @keyframes CSS pour que la
	 * carte reste montée pendant toute sa disparition — sinon elle s'évapore
	 * d'un coup, ce qui est exactement ce qu'on veut éviter.
	 */
	function mort(_node: Element, { duration = 620 }: { duration?: number } = {}) {
		return {
			duration: duree(duration),
			css: (t: number, u: number) => {
				// t : 1 → 0 ; u : 0 → 1 (progression de la disparition)
				const secousse = Math.sin(u * 44) * 9 * (1 - u * 0.4);
				const gite = Math.sin(u * 26) * 3;
				const parasite = Math.sin(u * 70) > 0.55 ? 'invert(1) hue-rotate(-25deg)' : '';
				return `
					transform: translate(${secousse}px, ${Math.abs(secousse) * 0.25}px)
					           skewX(${gite}deg) scale(${0.8 + t * 0.2});
					filter: ${parasite} brightness(${1 + u * 1.4}) saturate(${1 + u * 4})
					        drop-shadow(0 0 ${u * 26}px rgba(214, 48, 42, ${u * 0.9}));
					opacity: ${Math.max(0, t * 1.15 - 0.15)};
				`;
			}
		};
	}

	function rafraichir() {
		if (!duel) return;
		version++;
		const [a, b] = duel.state();
		marquerBlesses([a, b]);
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

	/**
	 * L'annonce de tour. Le bandeau « Tour 7 · À vous » du centre est trop
	 * discret : on lève les yeux de sa main et on ne sait pas que la parole est
	 * revenue. L'annonce traverse l'écran une seconde, puis s'efface.
	 */
	let annonce = $state<string | null>(null);
	let annonceTimer: ReturnType<typeof setTimeout> | null = null;
	let dernierTour = 0;

	/*
	 * On surveille le NUMÉRO de tour, pas le camp actif.
	 *
	 * endTurn() fait jouer l'IA de façon synchrone : quand la main revient à
	 * l'interface, `active` est déjà repassé à 0. Il n'y a donc aucune bascule à
	 * observer, et une annonce branchée dessus ne se déclenchait jamais — vérifié,
	 * elle restait muette à l'ouverture comme aux changements de tour.
	 */
	$effect(() => {
		const t = meta.turn;
		if (meta.winner !== null || t === dernierTour) return;
		const premier = dernierTour === 0;
		dernierTour = t;
		if (meta.active !== 0) return; // on n'annonce que la reprise de parole
		annonce = premier ? 'À vous' : 'À vous de jouer';
		if (annonceTimer) clearTimeout(annonceTimer);
		annonceTimer = setTimeout(() => (annonce = null), 1500);
	});

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

<div
	class="terrain"
	class:my-turn={monTour}
	style="--my-faction: {charter.factions[moi?.faction ?? 'vasar'].color}; --foe-faction: {charter.factions[lui?.faction ?? 'exar'].color}"
>
	<div class="arena-atmosphere" aria-hidden="true">
		<div class="vault-glow"></div>
		<div class="arena-ring ring-one"></div>
		<div class="arena-ring ring-two"></div>
		<div class="motes">
			{#each Array(18) as _, i (i)}<i style="--i: {i}; --d: {12 + (i % 7) * 2}s; left: {(i * 37) % 100}%"></i>{/each}
		</div>
	</div>
	<div class="corner corner-nw" aria-hidden="true"></div>
	<div class="corner corner-ne" aria-hidden="true"></div>
	<div class="corner corner-sw" aria-hidden="true"></div>
	<div class="corner corner-se" aria-hidden="true"></div>

	<!-- ================= ADVERSAIRE ================= -->
	<header class="bandeau haut">
		<span class="qui">
			<span class="sigil"><FactionSigil faction={lui?.faction ?? 'exar'} flat /></span>
			<span class="identity"><small>Adversaire</small><b>{lui?.name ?? 'Adversaire'}</b></span>
		</span>
		<span class="korum korum-medal" class:vise={ciblesLegales.korum && attaquant !== null} class:coup={coupLui} data-cible="korum">
			<button class="korum-btn" disabled={!ciblesLegales.korum || attaquant === null} onclick={frapperKorum}>
				<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="kg-track" cx="22" cy="22" r="19" pathLength="100"/><circle class="kg-value" cx="22" cy="22" r="19" pathLength="100" style="stroke-dasharray: {Math.max(0, ((lui?.korum ?? 0) / 25) * 100)} 100"/></svg>
				<small>Korum</small><b>{lui?.korum ?? 0}</b>
			</button>
		</span>
		<span class="will-display foe" title="Volonté adverse : {lui?.will ?? 0} sur {lui?.maxWill ?? 0}">
			<small>Volonté</small><span class="will-pips">{#each Array(lui?.maxWill ?? 0) as _, i (i)}<i class:on={i < (lui?.will ?? 0)}></i>{/each}</span>
		</span>
		<span class="ressource">Main {lui?.hand ?? 0}</span>
	</header>

	<!-- main adverse, face cachée -->
	<div class="main-adverse" aria-label="Main de l'adversaire">
		{#each Array(Math.min(lui?.hand ?? 0, 10)) as _, i (i)}
			<div
				class="dos"
				style="--tilt: {(i - (Math.min(lui?.hand ?? 0, 10) - 1) / 2) * 2.8}deg; --drop: {Math.abs(i - (Math.min(lui?.hand ?? 0, 10) - 1) / 2) * 0.07}rem"
			><CardBack /></div>
		{/each}
	</div>

	<!-- Rangée adverse. Elle porte data-cible="korum" : lâcher une attaque dans le
	     vide de la zone ennemie frappe le Korum, sans avoir à viser le petit badge
	     du bandeau. Un emplacement occupé, lui, capte le lâcher avant la rangée —
	     `closest()` remonte au plus proche. Le moteur refuse de toute façon le
	     Korum tant qu'un Être peut encore intercepter. -->
	<section
		class="rangee adverse"
		class:zone-visee={attaquant !== null && ciblesLegales.korum}
		data-cible="korum"
	>
		<span class="zone-label enemy-label" aria-hidden="true">Front adverse</span>
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
						out:mort
						class="slot occupe"
						class:frappe={blesses.has(u.uid)}
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
		<div class="central-seal" class:active={monTour} aria-hidden="true"><i></i><span>EX</span></div>
		<span class="tour"><small>Tour {meta.turn}</small><b>{monTour ? 'À vous de jouer' : 'Tour adverse'}</b></span>
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
		<span class="zone-label ally-label" aria-hidden="true">Votre front</span>
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
						out:mort
						class="slot occupe"
						class:frappe={blesses.has(u.uid)}
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
			<span class="identity"><small>Votre camp</small><b>{moi?.name ?? 'Vous'}</b></span>
		</span>
		<span class="korum korum-medal mien" class:coup={coupMoi}>
			<span class="korum-static"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="kg-track" cx="22" cy="22" r="19" pathLength="100"/><circle class="kg-value" cx="22" cy="22" r="19" pathLength="100" style="stroke-dasharray: {Math.max(0, ((moi?.korum ?? 0) / 25) * 100)} 100"/></svg><small>Korum</small><b>{moi?.korum ?? 0}</b></span>
		</span>
		<span class="will-display" title="Volonté : {meta.will} sur {meta.maxWill}">
			<small>Volonté</small><span class="will-pips">{#each Array(meta.maxWill) as _, i (i)}<i class:on={i < meta.will}></i>{/each}</span>
		</span>
		<button class="finir" disabled={!monTour} onclick={finirTour}>Finir le tour</button>
	</footer>

	{#if monTour && meta.winner === null}
		<p class="action-hint" aria-live="polite">
			{attaquant !== null ? 'Choisissez une cible' : 'Jouez une carte ou sélectionnez un combattant'}
		</p>
	{/if}

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

	<!-- l'annonce de tour : elle traverse, elle ne bloque pas -->
	{#if annonce}
		<div
			class="annonce"
			class:mienne={true}
			role="status"
			aria-live="polite"
			in:fly={{ x: -60, duration: duree(320), easing: cubicOut }}
			out:fade={{ duration: duree(400) }}
		>
			<span class="an-txt">{annonce}</span>
			<span class="an-tour">Tour {meta.turn}</span>
		</div>
	{/if}

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
			<div class="fin-emblem" aria-hidden="true"><span>EX</span></div>
			<p class="fin-txt">
				{meta.winner === 0 ? 'Victoire' : meta.winner === 1 ? 'Défaite' : 'Match nul'}
			</p>
			<p class="fin-sub">{meta.winner === 0 ? 'Votre parole résonne encore dans l’Arène.' : meta.winner === 1 ? 'Le Silence a repris le terrain.' : 'Aucun Korum ne demeure.'}</p>
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
	.korum b {
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
		padding: 0.3rem;
		border-radius: 14px;
		transition:
			background 0.2s ease,
			box-shadow 0.2s ease;
	}
	/* quand le Korum est ouvert, c'est toute la zone adverse qui s'allume */
	.rangee.zone-visee {
		background: rgba(232, 112, 63, 0.07);
		box-shadow: inset 0 0 0 1px rgba(232, 112, 63, 0.35);
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
	/* le coup encaissé : vibration courte et sèche, teintée de rouge */
	.slot.frappe {
		animation: frappe 0.44s cubic-bezier(0.36, 0.07, 0.19, 0.97);
	}
	@keyframes frappe {
		0%, 100% { transform: translateX(0); filter: none; }
		12% { transform: translateX(-7px); filter: brightness(1.5) saturate(2.2); }
		28% { transform: translateX(6px); filter: brightness(1.3) saturate(1.8); }
		44% { transform: translateX(-4px); }
		62% { transform: translateX(3px); }
		80% { transform: translateX(-2px); }
	}
	@media (prefers-reduced-motion: reduce) {
		.slot.frappe {
			animation: none;
		}
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

	/* l'annonce : au centre, au-dessus du terrain, sans jamais capter le curseur */
	.annonce {
		position: fixed;
		top: 50%;
		left: 0;
		right: 0;
		z-index: 46;
		display: grid;
		place-items: center;
		gap: 0.2rem;
		padding: 1rem 0;
		transform: translateY(-50%);
		pointer-events: none;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(10, 12, 20, 0.82) 18%,
			rgba(10, 12, 20, 0.82) 82%,
			transparent
		);
	}
	.an-txt {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: clamp(2.4rem, 6vw, 4.2rem);
		line-height: 1;
		letter-spacing: 0.02em;
		color: rgba(242, 240, 234, 0.75);
	}
	.annonce.mienne .an-txt {
		color: #f0e6cf;
		text-shadow: 0 0 30px rgba(213, 178, 94, 0.55);
	}
	.an-tour {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.4);
	}
	.annonce.mienne .an-tour {
		color: rgba(213, 178, 94, 0.8);
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

	/* ============================================================
	   ARÈNE VIVANTE — mise en scène appliquée au terrain existant
	   ============================================================ */
	.terrain {
		--arena-gold: #d9b95f;
		--arena-gold-hot: #f5dfa0;
		--arena-ember: #e06c45;
		gap: 0.32rem;
		padding: 0.65rem 1.2rem 0.55rem;
		background:
			radial-gradient(circle at 50% 50%, rgba(111, 91, 42, 0.18), transparent 19%),
			radial-gradient(ellipse at 50% 50%, rgba(30, 39, 55, 0.94), rgba(8, 12, 19, 0.98) 64%, #030507 100%);
		isolation: isolate;
	}
	.terrain::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		pointer-events: none;
		background:
			repeating-linear-gradient(115deg, transparent 0 78px, rgba(255,255,255,.012) 79px 80px),
			linear-gradient(90deg, rgba(0,0,0,.6), transparent 18%, transparent 82%, rgba(0,0,0,.6));
	}
	.terrain::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 30;
		pointer-events: none;
		box-shadow: inset 0 0 9rem rgba(0,0,0,.86), inset 0 0 0 1px rgba(217,185,95,.08);
	}
	.arena-atmosphere { position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
	.vault-glow {
		position: absolute;
		left: 50%; top: 50%;
		width: min(80vw, 78rem); aspect-ratio: 1;
		translate: -50% -50%;
		opacity: .55;
		background: repeating-conic-gradient(from 0deg, transparent 0 12deg, rgba(217,185,95,.04) 12.5deg 13deg);
		-webkit-mask-image: radial-gradient(circle, #000 0 48%, transparent 71%);
		mask-image: radial-gradient(circle, #000 0 48%, transparent 71%);
		animation: vault-turn 80s linear infinite;
	}
	.arena-ring { position: absolute; left: 50%; top: 50%; translate: -50% -50%; border-radius: 50%; }
	.ring-one { width: min(54vw, 48rem); aspect-ratio: 1; border: 1px solid rgba(217,185,95,.13); box-shadow: 0 0 4rem rgba(217,185,95,.05), inset 0 0 4rem rgba(217,185,95,.035); }
	.ring-two { width: min(24vw, 21rem); aspect-ratio: 1; border: 1px solid rgba(217,185,95,.21); box-shadow: 0 0 2.5rem rgba(217,185,95,.09); }
	.motes i {
		position: absolute;
		bottom: -2rem;
		width: 2px; height: 2px;
		border-radius: 50%;
		background: var(--arena-gold-hot);
		box-shadow: 0 0 8px var(--arena-gold);
		opacity: 0;
		animation: mote-rise var(--d) linear infinite;
		animation-delay: calc(var(--i) * -1.7s);
	}
	.corner { position: absolute; z-index: 2; width: 5.5rem; height: 5.5rem; opacity: .3; pointer-events: none; }
	.corner::before, .corner::after { content: ''; position: absolute; background: linear-gradient(90deg, transparent, var(--arena-gold)); }
	.corner::before { width: 100%; height: 1px; top: 0; }
	.corner::after { width: 1px; height: 100%; right: 0; background: linear-gradient(0deg, transparent, var(--arena-gold)); }
	.corner-nw { top: .65rem; left: .65rem; rotate: -90deg; }
	.corner-ne { top: .65rem; right: .65rem; }
	.corner-sw { bottom: .65rem; left: .65rem; rotate: 180deg; }
	.corner-se { bottom: .65rem; right: .65rem; rotate: 90deg; }

	.bandeau {
		position: relative;
		z-index: 4;
		background: linear-gradient(90deg, rgba(8,13,21,.92), rgba(27,33,43,.75), rgba(8,13,21,.92));
		border-color: rgba(217,185,95,.15);
		border-radius: 3px;
		box-shadow: 0 8px 28px rgba(0,0,0,.28), inset 0 1px rgba(255,255,255,.035);
	}
	.identity { display: grid; line-height: 1.05; }
	.identity small { font-size: .54rem; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: rgba(242,240,234,.34); }
	.identity b { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1rem; font-weight: 600; letter-spacing: .04em; }
	.sigil {
		width: 1.7rem; height: 1.7rem;
		padding: .28rem;
		color: var(--arena-gold-hot);
		background: radial-gradient(circle, rgba(217,185,95,.17), transparent 70%);
		border: 1px solid rgba(217,185,95,.25);
		rotate: 45deg;
	}
	.sigil :global(svg) { rotate: -45deg; }
	.finir {
		border-radius: 3px;
		letter-spacing: .06em;
		text-transform: uppercase;
		box-shadow: 0 0 20px rgba(217,185,95,.16), inset 0 1px rgba(255,255,255,.4);
	}
	.rangee {
		position: relative;
		z-index: 3;
		padding: .5rem .7rem;
		border-radius: 8px;
		background: linear-gradient(90deg, rgba(6,10,16,.4), rgba(25,32,41,.24) 50%, rgba(6,10,16,.4));
		border-block: 1px solid rgba(255,255,255,.035);
	}
	.slot {
		border-style: solid;
		border-color: rgba(217,185,95,.11);
		border-radius: 6px;
		background: radial-gradient(circle at 50% 42%, rgba(217,185,95,.06), rgba(255,255,255,.018) 55%, transparent 72%);
		box-shadow: inset 0 0 1.6rem rgba(0,0,0,.36), 0 8px 20px rgba(0,0,0,.2);
	}
	.slot.occupe:hover { transform: translateY(-.4rem) scale(1.018); }
	.slot.pret { box-shadow: 0 0 20px rgba(217,185,95,.25), inset 0 0 18px rgba(217,185,95,.08); animation: ready-breathe 2.2s ease-in-out infinite; }
	.stats {
		bottom: -.42rem;
		font-size: .76rem;
		background: linear-gradient(180deg, #f3dfaa, #bd9341);
		border: 1px solid rgba(255,245,207,.65);
		border-radius: 3px;
		box-shadow: 0 4px 12px rgba(0,0,0,.5);
	}
	.pile { border-radius: 5px; box-shadow: inset 0 0 1.5rem rgba(0,0,0,.3), 0 .5rem 1.2rem rgba(0,0,0,.18); }
	.centre { z-index: 5; }
	.tour {
		display: grid;
		min-width: 8.8rem;
		padding: .28rem 1rem;
		text-align: center;
		background: linear-gradient(90deg, transparent, rgba(217,185,95,.14), transparent);
		border: 0;
		border-block: 1px solid rgba(217,185,95,.23);
		border-radius: 0;
	}
	.tour small { font-size: .51rem; letter-spacing: .22em; text-transform: uppercase; color: rgba(217,185,95,.62); }
	.tour b { font-family: 'Cormorant Garamond', Georgia, serif; font-size: .95rem; font-weight: 600; letter-spacing: .04em; }
	.central-seal { position: absolute; left: 50%; top: 50%; width: 5.2rem; aspect-ratio: 1; translate: -50% -50%; border: 1px solid rgba(217,185,95,.14); border-radius: 50%; opacity: .34; }
	.central-seal i { position: absolute; inset: .42rem; border: 1px dashed rgba(217,185,95,.25); border-radius: 50%; animation: seal-turn 18s linear infinite; }
	.central-seal span { position: absolute; inset: 0; display: grid; place-items: center; font: 600 1rem 'Cormorant Garamond', serif; color: var(--arena-gold); }
	.central-seal.active { opacity: .78; filter: drop-shadow(0 0 12px rgba(217,185,95,.25)); }
	.ma-main { position: relative; z-index: 6; }
	.carte-main.jouable { filter: drop-shadow(0 0 8px rgba(217,185,95,.12)); }
	.carte-main.jouable:hover { transform: translateY(-1.25rem) scale(1.035); filter: drop-shadow(0 12px 18px rgba(0,0,0,.7)) drop-shadow(0 0 12px rgba(217,185,95,.22)); }
	.annonce::before, .annonce::after { content: ''; width: min(42rem, 78vw); height: 1px; background: linear-gradient(90deg, transparent, rgba(217,185,95,.56), transparent); }
	.action-hint { position: fixed; left: 50%; bottom: .3rem; z-index: 7; translate: -50% 0; margin: 0; font-size: .56rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: rgba(242,240,234,.38); pointer-events: none; }
	.fin { align-content: center; background: radial-gradient(circle at 50% 45%, rgba(93,75,34,.3), transparent 28%), rgba(3,5,8,.93); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
	.fin-emblem { width: 6rem; aspect-ratio: 1; display: grid; place-items: center; border: 1px solid rgba(217,185,95,.43); rotate: 45deg; box-shadow: 0 0 40px rgba(217,185,95,.17), inset 0 0 24px rgba(217,185,95,.08); }
	.fin-emblem span { rotate: -45deg; font: 600 1.35rem 'Cormorant Garamond',serif; color: var(--arena-gold-hot); }
	.fin-txt { line-height: .8; color: #f5edda; text-shadow: 0 0 32px rgba(217,185,95,.25); }
	.fin-sub { margin: -.2rem 0 .6rem; color: rgba(242,240,234,.5); }
	.fin-sortie { padding: .65rem 1.4rem; color: #0b0c0e; background: linear-gradient(180deg,#f2d98d,#bd943f); border-radius: 3px; font-size: .72rem; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; text-decoration: none; }

	@keyframes vault-turn { to { rotate: 360deg; } }
	@keyframes seal-turn { to { rotate: -360deg; } }
	@keyframes ready-breathe { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.12); } }
	@keyframes mote-rise { 0% { translate: 0 0; opacity: 0; } 12% { opacity: .45; } 82% { opacity: .2; } 100% { translate: 3rem -105vh; opacity: 0; } }
	@media (max-width: 900px) {
		.terrain { padding-inline: .45rem; }
		.rangee { gap: .35rem; padding-inline: .25rem; }
		.pile.lieu { width: 4.2rem; }
		.pile { width: 3.25rem; }
		.slots { gap: .25rem; }
		.bandeau { gap: .55rem; }
		.identity small, .action-hint { display: none; }
		.ressource { font-size: .7rem; }
	}
	@media (prefers-reduced-motion: reduce) {
		.vault-glow, .motes i, .central-seal i, .slot.pret { animation: none; }
	}

	/* Identité dynamique des deux peuples présents */
	.terrain::before { background: linear-gradient(180deg, color-mix(in srgb, var(--foe-faction) 7%, transparent), transparent 34%, transparent 66%, color-mix(in srgb, var(--my-faction) 8%, transparent)), repeating-linear-gradient(115deg, transparent 0 78px, rgba(255,255,255,.012) 79px 80px), linear-gradient(90deg, rgba(0,0,0,.6), transparent 18%, transparent 82%, rgba(0,0,0,.6)); }
	.haut { border-left: 2px solid color-mix(in srgb, var(--foe-faction) 72%, var(--arena-gold)); }
	.bas { border-left: 2px solid color-mix(in srgb, var(--my-faction) 72%, var(--arena-gold)); }
	.adverse .slot.occupe { box-shadow: 0 8px 20px rgba(0,0,0,.28), 0 0 18px color-mix(in srgb, var(--foe-faction) 9%, transparent); }
	.mienne .slot.occupe { box-shadow: 0 8px 20px rgba(0,0,0,.28), 0 0 18px color-mix(in srgb, var(--my-faction) 10%, transparent); }
	.my-turn .ring-two { border-color: color-mix(in srgb, var(--my-faction) 38%, var(--arena-gold)); box-shadow: 0 0 3rem color-mix(in srgb, var(--my-faction) 13%, transparent); animation: ring-pulse 3s ease-in-out infinite; }

	/* Le Korum devient l'objectif visuel principal */
	.korum-medal { width: 3.4rem; height: 3.4rem; flex: none; }
	.korum-btn, .korum-static {
		position: relative;
		width: 100%; height: 100%;
		display: grid; place-items: center;
		padding: 0;
	}
	.korum-static { color: inherit; }
	.korum-medal svg { position: absolute; inset: 0; width: 100%; height: 100%; rotate: -90deg; overflow: visible; filter: drop-shadow(0 0 6px rgba(217,185,95,.14)); }
	.kg-track, .kg-value { fill: rgba(3,5,8,.76); stroke-width: 2; }
	.kg-track { stroke: rgba(255,255,255,.1); }
	.kg-value { fill: none; stroke: var(--arena-gold); stroke-linecap: round; transition: stroke-dasharray .45s cubic-bezier(.2,.8,.2,1); }
	.haut .kg-value { stroke: color-mix(in srgb, var(--foe-faction) 62%, var(--arena-gold-hot)); }
	.bas .kg-value { stroke: color-mix(in srgb, var(--my-faction) 62%, var(--arena-gold-hot)); }
	.korum-medal small { position: absolute; top: .85rem; font-size: .42rem; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; color: rgba(242,240,234,.42); }
	.korum-medal b { position: absolute; top: 1.32rem; font: 650 1.05rem/1 'Cormorant Garamond',serif; color: #fff1c3; }
	.korum.vise { filter: drop-shadow(0 0 13px var(--arena-ember)); }
	.korum.vise .korum-btn { border: 0; animation: target-korum 1s ease-in-out infinite; }

	/* Ressource lisible d'un seul regard */
	.will-display { display: grid; gap: .2rem; min-width: 6.5rem; }
	.will-display small { font-size: .5rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: rgba(242,240,234,.38); }
	.will-pips { display: flex; gap: .24rem; min-height: .55rem; }
	.will-pips i { width: .43rem; height: .43rem; rotate: 45deg; border: 1px solid rgba(217,185,95,.3); background: rgba(255,255,255,.03); box-shadow: inset 0 0 4px rgba(0,0,0,.6); }
	.will-pips i.on { background: linear-gradient(135deg,#fff0b2,#bf8e32); border-color: #f7dfa0; box-shadow: 0 0 7px rgba(217,185,95,.62); }
	.will-display.foe .will-pips i.on { background: color-mix(in srgb, var(--foe-faction) 62%, #e9c870); }

	/* Une main adverse en éventail, davantage jeu de cartes que simple compteur */
	.main-adverse { position: relative; z-index: 5; perspective: 700px; margin-top: -.18rem; }
	.dos {
		position: relative;
		margin-inline: -.42rem;
		transform-origin: 50% -120%;
		rotate: var(--tilt);
		translate: 0 var(--drop);
		filter: drop-shadow(0 5px 7px rgba(0,0,0,.5));
		transition: translate .25s ease, filter .25s ease;
	}
	.dos:hover { translate: 0 .2rem; filter: drop-shadow(0 8px 11px rgba(0,0,0,.65)); }

	/* Les deux fronts sont identifiés sans ajouter de panneau */
	.zone-label { position: absolute; left: 50%; z-index: -1; translate: -50% 0; font-size: .48rem; font-weight: 700; letter-spacing: .32em; text-transform: uppercase; color: rgba(242,240,234,.13); white-space: nowrap; }
	.enemy-label { top: .15rem; }
	.ally-label { bottom: .12rem; }
	.rangee::after { content: ''; position: absolute; left: 12%; right: 12%; height: 1px; pointer-events: none; }
	.rangee.adverse::after { bottom: 0; background: linear-gradient(90deg,transparent,color-mix(in srgb,var(--foe-faction) 25%,transparent),transparent); }
	.rangee.mienne::after { top: 0; background: linear-gradient(90deg,transparent,color-mix(in srgb,var(--my-faction) 28%,transparent),transparent); }

	@keyframes ring-pulse { 0%,100% { opacity: .65; scale: 1; } 50% { opacity: 1; scale: 1.025; } }
	@keyframes target-korum { 0%,100% { scale: 1; } 50% { scale: 1.08; } }
	@media (prefers-reduced-motion: reduce) { .my-turn .ring-two, .korum.vise .korum-btn { animation: none; } }
	@media (max-width: 720px) {
		.korum-medal { width: 2.8rem; height: 2.8rem; }
		.korum-medal small { top: .63rem; }
		.korum-medal b { top: 1.08rem; }
		.will-display { min-width: 4.5rem; }
		.will-pips { gap: .16rem; }
		.will-pips i { width: .34rem; height: .34rem; }
	}
</style>
