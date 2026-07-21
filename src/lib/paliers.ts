import type { CardData, FoilPreset, Rarity } from '$lib/types';
import { cards } from '$lib/cards';
import { charter } from '$lib/charter';
import { FULLART_RATE, SLOT_ODDS } from '$lib/gacha';
import { versionsOf, foilLabel } from '$lib/variants';

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
 * Taux par booster d'UNE version précise — la même mesure que celle des paliers,
 * exposée carte par carte pour pouvoir en tirer un prix.
 */
export function tauxVersion(card: CardData, rateVersion: number): number {
	const n = effectifs();
	const p = chancesParRarete();
	return ((p[card.rarity] ?? 0) / (n[card.rarity] ?? 1)) * rateVersion;
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
		for (const v of versionsOf(c, FULLART_RATE)) refCache = Math.max(refCache, tauxVersion(c, v.rate));
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

export function paliers(): Palier[] {
	const n = effectifs();
	const pRarete = chancesParRarete();
	const map = new Map<string, Palier>();

	for (const c of cards) {
		for (const v of versionsOf(c, FULLART_RATE)) {
			const rarity = v.view.sourceRarity ?? v.view.rarity;
			const nobg = v.foil === 'showcase' && !!c.cutout;
			const key = `${rarity}|${v.fullArt ? 'fa' : 'n'}|${v.foil ?? 'raw'}|${nobg ? 'nobg' : ''}`;

			/* P(ce palier, sur un booster) = P(la rareté sort) × P(cette carte parmi
			   les cartes de sa rareté) × P(cette version de la carte). */
			const taux = ((pRarete[c.rarity] ?? 0) / (n[c.rarity] ?? 1)) * v.rate;

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
