/**
 * Enrichissement : l'artwork devient une carte jouable.
 * Claude reçoit l'image + les contraintes de la charte (budget de stats,
 * ton de faction, vocabulaire des règles) et rend les champs en JSON structuré.
 * Mode dégradé sans ANTHROPIC_API_KEY : carte stub à éditer à la main —
 * le pipeline ne bloque jamais sur l'API.
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import type { CardData, Charter, FactionId, Rarity } from '../src/lib/types.ts';

const charter: Charter = JSON.parse(
	fs.readFileSync(path.join(process.cwd(), 'charter.json'), 'utf8')
);

export interface EnrichInput {
	slug: string;
	artPath: string; // chemin absolu du webp final
	artUrl: string; // chemin public (/art/...)
	palette: string[];
	faction: FactionId;
	rarity: Rarity;
	kind: 'traveler' | 'epoque' | 'protocole';
	/** Indication optionnelle du user (concept, nom souhaité...). */
	hint?: string;
	seed: number;
}

const RESPONSE_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['name', 'cost', 'attack', 'health', 'cell', 'text', 'synchroCost', 'synchroText', 'flavor'],
	properties: {
		name: { type: 'string', description: 'Nom de la carte, en français, évocateur, max 30 caractères' },
		cost: { type: 'integer', description: "Coût en Énergie, entre 0 et 10" },
		attack: { type: 'integer', description: 'Attaque (0 pour un protocole)' },
		health: { type: 'integer', description: 'Intégrité (0 pour un protocole)' },
		cell: { type: 'string', description: "Nom du CELL porté (ex: 'CELL Pyros'), ou '' si epoque/protocole" },
		text: { type: 'string', description: "Texte d'effet avec les mots-clés du jeu, ou '' si vanilla" },
		synchroCost: { type: 'integer', description: 'Coût de la Synchro (0 si pas de Synchro)' },
		synchroText: { type: 'string', description: "Effet de la Synchro, ou '' si pas de Synchro" },
		flavor: { type: 'string', description: 'Une ligne de lore, max 90 caractères' }
	}
} as const;

function buildPrompt(input: EnrichInput): string {
	const factionDef = charter.factions[input.faction];
	const rarityDef = charter.rarities[input.rarity];
	const budget = Math.round(rarityDef.statBudgetPerCost * 10) / 10;
	return [
		`Tu crées une carte pour TRAVELERS TCG (univers : voyage temporel, suits biotech CELL, institut RIKKEN vs réseau KAIROS, figures historiques des "zones aveugles").`,
		`L'image jointe est l'artwork de la carte. Analyse-la et crée la carte correspondante.`,
		``,
		`Contraintes :`,
		`- Type : ${input.kind} (traveler = unité avec CELL et Synchro possible ; epoque = unité SANS CELL ni Synchro, stats +1 cran ; protocole = sort, attack/health/synchro à 0/'')`,
		`- Faction : ${factionDef.name} — ton du lore : ${factionDef.loreTone}`,
		`- Rareté : ${rarityDef.name} — budget de stats : attack + health ≈ ${budget} × cost (réduis d'~2 points si la carte a des effets forts)`,
		`- Mots-clés autorisés dans text : "À l'arrivée :", "Garde", "Célérité", "Insaisissable", "Dernier souffle :". Rien d'autre.`,
		`- Pas de magie : tout effet doit être exprimable en termes tech/CELL/temporel.`,
		`- Langue : français. Sobre, incarné, pas d'emphase.`,
		input.hint ? `- Indication du créateur : ${input.hint}` : ``,
		``,
		`Réponds uniquement avec le JSON demandé.`
	]
		.filter(Boolean)
		.join('\n');
}

async function callClaude(input: EnrichInput): Promise<Record<string, any>> {
	const client = new Anthropic();
	const imageData = fs.readFileSync(input.artPath).toString('base64');
	const response = await client.messages.create({
		model: 'claude-opus-4-8',
		max_tokens: 2048,
		thinking: { type: 'adaptive' },
		output_config: { format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
		messages: [
			{
				role: 'user',
				content: [
					{ type: 'image', source: { type: 'base64', media_type: 'image/webp', data: imageData } },
					{ type: 'text', text: buildPrompt(input) }
				]
			}
		]
	});
	const textBlock = response.content.find((b) => b.type === 'text');
	if (!textBlock || textBlock.type !== 'text') throw new Error('Réponse Claude sans bloc texte.');
	return JSON.parse(textBlock.text);
}

function stub(input: EnrichInput): Record<string, any> {
	return {
		name: input.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
		cost: 3,
		attack: input.kind === 'protocole' ? 0 : 3,
		health: input.kind === 'protocole' ? 0 : 3,
		cell: input.kind === 'traveler' ? 'CELL À-NOMMER' : '',
		text: 'TODO : écrire l’effet à la main (généré sans clé API).',
		synchroCost: 0,
		synchroText: '',
		flavor: ''
	};
}

export async function enrich(input: EnrichInput): Promise<CardData> {
	let fields: Record<string, any>;
	if (process.env.ANTHROPIC_API_KEY) {
		fields = await callClaude(input);
	} else {
		console.log('  ↳ pas de ANTHROPIC_API_KEY : carte stub (édite les champs à la main).');
		fields = stub(input);
	}

	const rarityDef = charter.rarities[input.rarity];
	const factionDef = charter.factions[input.faction];
	const card: CardData = {
		id: input.slug,
		name: fields.name,
		kind: input.kind,
		cost: Math.min(charter.constraints.maxCost, Math.max(charter.constraints.minCost, fields.cost)),
		text: fields.text ?? '',
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
	if (input.kind !== 'protocole') {
		card.attack = fields.attack;
		card.health = fields.health;
	}
	if (input.kind === 'traveler' && fields.cell) card.cell = fields.cell;
	if (input.kind === 'traveler' && fields.synchroText) {
		card.synchro = { cost: fields.synchroCost ?? 1, text: fields.synchroText };
	}
	if (fields.flavor) card.flavor = fields.flavor;
	return card;
}
