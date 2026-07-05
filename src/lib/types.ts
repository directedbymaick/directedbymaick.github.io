/**
 * Contrat de données du projet : une carte est un objet JSON qui stocke des
 * INTENTIONS (preset de foil, palette, seed) — jamais des valeurs CSS résolues.
 * Le rendu (Card.svelte + effects/) dérive la matière visuelle de ces intentions.
 *
 * Univers : TRAVELERS (bible : D:\Travelers\00_BIBLE). RIKKEN vs KAIROS,
 * pool neutre Les Époques. Raretés calquées sur la palette CELL du manga.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'prism';

export type FoilPreset = 'mat' | 'holo' | 'prismatic' | 'galaxy' | 'prism';

/** Matériau du cadre — la rareté EST un matériau. */
export type FrameMaterial = 'carbone' | 'nacre' | 'argent' | 'or' | 'prisme';

export type CardKind = 'traveler' | 'protocole' | 'epoque';

export type FactionId = 'rikken' | 'kairos' | 'epoques';

export interface CardGene {
	/** Couleurs dominantes extraites de l'artwork (hex), de la plus à la moins présente. */
	palette: string[];
	/** Preset de foil — par défaut dérivé de la rareté via charter.json. */
	foilPreset: FoilPreset;
	/** Seed du bruit procédural (masques de foil, scintillement). */
	seed: number;
	/** Couleur d'accent unique de la carte (règle monochrome + un accent). */
	accent: string;
	/** Référence du prompt d'origine (traçabilité pipeline), optionnel. */
	promptRef?: string;
}

export interface SynchroDef {
	/** Coût d'Énergie pour activer le CELL (mode local). */
	cost: number;
	/** Effet déclenché à la Synchro. */
	text: string;
}

export interface CardData {
	/** Slug unique, utilisé comme id d'URL (/card/[id]). */
	id: string;
	name: string;
	kind: CardKind;
	/** Coût d'Énergie (allocation de la Centrale). */
	cost: number;
	/** Stats de combat — absentes sur les protocoles. */
	attack?: number;
	health?: number;
	/** Nom du CELL porté (travelers uniquement). */
	cell?: string;
	/** Synchro : activation du CELL (travelers uniquement — les Époques n'en ont pas). */
	synchro?: SynchroDef;
	/** Texte d'effet affiché dans le cartouche. */
	text: string;
	/** Une ligne de lore, italique sous le texte d'effet. */
	flavor?: string;
	rarity: Rarity;
	faction: FactionId;
	/** Chemin de l'artwork (servi depuis static/). */
	art: string;
	/** Cadrage de l'art dans sa fenêtre (object-position CSS). Défaut : 'center 12%' — préserve le haut des portraits. */
	artPosition?: string;
	/** Obsolète : toutes les cartes sont rendues en full art (le champ est ignoré par Card.svelte). */
	fullArt?: boolean;
	/** Artworks alternatifs (static/art/alt/), affichés comme versions de la carte. */
	alts?: string[];
	gene: CardGene;
}

export interface FactionDef {
	name: string;
	/** Couleur d'accent de la faction. */
	color: string;
	/** Ton du lore pour le pipeline d'enrichissement. */
	loreTone: string;
	/** Sigil affiché sur la carte (caractère). */
	sigil: string;
}

export interface RarityDef {
	name: string;
	material: FrameMaterial;
	foilPreset: FoilPreset;
	/** Budget de stats indicatif pour le pipeline (attack + health par point de coût). */
	statBudgetPerCost: number;
	/** Copies max par deck. */
	maxCopies: number;
}

/** charter.json — la charte design en données. */
export interface Charter {
	game: { name: string; tagline: string };
	rarities: Record<Rarity, RarityDef>;
	factions: Record<FactionId, FactionDef>;
	artDirection: {
		basePrompt: string;
		negativePrompt: string;
		rule: string;
	};
	constraints: {
		minCost: number;
		maxCost: number;
		maxTextLength: number;
		deckSize: number;
	};
}
