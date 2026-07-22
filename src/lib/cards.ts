import type { CardData, FoilPreset } from '$lib/types';

/**
 * Catalogue : tous les cards/*.json du repo, chargés au build.
 * Le pipeline (pipeline/) écrit dans cards/ ; la curation = supprimer les ratés.
 */
const modules = import.meta.glob<{ default: CardData }>('../../cards/*.json', { eager: true });

const rarityOrder = { prism: 0, legendary: 1, epic: 2, rare: 3, common: 4 } as const;

export const cards: CardData[] = Object.values(modules)
	.map((m) => m.default)
	.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity] || a.name.localeCompare(b.name));

export function getCard(id: string): CardData | undefined {
	return cards.find((c) => c.id === id);
}

/**
 * Vue « art alternatif » d'une carte : les alts sont TOUJOURS foil
 * (holo minimum — les raretés déjà foil gardent leur preset), avec un
 * seed décalé pour que leur brillance diffère de la version de base.
 *
 * Ces deux règles ne sont que le DÉFAUT. Dès qu'un alt a été réglé au Lab, son
 * `altReglages[index]` prend la main : sans ça, un alt validé s'affichait quand
 * même avec la finition héritée de la base, et le réglage n'avait aucun effet.
 *
 * `foil` force une finition ponctuelle (une variante de l'alt) sans toucher à sa
 * composition officielle.
 */
export function altView(
	card: CardData,
	art: string,
	index: number,
	foil?: FoilPreset
): CardData {
	const reglage = card.altReglages?.[index];
	const defaut = card.gene.foilPreset === 'mat' ? 'regular' : card.gene.foilPreset;
	const vue: CardData = {
		...card,
		art,
		alt: index + 1,
		gene: {
			...card.gene,
			foilPreset: foil ?? reglage?.foilPreset ?? defaut,
			seed: reglage?.seed ?? card.gene.seed + 97 * (index + 1)
		}
	};
	/* Le détourage appartient à l'illustration de BASE. Le garder ici ferait
	   flotter le sujet découpé de la carte de base au-dessus de l'artwork de
	   l'alt, et ferait étiqueter cette version « SP » alors qu'elle n'est pas
	   détourée. Un alt détouré devra porter son propre découpage. */
	delete vue.cutout;
	delete vue.cutoutX;
	delete vue.cutoutY;
	delete vue.cutoutScale;
	return vue;
}
