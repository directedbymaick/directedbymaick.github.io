import type { CardData, FoilPreset, Rarity } from '$lib/types';
import { cards } from '$lib/cards';
import { charter } from '$lib/charter';
import { FULLART_RATE, SLOT_ODDS } from '$lib/gacha';
import { versionsOf, foilLabel } from '$lib/variants';

/**
 * L'échelle réelle du jeu.
 *
 * Une rareté seule ne dit plus ce qu'on tient en main : deux Prismatiques n'ont
 * pas la même valeur selon qu'elles sortent en Raw ou en Illustration spéciale
 * détourée. Le palier est donc le quadruplet rareté × forme × finition × détourage,
 * et sa probabilité se calcule sur le tirage réel — jamais posée à la main.
 */
export interface Palier {
	key: string;
	rarity: Rarity;
	fullArt: boolean;
	foil: FoilPreset | null;
	/** l'illustration est détourée : le personnage flotte, la carte porte « no bg » */
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
					v.foil ? foilLabel(v.foil, c) : 'Raw',
					nobg ? 'no bg' : null
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
