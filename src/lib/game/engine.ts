/**
 * L'Arène : moteur de duel Expelled (règles v1) + IA heuristique.
 *
 * Simule une partie complète et produit une TIMELINE d'événements avec
 * snapshots d'état — l'UI ne fait que rejouer, le moteur reste pur.
 * Les 60 effets du set sont implémentés carte par carte (registre par id).
 */
import type { CardData, FactionId } from '$lib/types';

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
	exile: number;
	board: UnitSnap[];
	supports: { cardId: string; name: string }[];
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
	for (const o of p.board) {
		if (o === u) continue;
		if (o.card.id === 'dasen' && u.card.faction === 'vasar') a += 1;
		if (o.card.id === 'koren') a += 1;
	}
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
	for (const o of p.board) if (o !== u && o.card.id === 'koren') h += 1;
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
		supports: p.supports.map((s) => ({ cardId: s.card.id, name: s.card.name }))
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

function spawnUnit(g: G, side: Side, card: CardData, silent = false): Unit {
	const p = g.players[side];
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

/** Détruit un Être (mort ou sacrifice). Déclenche les Ruptures. */
function destroy(g: G, side: Side, u: Unit, why: 'death' | 'sacrifice'): void {
	const p = g.players[side];
	const idx = p.board.indexOf(u);
	if (idx < 0) return;
	p.board.splice(idx, 1);
	if (!u.token) p.discard.push(u.card);
	p.allyDiedThisTurn = true;
	if (why === 'sacrifice') p.sacrificedThisTurn = true;
	// reliques attachées à ce corps meurent avec lui
	for (const s of [...p.supports, ...g.players[other(side)].supports]) {
		if (s.targetUid === u.uid) {
			const owner = p.supports.includes(s) ? p : g.players[other(side)];
			owner.supports.splice(owner.supports.indexOf(s), 1);
			owner.discard.push(s.card);
		}
	}
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

/* ----------------------------- Effets des Verbes --------------------------- */

/** Résout l'effet d'un Verbe. Retourne false si aucune cible utile (l'IA ne le joue pas). */
function resolveVerb(g: G, side: Side, c: CardData, dryRun: boolean): boolean {
	const p = g.players[side];
	const en = other(side);
	const e = g.players[en];
	const act = !dryRun;
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
			const t = strongest(g, en);
			if (!t || t.card.cost < 2) return false;
			if (act) {
				e.board.splice(e.board.indexOf(t), 1);
				if (!t.token) e.hand.push(t.card);
				ev(g, { t: 'effect', side, targetUid: t.uid, msg: `${t.card.name} est renvoyé dans la main adverse` });
			}
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
			const t = strongest(g, side);
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
			const t = strongest(g, side);
			if (!t) return false;
			if (act) {
				t.permAtk += 2;
				t.permHp += 2;
				ev(g, { t: 'effect', side, uid: t.uid, msg: `${t.card.name} porte la seconde sentence (+2/+2)` });
			}
			return true;
		}
		case 'echo-du-dixieme-mot': {
			const sac = weakest(g, side);
			if (!sac) return false;
			if (act) {
				destroy(g, side, sac, 'sacrifice');
				draw(g, side, 2);
			}
			return true;
		}
		case 'nouvelle-peau': {
			const t = [...p.board].sort(
				(a, b) => unitHp(g, side, b) - unitAtk(g, side, b) - (unitHp(g, side, a) - unitAtk(g, side, a))
			)[0];
			if (!t || unitHp(g, side, t) - unitAtk(g, side, t) < 2) return false;
			if (act) {
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
				const top = p.deck.slice(0, 3);
				const best = [...top].sort((a, b) => handScore(b) - handScore(a))[0];
				p.deck.splice(p.deck.indexOf(best), 1);
				p.hand.push(best);
				ev(g, { t: 'effect', side, msg: `La brume choisit : ${best.name} rejoint la main` });
			}
			return true;
		}
		case 'sentence-dor': {
			const t = strongest(g, en);
			if (!t) return false;
			if (act) {
				t.chained = true;
				ev(g, { t: 'effect', side, targetUid: t.uid, msg: `${t.card.name} est enchaîné — il ne peut plus attaquer` });
			}
			return true;
		}
		case 'sentence-retournee': {
			// équilibrage run-002 : mode de repli — sans allié entravé, buff simple
			const t = p.board.find((u) => isLocked(g, u));
			if (!t) {
				const ally = strongest(g, side);
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
			if (e.board.length < 2) return false;
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

function onSummon(g: G, side: Side, u: Unit): void {
	const p = g.players[side];
	const en = other(side);
	const e = g.players[en];
	switch (u.card.id) {
		case 'norel':
			draw(g, side, 1);
			break;
		case 'renna': {
			const t = strongest(g, side) === u ? p.board.find((o) => o !== u) : strongest(g, side);
			const target = t && t !== u ? t : p.board.find((o) => o !== u);
			if (target) {
				target.permAtk += 1;
				target.permHp += 1;
				ev(g, { t: 'effect', side, uid: target.uid, msg: `Renna livre une syllabe à ${target.card.name} (+1/+1)` });
			}
			break;
		}
		case 'korven': {
			const t = strongest(g, en);
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
			for (let i = 0; i < n; i++) {
				const best = [...p.discard].sort((a, b) => handScore(b) - handScore(a))[0];
				if (!best) break;
				p.discard.splice(p.discard.indexOf(best), 1);
				p.hand.push(best);
				ev(g, { t: 'effect', side, msg: `Eshna ramasse ${best.name} dans la défausse` });
			}
			break;
		}
		case 'eskor': {
			const n = memFactor(p);
			for (let i = 0; i < n; i++) {
				const best = [...p.exile].sort((a, b) => handScore(b) - handScore(a))[0];
				if (!best) break;
				p.exile.splice(p.exile.indexOf(best), 1);
				p.hand.push(best);
				ev(g, { t: 'effect', side, msg: `Eskor rapporte ${best.name} de l'exil — l'impossible` });
			}
			break;
		}
		case 'eshel': {
			const best = [...p.deck].sort((a, b) => handScore(b) - handScore(a))[0];
			if (best) {
				p.deck.splice(p.deck.indexOf(best), 1);
				p.hand.push(best);
				ev(g, { t: 'effect', side, msg: `Eshel ouvre l'archive : ${best.name} rejoint la main` });
			}
			break;
		}
		case 'korsa': {
			const s = e.supports[0];
			if (s) {
				e.supports.splice(0, 1);
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
			const aggressive = e.korum <= 12 || p.board.length > e.board.length;
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

function playCard(g: G, side: Side, c: CardData): void {
	const p = g.players[side];
	const cost = playCost(g, side, c);
	p.will -= cost;
	p.firstCardPlayed = true;
	p.hand.splice(p.hand.indexOf(c), 1);
	p.played[c.id] = (p.played[c.id] ?? 0) + 1;

	if (c.kind === 'etre') {
		ev(g, { t: 'play', side, cardId: c.id, msg: `${p.name} joue ${c.name} (${cost} Volonté)` });
		const u = spawnUnit(g, side, c);
		onSummon(g, side, u);
	} else if (c.kind === 'verbe') {
		ev(g, { t: 'verb', side, cardId: c.id, msg: `${p.name} prononce ${c.name} (${cost} Volonté)` });
		resolveVerb(g, side, c, false);
		g.lastVerb = c;
		p.discard.push(c);
	} else {
		// relique / lieu
		let targetUid: number | undefined;
		if (c.id === 'couronne-dos') targetUid = strongest(g, side)?.uid;
		if (c.id === 'premiere-chaine') {
			const t = strongest(g, other(side));
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
				let left = dmg;
				const targets = [...e.board].sort((a, b) => unitHp(g, en, a) - unitHp(g, en, b));
				for (const t of targets) {
					const hp = unitHp(g, en, t);
					if (hp <= left) {
						left -= hp;
						damageUnit(g, en, t, hp);
					}
				}
				if (left > 0) damageKorum(g, en, left);
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
			.filter((c) => playCost(g, side, c) <= p.will && worthPlaying(g, side, c))
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
			playable: this.myTurn && playCost(this.g, 0, c) <= p.will
		}));
	}

	play(index: number): boolean {
		const p = this.g.players[0];
		const c = p.hand[index];
		if (!this.myTurn || !c || playCost(this.g, 0, c) > p.will) return false;
		playCard(this.g, 0, c);
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

	pronounce(uid: number): boolean {
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
		const boost = hasSupport(p, 'porte-du-dehors') ? 1 : 0;
		ev(g, { t: 'prononcer', side: 0, uid: u.uid, msg: `${u.card.name} PRONONCE (${cost}) — ${pr.text}` });
		triggerSenel(g, 0);
		if (u.card.id === 'exva') {
			let left = 5 + boost;
			const targets = [...e.board].sort((a, b) => unitHp(g, 1, a) - unitHp(g, 1, b));
			for (const t of targets) {
				const hp = unitHp(g, 1, t);
				if (hp <= left) {
					left -= hp;
					damageUnit(g, 1, t, hp);
				}
			}
			if (left > 0) damageKorum(g, 1, left);
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
			playable: this.isTurn(side) && playCost(this.g, side, c) <= p.will
		}));
	}

	play(side: Side, index: number): boolean {
		const p = this.g.players[side];
		const c = p.hand[index];
		if (!this.isTurn(side) || !c || playCost(this.g, side, c) > p.will) return false;
		playCard(this.g, side, c);
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

	pronounce(side: Side, uid: number): boolean {
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
		const boost = hasSupport(p, 'porte-du-dehors') ? 1 : 0;
		ev(g, { t: 'prononcer', side, uid: u.uid, msg: `${u.card.name} PRONONCE (${cost}) — ${pr.text}` });
		triggerSenel(g, side);
		if (u.card.id === 'exva') {
			let left = 5 + boost;
			const targets = [...e.board].sort((x, y) => unitHp(g, en, x) - unitHp(g, en, y));
			for (const t of targets) {
				const hp = unitHp(g, en, t);
				if (hp <= left) {
					left -= hp;
					damageUnit(g, en, t, hp);
				}
			}
			if (left > 0) damageKorum(g, en, left);
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
