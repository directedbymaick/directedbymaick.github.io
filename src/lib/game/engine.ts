/**
 * L'Arène : moteur de duel Expelled (règles v1) + IA heuristique.
 *
 * Simule une partie complète et produit une TIMELINE d'événements avec
 * snapshots d'état — l'UI ne fait que rejouer, le moteur reste pur.
 * Les 60 effets du set sont implémentés carte par carte (registre par id).
 */
import type { CardData, CardKind, FactionId } from '$lib/types';

export type Side = 0 | 1;

/* ---------------------------------- RNG ---------------------------------- */

function mulberry32(seed: number) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/* --------------------------------- Types --------------------------------- */

interface Unit {
	uid: number;
	card: CardData;
	baseAtk: number;
	baseHp: number;
	permAtk: number;
	permHp: number;
	tempAtk: number;
	dmg: number;
	elan: boolean;
	serment: boolean;
	chained: boolean;
	/** Neutralisé tant que le tour global < cette valeur. */
	neutralizedUntil: number;
	enteredTurn: number;
	attacked: boolean;
	swapped: boolean;
	token: boolean;
}

interface Support {
	card: CardData;
	targetUid?: number;
}

interface P {
	name: string;
	faction: FactionId;
	korum: number;
	will: number;
	maxWill: number;
	deck: CardData[];
	hand: CardData[];
	board: Unit[];
	supports: Support[];
	discard: CardData[];
	exile: CardData[];
	fatigue: number;
	firstCardPlayed: boolean;
	allyDiedThisTurn: boolean;
	allyDiedLastTurn: boolean;
	sacrificedThisTurn: boolean;
	played: Record<string, number>;
}

interface G {
	t: number; // tour global (1 tour = 1 joueur)
	active: Side;
	players: [P, P];
	lastVerb: CardData | null;
	winner: Side | -1 | null; // -1 = nulle
	rng: () => number;
	uidSeq: number;
	events: Ev[];
}

export interface UnitSnap {
	uid: number;
	cardId: string;
	name: string;
	cost: number;
	faction: string;
	atk: number;
	hp: number;
	maxHp: number;
	canAct: boolean;
	serment: boolean;
	elan: boolean;
	locked: boolean; // neutralisé ou enchaîné
	token: boolean;
}

export interface PlayerSnap {
	name: string;
	faction: FactionId;
	korum: number;
	will: number;
	maxWill: number;
	hand: number;
	deck: number;
	discard: number;
	discardCards: string[];
	exile: number;
	board: UnitSnap[];
	/** Reliques, Verbes attachés et Lieux posés. `targetUid` dit DERRIÈRE quel Être
	    l'attachement se range ; `kind` distingue le Lieu, qui a sa case dédiée. */
	supports: { cardId: string; name: string; kind: CardKind; targetUid?: number }[];
}

export type EvType =
	| 'start'
	| 'turn'
	| 'phase'
	| 'draw'
	| 'fatigue'
	| 'play'
	| 'summon'
	| 'verb'
	| 'support'
	| 'attack'
	| 'hit'
	| 'death'
	| 'sacrifice'
	| 'prononcer'
	| 'effect'
	| 'heal'
	| 'win';

export interface Ev {
	t: EvType;
	msg: string;
	side: Side;
	uid?: number;
	targetUid?: number;
	targetKorum?: boolean;
	cardId?: string;
	state: [PlayerSnap, PlayerSnap];
}

export interface SimResult {
	events: Ev[];
	winner: Side | -1;
	turns: number;
	decks: [FactionId, FactionId];
	played: [Record<string, number>, Record<string, number>];
	/** Listes de deck complètes (ids), pour l'analyse d'équilibrage. */
	deckLists: [string[], string[]];
}

/* ------------------------------ Deck builder ------------------------------ */

export const MAX_COPIES: Record<string, number> = {
	common: 3,
	rare: 2,
	epic: 2,
	legendary: 1,
	prism: 1
};

export const MAJORS: FactionId[] = ['vasar', 'exar'];

/** Emplacements d'Êtres : le terrain en compte cinq, pas un de plus. */
export const BOARD_SLOTS = 5;

/**
 * Un Être ne peut être joué que s'il reste un emplacement libre. Les Verbes,
 * Reliques et Lieux ne consomment pas d'emplacement d'Être — le Verbe se résout
 * puis part à la défausse, la Relique s'attache derrière un Être, le Lieu occupe
 * sa case dédiée.
 */
export function hasSlot(g: { players: { board: unknown[] }[] }, side: number, c: CardData): boolean {
	return c.kind !== 'etre' || g.players[side].board.length < BOARD_SLOTS;
}
const MINORS: FactionId[] = ['eshar', 'morar', 'velar'];

/** Deck de 30 : ~24 cartes du peuple majeur + ~6 renforts mineurs, dans les limites de copies. */
export function buildDeck(cardPool: CardData[], major: FactionId, rng: () => number): CardData[] {
	const deck: CardData[] = [];
	const copies = new Map<string, number>();
	const add = (c: CardData) => {
		const n = copies.get(c.id) ?? 0;
		if (n >= (MAX_COPIES[c.rarity] ?? 1)) return false;
		copies.set(c.id, n + 1);
		deck.push(c);
		return true;
	};
	const pool = cardPool.filter((c) => c.faction === major);
	const minors = cardPool.filter((c) => MINORS.includes(c.faction));
	let guard = 0;
	while (deck.length < 24 && guard++ < 500) add(pool[Math.floor(rng() * pool.length)]);
	guard = 0;
	while (deck.length < 30 && guard++ < 500) add(minors[Math.floor(rng() * minors.length)]);
	// mélange
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
	return deck;
}

/* ------------------------------- Jetons ---------------------------------- */

function token(id: string, name: string, atk: number, hp: number, faction: FactionId): CardData {
	return {
		id,
		name,
		kind: 'etre',
		cost: 0,
		attack: atk,
		health: hp,
		text: '',
		rarity: 'common',
		faction,
		art: '',
		gene: { palette: [], foilPreset: 'mat', accent: '', seed: 0 }
	};
}

/* ------------------------------ Aides d'état ------------------------------ */

const other = (s: Side): Side => (s === 0 ? 1 : 0);

function hasSupport(p: P, id: string): boolean {
	return p.supports.some((s) => s.card.id === id);
}

function hasElan(g: G, side: Side, u: Unit): boolean {
	return u.elan || hasSupport(g.players[side], 'bord-du-monde');
}

function unitAtk(g: G, side: Side, u: Unit): number {
	let a = u.baseAtk + u.permAtk + u.tempAtk;
	const p = g.players[side];
	/* Koren et Dasen n'octroient plus d'aura permanente. Quatre auras cumulatives
	   sur un terrain de cinq corps faisaient croitre la puissance au carre du
	   nombre d'Etres : La Chorale d'Or gagnait 77 % contre un deck vasar auto, et
	   21 % seulement lui revenaient. Leur bonus est desormais ponctuel, applique a
	   l'arrivee (cf. onSummon) — il reste acquis, il ne se multiplie plus. */
	if (u.card.id === 'velna')
		a += p.board.filter((o) => o !== u && hasElan(g, side, o)).length;
	if (u.card.id === 'exel' && p.sacrificedThisTurn) a += 2;
	for (const s of p.supports)
		if (s.card.id === 'couronne-dos' && s.targetUid === u.uid) a += 2;
	return Math.max(0, a);
}

function unitMaxHp(g: G, side: Side, u: Unit): number {
	let h = u.baseHp + u.permHp;
	const p = g.players[side];
	/* aura de Koren supprimee : son bonus est ponctuel, pose a l'arrivee */
	for (const s of p.supports)
		if (s.card.id === 'couronne-dos' && s.targetUid === u.uid) h += 1;
	return h;
}

function unitHp(g: G, side: Side, u: Unit): number {
	return unitMaxHp(g, side, u) - u.dmg;
}

function isLocked(g: G, u: Unit): boolean {
	return u.chained || g.t < u.neutralizedUntil;
}

function canAttack(g: G, side: Side, u: Unit): boolean {
	if (u.attacked || isLocked(g, u)) return false;
	if (u.enteredTurn === g.t && !hasElan(g, side, u)) return false;
	return unitAtk(g, side, u) > 0;
}

/* ------------------------------- Snapshots -------------------------------- */

function snapPlayer(g: G, side: Side): PlayerSnap {
	const p = g.players[side];
	return {
		name: p.name,
		faction: p.faction,
		korum: p.korum,
		will: p.will,
		maxWill: p.maxWill,
		hand: p.hand.length,
		deck: p.deck.length,
		discard: p.discard.length,
		discardCards: p.discard.map((card) => card.id),
		exile: p.exile.length,
		board: p.board.map((u) => ({
			uid: u.uid,
			cardId: u.card.id,
			name: u.card.name,
			cost: u.card.cost,
			faction: u.card.faction,
			atk: unitAtk(g, side, u),
			hp: unitHp(g, side, u),
			maxHp: unitMaxHp(g, side, u),
			canAct: canAttack(g, side, u),
			serment: u.serment,
			elan: hasElan(g, side, u),
			locked: isLocked(g, u),
			token: u.token
		})),
		supports: p.supports.map((s) => ({
			cardId: s.card.id,
			name: s.card.name,
			kind: s.card.kind,
			targetUid: s.targetUid
		}))
	};
}

function ev(g: G, e: Omit<Ev, 'state'>): void {
	g.events.push({ ...e, state: [snapPlayer(g, 0), snapPlayer(g, 1)] });
}

/* ------------------------------- Mécaniques ------------------------------- */

function draw(g: G, side: Side, n: number, silent = false): void {
	const p = g.players[side];
	for (let i = 0; i < n; i++) {
		const c = p.deck.shift();
		if (!c) {
			p.fatigue += 1;
			p.korum -= 1;
			ev(g, { t: 'fatigue', side, msg: `${p.name} pioche à vide — fatigue, Korum -1 (${p.korum})` });
			checkWin(g);
			continue;
		}
		p.hand.push(c);
		if (!silent) ev(g, { t: 'draw', side, msg: `${p.name} pioche (${p.hand.length} en main)` });
	}
}

/**
 * Point de passage UNIQUE pour poser un Être — invocation, jeton, résurrection.
 * Le plafond des cinq emplacements se tient donc ici : le poser sur `play()`
 * seul laissait passer les jetons de la Première Armée et des chœurs, et des
 * terrains à onze Êtres apparaissaient (mesuré sur 300 parties).
 *
 * Renvoie `null` quand le terrain est plein : l'effet s'éteint sans rien créer,
 * comme dans n'importe quel jeu de cartes.
 */
function spawnUnit(g: G, side: Side, card: CardData, silent = false): Unit | null {
	const p = g.players[side];
	if (p.board.length >= BOARD_SLOTS) return null;
	const text = card.text ?? '';
	const u: Unit = {
		uid: g.uidSeq++,
		card,
		baseAtk: card.attack ?? 0,
		baseHp: card.health ?? 1,
		permAtk: 0,
		permHp: 0,
		tempAtk: 0,
		dmg: 0,
		elan: /Élan/.test(text) || card.id === 'velna',
		serment: /^Serment/.test(text),
		chained: false,
		neutralizedUntil: 0,
		enteredTurn: g.t,
		attacked: false,
		swapped: false,
		token: card.cost === 0 && card.art === ''
	};
	p.board.push(u);
	if (!silent)
		ev(g, { t: 'summon', side, uid: u.uid, cardId: card.id, msg: `${card.name} entre en jeu (${unitAtk(g, side, u)}/${unitHp(g, side, u)})` });
	return u;
}

/** Les attachements posés sur cet Être partent à la défausse de leur propriétaire.
    Servait uniquement à la mort ; un Être renvoyé en main ou exilé laissait sa
    Relique orpheline sur le terrain. */
function detachSupports(g: G, uid: number): void {
	for (const owner of g.players) {
		for (const s of [...owner.supports]) {
			if (s.targetUid === uid) {
				owner.supports.splice(owner.supports.indexOf(s), 1);
				owner.discard.push(s.card);
			}
		}
	}
}

/** Détruit un Être (mort ou sacrifice). Déclenche les Ruptures. */
function destroy(g: G, side: Side, u: Unit, why: 'death' | 'sacrifice'): void {
	const p = g.players[side];
	const idx = p.board.indexOf(u);
	if (idx < 0) return;
	p.board.splice(idx, 1);
	if (!u.token) p.discard.push(u.card);
	p.allyDiedThisTurn = true;
	if (why === 'sacrifice') p.sacrificedThisTurn = true;
	detachSupports(g, u.uid);
	ev(g, {
		t: why === 'sacrifice' ? 'sacrifice' : 'death',
		side,
		uid: u.uid,
		cardId: u.card.id,
		msg: why === 'sacrifice' ? `${p.name} sacrifie ${u.card.name}` : `${u.card.name} est détruit`
	});
	// Ruptures alliées
	for (const o of p.board) {
		if (o.card.id === 'exna') {
			o.permAtk += 1;
			o.permHp += 1;
			ev(g, { t: 'effect', side, uid: o.uid, msg: `Exna se nourrit de la chute (+1/+1)` });
		}
	}
	// équilibrage run-004 : Exen déclenche sur toute mort alliée, plus seulement le sacrifice
	if (hasSupport(p, 'exen')) {
		ev(g, { t: 'effect', side, msg: `Exen, l'Envers : la chute nourrit la main` });
		draw(g, side, 1);
	}
	checkWin(g);
}

function damageUnit(g: G, side: Side, u: Unit, n: number): void {
	if (n <= 0) return;
	u.dmg += n;
	ev(g, { t: 'hit', side, uid: u.uid, msg: `${u.card.name} subit ${n} dégât${n > 1 ? 's' : ''} (${Math.max(0, unitHp(g, side, u))} INT)` });
	if (unitHp(g, side, u) <= 0) destroy(g, side, u, 'death');
}

function damageKorum(g: G, side: Side, n: number): void {
	if (n <= 0) return;
	const p = g.players[side];
	p.korum -= n;
	ev(g, { t: 'hit', side, targetKorum: true, msg: `Le Korum de ${p.name} perd ${n} Intégrité (${Math.max(0, p.korum)})` });
	checkWin(g);
}

function checkWin(g: G): void {
	if (g.winner !== null) return;
	const [a, b] = g.players;
	if (a.korum <= 0 && b.korum <= 0) g.winner = -1;
	else if (b.korum <= 0) g.winner = 0;
	else if (a.korum <= 0) g.winner = 1;
	if (g.winner !== null) {
		const msg =
			g.winner === -1
				? 'Double chute — match nul'
				: `${g.players[g.winner].name} l'emporte — le Korum adverse se tait`;
		ev(g, { t: 'win', side: g.winner === -1 ? 0 : g.winner, msg });
	}
}

/* --------------------------- Ciblage heuristique -------------------------- */

function strongest(g: G, side: Side): Unit | null {
	const b = g.players[side].board;
	if (b.length === 0) return null;
	return [...b].sort(
		(x, y) => unitAtk(g, side, y) + unitHp(g, side, y) - (unitAtk(g, side, x) + unitHp(g, side, x))
	)[0];
}

function weakest(g: G, side: Side): Unit | null {
	const b = g.players[side].board;
	if (b.length === 0) return null;
	return [...b].sort(
		(x, y) => unitAtk(g, side, x) + unitHp(g, side, x) - (unitAtk(g, side, y) + unitHp(g, side, y))
	)[0];
}

/** Score de "valeur" d'une carte en main pour l'IA. */
function handScore(c: CardData): number {
	return c.cost + (c.kind === 'etre' ? 0.5 : 0) + (c.rarity === 'legendary' || c.rarity === 'prism' ? 1 : 0);
}

/* ------------------------------ Coûts modifiés ---------------------------- */

function playCost(g: G, side: Side, c: CardData): number {
	const p = g.players[side];
	let cost = c.cost;
	if (c.kind === 'verbe' && hasSupport(p, 'tours-de-grammaire')) cost -= 1;
	if (!p.firstCardPlayed && p.board.some((u) => u.card.id === 'moren')) cost -= 1;
	return Math.max(0, cost);
}

function prononcerCost(g: G, side: Side, base: number): number {
	const p = g.players[side];
	const e = g.players[other(side)];
	let cost = base;
	cost -= p.board.filter((u) => u.card.id === 'senna').length;
	cost += e.board.filter((u) => u.card.id === 'thessa').length;
	return Math.max(0, cost);
}

/** Le facteur Mémoire/exil : L'Interstice double ces effets. */
function memFactor(p: P): number {
	return hasSupport(p, 'interstice') ? 2 : 1;
}

/* --------------------------- Choix du joueur (arène) ------------------------
   Le moteur résolvait TOUT avec les heuristiques de l'IA, même côté humain :
   la Brume choisissait « la meilleure » des trois cartes au lieu de les
   montrer, Eshel fouillait le deck toute seule, Tala décidait de sa forme.
   Un joueur humain déclare désormais ses choix : l'UI demande la spécification
   (`Choix`), collecte la sélection (`Sel`) et la passe à `play`/`pronounce`.
   Sans sélection, les heuristiques restent le repli — l'IA et les anciennes
   UIs continuent de fonctionner à l'identique. */

export interface ChoixOption {
	uid: number;
	side: Side;
	nom: string;
}

export interface Choix {
	type: 'carte' | 'unite' | 'forme';
	titre: string;
	/** combien d'options choisir (les dégâts d'Exva : un choix par point) */
	n: number;
	cartes?: CardData[];
	unites?: ChoixOption[];
	/** le Korum adverse est une option valide ('korum' dans la sélection) */
	korum?: boolean;
	formes?: string[];
}

/** Sélection du joueur — indices dans `cartes`/`formes`, uids pour les unités. */
export interface Sel {
	cartes?: number[];
	unites?: (number | 'korum')[];
	forme?: number;
}

/** Liste triée STABLE pour présenter un tas de cartes sans révéler son ordre. */
function listeStable(cartes: CardData[]): CardData[] {
	return [...cartes].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
}

/* ----------------------------- Effets des Verbes --------------------------- */

/** Résout l'effet d'un Verbe. Retourne false si aucune cible utile (l'IA ne le joue pas).
    `sel` : la sélection du joueur humain ; absente, les heuristiques tranchent. */
function resolveVerb(g: G, side: Side, c: CardData, dryRun: boolean, sel?: Sel): boolean {
	const p = g.players[side];
	const en = other(side);
	const e = g.players[en];
	const act = !dryRun;
	/** l'unité désignée par la sélection, cherchée dans les deux camps */
	const selUnit = (i = 0): Unit | null => {
		const v = sel?.unites?.[i];
		if (v === undefined || v === 'korum') return null;
		return p.board.find((u) => u.uid === v) ?? e.board.find((u) => u.uid === v) ?? null;
	};
	switch (c.id) {
		case 'messe-basse':
			if (act) draw(g, side, 1);
			return true;
		case 'chant-daube':
			if (act) {
				p.korum = Math.min(25, p.korum + 2);
				ev(g, { t: 'heal', side, msg: `Le Korum de ${p.name} respire (+2 → ${p.korum})` });
				draw(g, side, 1);
			}
			return true;
		case 'bruler-le-jour':
			if (act) damageKorum(g, en, 3);
			return true;
		case 'rompre': {
			// le joueur désigne sa cible ; l'IA garde son heuristique
			if (act && sel?.unites?.length) {
				const t = selUnit();
				if (sel.unites[0] === 'korum' || !t) damageKorum(g, en, 3);
				else damageUnit(g, en, t, 3);
				return true;
			}
			// équilibrage run-002 : 2 → 3 dégâts
			const kill = e.board.filter((u) => unitHp(g, en, u) <= 3).sort((a, b) => unitAtk(g, en, b) - unitAtk(g, en, a))[0];
			if (kill) {
				if (act) damageUnit(g, en, kill, 3);
				return true;
			}
			if (e.korum <= 9 || e.board.length === 0) {
				if (act) damageKorum(g, en, 3);
				return true;
			}
			const target = strongest(g, en);
			if (target) {
				if (act) damageUnit(g, en, target, 3);
				return true;
			}
			return false;
		}
		case 'appel-a-lordre': {
			/* Le texte dit « un Être » : le joueur peut renvoyer n'importe lequel,
			   y compris un des siens (rejouer une arrivée). Le garde-fou « coût < 2 »
			   n'était qu'une évaluation d'IA : il reste au dryRun — appliqué à la
			   résolution, il faisait perdre la carte face à un plateau de jetons. */
			if (dryRun) {
				const t = strongest(g, en);
				return !!t && t.card.cost >= 2;
			}
			const t = selUnit() ?? strongest(g, en);
			if (!t) return false;
			const owner = p.board.includes(t) ? p : e;
			owner.board.splice(owner.board.indexOf(t), 1);
			if (!t.token) owner.hand.push(t.card);
			detachSupports(g, t.uid);
			ev(g, { t: 'effect', side, targetUid: t.uid, msg: `${t.card.name} est renvoyé dans la main de son propriétaire` });
			return true;
		}
		case 'recitation':
			if (p.board.length === 0) return false;
			if (act) {
				for (const u of p.board) u.permHp += 2;
				ev(g, { t: 'effect', side, msg: `Récitation : le camp de ${p.name} gagne +0/+2` });
			}
			return true;
		case 'clameur-dexen': {
			const t = (act ? selUnit() : null) ?? strongest(g, side);
			if (!t) return false;
			if (act) {
				t.tempAtk += 2;
				ev(g, { t: 'effect', side, uid: t.uid, msg: `${t.card.name} rugit (+2 ATQ ce tour)` });
			}
			return true;
		}
		case 'seconde-sentence': {
			// équilibrage run-002 : la fenêtre s'étend au tour précédent
			if (!p.allyDiedThisTurn && !p.allyDiedLastTurn) return false;
			const t = (act ? selUnit() : null) ?? strongest(g, side);
			if (!t) return false;
			if (act) {
				t.permAtk += 2;
				t.permHp += 2;
				ev(g, { t: 'effect', side, uid: t.uid, msg: `${t.card.name} porte la seconde sentence (+2/+2)` });
			}
			return true;
		}
		case 'echo-du-dixieme-mot': {
			const sac = (act ? selUnit() : null) ?? weakest(g, side);
			if (!sac) return false;
			if (act) {
				destroy(g, side, sac, 'sacrifice');
				draw(g, side, 2);
			}
			return true;
		}
		case 'nouvelle-peau': {
			/* « Un de vos Êtres échange » — n'importe lequel. L'exigence d'un écart
			   d'au moins 2 est un seuil de rentabilité : il ne vaut que pour l'IA,
			   un humain a le droit de faire un échange défensif. */
			const auto = [...p.board].sort(
				(a, b) => unitHp(g, side, b) - unitAtk(g, side, b) - (unitHp(g, side, a) - unitAtk(g, side, a))
			)[0];
			if (dryRun) return !!auto && unitHp(g, side, auto) - unitAtk(g, side, auto) >= 2;
			const t = selUnit() ?? auto;
			if (!t) return false;
			{
				const a = t.baseAtk + t.permAtk;
				const h = t.baseHp + t.permHp - t.dmg;
				t.baseAtk = h;
				t.permAtk = 0;
				t.baseHp = a + t.dmg;
				t.permHp = 0;
				ev(g, { t: 'effect', side, uid: t.uid, msg: `${t.card.name} change de peau (${unitAtk(g, side, t)}/${unitHp(g, side, t)})` });
			}
			return true;
		}
		case 'brume-memorielle': {
			if (p.deck.length === 0) return false;
			if (act) {
				/* « Regardez les 3 prochaines cartes, piochez-en une » : le joueur
				   choisit parmi les trois, les autres restent sur le deck dans
				   l'ordre. L'heuristique ne sert plus qu'à l'IA. */
				const top = p.deck.slice(0, 3);
				const i = sel?.cartes?.[0];
				const choisie =
					i !== undefined && top[i] ? top[i] : [...top].sort((a, b) => handScore(b) - handScore(a))[0];
				p.deck.splice(p.deck.indexOf(choisie), 1);
				p.hand.push(choisie);
				ev(g, { t: 'effect', side, msg: `La brume se lève : ${choisie.name} rejoint la main` });
			}
			return true;
		}
		case 'sentence-dor': {
			const t = (act ? selUnit() : null) ?? strongest(g, en);
			if (!t) return false;
			if (act) {
				t.chained = true;
				ev(g, { t: 'effect', side, targetUid: t.uid, msg: `${t.card.name} est enchaîné — il ne peut plus attaquer` });
			}
			return true;
		}
		case 'sentence-retournee': {
			// équilibrage run-002 : mode de repli — sans allié entravé, buff simple
			const choisi = act ? selUnit() : null;
			const t = choisi && isLocked(g, choisi) ? choisi : p.board.find((u) => isLocked(g, u));
			if (!t) {
				const ally = choisi ?? strongest(g, side);
				if (!ally) return false;
				if (act) {
					ally.permAtk += 1;
					ally.permHp += 1;
					ev(g, { t: 'effect', side, uid: ally.uid, msg: `${ally.card.name} se redresse (+1/+1)` });
				}
				return true;
			}
			if (act) {
				t.chained = false;
				t.neutralizedUntil = 0;
				t.permAtk += 1;
				t.permHp += 1;
				// brise aussi la Première Chaîne adverse posée sur lui
				const chain = e.supports.find((s) => s.card.id === 'premiere-chaine' && s.targetUid === t.uid);
				if (chain) {
					e.supports.splice(e.supports.indexOf(chain), 1);
					e.discard.push(chain.card);
				}
				ev(g, { t: 'effect', side, uid: t.uid, msg: `${t.card.name} se relève, libéré (+1/+1)` });
			}
			return true;
		}
		case 'vasis-assemble': {
			/* « Neutralisez TOUS les Êtres adverses » : un seul suffit à résoudre.
			   Exiger deux Êtres est un seuil de rentabilité d'IA — au dryRun
			   seulement, sinon la carte se dépensait pour rien face à un Être. */
			if (dryRun) return e.board.length >= 2;
			if (e.board.length === 0) return false;
			if (act) {
				for (const u of e.board) u.neutralizedUntil = g.t + 2;
				ev(g, { t: 'effect', side, msg: `Le Vasis parle d'une seule voix — le camp adverse est neutralisé` });
			}
			return true;
		}
		case 'dernier-mot': {
			if (e.board.length === 0) return false;
			if (act) {
				ev(g, { t: 'effect', side, msg: `Le Dernier Mot tombe — 3 dégâts à tous les Êtres adverses` });
				for (const u of [...e.board]) damageUnit(g, en, u, 3);
			}
			return true;
		}
		case 'doublement-des-choeurs':
			if (act) {
				spawnUnit(g, side, token('choriste', 'Choriste', 1, 2, 'vasar'));
				spawnUnit(g, side, token('choriste', 'Choriste', 1, 2, 'vasar'));
			}
			return true;
		case 'premiere-armee':
			if (act) {
				for (let i = 0; i < 3; i++) spawnUnit(g, side, token('banni', 'Banni', 2, 1, 'exar'));
			}
			return true;
		default:
			return true;
	}
}

/* --------------------------- Effets d'arrivée (ETB) ------------------------ */

function onSummon(g: G, side: Side, u: Unit, sel?: Sel): void {
	const p = g.players[side];
	const en = other(side);
	const e = g.players[en];
	const selUnit = (i = 0): Unit | null => {
		const v = sel?.unites?.[i];
		if (v === undefined || v === 'korum') return null;
		return p.board.find((x) => x.uid === v) ?? e.board.find((x) => x.uid === v) ?? null;
	};
	/** carte désignée dans une liste STABLE (cf. listeStable) */
	const selCarte = (source: CardData[], i = 0): CardData | null => {
		const idx = sel?.cartes?.[i];
		if (idx === undefined) return null;
		return listeStable(source)[idx] ?? null;
	};
	switch (u.card.id) {
		case 'norel':
			draw(g, side, 1);
			break;
		case 'renna': {
			const choisi = selUnit();
			const t =
				choisi && choisi !== u
					? choisi
					: strongest(g, side) === u
						? p.board.find((o) => o !== u)
						: strongest(g, side);
			const target = t && t !== u ? t : p.board.find((o) => o !== u);
			if (target) {
				target.permAtk += 1;
				target.permHp += 1;
				ev(g, { t: 'effect', side, uid: target.uid, msg: `Renna livre une syllabe à ${target.card.name} (+1/+1)` });
			}
			break;
		}
		/* Koren : un seul souffle, au moment ou il entre. Le bonus est inscrit
		   dans permAtk/permHp — il survit a la mort de Koren, contrairement a une
		   aura, mais il ne s'empile plus avec les autres. */
		case 'koren': {
			const beneficiaires = p.board.filter((o) => o !== u);
			for (const o of beneficiaires) {
				o.permAtk += 1;
				o.permHp += 1;
			}
			if (beneficiaires.length)
				ev(g, { t: 'effect', side, uid: u.uid, msg: `Koren fait rendre gorge : ${beneficiaires.length} Être(s) gagnent +1/+1` });
			break;
		}
		/* Dasen : meme principe, borne aux Vasar comme avant. */
		case 'dasen': {
			const beneficiaires = p.board.filter((o) => o !== u && o.card.faction === 'vasar');
			for (const o of beneficiaires) o.permAtk += 1;
			if (beneficiaires.length)
				ev(g, { t: 'effect', side, uid: u.uid, msg: `Dasen donne la mesure : ${beneficiaires.length} Vasar gagnent +1 ATQ` });
			break;
		}
		case 'korven': {
			const t = selUnit() ?? strongest(g, en);
			if (t) {
				t.neutralizedUntil = g.t + 2;
				ev(g, { t: 'effect', side, targetUid: t.uid, msg: `${t.card.name} est neutralisé par la sentence de Korven` });
			}
			break;
		}
		case 'doran': {
			// équilibrage run-002 : l'exil sec devient un enchaînement définitif
			const t = strongest(g, en);
			if (t) {
				t.chained = true;
				ev(g, { t: 'effect', side, targetUid: t.uid, msg: `Doran prononce la sentence : ${t.card.name} est enchaîné` });
			}
			break;
		}
		case 'thalen':
			ev(g, { t: 'effect', side, msg: `Thalen écoute : la main adverse est révélée (${e.hand.map((c) => c.name).join(', ') || 'vide'})` });
			break;
		case 'eshin':
			ev(g, { t: 'effect', side, msg: `Eshin regarde le dessus du deck${p.deck[0] ? ` (${p.deck[0].name})` : ''}` });
			break;
		case 'eshna': {
			const n = memFactor(p);
			// la liste stable est figée AVANT les retraits : les indices restent valides
			const stable = listeStable(p.discard);
			const choisies = (sel?.cartes ?? []).map((i) => stable[i]).filter(Boolean);
			for (let i = 0; i < n; i++) {
				const carte =
					choisies[i] && p.discard.includes(choisies[i])
						? choisies[i]
						: [...p.discard].sort((a, b) => handScore(b) - handScore(a))[0];
				if (!carte) break;
				p.discard.splice(p.discard.indexOf(carte), 1);
				p.hand.push(carte);
				ev(g, { t: 'effect', side, msg: `Eshna ramasse ${carte.name} dans la défausse` });
			}
			break;
		}
		case 'eskor': {
			const n = memFactor(p);
			const stable = listeStable(p.exile);
			const choisies = (sel?.cartes ?? []).map((i) => stable[i]).filter(Boolean);
			for (let i = 0; i < n; i++) {
				const carte =
					choisies[i] && p.exile.includes(choisies[i])
						? choisies[i]
						: [...p.exile].sort((a, b) => handScore(b) - handScore(a))[0];
				if (!carte) break;
				p.exile.splice(p.exile.indexOf(carte), 1);
				p.hand.push(carte);
				ev(g, { t: 'effect', side, msg: `Eskor rapporte ${carte.name} de l'exil — l'impossible` });
			}
			break;
		}
		case 'eshel': {
			/* « Cherchez n'importe quelle carte » : c'est un tuteur, le choix
			   appartient au joueur. La liste présentée est triée (listeStable)
			   pour ne pas révéler l'ordre du deck. */
			const carte =
				selCarte(p.deck) ?? [...p.deck].sort((a, b) => handScore(b) - handScore(a))[0];
			if (carte) {
				p.deck.splice(p.deck.indexOf(carte), 1);
				p.hand.push(carte);
				ev(g, { t: 'effect', side, msg: `Eshel ouvre l'archive : ${carte.name} rejoint la main` });
			}
			break;
		}
		case 'korsa': {
			const idx = sel?.cartes?.[0];
			const s = (idx !== undefined ? e.supports[idx] : undefined) ?? e.supports[0];
			if (s) {
				e.supports.splice(e.supports.indexOf(s), 1);
				e.discard.push(s.card);
				// briser la Première Chaîne libère l'Être qu'elle retenait
				if (s.card.id === 'premiere-chaine' && s.targetUid !== undefined) {
					const held = p.board.find((x) => x.uid === s.targetUid);
					if (held) held.chained = false;
				}
				ev(g, { t: 'effect', side, msg: `Korsa brise ${s.card.name}` });
			}
			break;
		}
		case 'tala': {
			/* « choisissez sa forme » : le joueur décide ; l'heuristique ne vaut
			   que pour l'IA. forme 0 = défensive (1/3), forme 1 = offensive (3/1). */
			const aggressive =
				sel?.forme !== undefined
					? sel.forme === 1
					: e.korum <= 12 || p.board.length > e.board.length;
			if (aggressive) {
				u.baseAtk = 3;
				u.baseHp = 1;
			}
			ev(g, { t: 'effect', side, uid: u.uid, msg: `Tala choisit sa forme ${aggressive ? 'offensive (3/1)' : 'défensive (1/3)'}` });
			break;
		}
		case 'enfant-de-xenen': {
			if (g.lastVerb) {
				ev(g, { t: 'effect', side, msg: `L'Enfant répète le dernier Verbe : ${g.lastVerb.name}` });
				resolveVerb(g, side, g.lastVerb, false);
			}
			break;
		}
	}
}

/* ------------------------------ Jouer une carte ---------------------------- */

function playCard(g: G, side: Side, c: CardData, sel?: Sel): void {
	const p = g.players[side];
	const cost = playCost(g, side, c);
	p.will -= cost;
	p.firstCardPlayed = true;
	p.hand.splice(p.hand.indexOf(c), 1);
	p.played[c.id] = (p.played[c.id] ?? 0) + 1;

	if (c.kind === 'etre') {
		ev(g, { t: 'play', side, cardId: c.id, msg: `${p.name} joue ${c.name} (${cost} Volonté)` });
		const u = spawnUnit(g, side, c);
		if (u) onSummon(g, side, u, sel);
	} else if (c.kind === 'verbe') {
		ev(g, { t: 'verb', side, cardId: c.id, msg: `${p.name} prononce ${c.name} (${cost} Volonté)` });
		resolveVerb(g, side, c, false, sel);
		g.lastVerb = c;
		p.discard.push(c);
	} else {
		// relique / lieu — l'attachement suit la sélection du joueur, sinon l'heuristique
		const selUid = sel?.unites?.[0];
		const pick = (camp: P) =>
			typeof selUid === 'number' ? camp.board.find((u) => u.uid === selUid) : undefined;
		let targetUid: number | undefined;
		if (c.id === 'couronne-dos') targetUid = (pick(p) ?? strongest(g, side) ?? undefined)?.uid;
		if (c.id === 'premiere-chaine') {
			const t = pick(g.players[other(side)]) ?? strongest(g, other(side));
			if (t) {
				t.chained = true;
				targetUid = t.uid;
			}
		}
		p.supports.push({ card: c, targetUid });
		ev(g, { t: 'support', side, cardId: c.id, msg: `${p.name} installe ${c.name}` });
	}
	checkWin(g);
}

/** L'IA décide si une carte vaut la peine d'être jouée maintenant. */
function worthPlaying(g: G, side: Side, c: CardData): boolean {
	const p = g.players[side];
	const en = other(side);
	if (c.kind === 'verbe') return resolveVerb(g, side, c, true);
	if (c.id === 'couronne-dos') return p.board.length > 0;
	if (c.id === 'premiere-chaine') return g.players[en].board.length > 0;
	if (c.id === 'eskor') return true; // corps correct même sans exil
	// la Porte ne vaut un tour que si un Prononcer peut en profiter
	if (c.id === 'porte-du-dehors')
		return p.board.some((u) => u.card.prononcer) || p.hand.some((h) => h.prononcer);
	return true;
}

/* ------------------------------- Prononcer --------------------------------- */

function tryPrononcer(g: G, side: Side): boolean {
	const p = g.players[side];
	const en = other(side);
	const e = g.players[en];
	const boost = hasSupport(p, 'porte-du-dehors') ? 1 : 0;
	for (const u of [...p.board]) {
		const pr = u.card.prononcer;
		if (!pr) continue;
		const cost = prononcerCost(g, side, pr.cost);
		if (p.will < cost) continue;
		if (u.card.id === 'exva') {
			const dmg = 5 + boost;
			const killable = e.board.filter((x) => unitHp(g, en, x) <= dmg);
			const value = killable.reduce((s, x) => s + x.card.cost, 0);
			if (value >= 5 || e.korum <= dmg) {
				p.will -= cost;
				ev(g, { t: 'prononcer', side, uid: u.uid, msg: `Exva PRONONCE (${cost}) — ${dmg} dégâts répartis` });
				triggerSenel(g, side);
				resoudreExva(g, side);
				exileUnit(g, side, u);
				return true;
			}
		}
		if (u.card.id === 'rasen') {
			const enemyValue = e.board.reduce((s, x) => s + x.card.cost, 0);
			const ownValue = p.board.reduce((s, x) => s + (x === u ? 0 : x.card.cost), 0);
			if (enemyValue - ownValue >= 5) {
				p.will -= cost;
				ev(g, { t: 'prononcer', side, uid: u.uid, msg: `Rasen PRONONCE (${cost}) — tous les autres Êtres tombent` });
				triggerSenel(g, side);
				for (const t of [...e.board]) destroy(g, en, t, 'death');
				for (const t of [...p.board]) if (t !== u) destroy(g, side, t, 'death');
				exileUnit(g, side, u);
				return true;
			}
		}
	}
	return false;
}

function exileUnit(g: G, side: Side, u: Unit): void {
	const p = g.players[side];
	const idx = p.board.indexOf(u);
	if (idx >= 0) {
		p.board.splice(idx, 1);
		if (!u.token) p.exile.push(u.card);
		detachSupports(g, u.uid);
		ev(g, { t: 'effect', side, uid: u.uid, msg: `${u.card.name} est exilé — définitivement` });
	}
}

/** Senel (adverse) : « Quand un Prononcer adverse est activé : 2 dégâts au Nom adverse. » */
function triggerSenel(g: G, prononcerSide: Side): void {
	const en = other(prononcerSide);
	const watchers = g.players[en].board.filter((u) => u.card.id === 'senel');
	for (const _ of watchers) {
		ev(g, { t: 'effect', side: en, msg: `Senel punit le Prononcer — 2 dégâts au Korum adverse` });
		damageKorum(g, prononcerSide, 2);
	}
}

/* --------------------------------- Combat ---------------------------------- */

function attack(g: G, side: Side, u: Unit, target: Unit | 'korum'): void {
	const en = other(side);
	const e = g.players[en];
	u.attacked = true;
	const atk = unitAtk(g, side, u);
	if (target === 'korum') {
		ev(g, { t: 'attack', side, uid: u.uid, targetKorum: true, msg: `${u.card.name} frappe le Korum adverse (${atk})` });
		damageKorum(g, en, atk);
	} else {
		ev(g, { t: 'attack', side, uid: u.uid, targetUid: target.uid, msg: `${u.card.name} (${atk}) affronte ${target.card.name} (${unitAtk(g, en, target)})` });
		const back = unitAtk(g, en, target);
		damageUnit(g, en, target, atk);
		damageUnit(g, side, u, back);
	}
	if (u.card.id === 'morna' && g.players[side].board.includes(u)) {
		ev(g, { t: 'effect', side, uid: u.uid, msg: `Morna se blesse en frappant (-1)` });
		damageUnit(g, side, u, 1);
	}
}

function combatPhase(g: G, side: Side): void {
	const p = g.players[side];
	const en = other(side);
	const e = g.players[en];

	// Moras : échange ATQ/INT quand c'est rentable
	if (p.board.some((u) => u.card.id === 'moras')) {
		for (const u of p.board) {
			if (u.swapped || u.token) continue;
			const a = unitAtk(g, side, u);
			const h = unitHp(g, side, u);
			if (h > a + 1 && canAttack(g, side, u)) {
				const ba = u.baseAtk;
				u.baseAtk = u.baseHp;
				u.baseHp = ba;
				u.swapped = true;
				ev(g, { t: 'effect', side, uid: u.uid, msg: `${u.card.name} inverse son être (${unitAtk(g, side, u)}/${unitHp(g, side, u)}) — le sourire de Moras` });
			}
		}
	}

	let guard = 0;
	while (guard++ < 30) {
		if (g.winner !== null) return;
		const attackers = p.board.filter((u) => canAttack(g, side, u));
		if (attackers.length === 0) return;

		// règle v1.2 : le Korum est protégé par les Êtres adverses — mais un Être
		// neutralisé ou enchaîné ne monte pas la garde. Plateau sans défenseur
		// valide → le Nom est exposé (sauf effets « directement », toujours libres).
		const wall = e.board.filter((t) => !isLocked(g, t));
		if (wall.length === 0) {
			for (const u of attackers) {
				if (g.winner !== null) return;
				if (g.players[en].board.some((t) => !isLocked(g, t))) break; // un défenseur est apparu
				attack(g, side, u, 'korum');
			}
			continue;
		}

		const u = attackers.sort((a, b) => unitAtk(g, side, b) - unitAtk(g, side, a))[0];
		const myAtk = unitAtk(g, side, u);
		const myHp = unitHp(g, side, u);

		// le Serment fixe la priorité de ciblage parmi les défenseurs
		const sermentWall = wall.filter((t) => t.serment);
		const pool = sermentWall.length > 0 ? sermentWall : wall;

		// 1) tuer si possible (le plus cher d'abord), 2) sinon entamer en survivant,
		// 3) sinon retenir ses coups — attaquer pour rien est un cadeau.
		const kills = pool.filter((t) => unitHp(g, en, t) <= myAtk);
		const pick =
			kills.filter((t) => unitAtk(g, en, t) < myHp).sort((a, b) => b.card.cost - a.card.cost)[0] ??
			kills.sort((a, b) => b.card.cost - a.card.cost)[0] ??
			pool
				.filter((t) => unitAtk(g, en, t) < myHp || myAtk >= 3)
				.sort((a, b) => unitHp(g, en, a) - unitHp(g, en, b))[0];
		if (!pick) {
			u.attacked = true; // il retient son coup ce tour-ci
			continue;
		}
		attack(g, side, u, pick);
	}
}

/* ------------------------------- Tour de jeu -------------------------------- */

function playPhase(g: G, side: Side): void {
	const p = g.players[side];
	let guard = 0;
	while (guard++ < 20) {
		if (g.winner !== null) return;
		if (tryPrononcer(g, side)) continue;
		const playable = p.hand
			.filter(
				(c) => playCost(g, side, c) <= p.will && hasSlot(g, side, c) && worthPlaying(g, side, c)
			)
			.sort((a, b) => handScore(b) - handScore(a));
		const c = playable[0];
		if (!c) return;
		playCard(g, side, c);
	}
}

function startTurn(g: G, side: Side): void {
	const p = g.players[side];
	g.active = side;
	g.t += 1;
	p.maxWill = Math.min(10, p.maxWill + 1);
	p.will = p.maxWill;
	p.firstCardPlayed = false;
	p.allyDiedLastTurn = p.allyDiedThisTurn;
	p.allyDiedThisTurn = false;
	p.sacrificedThisTurn = false;
	for (const u of p.board) {
		u.attacked = false;
		u.swapped = false;
	}
	ev(g, { t: 'turn', side, msg: `— Tour ${Math.ceil(g.t / 2)} · ${p.name} (${p.will} Volonté) —` });
	if (!(g.t === 1)) draw(g, side, 1);
}

function endTurnFx(g: G, side: Side): void {
	const p = g.players[side];
	for (const u of p.board) {
		if (u.card.id === 'dorvel') {
			ev(g, { t: 'effect', side, uid: u.uid, msg: `Dorvel copie une page — pioche` });
			draw(g, side, 1);
		}
	}
	// équilibrage run-002 : les dégâts PERSISTENT (le soin de fin de tour est supprimé)
	for (const u of p.board) u.tempAtk = 0;
}

function runTurn(g: G, side: Side): void {
	startTurn(g, side);
	if (g.winner !== null) return;

	playPhase(g, side);
	if (g.winner !== null) return;
	combatPhase(g, side);
	if (g.winner !== null) return;
	// seconde vague : la Volonté restante après combat (ex. après un trade favorable)
	playPhase(g, side);
	if (g.winner !== null) return;

	endTurnFx(g, side);
}

/* -------------------------------- Simulation -------------------------------- */

export function simulate(
	cardPool: CardData[],
	deckA: FactionId,
	deckB: FactionId,
	seed: number,
	/** decks imposés (Laboratoire) : liste de 30 cartes par camp, ou null = deck auto */
	presetDecks?: [CardData[] | null, CardData[] | null]
): SimResult {
	const rng = mulberry32(seed);
	const preset = (i: 0 | 1): CardData[] | null => {
		const p = presetDecks?.[i];
		return p && p.length === 30 ? p : null;
	};
	const mk = (faction: FactionId, name: string, forced: CardData[] | null): P => ({
		name,
		faction,
		korum: 25,
		will: 0,
		maxWill: 0,
		deck: forced ? shuffleInPlace([...forced], rng) : buildDeck(cardPool, faction, rng),
		hand: [],
		board: [],
		supports: [],
		discard: [],
		exile: [],
		fatigue: 0,
		firstCardPlayed: false,
		allyDiedThisTurn: false,
		allyDiedLastTurn: false,
		sacrificedThisTurn: false,
		played: {}
	});
	const g: G = {
		t: 0,
		active: 0,
		players: [
			mk(deckA, `IA·${deckA.toUpperCase()}`, preset(0)),
			mk(deckB, `IA·${deckB.toUpperCase()}`, preset(1))
		],
		lastVerb: null,
		winner: null,
		rng,
		uidSeq: 1,
		events: []
	};
	const deckLists: [string[], string[]] = [
		g.players[0].deck.map((c) => c.id),
		g.players[1].deck.map((c) => c.id)
	];
	// équilibrage run-002 : le second joueur pioche 5 cartes de départ
	draw(g, 0, 4, true);
	draw(g, 1, 5, true);
	ev(g, { t: 'start', side: 0, msg: `Le duel commence : ${g.players[0].name} contre ${g.players[1].name}` });

	while (g.winner === null && g.t < 80) {
		runTurn(g, (g.t % 2) as Side);
	}
	if (g.winner === null) {
		g.winner = g.players[0].korum > g.players[1].korum ? 0 : g.players[0].korum < g.players[1].korum ? 1 : -1;
		ev(g, {
			t: 'win',
			side: g.winner === -1 ? 0 : g.winner,
			msg: g.winner === -1 ? 'Épuisement — match nul' : `${g.players[g.winner].name} l'emporte à l'usure`
		});
	}
	return {
		events: g.events,
		winner: g.winner,
		turns: Math.ceil(g.t / 2),
		decks: [deckA, deckB],
		played: [g.players[0].played, g.players[1].played],
		deckLists
	};
}

/* ----------------------- Spécification des choix joueur ----------------------- */

/**
 * Ce qu'une carte demande au joueur AVANT d'être jouée. `null` : rien — soit la
 * carte n'a pas de choix, soit aucune option n'existe (l'effet se résout seul).
 * Toutes les options d'un effet d'arrivée se calculent avant la pose : aucune ne
 * dépend de l'état d'après-invocation.
 */
function choixPour(g: G, side: Side, c: CardData): Choix | null {
	const p = g.players[side];
	const en = other(side);
	const e = g.players[en];
	const miens = (): ChoixOption[] =>
		p.board.map((u) => ({ uid: u.uid, side, nom: u.card.name }));
	const siens = (): ChoixOption[] =>
		e.board.map((u) => ({ uid: u.uid, side: en, nom: u.card.name }));
	switch (c.id) {
		case 'brume-memorielle': {
			const top = p.deck.slice(0, 3);
			return top.length > 1
				? { type: 'carte', titre: 'Brume des souvenirs — gardez une carte', n: 1, cartes: top }
				: null;
		}
		case 'rompre':
			return e.board.length
				? { type: 'unite', titre: 'Rompre — 3 dégâts sur…', n: 1, unites: siens(), korum: true }
				: null; // plateau vide : les dégâts vont au Korum, rien à choisir
		case 'appel-a-lordre': {
			const tous = [...siens(), ...miens()];
			return tous.length
				? { type: 'unite', titre: 'Appel à l’ordre — renvoyez un Être', n: 1, unites: tous }
				: null;
		}
		case 'clameur-dexen':
			return p.board.length > 1
				? { type: 'unite', titre: 'Clameur d’Exen — +2 ATQ pour…', n: 1, unites: miens() }
				: null;
		case 'seconde-sentence':
			return (p.allyDiedThisTurn || p.allyDiedLastTurn) && p.board.length > 1
				? { type: 'unite', titre: 'Seconde sentence — +2/+2 pour…', n: 1, unites: miens() }
				: null;
		case 'echo-du-dixieme-mot':
			return p.board.length
				? { type: 'unite', titre: 'Écho du dixième mot — sacrifiez…', n: 1, unites: miens() }
				: null;
		case 'nouvelle-peau':
			return p.board.length > 1
				? { type: 'unite', titre: 'Nouvelle peau — échangez ATQ et INT de…', n: 1, unites: miens() }
				: null;
		case 'sentence-dor':
			return e.board.length > 1
				? { type: 'unite', titre: 'Sentence d’or — enchaînez…', n: 1, unites: siens() }
				: null;
		case 'sentence-retournee': {
			const entraves = p.board.filter((u) => isLocked(g, u));
			const pool = entraves.length ? entraves : p.board;
			return pool.length > 1
				? {
						type: 'unite',
						titre: entraves.length
							? 'Sentence retournée — libérez…'
							: 'Sentence retournée — +1/+1 pour…',
						n: 1,
						unites: pool.map((u) => ({ uid: u.uid, side, nom: u.card.name }))
					}
				: null;
		}
		case 'couronne-dos':
			return p.board.length > 1
				? { type: 'unite', titre: 'Couronne d’os — attachez à…', n: 1, unites: miens() }
				: null;
		case 'premiere-chaine':
			return e.board.length > 1
				? { type: 'unite', titre: 'Première Chaîne — entravez…', n: 1, unites: siens() }
				: null;
		// ------- effets d'arrivée -------
		case 'eshel':
			return p.deck.length > 1
				? { type: 'carte', titre: 'Eshel — cherchez une carte du deck', n: 1, cartes: listeStable(p.deck) }
				: null;
		case 'eshna': {
			const nb = Math.min(memFactor(p), p.discard.length);
			return p.discard.length > 1
				? { type: 'carte', titre: 'Eshna — reprenez dans la défausse', n: nb, cartes: listeStable(p.discard) }
				: null;
		}
		case 'eskor': {
			const nb = Math.min(memFactor(p), p.exile.length);
			return p.exile.length > 1
				? { type: 'carte', titre: 'Eskor — rapportez de l’exil', n: nb, cartes: listeStable(p.exile) }
				: null;
		}
		case 'korven':
			return e.board.length > 1
				? { type: 'unite', titre: 'Korven — neutralisez…', n: 1, unites: siens() }
				: null;
		case 'korsa':
			return e.supports.length > 1
				? { type: 'carte', titre: 'Korsa — brisez…', n: 1, cartes: e.supports.map((x) => x.card) }
				: null;
		case 'renna':
			return p.board.length > 1
				? { type: 'unite', titre: 'Renna — +1/+1 pour…', n: 1, unites: miens() }
				: null;
		case 'tala':
			return {
				type: 'forme',
				titre: 'Tala — choisissez sa forme',
				n: 1,
				formes: ['Défensive (1/3)', 'Offensive (3/1)']
			};
	}
	return null;
}

/** Le Prononcer d'Exva répartit ses dégâts : un choix par point. */
function choixPourPrononcer(g: G, side: Side, u: Unit): Choix | null {
	const en = other(side);
	const e = g.players[en];
	if (u.card.id !== 'exva' || e.board.length === 0) return null;
	const total = 5 + (hasSupport(g.players[side], 'porte-du-dehors') ? 1 : 0);
	return {
		type: 'unite',
		titre: `Exva — répartissez ${total} dégâts (un choix par point)`,
		n: total,
		unites: e.board.map((x) => ({ uid: x.uid, side: en, nom: x.card.name })),
		korum: true
	};
}

/**
 * Résolution partagée du Prononcer d'Exva : chaque entrée de `sel.unites` vaut
 * UN point de dégât ; les points restants (sélection courte ou cible déjà
 * morte) vont au Korum. Sans sélection : l'heuristique (achève du plus petit
 * au plus grand, le reste au Korum).
 */
function resoudreExva(g: G, side: Side, sel?: Sel): void {
	const en = other(side);
	const e = g.players[en];
	const boost = hasSupport(g.players[side], 'porte-du-dehors') ? 1 : 0;
	let left = 5 + boost;
	if (sel?.unites?.length) {
		for (const v of sel.unites) {
			if (left <= 0) break;
			if (v === 'korum') {
				damageKorum(g, en, 1);
				left--;
				continue;
			}
			const t = e.board.find((x) => x.uid === v);
			if (t) {
				damageUnit(g, en, t, 1);
				left--;
			}
		}
		if (left > 0) damageKorum(g, en, left);
		return;
	}
	const targets = [...e.board].sort((a, b) => unitHp(g, en, a) - unitHp(g, en, b));
	for (const t of targets) {
		const hp = unitHp(g, en, t);
		if (hp <= left) {
			left -= hp;
			damageUnit(g, en, t, hp);
		}
	}
	if (left > 0) damageKorum(g, en, left);
}

/* --------------------- Duel interactif : Joueur 1 contre IA --------------------- */

export interface HandEntry {
	card: CardData;
	cost: number;
	playable: boolean;
}

export interface DuelMeta {
	turn: number;
	active: Side;
	winner: Side | -1 | null;
	will: number;
	maxWill: number;
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

/**
 * Une partie contrôlée : le camp 0 est joué par l'humain (actions unitaires),
 * le camp 1 par l'IA heuristique du simulateur. Chaque action pousse des
 * événements avec snapshots — l'UI les draine et les rejoue.
 */
export class Duel {
	private g: G;

	constructor(
		cardPool: CardData[],
		humanDeck: CardData[] | null,
		humanFaction: FactionId,
		aiFaction: FactionId,
		seed: number,
		humanName = 'Vous'
	) {
		const rng = mulberry32(seed);
		const mk = (faction: FactionId, name: string, deck: CardData[]): P => ({
			name,
			faction,
			korum: 25,
			will: 0,
			maxWill: 0,
			deck,
			hand: [],
			board: [],
			supports: [],
			discard: [],
			exile: [],
			fatigue: 0,
			firstCardPlayed: false,
			allyDiedThisTurn: false,
			allyDiedLastTurn: false,
			sacrificedThisTurn: false,
			played: {}
		});
		const hd =
			humanDeck && humanDeck.length === 30
				? shuffleInPlace([...humanDeck], rng)
				: buildDeck(cardPool, humanFaction, rng);
		this.g = {
			t: 0,
			active: 0,
			players: [
				mk(humanFaction, humanName, hd),
				mk(aiFaction, `IA·${aiFaction.toUpperCase()}`, buildDeck(cardPool, aiFaction, rng))
			],
			lastVerb: null,
			winner: null,
			rng,
			uidSeq: 1,
			events: []
		};
		draw(this.g, 0, 4, true);
		draw(this.g, 1, 5, true);
		ev(this.g, {
			t: 'start',
			side: 0,
			msg: `Le duel commence : ${this.g.players[0].name} contre ${this.g.players[1].name}`
		});
		startTurn(this.g, 0);
	}

	/** Récupère (et vide) les événements accumulés depuis le dernier appel. */
	drain(): Ev[] {
		return this.g.events.splice(0);
	}

	state(): [PlayerSnap, PlayerSnap] {
		return [snapPlayer(this.g, 0), snapPlayer(this.g, 1)];
	}

	meta(): DuelMeta {
		const p = this.g.players[0];
		return {
			turn: Math.ceil(this.g.t / 2),
			active: this.g.active,
			winner: this.g.winner,
			will: p.will,
			maxWill: p.maxWill
		};
	}

	private get myTurn(): boolean {
		return this.g.active === 0 && this.g.winner === null;
	}

	/** La main du joueur, avec coût réel et jouabilité. */
	hand(): HandEntry[] {
		const p = this.g.players[0];
		return p.hand.map((c) => ({
			card: c,
			cost: playCost(this.g, 0, c),
			playable: this.myTurn && playCost(this.g, 0, c) <= p.will && hasSlot(this.g, 0, c)
		}));
	}

	/**
	 * Le choix que cette carte demanderait si elle était jouée maintenant.
	 * L'UI le présente AVANT d'appeler `play(index, sel)` ; `null` = jouer direct.
	 */
	choiceFor(index: number): Choix | null {
		const c = this.g.players[0].hand[index];
		if (!this.myTurn || !c) return null;
		return choixPour(this.g, 0, c);
	}

	play(index: number, sel?: Sel): boolean {
		const p = this.g.players[0];
		const c = p.hand[index];
		if (!this.myTurn || !c || playCost(this.g, 0, c) > p.will) return false;
		if (!hasSlot(this.g, 0, c)) return false; // les cinq emplacements sont pris
		playCard(this.g, 0, c, sel);
		return true;
	}

	/* ---- Moras : l'échange ATQ/INT, jusqu'ici réservé à l'IA ---- */

	/** uids des Êtres qui peuvent échanger leur ATQ et leur INT ce tour. */
	swappables(): number[] {
		if (!this.myTurn) return [];
		const p = this.g.players[0];
		if (!p.board.some((u) => u.card.id === 'moras')) return [];
		return p.board.filter((u) => !u.swapped && !u.token).map((u) => u.uid);
	}

	swap(uid: number): boolean {
		if (!this.myTurn) return false;
		const g = this.g;
		const p = g.players[0];
		if (!p.board.some((u) => u.card.id === 'moras')) return false;
		const u = p.board.find((x) => x.uid === uid);
		if (!u || u.swapped || u.token) return false;
		const ba = u.baseAtk;
		u.baseAtk = u.baseHp;
		u.baseHp = ba;
		u.swapped = true;
		ev(g, { t: 'effect', side: 0, uid: u.uid, msg: `${u.card.name} inverse son être (${unitAtk(g, 0, u)}/${unitHp(g, 0, u)}) — le sourire de Moras` });
		return true;
	}

	/** uids des Êtres qui peuvent attaquer ce tour. */
	attackers(): number[] {
		if (!this.myTurn) return [];
		return this.g.players[0].board.filter((u) => canAttack(this.g, 0, u)).map((u) => u.uid);
	}

	/** Cibles légales : Serment prioritaire ; Korum exposé seulement sans défenseur valide. */
	legalTargets(): { units: number[]; korum: boolean } {
		const e = this.g.players[1];
		const wall = e.board.filter((t) => !isLocked(this.g, t));
		if (wall.length === 0) return { units: [], korum: true };
		const serments = wall.filter((t) => t.serment);
		return { units: (serments.length > 0 ? serments : wall).map((t) => t.uid), korum: false };
	}

	attack(uid: number, target: number | 'korum'): boolean {
		if (!this.myTurn) return false;
		const u = this.g.players[0].board.find((x) => x.uid === uid);
		if (!u || !canAttack(this.g, 0, u)) return false;
		const legal = this.legalTargets();
		if (target === 'korum') {
			if (!legal.korum) return false;
			attack(this.g, 0, u, 'korum');
			return true;
		}
		if (!legal.units.includes(target)) return false;
		const t = this.g.players[1].board.find((x) => x.uid === target);
		if (!t) return false;
		attack(this.g, 0, u, t);
		return true;
	}

	/** Les Prononcer activables (coût réel, Volonté suffisante). */
	pronounceable(): { uid: number; cost: number; text: string }[] {
		if (!this.myTurn) return [];
		const p = this.g.players[0];
		return p.board
			.filter((u) => u.card.prononcer)
			.map((u) => ({
				uid: u.uid,
				cost: prononcerCost(this.g, 0, u.card.prononcer!.cost),
				text: u.card.prononcer!.text
			}))
			.filter((x) => x.cost <= p.will);
	}

	/** Le choix demandé par ce Prononcer (Exva répartit ses dégâts) ; `null` = direct. */
	choiceForPronounce(uid: number): Choix | null {
		if (!this.myTurn) return null;
		const u = this.g.players[0].board.find((x) => x.uid === uid);
		return u ? choixPourPrononcer(this.g, 0, u) : null;
	}

	pronounce(uid: number, sel?: Sel): boolean {
		if (!this.myTurn) return false;
		const g = this.g;
		const p = g.players[0];
		const e = g.players[1];
		const u = p.board.find((x) => x.uid === uid);
		const pr = u?.card.prononcer;
		if (!u || !pr) return false;
		const cost = prononcerCost(g, 0, pr.cost);
		if (p.will < cost) return false;
		p.will -= cost;
		ev(g, { t: 'prononcer', side: 0, uid: u.uid, msg: `${u.card.name} PRONONCE (${cost}) — ${pr.text}` });
		triggerSenel(g, 0);
		if (u.card.id === 'exva') {
			resoudreExva(g, 0, sel);
		} else if (u.card.id === 'rasen') {
			for (const t of [...e.board]) destroy(g, 1, t, 'death');
			for (const t of [...p.board]) if (t !== u) destroy(g, 0, t, 'death');
		}
		exileUnit(g, 0, u);
		checkWin(g);
		return true;
	}

	/** Fin du tour joueur → tour complet de l'IA → retour au joueur. */
	endTurn(): void {
		if (!this.myTurn) return;
		const g = this.g;
		ev(g, { t: 'phase', side: 0, msg: 'Fin de votre tour' });
		this.endTurnRest();
	}

	private endTurnRest(): void {
		const g = this.g;
		endTurnFx(g, 0);
		if (g.winner !== null) return;
		startTurn(g, 1);
		if (g.winner === null && g.players[1].hand.length > 0)
			ev(g, { t: 'phase', side: 1, msg: "L'IA déploie sa Volonté" });
		if (g.winner === null) playPhase(g, 1);
		if (g.winner === null && g.players[1].board.length > 0)
			ev(g, { t: 'phase', side: 1, msg: "L'IA passe à l'attaque" });
		if (g.winner === null) combatPhase(g, 1);
		if (g.winner === null) playPhase(g, 1);
		if (g.winner === null) endTurnFx(g, 1);
		if (g.winner === null) startTurn(g, 0);
	}
}

/* --------------------- Match : deux humains (PvP, hôte autoritaire) --------------------- */

/**
 * Une partie à deux joueurs humains. L'hôte (côté 0) exécute toute la logique ;
 * le camp est passé à chaque action — le moteur valide que c'est bien son tour.
 */
export class Match {
	private g: G;

	constructor(
		cardPool: CardData[],
		a: { deck: CardData[] | null; faction: FactionId; name: string },
		b: { deck: CardData[] | null; faction: FactionId; name: string },
		seed: number
	) {
		const rng = mulberry32(seed);
		const mk = (faction: FactionId, name: string, deck: CardData[]): P => ({
			name,
			faction,
			korum: 25,
			will: 0,
			maxWill: 0,
			deck,
			hand: [],
			board: [],
			supports: [],
			discard: [],
			exile: [],
			fatigue: 0,
			firstCardPlayed: false,
			allyDiedThisTurn: false,
			allyDiedLastTurn: false,
			sacrificedThisTurn: false,
			played: {}
		});
		const da =
			a.deck && a.deck.length === 30 ? shuffleInPlace([...a.deck], rng) : buildDeck(cardPool, a.faction, rng);
		const db =
			b.deck && b.deck.length === 30 ? shuffleInPlace([...b.deck], rng) : buildDeck(cardPool, b.faction, rng);
		this.g = {
			t: 0,
			active: 0,
			players: [mk(a.faction, a.name, da), mk(b.faction, b.name, db)],
			lastVerb: null,
			winner: null,
			rng,
			uidSeq: 1,
			events: []
		};
		draw(this.g, 0, 4, true);
		draw(this.g, 1, 5, true);
		ev(this.g, {
			t: 'start',
			side: 0,
			msg: `Le duel commence : ${this.g.players[0].name} contre ${this.g.players[1].name}`
		});
		startTurn(this.g, 0);
	}

	drain(): Ev[] {
		return this.g.events.splice(0);
	}

	state(): [PlayerSnap, PlayerSnap] {
		return [snapPlayer(this.g, 0), snapPlayer(this.g, 1)];
	}

	meta(): DuelMeta & { activeName: string } {
		const p = this.g.players[this.g.active];
		return {
			turn: Math.ceil(this.g.t / 2),
			active: this.g.active,
			winner: this.g.winner,
			will: p.will,
			maxWill: p.maxWill,
			activeName: p.name
		};
	}

	private isTurn(side: Side): boolean {
		return this.g.active === side && this.g.winner === null;
	}

	hand(side: Side): HandEntry[] {
		const p = this.g.players[side];
		return p.hand.map((c) => ({
			card: c,
			cost: playCost(this.g, side, c),
			playable:
				this.isTurn(side) && playCost(this.g, side, c) <= p.will && hasSlot(this.g, side, c)
		}));
	}

	choiceFor(side: Side, index: number): Choix | null {
		const c = this.g.players[side].hand[index];
		if (!this.isTurn(side) || !c) return null;
		return choixPour(this.g, side, c);
	}

	play(side: Side, index: number, sel?: Sel): boolean {
		const p = this.g.players[side];
		const c = p.hand[index];
		if (!this.isTurn(side) || !c || playCost(this.g, side, c) > p.will) return false;
		if (!hasSlot(this.g, side, c)) return false; // les cinq emplacements sont pris
		playCard(this.g, side, c, sel);
		return true;
	}

	swappables(side: Side): number[] {
		if (!this.isTurn(side)) return [];
		const p = this.g.players[side];
		if (!p.board.some((u) => u.card.id === 'moras')) return [];
		return p.board.filter((u) => !u.swapped && !u.token).map((u) => u.uid);
	}

	swap(side: Side, uid: number): boolean {
		if (!this.isTurn(side)) return false;
		const g = this.g;
		const p = g.players[side];
		if (!p.board.some((u) => u.card.id === 'moras')) return false;
		const u = p.board.find((x) => x.uid === uid);
		if (!u || u.swapped || u.token) return false;
		const ba = u.baseAtk;
		u.baseAtk = u.baseHp;
		u.baseHp = ba;
		u.swapped = true;
		ev(g, { t: 'effect', side, uid: u.uid, msg: `${u.card.name} inverse son être (${unitAtk(g, side, u)}/${unitHp(g, side, u)}) — le sourire de Moras` });
		return true;
	}

	attackers(side: Side): number[] {
		if (!this.isTurn(side)) return [];
		return this.g.players[side].board.filter((u) => canAttack(this.g, side, u)).map((u) => u.uid);
	}

	legalTargets(side: Side): { units: number[]; korum: boolean } {
		const e = this.g.players[other(side)];
		const wall = e.board.filter((t) => !isLocked(this.g, t));
		if (wall.length === 0) return { units: [], korum: true };
		const serments = wall.filter((t) => t.serment);
		return { units: (serments.length > 0 ? serments : wall).map((t) => t.uid), korum: false };
	}

	attack(side: Side, uid: number, target: number | 'korum'): boolean {
		if (!this.isTurn(side)) return false;
		const u = this.g.players[side].board.find((x) => x.uid === uid);
		if (!u || !canAttack(this.g, side, u)) return false;
		const legal = this.legalTargets(side);
		if (target === 'korum') {
			if (!legal.korum) return false;
			attack(this.g, side, u, 'korum');
			return true;
		}
		if (!legal.units.includes(target)) return false;
		const t = this.g.players[other(side)].board.find((x) => x.uid === target);
		if (!t) return false;
		attack(this.g, side, u, t);
		return true;
	}

	pronounceable(side: Side): { uid: number; cost: number; text: string }[] {
		if (!this.isTurn(side)) return [];
		const p = this.g.players[side];
		return p.board
			.filter((u) => u.card.prononcer)
			.map((u) => ({
				uid: u.uid,
				cost: prononcerCost(this.g, side, u.card.prononcer!.cost),
				text: u.card.prononcer!.text
			}))
			.filter((x) => x.cost <= p.will);
	}

	choiceForPronounce(side: Side, uid: number): Choix | null {
		if (!this.isTurn(side)) return null;
		const u = this.g.players[side].board.find((x) => x.uid === uid);
		return u ? choixPourPrononcer(this.g, side, u) : null;
	}

	pronounce(side: Side, uid: number, sel?: Sel): boolean {
		if (!this.isTurn(side)) return false;
		const g = this.g;
		const p = g.players[side];
		const en = other(side);
		const e = g.players[en];
		const u = p.board.find((x) => x.uid === uid);
		const pr = u?.card.prononcer;
		if (!u || !pr) return false;
		const cost = prononcerCost(g, side, pr.cost);
		if (p.will < cost) return false;
		p.will -= cost;
		ev(g, { t: 'prononcer', side, uid: u.uid, msg: `${u.card.name} PRONONCE (${cost}) — ${pr.text}` });
		triggerSenel(g, side);
		if (u.card.id === 'exva') {
			resoudreExva(g, side, sel);
		} else if (u.card.id === 'rasen') {
			for (const t of [...e.board]) destroy(g, en, t, 'death');
			for (const t of [...p.board]) if (t !== u) destroy(g, side, t, 'death');
		}
		exileUnit(g, side, u);
		checkWin(g);
		return true;
	}

	endTurn(side: Side): boolean {
		if (!this.isTurn(side)) return false;
		const g = this.g;
		ev(g, { t: 'phase', side, msg: `Fin du tour de ${g.players[side].name}` });
		endTurnFx(g, side);
		if (g.winner === null) startTurn(g, other(side));
		return true;
	}
}
