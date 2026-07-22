/**
 * Les molettes du tirage, réunies en un seul endroit.
 *
 * Elles étaient dispersées dans gacha.ts et variants.ts, et se multipliaient
 * entre elles sans que personne ne voie le produit : c'est ce qui a donné un
 * sommet à 1 booster sur 15 100, trente fois au-delà de ce que pratiquent les
 * jeux comparables.
 *
 * Repères mesurés chez les autres, pour situer :
 *
 *   MTG        mythique              1 booster sur 8
 *   Altered    carte Unique          1 booster sur 8
 *   Lorcana    Enchanted             ~1 booster sur 72   (estimation communautaire)
 *   MTG        sérialisée            ~1 booster sur 153  (Collector Booster)
 *   Pokémon Pocket  Immersive        ~1 booster sur 450  (carte précise)
 *
 * La bande visée pour Expelled est donc 1/70 à 1/500, et RIEN au-delà : le
 * palier le plus rare du jeu doit rester atteignable dans une saison de jeu.
 *
 * Toute modification ici périme `taux-mesures.json` ; `npm run build` le
 * régénère automatiquement (cf. scripts/taux.mjs).
 */

/** Cartes par booster. */
export const PACK_SIZE = 5;

/** Chance qu'un tirage soit foil plutôt que Raw. */
export const FOIL_RATE = 0.35;

/** Chance de la forme Full Art, sur une carte qui y a droit. */
export const FULLART_RATE = 0.15;

/**
 * Poids d'une finition détourée face aux autres finitions de la même forme.
 * En dessous de 1, la SP est plus rare que ses sœurs sans jamais disparaître.
 */
export const POIDS_SP = 0.8;

/** Chance qu'un tirage donne UN art alternatif donné, plutôt que l'illustration de base. */
export const ALT_RATE = 0.1;

/** Part de la Full Art à l'intérieur d'un art alternatif — la plus rare des deux. */
export const ALT_FULLART_PART = 0.3;

/** Booster intégralement foil. */
export const GOD_PACK_RATE = 0.008;

/** Garanties : au plus tard au N-ième booster sans. */
export const PITY_PRISM = 40;
export const PITY_FULLART = 25;
