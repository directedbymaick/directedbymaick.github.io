import type { CardData, FoilPreset, Rarity } from '$lib/types';
import { eligibleFullArt, fullArtView } from '$lib/gacha';
import { altView } from '$lib/cards';

/**
 * Les versions réellement existantes d'une carte, et leur probabilité de sortie.
 *
 * Le RAW est l'état de base : une carte sans aucun foil. Chaque carte existe en
 * Raw, et chaque Full Art aussi. Les finitions foil validées depuis le Lab sont
 * des bonus rares qui se substituent au Raw lors d'un tirage.
 */

/** Chance qu'un tirage soit foil plutôt que Raw. */
export const FOIL_RATE = 0.15;

/**
 * Chance qu'un tirage donne UN art alternatif donné, plutôt que l'illustration
 * de base. Une carte à deux alts leur cède donc 2 × ce taux.
 *
 * Réglé sous la Full Art (6 %) : l'alt est l'artwork chase de la carte.
 * Et un alt ne sort JAMAIS en Raw — c'est une pièce de collection, elle porte
 * toujours une finition.
 */
export const ALT_RATE = 0.01;

/**
 * Répartition À L'INTÉRIEUR d'un art alternatif.
 *
 * L'alt n'emprunte PAS le taux global de Full Art : s'il le faisait, sa Full Art
 * serait mécaniquement seize fois plus rare que son détourage, et le détourage
 * ne pourrait jamais être la pièce de tête. Les trois versions d'un alt ont donc
 * leur propre échelle, du plus courant au plus rare :
 *
 *   nu (finition ordinaire) → Full Art → détouré
 *
 * Les parts sont calées pour que, sur une carte du set, le détouré sorte environ
 * 3,5 fois moins souvent que la Full Art — l'écart qui sépare leurs prix d'un
 * facteur deux une fois passés dans la courbe de `prixNom`.
 */
export const ALT_FULLART_PART = 0.21;
export const ALT_NOBG_PART = 0.06;

export const FOIL_LABEL: Record<FoilPreset, string> = {
	mat: 'Raw',
	regular: 'Holographique',
	amazing: 'Cristallin',
	cosmos: 'Cosmique',
	galerie: 'Galerie',
	// « SP » : le nom court de la finition détourée, celui qui figure sur la carte
	showcase: 'SP'
};

/**
 * Le preset « showcase » n'a PAS de matière à lui : il emprunte le holo de la
 * rareté de la carte (et la Galerie en Full Art). Le nommer d'après le preset
 * mentait donc — une Épique en showcase est peinte avec la recette du Cristallin,
 * une Full Art en showcase avec celle de la Galerie.
 *
 * Règle : le nom suit la MATIÈRE réellement peinte. Seul le détourage échappe à
 * cette règle, parce qu'il change la composition elle-même (le personnage flotte
 * au-dessus du holo) et mérite son propre nom.
 *
 * Le mapping ci-dessous double celui de Card.svelte (showcaseHolo) : les deux
 * doivent rester alignés.
 */
const SHOWCASE_MATIERE: Record<Rarity, string> = {
	common: 'Reflet', // reverse holo — la seule matière propre au showcase
	rare: 'Holographique', // rare holo
	epic: 'Cristallin', // amazing rare
	legendary: 'Radiant', // radiant rare — aucune carte aujourd'hui
	prism: 'Secret' // rare secret — aucune carte aujourd'hui
};

export function foilLabel(
	foil: FoilPreset,
	card: Pick<CardData, 'cutout' | 'rarity'>,
	fullArt = false
): string {
	if (foil !== 'showcase') return FOIL_LABEL[foil];
	if (card.cutout) return FOIL_LABEL.showcase; // détourée : la SP, nom propre
	// en Full Art, le holo derrière est toujours la Galerie (cf. Card.svelte)
	return fullArt ? FOIL_LABEL.galerie : SHOWCASE_MATIERE[card.rarity];
}

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

	/* L'Illustration spéciale n'est la finition la plus désirable que si la carte a
	   un DÉTOURAGE : le personnage flotte alors au-dessus du holo, et la carte porte
	   le tag « no bg ». Sans détourage, ce foil ne fait qu'appliquer le holo de fond
	   de la rareté — c'est donc une finition ordinaire, au même poids que les autres. */
	const poidsDe = (f: FoilPreset, c: Pick<CardData, 'cutout'>) =>
		f === 'showcase' && c.cutout ? 0.4 : 1;
	const poids = (f: FoilPreset) => poidsDe(f, card);

	const eligible = eligibleFullArt(card);
	const pFA = eligible ? fullArtRate : 0;

	const versions: CardVersion[] = [];

	/* Les arts alternatifs prélèvent leur part sur l'illustration de base : le
	   total des versions d'une carte vaut toujours 1. */
	const alts = card.alts ?? [];
	const pArt = 1 - alts.length * ALT_RATE;

	for (const fullArt of eligible ? [false, true] : [false]) {
		const pForme = (fullArt ? pFA : 1 - pFA) * pArt;
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
				label: `${fullArt ? 'Full Art · ' : ''}${foilLabel(f, card, fullArt)}`,
				foil: f,
				fullArt,
				rate: (pForme * FOIL_RATE * poids(f)) / total,
				view: { ...vueForme, gene: { ...vueForme.gene, foilPreset: f } }
			});
		}
	}

	/* ---------------------------------------------------- arts alternatifs
	   Un alt est une troisième forme, avec ses propres finitions réglées au Lab.
	   Deux différences avec l'illustration de base : il n'a jamais de Raw, et son
	   illustration n'étant pas détourée, ses libellés suivent la matière de la
	   rareté et non la « SP ». */
	alts.forEach((art, i) => {
		const reglage = card.altReglages?.[i];
		const detourage = reglage?.cutout;
		// à défaut de validation au Lab, la finition héritée de la carte de base
		const herite: FoilPreset =
			card.gene.foilPreset === 'mat' ? 'regular' : card.gene.foilPreset;
		/* « showcase » est réservé à la version détourée. Si la carte de base le
		   porte et que l'alt a un détourage, la version nue prend une matière
		   ordinaire — sinon les deux porteraient le même nom. */
		const finitionNue: FoilPreset =
			reglage?.foilPreset ?? (herite === 'showcase' && detourage ? 'regular' : herite);
		const finitionFA: FoilPreset = reglage?.fullArtFoil ?? (detourage ? 'galerie' : herite);

		// la vue nue : l'artwork alternatif sans découpe
		const vueNue = altView(card, art, i);
		delete vueNue.cutout;

		const formes: { cle: string; p: number; foil: FoilPreset; vue: CardData; fa: boolean }[] = [];

		const pFullArt = eligible ? ALT_FULLART_PART : 0;
		const pNobg = detourage ? ALT_NOBG_PART : 0;

		formes.push({
			cle: `--alt${i + 1}`,
			p: 1 - pFullArt - pNobg,
			foil: finitionNue,
			vue: vueNue,
			fa: false
		});

		if (eligible) {
			formes.push({
				cle: `--alt${i + 1}--fullart`,
				p: pFullArt,
				foil: finitionFA,
				vue: { ...fullArtView(vueNue), gene: { ...vueNue.gene } },
				fa: true
			});
		}

		if (detourage) {
			// la pièce de tête : l'artwork alternatif détouré
			formes.push({
				cle: `--alt${i + 1}--nobg`,
				p: pNobg,
				foil: 'showcase',
				vue: altView(card, art, i),
				fa: false
			});
		}

		for (const f of formes) {
			versions.push({
				key: `${card.id}${f.cle}--${f.foil}`,
				label: `Alt ${i + 1}${f.fa ? ' · Full Art' : ''} · ${foilLabel(f.foil, f.vue, f.fa)}`,
				foil: f.foil,
				fullArt: f.fa,
				rate: ALT_RATE * f.p,
				view: { ...f.vue, gene: { ...f.vue.gene, foilPreset: f.foil } }
			});
		}
	});

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
