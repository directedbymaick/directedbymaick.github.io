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
	import { loadDecks, validateDeck, validateDeckOwnership } from '$lib/decks';
	import { loadCollection } from '$lib/gacha';
	import { GAME_RULES } from '$lib/game/rules';
	import {
		Duel,
		Match,
		simulate,
		BOARD_SLOTS,
		type PlayerSnap,
		type HandEntry,
		type Ev,
		type Choix,
		type Sel,
		type Side
	} from '$lib/game/engine';
	import type { CardData, FactionId } from '$lib/types';
	import type { DataConnection } from '$lib/net';
	import type Peer from 'peerjs';
	import { nsKey } from '$lib/store';
	import { initEconomy, rewardMatch, track } from '$lib/economy.svelte';

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

	/* ---------------- Mode PvP : le salon se joue ICI, sur le vrai terrain ----------------
	   `?mode=pvp` — la page héberge ou rejoint elle-même le salon PeerJS ; la
	   page Salons n'est plus qu'un vestibule qui ouvre cette fenêtre. L'hôte
	   fait tourner le Match et diffuse à l'invité des vues prêtes à afficher,
	   y compris les spécifications de choix (Brume, Tala, Exva…) pour que le
	   sélecteur fonctionne des deux côtés du fil. */
	type RolePvp = 'hote' | 'invite';
	type StatutPvp = 'attente' | 'file' | 'connexion' | 'jeu' | 'quitte' | 'erreur';
	type ActionPvp =
		| { kind: 'play'; i: number; sel?: Sel }
		| { kind: 'attack'; uid: number; target: number | 'korum' }
		| { kind: 'pron'; uid: number; sel?: Sel }
		| { kind: 'swap'; uid: number }
		| { kind: 'end' };
	interface VueInvite {
		view: [PlayerSnap, PlayerSnap];
		hand: HandEntry[];
		attackers: number[];
		legal: { units: number[]; korum: boolean };
		pron: { uid: number; cost: number; text: string }[];
		swappables: number[];
		specs: (Choix | null)[];
		pronSpecs: Record<number, Choix | null>;
		meta: { turn: number; active: Side; winner: Side | -1 | null };
	}
	type MsgPvp =
		| { t: 'hello'; name: string; deck: string[] | null; faction: FactionId }
		| { t: 'action'; a: ActionPvp }
		| { t: 'sync'; events: Ev[]; view: VueInvite };

	let pvp = $state<null | { role: RolePvp; statut: StatutPvp; code: string; message?: string }>(null);
	/** Mon camp aux yeux du moteur : 0 en solo et en hôte, 1 en invité. */
	let maCote = $state<Side>(0);
	let match: Match | null = null; // hôte seulement
	let vueInvite = $state<VueInvite | null>(null); // invité seulement
	let conn: DataConnection | null = null;
	let peer: Peer | null = null;
	let annulerFile: (() => void) | null = null;
	let monNom = 'Sans-Nom';
	let maFaction: FactionId = 'vasar';
	let maListe: CardData[] | null = null;

	/* ---------------- Mode spectateur : IA contre IA sur CE terrain ----------------
	   `?mode=ia` — le simulateur envoie ses parties ici, sur le vrai plateau,
	   au lieu de la table miniature qu'il affichait en page. La partie est
	   simulée d'un bloc puis REJOUÉE à un rythme suivable : chaque événement
	   porte son instantané d'état, l'UI ne fait que les appliquer. */
	let spectateur = $state(false);
	let lecture = $state(true);
	let vitesseIA = $state(1); // multiplicateur : 0.5 lent · 1 normal · 2 rapide
	let evtsIA: Ev[] = [];
	let curseurIA = -1;
	let timerIA: ReturnType<typeof setTimeout> | null = null;

	/** le rythme du replay — les moments forts respirent, la pioche file */
	function delaiIA(e: Ev | undefined): number {
		const base = 900 / vitesseIA;
		if (!e) return base;
		if (e.t === 'attack' || e.t === 'prononcer' || e.t === 'win') return base * 1.8;
		if (e.t === 'turn') return base * 1.6;
		if (e.t === 'draw' || e.t === 'heal') return base * 0.5;
		return base;
	}

	function appliquerIA(e: Ev, muet = false) {
		version++;
		if (e.state) {
			if (!muet) marquerBlesses(e.state);
			moi = e.state[0];
			lui = e.state[1];
		}
		journal = [...journal, e].slice(-60);
		if (e.t === 'turn') {
			const m = e.msg?.match(/Tour (\d+)/);
			meta = { ...meta, turn: m ? Number(m[1]) : meta.turn, active: e.side };
		}
		if (e.t === 'win') meta = { ...meta, winner: /nul/i.test(e.msg ?? '') ? -1 : e.side };
		if (muet) return;
		if (e.t === 'verb') montrerVerbe(e.cardId);
		if (e.t === 'death') { son('hit'); etincelles('death'); }
		else if (e.t === 'effect' || e.t === 'prononcer') { son('effect'); etincelles('effect'); }
		else if (e.t === 'play' || e.t === 'summon') { son('card'); etincelles('play'); }
	}

	function pasIA() {
		if (timerIA) clearTimeout(timerIA);
		if (!lecture || curseurIA >= evtsIA.length - 1) return;
		timerIA = setTimeout(() => {
			curseurIA++;
			appliquerIA(evtsIA[curseurIA]);
			pasIA();
		}, delaiIA(evtsIA[curseurIA + 1]));
	}

	function basculeLecture() {
		lecture = !lecture;
		if (lecture) pasIA();
	}

	function cyclerVitesse() {
		vitesseIA = vitesseIA === 1 ? 2 : vitesseIA === 2 ? 0.5 : 1;
		if (lecture) pasIA();
	}

	/** saute au dénouement : applique le reste sans sons ni secousses */
	function sauterFin() {
		lecture = false;
		if (timerIA) clearTimeout(timerIA);
		while (curseurIA < evtsIA.length - 1) {
			curseurIA++;
			appliquerIA(evtsIA[curseurIA], true);
		}
	}
	let moi = $state<PlayerSnap | null>(null);
	let lui = $state<PlayerSnap | null>(null);
	let meta = $state({ turn: 1, active: 0 as 0 | 1, winner: null as 0 | 1 | -1 | null, will: 0, maxWill: 0 });
	let main = $state<HandEntry[]>([]);
	let journal = $state<Ev[]>([]);
	let impact = $state<{ id: number; kind: 'effect' | 'death' | 'play' } | null>(null);
	let audio: AudioContext | null = null;

	function son(kind: 'card' | 'hit' | 'effect' | 'turn') {
		if (sobre || typeof AudioContext === 'undefined') return;
		audio ??= new AudioContext();
		const now = audio.currentTime;
		const osc = audio.createOscillator();
		const gain = audio.createGain();
		osc.type = kind === 'hit' ? 'sawtooth' : kind === 'effect' ? 'sine' : 'triangle';
		osc.frequency.setValueAtTime(kind === 'hit' ? 92 : kind === 'turn' ? 330 : 190, now);
		osc.frequency.exponentialRampToValueAtTime(kind === 'effect' ? 720 : 120, now + .18);
		gain.gain.setValueAtTime(.0001, now);
		gain.gain.exponentialRampToValueAtTime(kind === 'hit' ? .075 : .035, now + .012);
		gain.gain.exponentialRampToValueAtTime(.0001, now + .24);
		osc.connect(gain).connect(audio.destination);
		osc.start(now); osc.stop(now + .25);
	}

	function etincelles(kind: 'effect' | 'death' | 'play') {
		impact = { id: Date.now(), kind };
		setTimeout(() => (impact = null), 760);
	}

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
		const legales = ciblesMaintenant();
		if (cible === 'korum' && legales.korum) {
			agir({ kind: 'attack', uid: t.uid, target: 'korum' });
		} else {
			const uid = Number(cible);
			if (!legales.units.includes(uid)) return;
			agir({ kind: 'attack', uid: t.uid, target: uid });
		}
		attaquant = null;
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
		effetsEvenements(evs);
	}

	function effetsEvenements(evs: Ev[]) {
		for (const e of evs) {
			if (e.t === 'verb') montrerVerbe(e.cardId);
			if (e.t === 'death') { son('hit'); etincelles('death'); }
			else if (e.t === 'effect' || e.t === 'prononcer') { son('effect'); etincelles('effect'); }
			else if (e.t === 'play' || e.t === 'summon') { son('card'); etincelles('play'); }
		}
	}

	/* ---------------- PvP : hôte ---------------- */

	function brancherHote() {
		peer?.on('connection', (c) => {
			conn = c as DataConnection;
			conn.on('data', (raw) => surDonneesHote(raw as MsgPvp));
			conn.on('close', surDepart);
		});
	}

	function surDonneesHote(msg: MsgPvp) {
		if (msg.t === 'hello') {
			annulerFile?.();
			annulerFile = null;
			match = new Match(
				cards,
				{ deck: maListe, faction: maFaction, name: monNom },
				{ deck: deckDistant(msg.deck), faction: msg.faction, name: msg.name },
				Math.floor(Math.random() * 1e9)
			);
			if (pvp) pvp.statut = 'jeu';
			diffuser();
			return;
		}
		if (msg.t === 'action') actionHote(1, msg.a);
	}

	/** Le deck imposé par l'invité, accepté seulement s'il est légal. */
	function deckDistant(ids: string[] | null): CardData[] | null {
		if (!ids) return null;
		const fiche = {
			id: 'distant',
			name: 'Deck distant',
			updatedAt: 0,
			cards: ids.reduce<Record<string, number>>((n, id) => ({ ...n, [id]: (n[id] ?? 0) + 1 }), {})
		};
		if (!validateDeck(fiche, getCard).isLegal) return null;
		const l = ids.map((id) => getCard(id)).filter((c): c is CardData => !!c);
		return l.length === GAME_RULES.deckSize ? l : null;
	}

	function actionHote(cote: Side, a: ActionPvp) {
		if (!match) return;
		let ok = false;
		if (a.kind === 'play') ok = match.play(cote, a.i, a.sel);
		else if (a.kind === 'attack') ok = match.attack(cote, a.uid, a.target);
		else if (a.kind === 'pron') ok = match.pronounce(cote, a.uid, a.sel);
		else if (a.kind === 'swap') ok = match.swap(cote, a.uid);
		else ok = match.endTurn(cote);
		if (ok) diffuser();
	}

	/** L'hôte pousse le nouvel état : à son écran, et à l'invité. */
	function diffuser() {
		if (!match) return;
		version++;
		const evs = match.drain();
		const [a, b] = match.state();
		marquerBlesses([a, b]);
		moi = a;
		lui = b;
		const m = match.meta();
		meta = { turn: m.turn, active: m.active, winner: m.winner, will: a.will ?? 0, maxWill: a.maxWill ?? 0 };
		main = match.hand(0);
		if (evs.length) journal = [...journal, ...evs].slice(-60);
		effetsEvenements(evs);
		conn?.send({ t: 'sync', events: evs, view: vueDInvite() } satisfies MsgPvp);
	}

	function vueDInvite(): VueInvite {
		const m = match!;
		const hand = m.hand(1);
		const pron = m.pronounceable(1);
		const pronSpecs: Record<number, Choix | null> = {};
		for (const p of pron) pronSpecs[p.uid] = m.choiceForPronounce(1, p.uid);
		const mm = m.meta();
		return {
			view: m.state(),
			hand,
			attackers: m.attackers(1),
			legal: m.legalTargets(1),
			pron,
			swappables: m.swappables(1),
			specs: hand.map((h, i) => (h.playable ? m.choiceFor(1, i) : null)),
			pronSpecs,
			meta: { turn: mm.turn, active: mm.active, winner: mm.winner }
		};
	}

	/* ---------------- PvP : invité ---------------- */

	function surDonneesInvite(msg: MsgPvp) {
		if (msg.t !== 'sync') return;
		version++;
		const v = msg.view;
		if (msg.events.length) journal = [...journal, ...msg.events].slice(-60);
		effetsEvenements(msg.events);
		marquerBlesses(v.view);
		moi = v.view[1];
		lui = v.view[0];
		main = v.hand;
		vueInvite = v;
		meta = { ...v.meta, will: v.view[1].will ?? 0, maxWill: v.view[1].maxWill ?? 0 };
		if (pvp && pvp.statut !== 'jeu') pvp.statut = 'jeu';
	}

	function surDepart() {
		if (meta.winner === null && pvp) pvp.statut = 'quitte';
	}

	async function rejoindreSalon(codeSalon: string) {
		maCote = 1;
		pvp = { role: 'invite', statut: 'connexion', code: codeSalon };
		const net = await import('$lib/net');
		/* En partie rapide, la fenêtre de l'hôte s'ouvre en même temps que la
		   nôtre : son salon peut mettre quelques secondes à s'enregistrer. On
		   réessaie donc au lieu d'échouer au premier refus. */
		for (let essai = 0; ; essai++) {
			try {
				const res = await net.joinHost(codeSalon);
				peer = res.peer;
				conn = res.conn;
				conn.on('data', (raw) => surDonneesInvite(raw as MsgPvp));
				conn.on('close', surDepart);
				conn.send({
					t: 'hello',
					name: monNom,
					deck: maListe ? maListe.map((c) => c.id) : null,
					faction: maFaction
				} satisfies MsgPvp);
				return;
			} catch (e) {
				if (essai >= 3) {
					pvp = {
						role: 'invite',
						statut: 'erreur',
						code: codeSalon,
						message: e instanceof Error ? e.message : 'Connexion impossible.'
					};
					return;
				}
				await new Promise((r) => setTimeout(r, 1500));
			}
		}
	}

	async function initPvp(params: URLSearchParams, liste: CardData[] | null) {
		maListe = liste;
		maFaction = (params.get('moi') as FactionId) || 'vasar';
		monNom = localStorage.getItem(nsKey('expelled-pseudo')) ?? 'Sans-Nom';
		const role = params.get('role');
		if (role === 'invite') {
			await rejoindreSalon((params.get('code') ?? '').trim().toUpperCase());
			return;
		}
		try {
			const net = await import('$lib/net');
			const codeSalon = (params.get('code') ?? '').trim().toUpperCase() || net.salonCode();
			peer = await net.createHost(codeSalon);
			brancherHote();
			if (params.get('rapide')) {
				pvp = { role: 'hote', statut: 'file', code: codeSalon };
				const { entrerFile } = await import('$lib/matchmaking');
				annulerFile = entrerFile(codeSalon, (a) => {
					annulerFile = null;
					if (a.hote) {
						// l'adversaire arrive chez nous : plus rien à faire qu'attendre son hello
						if (pvp) pvp.statut = 'connexion';
						return;
					}
					peer?.destroy();
					peer = null;
					void rejoindreSalon(a.code);
				});
			} else {
				pvp = { role: 'hote', statut: 'attente', code: codeSalon };
			}
		} catch (e) {
			pvp = {
				role: 'hote',
				statut: 'erreur',
				code: '',
				message: e instanceof Error ? e.message : 'Salon impossible à ouvrir.'
			};
		}
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
		const collection = loadCollection();
		const deck = deckId
			? loadDecks().find(
					(d) =>
						d.id === deckId &&
						validateDeck(d, getCard).isLegal &&
						validateDeckOwnership(d, collection).isLegal
				)
			: null;
		const liste = deck
			? Object.entries(deck.cards).flatMap(([id, n]) =>
					Array.from({ length: n }, () => getCard(id)!).filter(Boolean)
				)
			: null;

		initEconomy();

		if (params.get('mode') === 'pvp') {
			void initPvp(params, liste);
			sobre = matchMedia('(prefers-reduced-motion: reduce)').matches;
			horloge = setInterval(() => secondes++, 1000);
			return () => {
				if (horloge) clearInterval(horloge);
				if (verbeTimer) clearTimeout(verbeTimer);
				annulerFile?.();
				peer?.destroy();
			};
		}

		if (params.get('mode') === 'ia') {
			spectateur = true;
			const fa = (params.get('moi') as FactionId) || 'vasar';
			const fb = (params.get('lui') as FactionId) || 'exar';
			/* une liste imposée voyage en ids ; un deck auto se reconstruit avec la
			   même graine — la partie est identique à celle du simulateur */
			const lireListe = (k: string): CardData[] | null => {
				const v = params.get(k);
				if (!v) return null;
				const l = v.split(',').map((id) => getCard(id)).filter((c): c is CardData => !!c);
				return l.length === GAME_RULES.deckSize ? l : null;
			};
			const sim = simulate(cards, fa, fb, graine, [lireListe('da'), lireListe('db')]);
			evtsIA = sim.events;
			curseurIA = 0;
			appliquerIA(evtsIA[0]);
			pasIA();
			sobre = matchMedia('(prefers-reduced-motion: reduce)').matches;
			horloge = setInterval(() => secondes++, 1000);
			return () => {
				if (horloge) clearInterval(horloge);
				if (timerIA) clearTimeout(timerIA);
				if (verbeTimer) clearTimeout(verbeTimer);
			};
		}

		duel = new Duel(
			cards,
			liste && liste.length === GAME_RULES.deckSize ? liste : null,
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

	const monTour = $derived(meta.active === maCote && meta.winner === null);
	const attaquantsPossibles = $derived.by(() => {
		if (version < 0 || !monTour) return [];
		if (duel) return duel.attackers();
		if (match) return match.attackers(0);
		return vueInvite?.attackers ?? [];
	});
	const ciblesLegales = $derived.by(() => {
		if (version < 0 || attaquant === null) return { units: [], korum: false };
		return ciblesMaintenant();
	});
	const prononcables = $derived.by(() => {
		if (version < 0 || !monTour) return [];
		if (duel) return duel.pronounceable();
		if (match) return match.pronounceable(0);
		return vueInvite?.pron ?? [];
	});

	/** Les cibles légales, interrogées à l'instant T (cf. finTraine). */
	function ciblesMaintenant(): { units: number[]; korum: boolean } {
		if (duel) return duel.legalTargets();
		if (match) return match.legalTargets(0);
		return vueInvite?.legal ?? { units: [], korum: false };
	}

	/**
	 * L'action du joueur, quel que soit son siège : appliquée au Duel en solo,
	 * au Match chez l'hôte, envoyée sur le fil chez l'invité.
	 */
	function agir(a: ActionPvp) {
		if (a.kind === 'play') track('cardPlayed');
		if (a.kind === 'pron') track('prononcer');
		if (duel) {
			if (a.kind === 'play') duel.play(a.i, a.sel);
			else if (a.kind === 'attack') duel.attack(a.uid, a.target);
			else if (a.kind === 'pron') duel.pronounce(a.uid, a.sel);
			else if (a.kind === 'swap') duel.swap(a.uid);
			else duel.endTurn();
			rafraichir();
			return;
		}
		if (match) {
			actionHote(0, a);
			return;
		}
		conn?.send({ t: 'action', a } satisfies MsgPvp);
	}

	function specDeMain(i: number): Choix | null {
		if (duel) return duel.choiceFor(i);
		if (match) return match.choiceFor(0, i);
		return vueInvite?.specs[i] ?? null;
	}

	function specDePron(uid: number): Choix | null {
		if (duel) return duel.choiceForPronounce(uid);
		if (match) return match.choiceForPronounce(0, uid);
		return vueInvite?.pronSpecs[uid] ?? null;
	}

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

	/* ---------------- Le sélecteur : les choix appartiennent au joueur ----------------
	   Brume montre ses trois cartes, Eshel ouvre le deck, Tala demande sa forme,
	   Exva fait répartir ses dégâts. La carte n'est JOUÉE qu'à la validation :
	   annuler ne coûte ni la carte ni la Volonté. */
	let choix = $state<null | {
		spec: Choix;
		action: { type: 'main'; index: number } | { type: 'prononcer'; uid: number };
		picks: (number | 'korum')[];
	}>(null);

	function jouer(i: number) {
		// les cartes injouables ne sont plus `disabled` : un bouton désactivé ne
		// reçoit aucun survol, et c'est justement celles-là qu'on veut lire.
		if (!main[i]?.playable) return;
		const spec = specDeMain(i);
		if (spec) {
			choix = { spec, action: { type: 'main', index: i }, picks: [] };
			carteLue = null;
			return;
		}
		agir({ kind: 'play', i });
		carteLue = null;
	}

	function pick(v: number | 'korum') {
		if (!choix) return;
		const { spec } = choix;
		if (spec.type === 'forme' || spec.n === 1) {
			validerChoix([v]);
			return;
		}
		// choix multiples : les cartes ne se prennent qu'une fois, les dégâts se répètent
		if (spec.type === 'carte' && choix.picks.includes(v)) {
			choix.picks = choix.picks.filter((x) => x !== v);
			return;
		}
		if (choix.picks.length >= spec.n) return;
		choix.picks = [...choix.picks, v];
	}

	function validerChoix(picks?: (number | 'korum')[]) {
		if (!choix) return;
		const { spec, action } = choix;
		const p = picks ?? choix.picks;
		const sel: Sel =
			spec.type === 'carte'
				? { cartes: p.filter((x): x is number => x !== 'korum') }
				: spec.type === 'forme'
					? { forme: p[0] === 'korum' ? 0 : (p[0] ?? 0) }
					: { unites: p };
		if (action.type === 'main') agir({ kind: 'play', i: action.index, sel });
		else agir({ kind: 'pron', uid: action.uid, sel });
		choix = null;
	}

	function annulerChoix() {
		choix = null;
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
			agir({ kind: 'attack', uid: attaquant, target: uid });
			attaquant = null;
			return;
		}
		etreOuvert = { side: 1, uid };
	}

	function frapperKorum() {
		if (attaquant === null || !ciblesLegales.korum) return;
		agir({ kind: 'attack', uid: attaquant, target: 'korum' });
		attaquant = null;
	}

	function finirTour() {
		attaquant = null;
		agir({ kind: 'end' });
		son('turn');
		secondes = 0;
	}

	function prononcer(uid: number) {
		const spec = specDePron(uid);
		if (spec) {
			choix = { spec, action: { type: 'prononcer', uid }, picks: [] };
			return;
		}
		agir({ kind: 'pron', uid });
	}

	/* ---------------- Moras : l'échange ATQ/INT, enfin offert au joueur ---------------- */
	const echangeables = $derived.by(() => {
		if (version < 0 || !monTour) return [];
		if (duel) return duel.swappables();
		if (match) return match.swappables(0);
		return vueInvite?.swappables ?? [];
	});

	function echanger(uid: number) {
		agir({ kind: 'swap', uid });
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
		if (meta.active !== maCote) return; // on n'annonce que la reprise de parole
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

	/* Récompense de fin de duel — une seule fois, jamais en spectateur. Elle
	   vivait dans les pages Arène et Salons ; maintenant que tous les combats
	   se jouent ICI, c'est ici qu'elle se verse. */
	let recompense = false;
	$effect(() => {
		if (meta.winner === null || recompense || spectateur) return;
		if (!duel && !pvp) return; // page ouverte sans partie en cours
		recompense = true;
		const gagne = meta.winner === maCote;
		if (pvp) rewardMatch(gagne ? 'pvpWin' : 'pvpLoss', gagne ? 'Victoire en salon' : 'Duel de salon');
		else rewardMatch(gagne ? 'win' : 'loss', gagne ? 'Victoire en Arène' : 'Défaite honorable');
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
		<div class="table-rift"></div>
		<div class="arena-ring ring-one"></div>
		<div class="arena-ring ring-two"></div>
		<div class="motes">
			{#each Array(18) as _, i (i)}<i style="--i: {i}; --d: {12 + (i % 7) * 2}s; left: {(i * 37) % 100}%"></i>{/each}
		</div>
	</div>
	{#if impact}
		<div class="impact {impact.kind}" aria-hidden="true">
			{#each Array(22) as _, i (i)}<i style="--n:{i}; --a:{i * 16.36}deg; --r:{55 + (i % 6) * 15}px"></i>{/each}
		</div>
	{/if}
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
						class:neutralise={u.locked}
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
						class:neutralise={u.locked}
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
							<!-- le badge déclenche le Prononcer — il existait sans être branché -->
							<span
								class="pron actif"
								title="Prononcer — cliquer pour activer"
								role="button"
								tabindex="-1"
								onclick={(e) => {
									e.stopPropagation();
									prononcer(u.uid);
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.stopPropagation();
										prononcer(u.uid);
									}
								}}>EX</span
							>
						{/if}
						{#if echangeables.includes(u.uid)}
							<span
								class="echange"
								title="Moras — échanger ATQ et INT"
								role="button"
								tabindex="-1"
								onclick={(e) => {
									e.stopPropagation();
									echanger(u.uid);
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.stopPropagation();
										echanger(u.uid);
									}
								}}>⇄</span
							>
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
		{#if spectateur}
			<span class="spec-badge" title="Partie IA contre IA — vous regardez">Spectateur</span>
			<button class="finir" onclick={basculeLecture}>{lecture ? 'Pause' : 'Reprendre'}</button>
			<button class="finir ghost" onclick={cyclerVitesse} title="Rythme du replay">
				×{vitesseIA === 0.5 ? '½' : vitesseIA}
			</button>
			{#if meta.winner === null}
				<button class="finir ghost" onclick={sauterFin}>Dénouement</button>
			{/if}
		{:else}
			<button class="finir" disabled={!monTour} onclick={finirTour}>Finir le tour</button>
		{/if}
	</footer>

	{#if monTour && meta.winner === null && !spectateur}
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

	<!-- notre main — en spectateur, celle du camp du bas, faces cachées -->
	<div class="ma-main">
		{#if spectateur}
			{#each Array(moi?.hand ?? 0) as _, i (i)}
				<div class="carte-main dos"><CardBack /></div>
			{/each}
		{/if}
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
				{#if spectateur}
					{meta.winner === -1 ? 'Match nul' : `${(meta.winner === 0 ? moi : lui)?.name ?? 'L’IA'} l’emporte`}
				{:else}
					{meta.winner === maCote ? 'Victoire' : meta.winner === -1 ? 'Match nul' : 'Défaite'}
				{/if}
			</p>
			<p class="fin-sub">
				{#if spectateur}
					{meta.winner === -1 ? 'Aucun Korum ne demeure.' : 'Le duel des IA est terminé.'}
				{:else}
					{meta.winner === maCote ? 'Votre parole résonne encore dans l’Arène.' : meta.winner === -1 ? 'Aucun Korum ne demeure.' : 'Le Silence a repris le terrain.'}
				{/if}
			</p>
			<a class="fin-sortie" href={pvp ? '/arene/salons' : '/arene'}>Quitter le terrain</a>
		</div>
	{/if}

	<!-- ============ PvP : l'attente se vit sur le terrain ============ -->
	{#if pvp && pvp.statut !== 'jeu' && meta.winner === null}
		<div class="fin pvp-etat" role="dialog" aria-modal="true" in:fade={{ duration: duree(300) }}>
			<div class="fin-emblem" aria-hidden="true"><span>EX</span></div>
			{#if pvp.statut === 'attente'}
				<p class="fin-txt">Salon ouvert</p>
				<p class="fin-sub">Partagez ce code : le duel commencera dès que votre adversaire l'aura saisi.</p>
				<p class="pvp-code">{pvp.code}</p>
			{:else if pvp.statut === 'file'}
				<p class="fin-txt">Recherche d'un adversaire…</p>
				<p class="fin-sub">Vous serez apparié au premier joueur disponible.</p>
			{:else if pvp.statut === 'connexion'}
				<p class="fin-txt">Adversaire trouvé</p>
				<p class="fin-sub">Connexion au salon…</p>
			{:else if pvp.statut === 'quitte'}
				<p class="fin-txt">Votre adversaire a quitté la partie</p>
				<p class="fin-sub">Le Silence retombe sur le terrain.</p>
			{:else}
				<p class="fin-txt">Connexion impossible</p>
				<p class="fin-sub">{pvp.message ?? 'Vérifiez le code du salon et réessayez.'}</p>
			{/if}
			<a class="fin-sortie" href="/arene/salons">
				{pvp.statut === 'quitte' || pvp.statut === 'erreur' ? 'Retour aux salons' : 'Annuler'}
			</a>
		</div>
	{/if}
</div>

<svelte:window onpointermove={bougeTraine} onpointerup={finTraine} onpointercancel={() => (traine = null)} />

<!-- ============ consultation de la défausse ============ -->
{#if choix}
	<div class="voile" role="dialog" aria-modal="true" aria-label={choix.spec.titre}>
		<button class="voile-fond" aria-label="Annuler" onclick={annulerChoix}></button>
		<div class="voile-boite choix-boite" in:scale={{ duration: duree(220), start: 0.94, easing: backOut }}>
			<h3 class="choix-titre">{choix.spec.titre}</h3>

			{#if choix.spec.type === 'carte'}
				<div class="choix-cartes">
					{#each choix.spec.cartes ?? [] as c, i (i)}
						<button
							class="choix-carte"
							class:pris={choix.picks.includes(i)}
							onclick={() => pick(i)}
							onpointerenter={() => lire(c)}
							onpointerleave={() => (carteLue = null)}
						>
							<Card card={c} interactive={false} thumb />
						</button>
					{/each}
				</div>
			{:else if choix.spec.type === 'unite'}
				<div class="choix-unites">
					{#each choix.spec.unites ?? [] as u (u.uid)}
						{@const snap = u.side === maCote ? moi : lui}
						{@const vue = snap?.board.find((b) => b.uid === u.uid)}
						<button class="choix-unite" onclick={() => pick(u.uid)}>
							<b>{u.nom}</b>
							{#if vue}<span>{vue.atk} / {vue.hp}</span>{/if}
							{#if choix.spec.n > 1 && choix.picks.filter((x) => x === u.uid).length}
								<i class="pts">{choix.picks.filter((x) => x === u.uid).length}</i>
							{/if}
						</button>
					{/each}
					{#if choix.spec.korum}
						<button class="choix-unite korum" onclick={() => pick('korum')}>
							<b>Korum adverse</b>
							{#if choix.spec.n > 1 && choix.picks.filter((x) => x === 'korum').length}
								<i class="pts">{choix.picks.filter((x) => x === 'korum').length}</i>
							{/if}
						</button>
					{/if}
				</div>
			{:else}
				<div class="choix-formes">
					{#each choix.spec.formes ?? [] as f, i (i)}
						<button class="choix-forme" onclick={() => pick(i)}>{f}</button>
					{/each}
				</div>
			{/if}

			{#if choix.spec.n > 1}
				<p class="choix-compte">
					{choix.picks.length} / {choix.spec.n}
					{#if choix.spec.korum}— le reste ira au Korum{/if}
				</p>
				<button
					class="choix-valider"
					disabled={choix.spec.type === 'carte' && choix.picks.length < choix.spec.n}
					onclick={() => validerChoix()}
				>
					Valider
				</button>
			{/if}
			<button class="voile-x" onclick={annulerChoix}>Annuler</button>
		</div>
	</div>
{/if}

{#if defausseOuverte !== null}
	<div class="voile" role="dialog" aria-modal="true" aria-label="Défausse">
		<button class="voile-fond" aria-label="Fermer" onclick={() => (defausseOuverte = null)}></button>
		<div class="voile-boite discard-panel">
			<div class="discard-head"><div><small>Archives du duel</small><h2>Défausse — {defausseOuverte === 0 ? 'vous' : 'adversaire'}</h2></div><span>{(defausseOuverte === 0 ? moi : lui)?.discard ?? 0} cartes</span></div>
			<div class="discard-grid">
				{#each ((defausseOuverte === 0 ? moi : lui)?.discardCards ?? []) as id, i (`${id}-${i}`)}
					{@const c = getCard(id)}
					{#if c}<button onclick={() => (carteZoom = c)} title={`Lire ${c.name}`}><Card card={c} interactive={false} thumb /></button>{/if}
				{:else}<p class="voile-vide">Aucune carte n'a encore rejoint la défausse.</p>{/each}
			</div>
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
	.spec-badge {
		padding: 0.45rem 0.9rem;
		border: 1px solid rgba(213, 178, 94, 0.5);
		border-radius: 999px;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #d5b25e;
	}
	.finir.ghost {
		background: none;
		border: 1px solid rgba(238, 240, 245, 0.28);
		color: rgba(238, 240, 245, 0.75);
	}
	.carte-main.dos {
		pointer-events: none;
		--card-w: 6.4rem;
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

	/* ============ PVP : ATTENTE SUR LE TERRAIN ============ */
	.pvp-etat .fin-txt {
		font-size: clamp(2rem, 6vw, 3.6rem);
	}
	.pvp-code {
		margin: 0.4rem 0 0;
		font-family: 'Cinzel', Georgia, serif;
		font-size: clamp(2.2rem, 7vw, 4rem);
		font-weight: 700;
		letter-spacing: 0.35em;
		color: #f2d98d;
		text-shadow: 0 0 34px rgba(213, 178, 94, 0.55);
		user-select: all;
	}

	/* ============ LE SÉLECTEUR DE CHOIX ============ */
	.choix-boite {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		max-width: min(58rem, 92vw);
		max-height: 86vh;
		overflow-y: auto;
	}
	.choix-titre {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-size: 1.15rem;
		letter-spacing: 0.08em;
		color: var(--or, #d5b25e);
	}
	.choix-cartes {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.9rem;
	}
	.choix-carte {
		width: 9.5rem;
		padding: 0;
		border: 2px solid transparent;
		border-radius: 0.8rem;
		background: none;
		cursor: pointer;
		transition:
			transform 0.16s ease,
			border-color 0.16s ease;
	}
	.choix-carte:hover {
		transform: translateY(-4px);
	}
	.choix-carte.pris {
		border-color: #d5b25e;
		box-shadow: 0 0 18px rgba(213, 178, 94, 0.45);
	}
	.choix-unites {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.6rem;
	}
	.choix-unite {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		min-width: 8rem;
		padding: 0.7rem 1rem;
		border: 1px solid rgba(213, 178, 94, 0.4);
		border-radius: 0.6rem;
		background: rgba(10, 14, 24, 0.9);
		color: #eef0f5;
		font: inherit;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			transform 0.15s ease;
	}
	.choix-unite:hover {
		border-color: #d5b25e;
		transform: translateY(-2px);
	}
	.choix-unite.korum {
		border-color: rgba(179, 39, 58, 0.6);
	}
	.choix-unite .pts {
		position: absolute;
		top: -0.45rem;
		right: -0.45rem;
		display: grid;
		place-items: center;
		width: 1.35rem;
		height: 1.35rem;
		border-radius: 50%;
		background: #d5b25e;
		color: #14100a;
		font-style: normal;
		font-weight: 700;
		font-size: 0.78rem;
	}
	.choix-formes {
		display: flex;
		gap: 0.8rem;
	}
	.choix-forme {
		padding: 0.85rem 1.6rem;
		border: 1px solid rgba(213, 178, 94, 0.5);
		border-radius: 0.6rem;
		background: rgba(10, 14, 24, 0.9);
		color: #eef0f5;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.choix-forme:hover {
		border-color: #d5b25e;
	}
	.choix-compte {
		margin: 0;
		font-size: 0.85rem;
		color: rgba(238, 240, 245, 0.6);
	}
	.choix-valider {
		padding: 0.7rem 2.4rem;
		border: none;
		border-radius: 0.5rem;
		background: #d5b25e;
		color: #14100a;
		font: inherit;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
	}
	.choix-valider:disabled {
		opacity: 0.35;
		cursor: default;
	}
	/* badge EX actif + échange de Moras */
	.pron.actif {
		cursor: pointer;
		pointer-events: auto;
	}
	.echange {
		position: absolute;
		bottom: 0.3rem;
		right: 0.3rem;
		z-index: 3;
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background: rgba(143, 180, 217, 0.92);
		color: #10141c;
		font-weight: 700;
		cursor: pointer;
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

	/* Table rituelle — profondeur, lisibilité et feedback tactique */
	.terrain {
		--ink: #05070b;
		--ivory: #f4eedf;
		grid-template-rows: 3.9rem 2.6rem minmax(0,1fr) 2.55rem minmax(0,1fr) 3.9rem 7.6rem;
		gap: .3rem;
		padding: .65rem 1rem .35rem;
		background:
			radial-gradient(ellipse at 50% 52%, rgba(37,50,62,.72) 0, rgba(12,17,24,.92) 47%, #030507 100%),
			linear-gradient(105deg,#030507,#111722 50%,#030507);
	}
	.table-rift {
		position:absolute; inset: 9% 12%; opacity:.5;
		background:
			linear-gradient(112deg,transparent 49.8%,rgba(237,202,111,.22) 50%,transparent 50.25%),
			linear-gradient(71deg,transparent 49.8%,rgba(118,150,171,.13) 50%,transparent 50.2%);
		filter: drop-shadow(0 0 12px rgba(217,185,95,.14));
	}
	.ring-one { width:min(40vw,38rem); opacity:.28; border-style:dashed; }
	.ring-two { width:3.8rem; opacity:.4; }
	.bandeau {
		padding:.35rem .8rem;
		border:1px solid rgba(225,207,157,.17);
		background:linear-gradient(100deg,rgba(7,11,17,.97),rgba(23,30,40,.91) 45%,rgba(7,11,17,.97));
		box-shadow:0 12px 30px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.055),inset 0 -1px rgba(0,0,0,.8);
	}
	.qui { display:flex; align-items:center; gap:.85rem; min-width:11rem; }
	.identity { gap:.14rem; padding-left:.08rem; }
	.identity small { color:rgba(244,238,223,.57); font-size:.56rem; }
	.identity b { color:var(--ivory); font-size:1.08rem; }
	.sigil { flex:none; margin:0 .15rem; }
	.rangee {
		padding:.6rem .85rem; gap:1rem; overflow:visible;
		background:linear-gradient(180deg,rgba(23,30,40,.55),rgba(4,7,11,.38));
		border:1px solid rgba(215,192,132,.08); border-radius:5px;
		box-shadow:inset 0 12px 40px rgba(0,0,0,.28),0 10px 28px rgba(0,0,0,.18);
	}
	.slots { gap:clamp(.55rem,1.25vw,1.25rem); height:100%; align-items:center; }
	.slot { max-width:7.8rem; max-height:calc(100% - .25rem); }
	.slot:not(.occupe)::before { content:''; position:absolute; inset:8%; border:1px solid rgba(217,185,95,.07); clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%); }
	.slot.occupe { transform:perspective(650px) rotateX(2deg); box-shadow:0 14px 22px rgba(0,0,0,.5),0 0 0 1px rgba(242,222,167,.1); }
	.slot.occupe:hover { transform:perspective(650px) translateY(-.55rem) rotateX(0) scale(1.025); z-index:8; }
	.slot.neutralise { filter:grayscale(.72) brightness(.55); }
	.slot.neutralise::after { content:'NEUTRALISÉ'; position:absolute; inset:36% -8% auto; z-index:6; padding:.32rem; color:#ffe0d7; background:rgba(96,18,18,.88); border-block:1px solid #d66a59; font-size:.55rem; font-weight:800; letter-spacing:.18em; box-shadow:0 0 20px rgba(211,53,40,.42); transform:rotate(-5deg); }
	.centre { min-height:2.55rem; }
	.central-seal { width:3.3rem; opacity:.22; transition:opacity .25s,filter .25s; }
	.central-seal.active { opacity:.42; }
	.tour { min-width:11rem; position:relative; z-index:2; background:rgba(5,8,12,.78); }
	.chrono { position:absolute; left:calc(50% + 6.7rem); color:rgba(244,238,223,.58); }
	.pile { border-color:rgba(227,207,151,.17); background:linear-gradient(145deg,rgba(25,32,42,.84),rgba(5,8,12,.9)); transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease; }
	.pile:not(.pioche):hover { transform:translateY(-.35rem); border-color:rgba(238,208,127,.62); box-shadow:0 12px 25px rgba(0,0,0,.5),0 0 15px rgba(217,185,95,.14); }
	.pile-l { color:rgba(244,238,223,.62); }
	.ma-main { height:7.6rem; gap:clamp(.08rem,.45vw,.42rem); perspective:900px; }
	.carte-main { --card-w:5.65rem; transform-origin:50% 120%; filter:drop-shadow(0 8px 8px rgba(0,0,0,.62)); transition:transform .24s cubic-bezier(.2,.8,.2,1),opacity .2s,filter .2s; }
	.carte-main:hover,.carte-main.jouable:hover { transform:translateY(-2.2rem) scale(1.11); z-index:15; filter:drop-shadow(0 18px 18px rgba(0,0,0,.75)) drop-shadow(0 0 11px rgba(217,185,95,.22)); }
	.action-hint { bottom:.15rem; padding:.22rem .75rem; background:rgba(4,7,10,.72); border-radius:2px; color:rgba(244,238,223,.58); }
	.impact { position:fixed; left:50%; top:50%; z-index:35; pointer-events:none; }
	.impact::before { content:''; position:absolute; width:3rem; aspect-ratio:1; translate:-50% -50%; border-radius:50%; border:2px solid #f0ce73; animation:shock .7s ease-out forwards; box-shadow:0 0 30px currentColor; }
	.impact.death { color:#e84838; }.impact.effect { color:#d7b65a; }.impact.play { color:#7ea8be; }
	.impact i { position:absolute; width:4px; height:4px; border-radius:50%; background:currentColor; box-shadow:0 0 8px currentColor; animation:spark .72s cubic-bezier(.1,.7,.1,1) forwards; transform:rotate(var(--a)) translateX(0); }
	.discard-panel { width:min(72rem,92vw); max-width:none!important; min-height:min(34rem,78vh); background:linear-gradient(145deg,#121822,#080b10)!important; box-shadow:0 35px 90px rgba(0,0,0,.75),inset 0 1px rgba(255,255,255,.06); }
	.discard-head { display:flex; align-items:end; justify-content:space-between; border-bottom:1px solid rgba(217,185,95,.18); margin-bottom:1.2rem; }
	.discard-head small { color:#c7a958; font-size:.58rem; letter-spacing:.2em; text-transform:uppercase; }
	.discard-head span { margin-bottom:.75rem; color:rgba(244,238,223,.45); font-size:.72rem; }
	.discard-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(7.2rem,1fr)); gap:1rem; max-height:58vh; overflow:auto; padding:.4rem .4rem 1.4rem; }
	.discard-grid button { --card-w:100%; padding:0; border:0; background:none; cursor:zoom-in; transition:transform .2s,filter .2s; filter:drop-shadow(0 9px 10px rgba(0,0,0,.5)); }
	.discard-grid button:hover { transform:translateY(-.4rem) scale(1.035); filter:drop-shadow(0 14px 15px rgba(0,0,0,.65)); }
	@keyframes shock { from{scale:.2;opacity:1} to{scale:5;opacity:0} }
	@keyframes spark { 60%{opacity:1} to{transform:rotate(var(--a)) translateX(var(--r));opacity:0} }
	@media (max-height:800px) { .terrain{grid-template-rows:3.3rem 2rem minmax(0,1fr) 2.2rem minmax(0,1fr) 3.3rem 6.4rem}.ma-main{height:6.4rem}.carte-main{--card-w:4.8rem}.rangee{padding:.35rem .65rem} }
	@media (prefers-reduced-motion:reduce){.impact{display:none}.carte-main,.slot,.pile{transition:none!important}}
</style>
