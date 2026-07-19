import type { CardData, Rarity } from '$lib/types';
import { cards } from '$lib/cards';

/**
 * Le gacha : ouverture de boosters ZONES AVEUGLES, 100% local.
 * Inspiré de packs.com (odds publiées, ouverture par peel, reveal en pile)
 * — mais sans monnaie ni backend : ouverture libre, collection en localStorage.
 */

export const PACK_SIZE = 5;

/** Odds par slot du booster — publiées sur la page (esprit « fair odds »). */
export const SLOT_ODDS: { label: string; odds: Partial<Record<Rarity, number>> }[] = [
	{ label: 'Cartes 1 à 3', odds: { common: 1 } },
	{ label: 'Carte 4', odds: { rare: 0.8, epic: 0.2 } },
	{ label: 'Carte 5', odds: { rare: 0.6, epic: 0.25, legendary: 0.12, prism: 0.03 } }
];

/** Ordre de repli si aucune carte forgée n'existe dans la rareté tirée. */
const FALLBACK: Record<Rarity, Rarity[]> = {
	common: ['common', 'rare', 'epic', 'legendary', 'prism'],
	rare: ['rare', 'epic', 'common', 'legendary', 'prism'],
	epic: ['epic', 'rare', 'legendary', 'common', 'prism'],
	legendary: ['legendary', 'epic', 'prism', 'rare', 'common'],
	prism: ['prism', 'legendary', 'epic', 'rare', 'common']
};

function rollRarity(odds: Partial<Record<Rarity, number>>): Rarity {
	let r = Math.random();
	for (const [rarity, p] of Object.entries(odds) as [Rarity, number][]) {
		if (r < p) return rarity;
		r -= p;
	}
	return (Object.keys(odds) as Rarity[])[0];
}

function pickCard(rarity: Rarity, avoid: Set<string>): CardData {
	for (const tier of FALLBACK[rarity]) {
		const pool = cards.filter((c) => c.rarity === tier);
		if (pool.length === 0) continue;
		const fresh = pool.filter((c) => !avoid.has(c.id));
		const from = fresh.length > 0 ? fresh : pool;
		return from[Math.floor(Math.random() * from.length)];
	}
	return cards[Math.floor(Math.random() * cards.length)];
}

/* ---------- full art : le chase du set ---------- */

/** Chance qu'une carte éligible sorte en version Full Art. Publiée sur la page. */
export const FULLART_RATE = 0.06;

function eligibleFullArt(c: CardData): boolean {
	return !!c.fullArt || c.rarity === 'epic' || c.rarity === 'legendary' || c.rarity === 'prism';
}

/** Vue Full Art d'une carte : cadre prismatique, art plein cadre, id dédié (collectible à part). */
export function fullArtView(c: CardData): CardData {
	const v = structuredClone(c);
	v.id = `${c.id}--fullart`;
	v.rarity = 'prism';
	v.gene = { ...v.gene, foilPreset: 'prism' };
	return v;
}

/** Un tirage : la carte affichée (vue full art le cas échéant) + son identité de base. */
export interface Pull {
	card: CardData;
	baseId: string;
	fullArt: boolean;
}

/** Tire un booster : 5 cartes, sans doublon dans le pack si le pool le permet. */
export function openPack(): Pull[] {
	const pulls: Pull[] = [];
	const seen = new Set<string>();
	const slots: Rarity[] = [
		rollRarity(SLOT_ODDS[0].odds),
		rollRarity(SLOT_ODDS[0].odds),
		rollRarity(SLOT_ODDS[0].odds),
		rollRarity(SLOT_ODDS[1].odds),
		rollRarity(SLOT_ODDS[2].odds)
	];
	for (const rarity of slots) {
		const card = pickCard(rarity, seen);
		seen.add(card.id);
		const fullArt = eligibleFullArt(card) && Math.random() < FULLART_RATE;
		pulls.push({ card: fullArt ? fullArtView(card) : card, baseId: card.id, fullArt });
	}
	return pulls;
}

/* ---------- collection (localStorage) ---------- */

const STORE_KEY = 'travelers-collection-v1';

export type Collection = Record<string, number>;

export function loadCollection(): Collection {
	if (typeof localStorage === 'undefined') return {};
	try {
		return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
	} catch {
		return {};
	}
}

export function saveCollection(col: Collection): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORE_KEY, JSON.stringify(col));
}

/** Ajoute les tirages à la collection ; renvoie les ids nouveaux (première fois).
 *  Les Full Art sont collectionnés à part, sous leur id `--fullart`. */
export function addToCollection(col: Collection, pulls: Pull[]): string[] {
	const fresh: string[] = [];
	for (const p of pulls) {
		const id = p.card.id;
		if (!col[id]) fresh.push(id);
		col[id] = (col[id] ?? 0) + 1;
	}
	saveCollection(col);
	return fresh;
}

export function collectionStats(col: Collection): { unique: number; total: number } {
	const owned = Object.entries(col).filter(([, n]) => n > 0);
	return {
		// les uniques comptent les cartes de base — les Full Art sont un bonus, pas un dénominateur
		unique: owned.filter(([id]) => !id.endsWith('--fullart')).length,
		total: owned.reduce((a, [, n]) => a + n, 0)
	};
}
