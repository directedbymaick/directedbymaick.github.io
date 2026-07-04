import type { CardData } from '$lib/types';

/**
 * Catalogue : tous les cards/*.json du repo, chargés au build.
 * Le pipeline (pipeline/) écrit dans cards/ ; la curation = supprimer les ratés.
 */
const modules = import.meta.glob<{ default: CardData }>('../../cards/*.json', { eager: true });

const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 } as const;

export const cards: CardData[] = Object.values(modules)
	.map((m) => m.default)
	.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity] || a.name.localeCompare(b.name));

export function getCard(id: string): CardData | undefined {
	return cards.find((c) => c.id === id);
}
