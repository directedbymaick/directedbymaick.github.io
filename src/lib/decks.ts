import { charter } from '$lib/charter';
import type { CardData } from '$lib/types';

/** Un deck : 30 cartes, copies limitées par la rareté (cf. Règles). */
export interface Deck {
	id: string;
	name: string;
	/** cardId -> nombre de copies */
	cards: Record<string, number>;
	updatedAt: number;
}

const KEY = 'expelled-decks';
export const DECK_SIZE = 30;

export function loadDecks(): Deck[] {
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
		return Array.isArray(raw) ? raw : [];
	} catch {
		return [];
	}
}

export function saveDecks(decks: Deck[]) {
	localStorage.setItem(KEY, JSON.stringify(decks));
}

export function newDeck(name: string): Deck {
	return {
		id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
		name,
		cards: {},
		updatedAt: Date.now()
	};
}

export function deckSize(deck: Deck): number {
	return Object.values(deck.cards).reduce((a, b) => a + b, 0);
}

export function maxCopiesOf(card: CardData): number {
	return charter.rarities[card.rarity].maxCopies;
}

export function canAdd(deck: Deck, card: CardData): boolean {
	return deckSize(deck) < DECK_SIZE && (deck.cards[card.id] ?? 0) < maxCopiesOf(card);
}

/** Répartition des coûts en Volonté : buckets 0..6 et 7+. */
export function costCurve(deck: Deck, resolve: (id: string) => CardData | undefined): number[] {
	const buckets = new Array(8).fill(0);
	for (const [id, n] of Object.entries(deck.cards)) {
		const card = resolve(id);
		if (!card) continue;
		buckets[Math.min(card.cost, 7)] += n;
	}
	return buckets;
}

/** Répartition par peuple, pour la barre d'identité du deck. */
export function factionSpread(
	deck: Deck,
	resolve: (id: string) => CardData | undefined
): Record<string, number> {
	const spread: Record<string, number> = {};
	for (const [id, n] of Object.entries(deck.cards)) {
		const card = resolve(id);
		if (!card) continue;
		spread[card.faction] = (spread[card.faction] ?? 0) + n;
	}
	return spread;
}
