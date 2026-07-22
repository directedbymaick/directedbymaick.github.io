/**
 * Contrat de données du projet : une carte est un objet JSON qui stocke des
 * INTENTIONS (preset de foil, palette, seed) — jamais des valeurs CSS résolues.
 * Le rendu (Card.svelte + effects/) dérive la matière visuelle de ces intentions.
 *
 * Univers : Expelled. Le contrat reste indépendant du rendu Svelte afin que
 * le moteur, la Forge et les pages de collection partagent les mêmes données.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'prism';

// Foils = recettes verbatim de simeydotme (pokemon-cards-css)
export type FoilPreset = 'mat' | 'regular' | 'amazing' | 'cosmos' | 'galerie' | 'showcase';

/** Matériau du cadre — la rareté EST un matériau. */
export type FrameMaterial = 'carbone' | 'nacre' | 'argent' | 'or' | 'prisme';

export type CardKind = 'etre' | 'verbe' | 'relique' | 'lieu';

export type FactionId = 'vasar' | 'exar' | 'eshar' | 'morar' | 'velar';

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

export interface PrononcerDef {
	/** Coût en Volonté pour prononcer l'EX. */
	cost: number;
	/** Effet déclenché — puis la carte est exilée définitivement. */
	text: string;
}

/** Une finition officielle supplémentaire d'une carte, validée depuis le Lab. */
export interface CardVariant {
	foilPreset: FoilPreset;
	/** true = cette variante est la vue Full Art (cadre prismatique, layout Auréole). */
	fullArt?: boolean;
	/** Libellé affiché ; à défaut, on retombe sur le nom du foil. */
	label?: string;
}

/**
 * Un art alternatif se règle comme une petite carte : sa finition officielle et,
 * éventuellement, des finitions supplémentaires. Sans réglage, `altView` applique
 * la règle par défaut — foil hérité de la base, brillance décalée.
 */
export interface AltReglage {
	foilPreset?: FoilPreset;
	/** Détourage PROPRE à cet art alternatif (static/art/alt/…-cutout.webp).
	    Sans lui l'alt n'a pas de version « SP » : celui de la carte de base ne
	    convient pas, il découpe une autre illustration. */
	cutout?: string;
	/** finition de la vue Full Art DE CET ALT ; à défaut, celle de la carte de base */
	fullArtFoil?: FoilPreset;
	/** décalage de brillance ; à défaut, seed de la base + 97 × (index + 1) */
	seed?: number;
	/** finitions supplémentaires, comme `variants` sur la carte de base */
	variants?: CardVariant[];
}

export interface CardData {
	/** Slug unique, utilisé comme id d'URL (/card/[id]). */
	id: string;
	name: string;
	kind: CardKind;
	/** Coût en Volonté (NER). */
	cost: number;
	/** Stats de combat — Êtres uniquement (ATQ / Intégrité). */
	attack?: number;
	health?: number;
	/** Sous-titre optionnel (racine conceptuelle, titre honorifique…). */
	cell?: string;
	/** Prononcer (n) : one-shot définitif, la carte est exilée après l'effet. */
	prononcer?: PrononcerDef;
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
	/** Illustration détourée (fond transparent) pour le foil « showcase » : le
	    personnage flotte au-dessus d'un holo prismatique. Optionnel. */
	cutout?: string;
	/** Calage vertical du détourage (translateY, ex. '-9%') pour matcher pile
	    l'illustration de fond. Défaut global : -4%. Optionnel, par carte. */
	cutoutY?: string;
	/** Calage horizontal du détourage (translateX, ex. '3%'). Défaut 0. Optionnel, par carte. */
	cutoutX?: string;
	/** Calage du détourage EN MODE FULL ART (l'art couvre toute la carte, donc le
	    calage diffère du mode normal). Défauts : x 0%, y 3.05%. Optionnels. */
	faCutoutX?: string;
	faCutoutY?: string;
	/** Remontée de l'ILLUSTRATION en mode full art (ex. '14%'). L'image est agrandie
	    d'autant, donc aucun vide n'apparaît en bas — utile quand le bas de l'artwork
	    est le sujet et se retrouve masqué par le bloc de texte. */
	faArtLift?: string;
	/** Échelle du détourage en mode full art (défaut 1.068). Optionnel, par carte. */
	faCutoutScale?: number;
	/** Échelle du détourage (ex. 0.98) pour matcher la taille du fond. Défaut 1. */
	cutoutScale?: number;
	/** Obsolète : toutes les cartes sont rendues en full art (le champ est ignoré par Card.svelte). */
	fullArt?: boolean;
	/** Rareté d'origine, conservée par fullArtView() : la vue full art force
	    `rarity: 'prism'` (cadre prismatique) mais le nom reste doré tant que la
	    carte n'est pas VRAIMENT prismatique. Posé à l'affichage, jamais en JSON. */
	sourceRarity?: Rarity;
	/** Matière du nom en Full Art. Par défaut l'or, le cristal sur les Prismatiques.
	    Ce champ force l'un ou l'autre pour une carte donnée (exception d'auteur). */
	nameMaterial?: 'or' | 'cristal';
	/** Foil officiel de la vue Full Art, validé depuis le Lab. Sans lui, la vue
	    full art retombe sur son défaut (showcase si détourage, sinon galerie). */
	fullArtFoil?: FoilPreset;
	/** Variantes officielles SUPPLÉMENTAIRES, validées depuis le Lab : une même
	    carte peut exister en plusieurs finitions (ex. cosmique ET galerie).
	    Elles s'ajoutent au Registre à côté de la version de base. */
	variants?: CardVariant[];
	/** Artworks alternatifs (static/art/alt/), affichés comme versions de la carte. */
	alts?: string[];
	/** Réglages propres à chaque art alternatif, indexés comme `alts`.
	    Absent = l'alt garde le comportement par défaut d'`altView`. */
	altReglages?: AltReglage[];
	/** Index de version alternative (1+) — posé par altView à l'affichage, jamais dans les JSON. */
	alt?: number;
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
