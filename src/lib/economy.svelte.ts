/**
 * L'économie du Silence : les Éclats (fragments d'auréole).
 * On en gagne à chaque partie, via les quêtes journalières/hebdomadaires
 * et le livre de succès — on les dépense en boosters.
 * Tout vit en localStorage (rattaché au compte), partagé via un état réactif.
 */
import { nsKey, scheduleCloudSync } from '$lib/store';

export const PACK_PRICE = 100;
export const STARTER_GRANT = 300000;
/** Plafond de solde : un compte ne peut pas dépasser cette somme d'Éclats. */
export const MAX_BALANCE = 999999;
export const MATCH_REWARD = { win: 25, loss: 8, pvpWin: 35, pvpLoss: 12 };
export const DAILY_REWARDED_MATCHES = 3;

/** Revente des copies excédentaires (au-delà de 3) : valeur par rareté. */
export const SELL_KEEP = 3;
export const SELL_VALUE: Record<string, number> = {
	common: 2,
	rare: 4,
	epic: 8,
	legendary: 15,
	prism: 25
};

/* ---------------- les Syllabes ----------------
 *
 * Le lore la décrivait avant nous (KORUM.md, « Les Eshar ») :
 *
 *   « Nous collectionnons les syllabes perdues. Certains d'entre nous en ont
 *     rassemblé assez pour reconstituer des noms entiers. »
 *
 * Une carte EST un nom — le Registre compte des « noms inscrits ». La Syllabe
 * est donc la seule monnaie qui puisse acheter une carte directement : on ne
 * l'achète pas, on la RECONSTITUE. Les Éclats, eux, restent la monnaie
 * matérielle des boosters : on paie un booster, on ne paie pas un nom.
 *
 * Elle ne vient que des Prismatiques, les noms restés entiers : les tirer en
 * libère quelques-unes, en défaire une en rend beaucoup plus.
 */

/* Les montants sont volontairement faibles : les Syllabes suppriment le hasard
   en achetant une version exacte et ne doivent pas auto-financer la collection. */

/** Syllabes libérées par une Prismatique tirée pour la PREMIÈRE fois. */
export const SYLLABES_PULL = 5;
/** Un doublon ne rapporte rien tant que le joueur ne choisit pas de le défaire. */
export const SYLLABES_DOUBLON = 0;
/** Syllabes rendues en défaisant une Prismatique excédentaire, à la main. */
export const SYLLABES_DEFAIRE = 25;
/** Une SP non prismatique en libère aussi : c'est la finition la plus rare. */
export const SYLLABES_SP = 3;
/** Un Full Art ordinaire, moins. */
export const SYLLABES_FULLART = 1;

/* Le prix d'un nom ne vit PAS ici : il découle de la rareté réelle du palier
   (rareté × forme × finition), calculée dans paliers.ts — `prixNom(taux)`. Une
   Commune Raw et une Commune Full Art SP ne peuvent pas valoir pareil. */

export type TrackEvent =
	| 'win'
	| 'loss'
	| 'pvpWin'
	| 'cardPlayed'
	| 'packOpened'
	| 'pull'
	| 'prononcer';

export interface Stats {
	wins: number;
	losses: number;
	pvpWins: number;
	cardsPlayed: number;
	packsOpened: number;
	pulls: number;
	prononces: number;
}

interface QuestDef {
	id: string;
	label: string;
	event: TrackEvent;
	n: number;
	reward: number;
}

export const DAILY: QuestDef[] = [
	{ id: 'd-win', label: 'Gagner une partie en Arène', event: 'win', n: 1, reward: 55 },
	{ id: 'd-cards', label: 'Jouer 12 cartes en duel', event: 'cardPlayed', n: 12, reward: 45 }
];

export const WEEKLY: QuestDef[] = [
	{ id: 'w-wins', label: 'Gagner 5 parties', event: 'win', n: 5, reward: 120 },
	{ id: 'w-cards', label: 'Jouer 60 cartes en duel', event: 'cardPlayed', n: 60, reward: 90 },
	{ id: 'w-pron', label: 'Prononcer 3 fois', event: 'prononcer', n: 3, reward: 90 }
];

export type AchCategory = 'combat' | 'prononciation' | 'salons' | 'collection' | 'voie';

export interface AchDef {
	id: string;
	label: string;
	desc: string;
	reward: number;
	cat: AchCategory;
	check: (s: Stats, ctx: AchContext) => boolean;
}
export interface AchContext {
	uniques: number;
	setSize: number;
	fullDecks: number;
	prisms: number;
	prismTotal: number;
	legendaries: number;
	legendTotal: number;
	factionsCovered: number;
	factionTotal: number;
}

export const ACH_CATEGORIES: { id: AchCategory; label: string }[] = [
	{ id: 'combat', label: "L'Arène" },
	{ id: 'prononciation', label: 'La Prononciation' },
	{ id: 'salons', label: 'Duel en ligne' },
	{ id: 'collection', label: 'Collection' },
	{ id: 'voie', label: 'Decks et ressources' }
];

const ACHIEVEMENT_BASE: AchDef[] = [
	/* ---- L'Arène : le combat ---- */
	{ id: 'a-first-win', label: 'Premier mot', desc: 'Gagner votre première partie.', reward: 100, cat: 'combat', check: (s) => s.wins >= 1 },
	{ id: 'a-wins-5', label: "La voix s'affermit", desc: 'Gagner 5 parties.', reward: 150, cat: 'combat', check: (s) => s.wins >= 5 },
	{ id: 'a-wins-10', label: 'La parole tient', desc: 'Gagner 10 parties.', reward: 300, cat: 'combat', check: (s) => s.wins >= 10 },
	{ id: 'a-wins-25', label: 'Rhéteur', desc: 'Gagner 25 parties.', reward: 400, cat: 'combat', check: (s) => s.wins >= 25 },
	{ id: 'a-wins-50', label: "L'Arène vous connaît", desc: 'Gagner 50 parties.', reward: 600, cat: 'combat', check: (s) => s.wins >= 50 },
	{ id: 'a-wins-100', label: 'Le Silence recule', desc: 'Gagner 100 parties.', reward: 1000, cat: 'combat', check: (s) => s.wins >= 100 },
	{ id: 'a-losses-10', label: 'Apprendre de ses défaites', desc: 'Disputer et perdre 10 parties.', reward: 150, cat: 'combat', check: (s) => s.losses >= 10 },
	{ id: 'a-games-25', label: "Habitué de l'Arène", desc: 'Disputer 25 parties.', reward: 200, cat: 'combat', check: (s) => s.wins + s.losses >= 25 },
	{ id: 'a-cards-100', label: 'Cent gestes', desc: 'Jouer 100 cartes en duel.', reward: 150, cat: 'combat', check: (s) => s.cardsPlayed >= 100 },
	{ id: 'a-cards-500', label: 'Le bras ne tremble plus', desc: 'Jouer 500 cartes en duel.', reward: 400, cat: 'combat', check: (s) => s.cardsPlayed >= 500 },

	/* ---- La Prononciation ---- */
	{ id: 'a-pron-1', label: 'Première Prononciation', desc: 'Prononcer pour la première fois.', reward: 50, cat: 'prononciation', check: (s) => s.prononces >= 1 },
	{ id: 'a-pron-10', label: 'Dix Prononciations', desc: 'Prononcer 10 fois en duel.', reward: 200, cat: 'prononciation', check: (s) => s.prononces >= 10 },
	{ id: 'a-pron-25', label: "La bouche d'or", desc: 'Prononcer 25 fois en duel.', reward: 350, cat: 'prononciation', check: (s) => s.prononces >= 25 },

	/* ---- Les Salons : le PvP ---- */
	{ id: 'a-pvp', label: 'Premier duel en ligne', desc: 'Gagner un duel contre un autre joueur.', reward: 250, cat: 'salons', check: (s) => s.pvpWins >= 1 },
	{ id: 'a-pvp-5', label: 'Duelliste', desc: 'Gagner 5 duels en ligne.', reward: 400, cat: 'salons', check: (s) => s.pvpWins >= 5 },
	{ id: 'a-pvp-20', label: 'Maître des salons', desc: 'Gagner 20 duels en ligne.', reward: 800, cat: 'salons', check: (s) => s.pvpWins >= 20 },

	/* ---- Le Registre : la collection ---- */
	{ id: 'a-uniques-10', label: 'Premières pages', desc: 'Posséder 10 cartes uniques.', reward: 100, cat: 'collection', check: (_s, c) => c.uniques >= 10 },
	{ id: 'a-uniques-30', label: 'À mi-chemin', desc: 'Posséder 30 cartes uniques.', reward: 200, cat: 'collection', check: (_s, c) => c.uniques >= 30 },
	{ id: 'a-uniques-45', label: 'Bibliothécaire', desc: 'Posséder 45 cartes uniques.', reward: 300, cat: 'collection', check: (_s, c) => c.uniques >= 45 },
	{ id: 'a-uniques-60', label: 'Collection complète', desc: 'Posséder les 60 cartes du Silence.', reward: 500, cat: 'collection', check: (_s, c) => c.uniques >= c.setSize },
	{ id: 'a-packs-10', label: 'Premier lot', desc: 'Ouvrir 10 boosters.', reward: 150, cat: 'collection', check: (s) => s.packsOpened >= 10 },
	{ id: 'a-packs-25', label: 'Collectionneur assidu', desc: 'Ouvrir 25 boosters.', reward: 300, cat: 'collection', check: (s) => s.packsOpened >= 25 },
	{ id: 'a-pulls-100', label: 'Cent tirages', desc: 'Tirer 100 cartes de boosters.', reward: 200, cat: 'collection', check: (s) => s.pulls >= 100 },
	{ id: 'a-prism-1', label: 'Toucher le prisme', desc: 'Posséder une carte Prismatique.', reward: 150, cat: 'collection', check: (_s, c) => c.prisms >= 1 },
	{ id: 'a-prism-all', label: 'Les cinq lumières', desc: 'Posséder toutes les Prismatiques.', reward: 400, cat: 'collection', check: (_s, c) => c.prismTotal > 0 && c.prisms >= c.prismTotal },
	{ id: 'a-legend-all', label: 'Panthéon', desc: 'Posséder toutes les Légendaires.', reward: 300, cat: 'collection', check: (_s, c) => c.legendTotal > 0 && c.legendaries >= c.legendTotal },
	{ id: 'a-all-factions', label: 'Les cinq peuples', desc: 'Posséder au moins une carte de chaque peuple.', reward: 100, cat: 'collection', check: (_s, c) => c.factionsCovered >= c.factionTotal },

	/* ---- La Voie : decks et Éclats ---- */
	{ id: 'a-deck', label: 'Trente voix', desc: 'Construire un deck complet de 30 cartes.', reward: 100, cat: 'voie', check: (_s, c) => c.fullDecks >= 1 },
	{ id: 'a-decks-3', label: 'Stratège', desc: 'Avoir 3 decks complets.', reward: 200, cat: 'voie', check: (_s, c) => c.fullDecks >= 3 },
	{ id: 'a-rich-1000', label: 'Trésorier du Vasis', desc: "Détenir 1 000 Éclats d'un coup.", reward: 150, cat: 'voie', check: () => eco.balance >= 1000 },
	{ id: 'a-rich-2500', label: "L'auréole se reforme", desc: "Détenir 2 500 Éclats d'un coup.", reward: 300, cat: 'voie', check: () => eco.balance >= 2500 }
];

export const ACHIEVEMENTS: AchDef[] = ACHIEVEMENT_BASE.map((achievement) => ({
	...achievement,
	reward: Math.ceil(achievement.reward / 20) * 10
}));

/* ------------------------------- état + persistance ------------------------------- */

interface QuestState {
	p: number;
	claimed: boolean;
}

interface EcoState {
	ready: boolean;
	balance: number;
	/** Syllabes — la monnaie des noms, gagnée sur les seules Prismatiques. */
	syllabes: number;
	stats: Stats;
	day: string;
	week: string;
	rewardedMatches: number;
	daily: Record<string, QuestState>;
	weekly: Record<string, QuestState>;
	ach: Record<string, { claimed: boolean }>;
	/** revente automatique du surplus (au-delà de 3 copies) à l'ouverture des boosters */
	autoSell: boolean;
	/** dernier gain affichable (toast) ; `syllabes` distingue la monnaie */
	lastGain: { amount: number; reason: string; at: number; syllabes?: boolean } | null;
}

const KEY = 'expelled-eco';

const blankStats = (): Stats => ({
	wins: 0,
	losses: 0,
	pvpWins: 0,
	cardsPlayed: 0,
	packsOpened: 0,
	pulls: 0,
	prononces: 0
});

export const eco = $state<EcoState>({
	ready: false,
	balance: 0,
	syllabes: 0,
	stats: blankStats(),
	day: '',
	week: '',
	rewardedMatches: 0,
	daily: {},
	weekly: {},
	ach: {},
	autoSell: false,
	lastGain: null
});

function dayKey(d = new Date()): string {
	return d.toISOString().slice(0, 10);
}
function weekKey(d = new Date()): string {
	// semaine ISO (algorithme du jeudi)
	const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
	const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
	const w = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
	return `${t.getUTCFullYear()}-W${w}`;
}

function persist(): void {
	const { ready, lastGain, ...data } = eco;
	localStorage.setItem(nsKey(KEY), JSON.stringify(data));
	scheduleCloudSync();
}

export function initEconomy(): void {
	if (eco.ready) return;
	try {
		const raw = localStorage.getItem(nsKey(KEY));
		if (raw) {
			const d = JSON.parse(raw);
			eco.balance = d.balance ?? 0;
			eco.syllabes = d.syllabes ?? 0;
			eco.stats = { ...blankStats(), ...(d.stats ?? {}) };
			eco.day = d.day ?? '';
			eco.week = d.week ?? '';
			eco.rewardedMatches = d.rewardedMatches ?? 0;
			eco.daily = d.daily ?? {};
			eco.weekly = d.weekly ?? {};
			eco.ach = d.ach ?? {};
			eco.autoSell = d.autoSell ?? false;
		} else {
			eco.balance = STARTER_GRANT;
			eco.lastGain = { amount: STARTER_GRANT, reason: 'Bienvenue dans le Silence', at: Date.now() };
		}
	} catch {
		eco.balance = STARTER_GRANT;
	}
	// rotation des périodes
	const today = dayKey();
	const thisWeek = weekKey();
	if (eco.day !== today) {
		eco.day = today;
		eco.daily = {};
		eco.rewardedMatches = 0;
	}
	if (eco.week !== thisWeek) {
		eco.week = thisWeek;
		eco.weekly = {};
	}
	eco.ready = true;
	persist();
}

export function setAutoSell(v: boolean): void {
	eco.autoSell = v;
	persist();
}

export function earn(amount: number, reason: string): void {
	if (amount <= 0) return;
	const before = eco.balance;
	eco.balance = Math.min(MAX_BALANCE, eco.balance + amount);
	const gained = eco.balance - before;
	if (gained <= 0) return; // déjà au plafond
	eco.lastGain = { amount: gained, reason, at: Date.now() };
	persist();
}

export function spend(amount: number): boolean {
	if (eco.balance < amount) return false;
	eco.balance -= amount;
	persist();
	return true;
}

export type MatchResult = keyof typeof MATCH_REWARD;

export function canEarnMatchReward(): boolean {
	return eco.rewardedMatches < DAILY_REWARDED_MATCHES;
}

export function rewardMatch(result: MatchResult, reason: string): number {
	const event: TrackEvent = result === 'pvpWin' ? 'pvpWin' : result === 'win' ? 'win' : 'loss';
	track(event);
	if (!canEarnMatchReward()) return 0;
	eco.rewardedMatches++;
	const amount = MATCH_REWARD[result];
	earn(amount, reason);
	return amount;
}

/** Libère des Syllabes. `raison` alimente le bandeau de gain. */
export function gagnerSyllabes(n: number, raison: string): void {
	if (n <= 0) return;
	eco.syllabes = Math.min(MAX_BALANCE, eco.syllabes + n);
	eco.lastGain = { amount: n, reason: raison, at: Date.now(), syllabes: true };
	persist();
}

/** Dépense des Syllabes pour reconstituer un nom. */
export function depenserSyllabes(n: number): boolean {
	if (eco.syllabes < n) return false;
	eco.syllabes -= n;
	persist();
	return true;
}

/** Enregistre un événement de jeu : stats + progression des quêtes. */
export function track(event: TrackEvent, n = 1): void {
	const s = eco.stats;
	if (event === 'win') s.wins += n;
	else if (event === 'loss') s.losses += n;
	else if (event === 'pvpWin') {
		s.pvpWins += n;
		s.wins += n;
	} else if (event === 'cardPlayed') s.cardsPlayed += n;
	else if (event === 'packOpened') s.packsOpened += n;
	else if (event === 'pull') s.pulls += n;
	else if (event === 'prononcer') s.prononces += n;

	const questEvent: TrackEvent = event === 'pvpWin' ? 'win' : event;
	for (const q of DAILY) {
		if (q.event !== questEvent) continue;
		const st = (eco.daily[q.id] ??= { p: 0, claimed: false });
		st.p += n;
	}
	for (const q of WEEKLY) {
		if (q.event !== questEvent) continue;
		const st = (eco.weekly[q.id] ??= { p: 0, claimed: false });
		st.p += n;
	}
	persist();
}

export function questProgress(scope: 'daily' | 'weekly', id: string): QuestState {
	return (scope === 'daily' ? eco.daily : eco.weekly)[id] ?? { p: 0, claimed: false };
}

export function claimQuest(scope: 'daily' | 'weekly', id: string): boolean {
	const defs = scope === 'daily' ? DAILY : WEEKLY;
	const def = defs.find((q) => q.id === id);
	if (!def) return false;
	const store = scope === 'daily' ? eco.daily : eco.weekly;
	const st = (store[id] ??= { p: 0, claimed: false });
	if (st.claimed || st.p < def.n) return false;
	st.claimed = true;
	earn(def.reward, def.label);
	return true;
}

export function claimAchievement(id: string, ctx: AchContext): boolean {
	const def = ACHIEVEMENTS.find((a) => a.id === id);
	if (!def) return false;
	const st = (eco.ach[id] ??= { claimed: false });
	if (st.claimed || !def.check(eco.stats, ctx)) return false;
	st.claimed = true;
	earn(def.reward, def.label);
	return true;
}
