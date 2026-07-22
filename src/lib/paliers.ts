import type { CardData, FoilPreset, Rarity } from '$lib/types';
import { cards } from '$lib/cards';
import { charter } from '$lib/charter';
import { FULLART_RATE, SLOT_ODDS } from '$lib/gacha';
import { versionsOf, foilLabel } from '$lib/variants';
import mesures from '$lib/taux-mesures.json';

/**
 * L'échelle réelle du jeu.
 *
 * Une rareté seule ne dit plus ce qu'on tient en main : deux Prismatiques n'ont
 * pas la même valeur selon qu'elles sortent en Raw ou en SP
 * détourée. Le palier est donc le quadruplet rareté × forme × finition × détourage,
 * et sa probabilité se calcule sur le tirage réel — jamais posée à la main.
 */
export interface Palier {
	key: string;
	rarity: Rarity;
	fullArt: boolean;
	foil: FoilPreset | null;
	/** l'illustration est détourée : le personnage flotte, la carte porte « no bg ».
	    Depuis que le showcase sans détourage s'appelle « Reflet », ce booléen vaut
	    exactement `foil === 'showcase'` — il reste exposé pour filtrer, mais il
	    n'apparaît plus dans le libellé, où il ne ferait que répéter la finition. */
	nobg: boolean;
	label: string;
	/** nombre de cartes du set qui existent à ce palier */
	membres: number;
	/** exemplaires attendus par booster de 5 cartes */
	taux: number;
	/** une carte du palier, rendue telle qu'elle sort */
	exemple: CardData;
	exempleFullArt: boolean;
}

/** Combien de cartes forgées par rareté — le tirage choisit uniformément dedans. */
function effectifs(): Record<string, number> {
	const n: Record<string, number> = {};
	for (const c of cards) n[c.rarity] = (n[c.rarity] ?? 0) + 1;
	return n;
}

/** Chance qu'un booster de 5 cartes donne un slot de cette rareté de base. */
function chancesParRarete(): Record<string, number> {
	const p: Record<string, number> = {};
	// les slots 1 à 3 partagent les mêmes odds : SLOT_ODDS[0] compte triple
	const poids = [3, 1, 1];
	SLOT_ODDS.forEach((slot, i) => {
		for (const [r, q] of Object.entries(slot.odds)) p[r] = (p[r] ?? 0) + (q ?? 0) * poids[i];
	});
	return p;
}

/**
 * Le modèle analytique : P(la rareté sort) × P(cette carte) × P(cette version).
 *
 * Il ne sert plus que de filet. Il ignore les god packs et les deux pity, donc
 * il sous-estime lourdement tout ce qui est Full Art — c'est précisément le
 * défaut qui a fait publier « 1 booster sur 13 000 » là où le tirage réel donne
 * 1 sur 730.
 */
function tauxModele(card: CardData, rateVersion: number): number {
	const n = effectifs();
	const p = chancesParRarete();
	return ((p[card.rarity] ?? 0) / (n[card.rarity] ?? 1)) * rateVersion;
}

/**
 * Taux par booster d'UNE version précise, MESURÉ sur le tirage réel.
 *
 * `src/lib/taux-mesures.json` est produit par `node scripts/taux.mjs`, qui ouvre
 * trois millions de boosters avec le vrai `openPack`. On ne calcule donc plus
 * ce que le tirage devrait faire : on regarde ce qu'il fait, god packs et pity
 * compris. Toute mécanique ajoutée plus tard au booster sera prise en compte
 * dès la prochaine régénération, sans une ligne à changer ici.
 */
const COMPTES = mesures.versions as Record<string, number>;

export function tauxVersion(card: CardData, v: { key: string; rate: number }): number {
	const vus = COMPTES[v.key];
	// Les 193 versions du set sont toutes apparues à la dernière mesure. Si une
	// nouveauté n'y est pas encore, le modèle évite un taux nul — qui vaudrait un
	// prix plancher sur la carte la plus rare du jeu.
	if (vus === undefined) return tauxModele(card, v.rate);
	return vus / mesures.boosters;
}

/** Prix plancher : celui du nom le plus facile à tirer du set. */
export const PRIX_PLANCHER = 20;
/* Compression : à cru, l'écart de rareté entre le nom le plus banal et le plus
   rare dépasse 1 à 2 500, ce qui donnerait des prix absurdes. L'exposant ramène
   l'écart à un facteur ~100 : le sommet reste hors de portée sans être une
   plaisanterie. */
const COMPRESSION = 0.6;

/* La référence n'est pas posée à la main : c'est le taux du nom RÉELLEMENT le
   plus courant du set. Ainsi le plancher reste le plancher quoi qu'on ajoute au
   set, et aucun prix ne peut passer sous PRIX_PLANCHER par accident. */
let refCache = 0;
function tauxReference(): number {
	if (refCache) return refCache;
	for (const c of cards)
		for (const v of versionsOf(c, FULLART_RATE)) refCache = Math.max(refCache, tauxVersion(c, v));
	return refCache;
}

/**
 * Le prix d'un nom découle de sa rareté RÉELLE — celle du palier, qui tient
 * compte de la rareté de la carte, de sa forme et de sa finition. Une Commune
 * Raw et une Commune Full Art SP ne peuvent pas valoir pareil : la seconde sort
 * mille fois moins souvent.
 *
 * Rien n'est saisi à la main : valider une variante au Lab déplace son taux, et
 * son prix suit.
 */
export function prixNom(taux: number): number {
	if (taux <= 0) return PRIX_PLANCHER;
	const brut = PRIX_PLANCHER * Math.pow(tauxReference() / taux, COMPRESSION);
	const arrondi = brut < 100 ? 5 : brut < 500 ? 10 : 50;
	return Math.max(PRIX_PLANCHER, Math.round(brut / arrondi) * arrondi);
}

/* ------------------------------------------------------------------ plancher
   Le prix suit le taux mesuré, et le taux mesuré ne suit pas la rareté : les
   garanties et les god packs promeuvent toujours la carte la plus rare du
   booster, jamais une Rare. Une Rare Full Art SP se retrouvait donc plus dure à
   sortir — et deux fois plus chère — qu'une Prismatique Full Art SP.

   La règle : à forme égale (Full Art, finition, détourage), le prix d'une
   rareté ne peut pas descendre sous celui de la même forme à une rareté
   inférieure. Le tirage reste ce qu'il est, l'échelle des raretés reste
   sincère ; c'est la boutique seule qui garde une hiérarchie lisible. */
const ECHELLE_RARETE: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'prism'];

/** L'identité d'une version, rareté mise à part. */
function forme(v: { fullArt: boolean; foil: FoilPreset | null }, c: CardData): string {
	const nobg = v.foil === 'showcase' && !!c.cutout;
	return `${v.fullArt ? 'fa' : 'n'}|${v.foil ?? 'raw'}|${nobg ? 'nobg' : ''}`;
}

/** forme -> rareté -> prix minimal admissible, hérité des raretés inférieures. */
let planchersCache: Map<string, number[]> | null = null;
function planchers(): Map<string, number[]> {
	if (planchersCache) return planchersCache;

	// prix bruts les plus élevés observés pour chaque (forme, rareté)
	const brut = new Map<string, number[]>();
	for (const c of cards) {
		for (const v of versionsOf(c, FULLART_RATE)) {
			const r = (v.view.sourceRarity ?? v.view.rarity) as Rarity;
			const i = ECHELLE_RARETE.indexOf(r);
			if (i < 0) continue;
			const f = forme(v, c);
			const ligne = brut.get(f) ?? ECHELLE_RARETE.map(() => 0);
			ligne[i] = Math.max(ligne[i], prixNom(tauxVersion(c, v)));
			brut.set(f, ligne);
		}
	}

	// puis on propage vers le haut : chaque rareté hérite du maximum d'en dessous
	planchersCache = new Map();
	for (const [f, ligne] of brut) {
		const sol = ECHELLE_RARETE.map(() => 0);
		let acc = 0;
		for (let i = 0; i < ligne.length; i++) {
			sol[i] = acc; // strictement les raretés INFÉRIEURES
			acc = Math.max(acc, ligne[i]);
		}
		planchersCache.set(f, sol);
	}
	return planchersCache;
}

/**
 * Le prix affiché : celui que dicte le taux mesuré, relevé au plancher de sa
 * forme si une rareté inférieure coûtait davantage.
 */
export function prixVersion(
	card: CardData,
	v: { key: string; rate: number; fullArt: boolean; foil: FoilPreset | null; view: CardData }
): number {
	const p = prixNom(tauxVersion(card, v));
	const r = (v.view.sourceRarity ?? v.view.rarity) as Rarity;
	const i = ECHELLE_RARETE.indexOf(r);
	if (i < 0) return p;
	return Math.max(p, planchers().get(forme(v, card))?.[i] ?? 0);
}

export function paliers(): Palier[] {
	const map = new Map<string, Palier>();

	for (const c of cards) {
		for (const v of versionsOf(c, FULLART_RATE)) {
			const rarity = v.view.sourceRarity ?? v.view.rarity;
			const nobg = v.foil === 'showcase' && !!c.cutout;
			const key = `${rarity}|${v.fullArt ? 'fa' : 'n'}|${v.foil ?? 'raw'}|${nobg ? 'nobg' : ''}`;

			/* Mesuré, pas déduit : le nombre de fois que cette version exacte est
			   sortie de `openPack`, rapporté au nombre de boosters ouverts. */
			const taux = tauxVersion(c, v);

			const dejaVu = map.get(key);
			if (dejaVu) {
				dejaVu.membres++;
				dejaVu.taux += taux;
				continue;
			}
			map.set(key, {
				key,
				rarity,
				fullArt: v.fullArt,
				foil: v.foil,
				nobg,
				label: [
					charter.rarities[rarity].name,
					v.fullArt ? 'Full Art' : null,
					v.foil ? foilLabel(v.foil, c, v.fullArt) : 'Raw'
				]
					.filter(Boolean)
					.join(' · '),
				membres: 1,
				taux,
				exemple: v.view,
				exempleFullArt: v.fullArt
			});
		}
	}

	// du plus courant au plus rare : l'échelle se lit en montant
	return [...map.values()].sort((a, b) => b.taux - a.taux);
}

/**
 * « 1 booster sur 13 000 » parle plus qu'un pourcentage à quatre décimales.
 * Au-delà d'un exemplaire par booster, la fréquence se dit dans l'autre sens.
 */
export function frequence(taux: number): string {
	if (taux <= 0) return '—';
	if (taux >= 1) return `${taux.toFixed(1).replace('.', ',')} par booster`;
	const n = 1 / taux;
	const arrondi =
		n < 100 ? Math.round(n) : n < 1000 ? Math.round(n / 10) * 10 : Math.round(n / 100) * 100;
	return `1 booster sur ${arrondi.toLocaleString('fr-FR')}`;
}
