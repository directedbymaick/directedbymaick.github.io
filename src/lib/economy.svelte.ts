/**
 * L'économie du Silence : les Éclats (fragments d'auréole).
 * On en gagne à chaque partie, via les quêtes journalières/hebdomadaires
 * et le livre de succès — on les dépense en boosters.
 * Tout vit en localStorage, partagé via un état réactif.
 */

export const PACK_PRICE = 100;
export const STARTER_GRANT = 300;
export const MATCH_REWARD = { win: 100, loss: 40, pvpWin: 150, pvpLoss: 60 };

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
	{ id: 'd-win', label: 'Gagner une partie en Arène', event: 'win', n: 1, reward: 60 },
	{ id: 'd-cards', label: 'Jouer 12 cartes en duel', event: 'cardPlayed', n: 12, reward: 40 },
	{ id: 'd-pack', label: 'Ouvrir un booster', event: 'packOpened', n: 1, reward: 30 }
];

export const WEEKLY: QuestDef[] = [
	{ id: 'w-wins', label: 'Gagner 5 parties', event: 'win', n: 5, reward: 200 },
	{ id: 'w-packs', label: 'Ouvrir 5 boosters', event: 'packOpened', n: 5, reward: 150 },
	{ id: 'w-pron', label: 'Prononcer 3 fois', event: 'prononcer', n: 3, reward: 150 }
];

export interface AchDef {
	id: string;
	label: string;
	desc: string;
	reward: number;
	check: (s: Stats, ctx: AchContext) => boolean;
}
export interface AchContext {
	uniques: number;
	setSize: number;
	fullDecks: number;
}

export const ACHIEVEMENTS: AchDef[] = [
	{ id: 'a-first-win', label: 'Premier mot', desc: 'Gagner votre première partie.', reward: 100, check: (s) => s.wins >= 1 },
	{ id: 'a-wins-10', label: 'La parole tient', desc: 'Gagner 10 parties.', reward: 300, check: (s) => s.wins >= 10 },
	{ id: 'a-packs-10', label: 'Réquisition', desc: 'Ouvrir 10 boosters.', reward: 150, check: (s) => s.packsOpened >= 10 },
	{ id: 'a-pron-10', label: 'Dix Prononciations', desc: 'Prononcer 10 fois en duel.', reward: 200, check: (s) => s.prononces >= 10 },
	{ id: 'a-uniques-30', label: 'Demi-Registre', desc: 'Posséder 30 cartes uniques.', reward: 200, check: (_s, c) => c.uniques >= 30 },
	{ id: 'a-uniques-60', label: 'Le Registre complet', desc: 'Posséder les 60 cartes du Silence.', reward: 500, check: (_s, c) => c.uniques >= c.setSize },
	{ id: 'a-deck', label: 'Trente voix', desc: 'Construire un deck complet de 30 cartes.', reward: 100, check: (_s, c) => c.fullDecks >= 1 },
	{ id: 'a-pvp', label: 'Face à un Nom', desc: 'Gagner un duel Joueur contre Joueur.', reward: 250, check: (s) => s.pvpWins >= 1 }
];

/* ------------------------------- état + persistance ------------------------------- */

interface QuestState {
	p: number;
	claimed: boolean;
}

interface EcoState {
	ready: boolean;
	balance: number;
	stats: Stats;
	day: string;
	week: string;
	daily: Record<string, QuestState>;
	weekly: Record<string, QuestState>;
	ach: Record<string, { claimed: boolean }>;
	/** dernier gain affichable (toast) */
	lastGain: { amount: number; reason: string; at: number } | null;
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
	stats: blankStats(),
	day: '',
	week: '',
	daily: {},
	weekly: {},
	ach: {},
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
	localStorage.setItem(KEY, JSON.stringify(data));
}

export function initEconomy(): void {
	if (eco.ready) return;
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const d = JSON.parse(raw);
			eco.balance = d.balance ?? 0;
			eco.stats = { ...blankStats(), ...(d.stats ?? {}) };
			eco.day = d.day ?? '';
			eco.week = d.week ?? '';
			eco.daily = d.daily ?? {};
			eco.weekly = d.weekly ?? {};
			eco.ach = d.ach ?? {};
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
	}
	if (eco.week !== thisWeek) {
		eco.week = thisWeek;
		eco.weekly = {};
	}
	eco.ready = true;
	persist();
}

export function earn(amount: number, reason: string): void {
	if (amount <= 0) return;
	eco.balance += amount;
	eco.lastGain = { amount, reason, at: Date.now() };
	persist();
}

export function spend(amount: number): boolean {
	if (eco.balance < amount) return false;
	eco.balance -= amount;
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
