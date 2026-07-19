import type { CardData } from '$lib/types';

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
 */
export function altView(card: CardData, art: string, index: number): CardData {
	return {
		...card,
		art,
		alt: index + 1,
		gene: {
			...card.gene,
			foilPreset: card.gene.foilPreset === 'mat' ? 'holo' : card.gene.foilPreset,
			seed: card.gene.seed + 97 * (index + 1)
		}
	};
}
