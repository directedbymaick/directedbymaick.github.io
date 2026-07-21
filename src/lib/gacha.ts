import type { CardData, Rarity } from '$lib/types';
import { cards, getCard } from '$lib/cards';
import { nsKey, scheduleCloudSync } from '$lib/store';
import { rollVersion, versionsOf } from '$lib/variants';

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

export function eligibleFullArt(c: CardData): boolean {
	return !!c.fullArt || c.rarity === 'epic' || c.rarity === 'legendary' || c.rarity === 'prism';
}

/** Vue Full Art d'une carte : layout « L'Auréole » (via le prop `fullArt` du
    composant Card) + cadre prismatique. Si la carte a un détourage, le foil
    « showcase » s'applique (personnage flottant sur le holo) ; sinon holo secret. */
export function fullArtView(c: CardData): CardData {
	const v = structuredClone(c);
	v.id = `${c.id}--fullart`;
	v.sourceRarity = c.rarity;
	v.rarity = 'prism';
	// foil validé depuis le Lab s'il existe, sinon le défaut de la vue full art
	v.gene = { ...v.gene, foilPreset: c.fullArtFoil ?? (c.cutout ? 'showcase' : 'galerie') };
	return v;
}

/** Un tirage : la version affichée + son identité de base.
 *  `card.id` porte la clé de version (raw, foil, full art…) : c'est elle qui est
 *  collectionnée, un Raw et un foil de la même carte étant deux exemplaires. */
export interface Pull {
	card: CardData;
	baseId: string;
	fullArt: boolean;
	/** libellé de la version tirée (Raw, Cosmique, Full Art · Raw…) */
	version: string;
	/** true si la version tirée porte un foil */
	foil: boolean;
}

/** Chance, très rare, d'un booster « EXPELLED » : 5 cartes toutes en Full Art
 *  prismatique — épiques, légendaires et prismatiques uniquement. */
export const GOD_PACK_RATE = 0.008;

/** Le pack est-il un « EXPELLED » (les 5 cartes en Full Art) ? */
export function isGodPack(pulls: Pull[]): boolean {
	return pulls.length === PACK_SIZE && pulls.every((p) => p.fullArt);
}

function openGodPack(): Pull[] {
	const pool = cards.filter(
		(c) => c.rarity === 'epic' || c.rarity === 'legendary' || c.rarity === 'prism'
	);
	const src = pool.length >= PACK_SIZE ? pool : cards;
	const seen = new Set<string>();
	const pulls: Pull[] = [];
	for (let i = 0; i < PACK_SIZE; i++) {
		let card = src[Math.floor(Math.random() * src.length)];
		let guard = 0;
		while (seen.has(card.id) && guard++ < 40) card = src[Math.floor(Math.random() * src.length)];
		seen.add(card.id);
		/* `find` renvoyait la PREMIÈRE finition de la liste, donc toujours la même :
		   les 18 cartes du pool sortaient en Full Art Cosmique, et le pack le plus
		   rare du jeu ne pouvait produire ni SP, ni Galerie, ni Cristallin. On tire
		   maintenant parmi les finitions Full Art validées, au prorata de leurs
		   taux — le Raw reste exclu, un god pack ne rend pas de cartes nues. */
		const versions = versionsOf(card, 1).filter((v) => v.fullArt);
		const v = tirerParmi(versions.filter((x) => x.foil)) ?? versions[0];
		pulls.push({
			card: { ...v.view, id: v.key },
			baseId: card.id,
			fullArt: true,
			version: v.label,
			foil: v.foil !== null
		});
	}
	return pulls;
}

/* ---------- pitié ---------- */

/**
 * Rareté et Full Art sont deux jets INDÉPENDANTS : une garantie sur l'un ne dit
 * rien de l'autre. Sans Full Art, une Prismatique garantie reste une Prismatique
 * Raw, et le palier convoité n'arrive jamais. D'où deux compteurs séparés.
 */
export const PITY_PRISM = 40;
export const PITY_FULLART = 25;

export interface Pity {
	/** boosters ouverts depuis la dernière Prismatique */
	sansPrism: number;
	/** boosters ouverts depuis le dernier Full Art */
	sansFullArt: number;
}

const PITY_KEY = 'travelers-pity-v1';

export function loadPity(): Pity {
	if (typeof localStorage === 'undefined') return { sansPrism: 0, sansFullArt: 0 };
	try {
		const p = JSON.parse(localStorage.getItem(nsKey(PITY_KEY)) ?? '{}');
		return { sansPrism: p.sansPrism ?? 0, sansFullArt: p.sansFullArt ?? 0 };
	} catch {
		return { sansPrism: 0, sansFullArt: 0 };
	}
}

export function savePity(p: Pity): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(nsKey(PITY_KEY), JSON.stringify(p));
	scheduleCloudSync();
}

/** Tire une version au hasard dans une liste, au prorata des taux. */
function tirerParmi<T extends { rate: number }>(liste: T[]): T | null {
	if (!liste.length) return null;
	const total = liste.reduce((s, v) => s + v.rate, 0);
	if (total <= 0) return liste[Math.floor(Math.random() * liste.length)];
	let r = Math.random() * total;
	for (const v of liste) {
		if (r < v.rate) return v;
		r -= v.rate;
	}
	return liste[liste.length - 1];
}

/** La version Full Art d'une carte, tirée parmi ses finitions Full Art validées. */
function versionFullArt(card: CardData) {
	return tirerParmi(versionsOf(card, 1).filter((v) => v.fullArt));
}

function versEnPull(v: ReturnType<typeof rollVersion>, baseId: string): Pull {
	return {
		card: { ...v.view, id: v.key },
		baseId,
		fullArt: v.fullArt,
		version: v.label,
		foil: v.foil !== null
	};
}

/**
 * Tire un booster : 5 cartes, sans doublon dans le pack si le pool le permet.
 * `pity` est MUTÉ : ses compteurs montent d'un cran ou retombent à zéro.
 */
export function openPack(pity?: Pity): Pull[] {
	if (Math.random() < GOD_PACK_RATE) {
		const p = openGodPack();
		if (pity) {
			pity.sansFullArt = 0;
			if (p.some((x) => (x.card.sourceRarity ?? x.card.rarity) === 'prism')) pity.sansPrism = 0;
			else pity.sansPrism++;
		}
		return p;
	}

	// le compteur est à son dernier cran : ce booster DOIT tenir la promesse
	const duPrism = !!pity && pity.sansPrism + 1 >= PITY_PRISM;
	const duFullArt = !!pity && pity.sansFullArt + 1 >= PITY_FULLART;

	const pulls: Pull[] = [];
	const seen = new Set<string>();
	const slots: Rarity[] = [
		rollRarity(SLOT_ODDS[0].odds),
		rollRarity(SLOT_ODDS[0].odds),
		rollRarity(SLOT_ODDS[0].odds),
		rollRarity(SLOT_ODDS[1].odds),
		duPrism ? 'prism' : rollRarity(SLOT_ODDS[2].odds)
	];
	for (const rarity of slots) {
		const card = pickCard(rarity, seen);
		seen.add(card.id);
		/* le Raw est l'état de base : la version foil est un bonus rare, tiré selon
		   les finitions réellement validées pour cette carte (cf. variants.ts) */
		pulls.push(versEnPull(rollVersion(card, FULLART_RATE), card.id));
	}

	if (duFullArt && !pulls.some((p) => p.fullArt)) {
		/* on promeut la carte la plus rare éligible du booster ; si aucune ne l'est,
		   on remplace le dernier slot par une carte qui l'est. */
		const rang: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3, prism: 4 };
		let i = -1;
		let meilleur = -1;
		pulls.forEach((p, k) => {
			const c = getCard(p.baseId);
			if (!c || !eligibleFullArt(c)) return;
			if (rang[c.rarity] > meilleur) {
				meilleur = rang[c.rarity];
				i = k;
			}
		});
		if (i < 0) {
			const pool = cards.filter((c) => eligibleFullArt(c) && !seen.has(c.id));
			const src = pool.length ? pool : cards.filter(eligibleFullArt);
			if (src.length) {
				const c = src[Math.floor(Math.random() * src.length)];
				pulls[pulls.length - 1] = versEnPull(rollVersion(c, 1), c.id);
				i = pulls.length - 1;
			}
		} else {
			const c = getCard(pulls[i].baseId)!;
			const v = versionFullArt(c);
			if (v) pulls[i] = versEnPull(v, c.id);
		}
	}

	if (pity) {
		const prism = pulls.some((p) => (p.card.sourceRarity ?? p.card.rarity) === 'prism');
		pity.sansPrism = prism ? 0 : pity.sansPrism + 1;
		pity.sansFullArt = pulls.some((p) => p.fullArt) ? 0 : pity.sansFullArt + 1;
	}
	return pulls;
}

/* ---------- collection (localStorage, rattachée au compte) ---------- */

const STORE_KEY = 'travelers-collection-v1';

export type Collection = Record<string, number>;

export function loadCollection(): Collection {
	if (typeof localStorage === 'undefined') return {};
	try {
		return JSON.parse(localStorage.getItem(nsKey(STORE_KEY)) ?? '{}');
	} catch {
		return {};
	}
}

export function saveCollection(col: Collection): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(nsKey(STORE_KEY), JSON.stringify(col));
	scheduleCloudSync();
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
