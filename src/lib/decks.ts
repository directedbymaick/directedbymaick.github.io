import { charter } from '$lib/charter';
import type { CardData } from '$lib/types';
import { nsKey, scheduleCloudSync } from '$lib/store';
import { GAME_RULES } from '$lib/game/rules';

/** Un deck : 30 cartes, copies limitées par la rareté (cf. Règles). */
export interface Deck {
	id: string;
	name: string;
	/** cardId -> nombre de copies */
	cards: Record<string, number>;
	updatedAt: number;
}

const KEY = 'expelled-decks';
export const DECK_SIZE = GAME_RULES.deckSize;
export const MAX_FACTIONS = GAME_RULES.maxFactionsPerDeck;

export interface DeckValidation {
	isLegal: boolean;
	errors: string[];
}

export type CardCollection = Record<string, number>;

export function ownedCopies(collection: CardCollection, cardId: string): number {
	return Object.entries(collection).reduce(
		(total, [versionId, count]) =>
			total + (versionId === cardId || versionId.startsWith(`${cardId}--`) ? Math.max(0, count) : 0),
		0
	);
}

export function loadDecks(): Deck[] {
	try {
		const raw = JSON.parse(localStorage.getItem(nsKey(KEY)) ?? '[]');
		return Array.isArray(raw) ? raw : [];
	} catch {
		return [];
	}
}

export function saveDecks(decks: Deck[]) {
	localStorage.setItem(nsKey(KEY), JSON.stringify(decks));
	scheduleCloudSync();
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

export function canAddFaction(
	deck: Deck,
	card: CardData,
	resolve: (id: string) => CardData | undefined
): boolean {
	const factions = new Set(
		Object.entries(deck.cards)
			.filter(([, count]) => count > 0)
			.map(([id]) => resolve(id)?.faction)
			.filter(Boolean)
	);
	return factions.has(card.faction) || factions.size < MAX_FACTIONS;
}

export function validateDeck(
	deck: Deck,
	resolve: (id: string) => CardData | undefined
): DeckValidation {
	const errors: string[] = [];
	if (deckSize(deck) !== DECK_SIZE) errors.push(`Le deck doit contenir exactement ${DECK_SIZE} cartes.`);
	const factions = new Set<string>();
	for (const [id, count] of Object.entries(deck.cards)) {
		const card = resolve(id);
		if (!card) { errors.push(`Carte inconnue : ${id}.`); continue; }
		if (count < 1 || count > maxCopiesOf(card)) errors.push(`${card.name} dépasse sa limite de copies.`);
		factions.add(card.faction);
	}
	if (factions.size > MAX_FACTIONS) errors.push(`Un deck ne peut contenir que ${MAX_FACTIONS} peuples.`);
	return { isLegal: errors.length === 0, errors };
}

export function validateDeckOwnership(deck: Deck, collection: CardCollection): DeckValidation {
	const errors = Object.entries(deck.cards)
		.filter(([id, count]) => count > ownedCopies(collection, id))
		.map(([id, count]) => `${id} : ${count} requise(s), ${ownedCopies(collection, id)} possédée(s).`);
	return { isLegal: errors.length === 0, errors };
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
