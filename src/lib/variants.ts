import type { CardData, FoilPreset } from '$lib/types';
import { eligibleFullArt, fullArtView } from '$lib/gacha';

/**
 * Les versions réellement existantes d'une carte, et leur probabilité de sortie.
 *
 * Le RAW est l'état de base : une carte sans aucun foil. Chaque carte existe en
 * Raw, et chaque Full Art aussi. Les finitions foil validées depuis le Lab sont
 * des bonus rares qui se substituent au Raw lors d'un tirage.
 */

/** Chance qu'un tirage soit foil plutôt que Raw. */
export const FOIL_RATE = 0.15;

export const FOIL_LABEL: Record<FoilPreset, string> = {
	mat: 'Raw',
	regular: 'Holographique',
	amazing: 'Cristallin',
	cosmos: 'Cosmique',
	galerie: 'Galerie',
	showcase: 'Illustration spéciale'
};

export interface CardVersion {
	/** identifiant de collection — c'est lui qui distingue les exemplaires */
	key: string;
	label: string;
	/** null = Raw (aucun foil) */
	foil: FoilPreset | null;
	fullArt: boolean;
	/** probabilité de sortie sur un tirage de CETTE carte */
	rate: number;
	/** la carte telle qu'elle doit être rendue */
	view: CardData;
}

/** Le foil « mat » n'est pas une finition : c'est l'absence de foil, donc le Raw. */
function estFoil(p: FoilPreset | undefined): p is FoilPreset {
	return !!p && p !== 'mat';
}

/**
 * Toutes les versions d'une carte, Raw d'abord, avec leur taux de drop.
 * @param fullArtRate chance de la forme Full Art (0 si la carte n'y a pas droit)
 */
export function versionsOf(card: CardData, fullArtRate: number): CardVersion[] {
	const rawView = { ...card, gene: { ...card.gene, foilPreset: 'mat' as FoilPreset } };

	/* Finitions RÉELLEMENT validées depuis le Lab, par forme. Aucune valeur par
	   défaut : une carte sans validation n'existe qu'en Raw. C'est l'auteur qui
	   décide, pas le code. */
	const finitions = (fullArt: boolean): FoilPreset[] => {
		const base = fullArt ? card.fullArtFoil : card.gene.foilPreset;
		const list = [
			...(estFoil(base) ? [base] : []),
			...(card.variants ?? []).filter((v) => !!v.fullArt === fullArt).map((v) => v.foilPreset)
		].filter(estFoil);
		return [...new Set(list)];
	};

	/* l'Illustration spéciale est la finition la plus désirable : on lui donne
	   moins de poids qu'aux autres dans la répartition des 15 % de foil */
	const poids = (f: FoilPreset) => (f === 'showcase' ? 0.4 : 1);

	const eligible = eligibleFullArt(card);
	const pFA = eligible ? fullArtRate : 0;

	const versions: CardVersion[] = [];

	for (const fullArt of eligible ? [false, true] : [false]) {
		const pForme = fullArt ? pFA : 1 - pFA;
		const foils = finitions(fullArt);
		const suffixe = fullArt ? '--fullart' : '';
		const vueForme = fullArt
			? { ...fullArtView(card), gene: { ...card.gene, foilPreset: 'mat' as FoilPreset } }
			: rawView;

		// Raw de la forme : ce qui reste quand aucun foil ne sort
		versions.push({
			key: `${card.id}${suffixe}`,
			label: fullArt ? 'Full Art · Raw' : 'Raw',
			foil: null,
			fullArt,
			rate: pForme * (foils.length ? 1 - FOIL_RATE : 1),
			view: vueForme
		});

		const total = foils.reduce((a, f) => a + poids(f), 0);
		for (const f of foils) {
			versions.push({
				key: `${card.id}${suffixe}--${f}`,
				label: `${fullArt ? 'Full Art · ' : ''}${FOIL_LABEL[f]}`,
				foil: f,
				fullArt,
				rate: (pForme * FOIL_RATE * poids(f)) / total,
				view: { ...vueForme, gene: { ...vueForme.gene, foilPreset: f } }
			});
		}
	}

	return versions;
}

/** Tire une version au hasard selon les taux. */
export function rollVersion(card: CardData, fullArtRate: number): CardVersion {
	const versions = versionsOf(card, fullArtRate);
	let r = Math.random();
	for (const v of versions) {
		if (r < v.rate) return v;
		r -= v.rate;
	}
	return versions[0];
}

/** Taux formaté pour l'affichage : « 79,9 % », « 0,45 % ». */
export function formatRate(rate: number): string {
	const pct = rate * 100;
	const dec = pct >= 10 ? 1 : pct >= 1 ? 1 : 2;
	return `${pct.toFixed(dec).replace('.', ',')} %`;
}
