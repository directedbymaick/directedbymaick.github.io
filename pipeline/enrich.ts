/**
 * Assemblage de la carte : la Forge fait le mécanique (WebP, palette, gène),
 * l'humain + Claude en session font le créatif (nom, stats, effets, lore).
 *
 * Workflow acté (2026-07-04) : PAS d'API — le user génère ses images sur
 * Midjourney à la main et les dépose dans drop/ ; Claude Code écrit ensuite
 * les champs créatifs directement dans le JSON, en respectant docs/RULES.md
 * (budget de stats, mots-clés) et le ton de faction de charter.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CardData, Charter, FactionId, Rarity } from '../src/lib/types.ts';

const charter: Charter = JSON.parse(
	fs.readFileSync(path.join(process.cwd(), 'charter.json'), 'utf8')
);

export interface AssembleInput {
	slug: string;
	artUrl: string; // chemin public (/art/...)
	palette: string[];
	faction: FactionId;
	rarity: Rarity;
	kind: 'etre' | 'verbe' | 'relique' | 'lieu';
	seed: number;
}

/** Gabarit de carte : gène complet, champs créatifs à remplir en session. */
export function assemble(input: AssembleInput): CardData {
	const rarityDef = charter.rarities[input.rarity];
	const factionDef = charter.factions[input.faction];

	const card: CardData = {
		id: input.slug,
		name: input.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
		kind: input.kind,
		cost: 3,
		text: '',
		rarity: input.rarity,
		faction: input.faction,
		art: input.artUrl,
		gene: {
			palette: input.palette,
			foilPreset: rarityDef.foilPreset,
			accent: factionDef.color,
			seed: input.seed
		}
	};
	if (input.kind === 'etre') {
		// Point de départ neutre selon le budget de la charte — à ajuster à la main.
		const budget = Math.round(rarityDef.statBudgetPerCost * card.cost);
		card.attack = Math.floor(budget / 2);
		card.health = Math.ceil(budget / 2);
	}
	// Toutes les cartes sont rendues en full art (DESIGN.md §4ter) — plus de champ à poser.
	return card;
}
