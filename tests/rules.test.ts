import assert from 'node:assert/strict';
import { GAME_RULES } from '../src/lib/game/rules';
import {
	canAddFaction,
	ownedCopies,
	validateDeck,
	validateDeckOwnership,
	type Deck
} from '../src/lib/decks';
import type { CardData, FactionId, Rarity } from '../src/lib/types';
import {
	ALT_RATE,
	FOIL_RATE,
	FULLART_RATE,
	GOD_PACK_RATE,
	PITY_FULLART,
	PITY_PRISM
} from '../src/lib/tirage.config';

function card(id: string, faction: FactionId, rarity: Rarity = 'common'): CardData {
	return {
		id,
		name: id,
		kind: 'etre',
		cost: 1,
		attack: 1,
		health: 1,
		text: '',
		rarity,
		faction,
		art: '',
		gene: { palette: [], foilPreset: 'mat', seed: 1, accent: '#fff' }
	};
}

const pool = [card('v1', 'vasar'), card('x1', 'exar'), card('e1', 'eshar')];
const resolve = (id: string) => pool.find((entry) => entry.id === id);
const cards: Deck['cards'] = { v1: 3, x1: 3 };
for (let i = 0; i < GAME_RULES.deckSize - 6; i++) cards[`v${i + 2}`] = 1;
const expandedPool = [...pool, ...Object.keys(cards).filter((id) => !resolve(id)).map((id) => card(id, 'vasar'))];
const resolveExpanded = (id: string) => expandedPool.find((entry) => entry.id === id);
const legal: Deck = { id: 'legal', name: 'Légal', updatedAt: 0, cards };

assert.equal(GAME_RULES.startingKorum, 25);
assert.equal(FOIL_RATE, 0.24);
assert.equal(FULLART_RATE, 0.06);
assert.equal(ALT_RATE, 0.08);
assert.equal(GOD_PACK_RATE, 0.0015);
assert.equal(PITY_PRISM, 40);
assert.equal(PITY_FULLART, 35);
assert.equal(validateDeck(legal, resolveExpanded).isLegal, true);
assert.equal(canAddFaction(legal, card('e2', 'eshar'), resolveExpanded), false);

const threeFactions: Deck = { ...legal, cards: { ...legal.cards, e1: 1, v2: 0 } };
assert.equal(validateDeck(threeFactions, resolveExpanded).isLegal, false);
assert.match(validateDeck(threeFactions, resolveExpanded).errors.join(' '), /2 peuples/);

const tooManyCopies: Deck = { ...legal, cards: { ...legal.cards, v1: 4, v2: 0 } };
assert.equal(validateDeck(tooManyCopies, resolveExpanded).isLegal, false);

const collection = { v1: 1, 'v1--fullart': 2, x1: 2 };
assert.equal(ownedCopies(collection, 'v1'), 3);
assert.equal(validateDeckOwnership(legal, collection).isLegal, false);
assert.match(validateDeckOwnership(legal, collection).errors.join(' '), /x1/);

console.log('Règles canoniques et légalité des decks : OK');
