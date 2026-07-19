import { readdirSync, readFileSync } from 'node:fs';
import { META_DECKS, metaDeckSize } from '../src/lib/metadecks';

const LIMITS: Record<string, number> = { common: 3, rare: 2, epic: 2, legendary: 1, prism: 1 };
const byId = new Map<string, { rarity: string }>();
for (const f of readdirSync('cards').filter((x) => x.endsWith('.json'))) {
	const c = JSON.parse(readFileSync(`cards/${f}`, 'utf8'));
	byId.set(c.id, c);
}

let ok = true;
for (const d of META_DECKS) {
	const size = metaDeckSize(d);
	if (size !== 30) {
		ok = false;
		console.log(`✗ ${d.id} : ${size} cartes (attendu 30)`);
	}
	for (const [id, n] of Object.entries(d.cards)) {
		const c = byId.get(id);
		if (!c) {
			ok = false;
			console.log(`✗ ${d.id} : carte inconnue « ${id} »`);
			continue;
		}
		if (n > (LIMITS[c.rarity] ?? 1)) {
			ok = false;
			console.log(`✗ ${d.id} : ${id} ×${n} dépasse la limite ${c.rarity} (${LIMITS[c.rarity]})`);
		}
	}
	// combos et garder référencent des cartes du deck
	for (const combo of d.guide.combos)
		for (const id of combo.cards)
			if (!d.cards[id]) {
				ok = false;
				console.log(`✗ ${d.id} : combo référence « ${id} » hors deck`);
			}
	for (const id of d.guide.garder)
		if (!d.cards[id]) {
			ok = false;
			console.log(`✗ ${d.id} : garder référence « ${id} » hors deck`);
		}
	if (ok) console.log(`✓ ${d.id} : 30 cartes, limites respectées`);
}
console.log(ok ? 'TOUT EST VALIDE' : 'ERREURS');
