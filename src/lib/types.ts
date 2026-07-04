/**
 * Contrat de données du projet : une carte est un objet JSON qui stocke des
 * INTENTIONS (preset de foil, palette, seed) — jamais des valeurs CSS résolues.
 * Le rendu (Card.svelte + effects/) dérive la matière visuelle de ces intentions,
 * ce qui garantit qu'une même carte brille de la même façon partout, et qu'une
 * palette différente produit un holo différent.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type FoilPreset = 'mat' | 'holo' | 'prismatic' | 'galaxy';

export interface CardGene {
	/** Couleurs dominantes extraites de l'artwork (hex), de la plus à la moins présente. */
	palette: string[];
	/** Preset de foil — par défaut dérivé de la rareté via charter.json. */
	foilPreset: FoilPreset;
	/** Seed du bruit procédural (masques de foil, scintillement). */
	seed: number;
	/** Référence du prompt d'origine (traçabilité pipeline), optionnel. */
	promptRef?: string;
}

export interface CardData {
	/** Slug unique, utilisé comme id d'URL (/card/[id]). */
	id: string;
	name: string;
	cost: number;
	attack: number;
	health: number;
	/** Texte d'effet affiché dans le cartouche. */
	text: string;
	/** Une ligne de lore, italique sous le texte d'effet. */
	flavor?: string;
	rarity: Rarity;
	faction: string;
	/** Chemin de l'artwork (servi depuis static/). */
	art: string;
	gene: CardGene;
}

export interface FactionDef {
	name: string;
	/** Couleur d'accent du cadre. */
	color: string;
	/** Ton du lore pour le pipeline d'enrichissement. */
	loreTone: string;
}

export interface RarityDef {
	name: string;
	foilPreset: FoilPreset;
	/** Couleur de la gemme de rareté. */
	gemColor: string;
	/** Budget de stats indicatif pour le pipeline (attack + health par point de coût). */
	statBudgetPerCost: number;
}

/** charter.json — la charte design en données. */
export interface Charter {
	game: { name: string; tagline: string };
	rarities: Record<Rarity, RarityDef>;
	factions: Record<string, FactionDef>;
	constraints: {
		minCost: number;
		maxCost: number;
		maxTextLength: number;
	};
}
