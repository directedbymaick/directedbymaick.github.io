import type { CardData, FoilPreset, Rarity } from '$lib/types';
import { cards } from '$lib/cards';
import { charter } from '$lib/charter';
import { FULLART_RATE, SLOT_ODDS } from '$lib/gacha';
import { versionsOf, foilLabel } from '$lib/variants';
import { carteDansEdition, editionsDe, editionDe, type EditionId } from '$lib/editions';
import mesures from '$lib/taux-mesures.json';

/** L'édition par défaut : celle mise en avant au comptoir (la 2ᵉ, « Routes de Xenen »). */
export const EDITION_DEFAUT: EditionId = 'ed2';

/**
 * L'échelle réelle du jeu.
 *
 * Une rareté seule ne dit plus ce qu'on tient en main : deux Prismatiques n'ont
 * pas la même valeur selon qu'elles sortent en Raw ou en SP
 * détourée. Le palier est donc le quadruplet rareté × forme × finition × détourage,
 * et sa probabilité se calcule sur le tirage réel — jamais posée à la main.
 */
export interface Palier {
	key: string;
	rarity: Rarity;
	fullArt: boolean;
	foil: FoilPreset | null;
	/** version bâtie sur un art alternatif plutôt que sur l'illustration de base */
	alt: boolean;
	/** identifiant de la classe (cf. classes()) — la lecture courante du palier */
	classe: string;
	/** l'illustration est détourée : le personnage flotte, la carte porte « no bg ».
	    Depuis que le showcase sans détourage s'appelle « Reflet », ce booléen vaut
	    exactement `foil === 'showcase'` — il reste exposé pour filtrer, mais il
	    n'apparaît plus dans le libellé, où il ne ferait que répéter la finition. */
	nobg: boolean;
	label: string;
	/** nombre de cartes du set qui existent à ce palier */
	membres: number;
	/** exemplaires attendus par booster de 5 cartes */
	taux: number;
	/** une carte du palier, rendue telle qu'elle sort */
	exemple: CardData;
	exempleFullArt: boolean;
}

/** Combien de cartes forgées par rareté — le tirage choisit uniformément dedans. */
function effectifs(): Record<string, number> {
	const n: Record<string, number> = {};
	for (const c of cards) n[c.rarity] = (n[c.rarity] ?? 0) + 1;
	return n;
}

/** Chance qu'un booster de 5 cartes donne un slot de cette rareté de base. */
function chancesParRarete(): Record<string, number> {
	const p: Record<string, number> = {};
	// les slots 1 à 3 partagent les mêmes odds : SLOT_ODDS[0] compte triple
	const poids = [3, 1, 1];
	SLOT_ODDS.forEach((slot, i) => {
		for (const [r, q] of Object.entries(slot.odds)) p[r] = (p[r] ?? 0) + (q ?? 0) * poids[i];
	});
	return p;
}

/**
 * Le modèle analytique : P(la rareté sort) × P(cette carte) × P(cette version).
 *
 * Il ne sert plus que de filet. Il ignore les god packs et les deux pity, donc
 * il sous-estime lourdement tout ce qui est Full Art — c'est précisément le
 * défaut qui a fait publier « 1 booster sur 13 000 » là où le tirage réel donne
 * 1 sur 730.
 */
function tauxModele(card: CardData, rateVersion: number): number {
	const n = effectifs();
	const p = chancesParRarete();
	return ((p[card.rarity] ?? 0) / (n[card.rarity] ?? 1)) * rateVersion;
}

/**
 * Taux par booster d'UNE version précise, MESURÉ sur le tirage réel.
 *
 * `src/lib/taux-mesures.json` est produit par `node scripts/taux.mjs`, qui ouvre
 * trois millions de boosters avec le vrai `openPack`. On ne calcule donc plus
 * ce que le tirage devrait faire : on regarde ce qu'il fait, god packs et pity
 * compris. Toute mécanique ajoutée plus tard au booster sera prise en compte
 * dès la prochaine régénération, sans une ligne à changer ici.
 */
const EDITIONS_MESUREES = mesures.editions as Record<
	string,
	{ boosters: number; versions: Record<string, number> }
>;

/**
 * Taux par booster d'UNE version, MESURÉ sur le tirage réel de l'ÉDITION donnée.
 *
 * Chaque édition est un produit distinct, mesuré sur son propre pool : une carte
 * exclusive à la 2ᵉ édition a son taux calculé sur les seuls boosters 2ᵉ édition,
 * jamais dilué par les boosters 1ʳᵉ édition où elle ne peut pas tomber. Une carte
 * absente de l'édition demandée rend 0 (indisponible dans ce produit).
 */
export function tauxVersion(
	card: CardData,
	v: { key: string; rate: number },
	edition: EditionId = EDITION_DEFAUT
): number {
	const m = EDITIONS_MESUREES[edition];
	if (!m) return tauxModele(card, v.rate);
	if (!carteDansEdition(card.id, edition)) return 0; // pas dans ce booster
	const vus = m.versions[v.key];
	/* Toutes les versions du set apparaissent dans la mesure — `prebuild` la
	   régénère dès qu'une carte ou le moteur de tirage bouge. Ce filet ne sert donc
	   qu'à une exécution où le fichier serait momentanément en retard. */
	if (vus === undefined) return tauxModele(card, v.rate);
	return vus / m.boosters;
}

/** Prix plancher : celui du nom le plus facile à tirer du set. */
export const PRIX_PLANCHER = 20;
/* Compression : l'exposant qui traduit un écart de rareté en écart de prix.
   Il valait 0.6 quand la rareté s'étalait sur un facteur 2 500 — il fallait
   écraser. Depuis le recalibrage sur les standards, l'écart n'est plus que de
   53, et le même exposant ramenait le sommet à 220 Syllabes : la boutique
   rendait la pièce de tête triviale. À 0.9, l'échelle va de 20 à 700, soit
   environ cinq boosters de glanage pour le sommet. */
const COMPRESSION = 0.9;

/* La référence n'est pas posée à la main : c'est le taux du nom RÉELLEMENT le
   plus courant du set. Ainsi le plancher reste le plancher quoi qu'on ajoute au
   set, et aucun prix ne peut passer sous PRIX_PLANCHER par accident. */
/* La référence de prix est GLOBALE (le nom le plus courant du set, toutes
   éditions confondues) : le prix d'une carte ne doit pas dépendre du booster où
   on la tire. On prend donc le taux le plus élevé observé, quelle que soit
   l'édition. */
let refCache = 0;
function tauxReference(): number {
	if (refCache) return refCache;
	for (const c of cards)
		for (const v of versionsOf(c, FULLART_RATE))
			for (const ed of ['ed1', 'ed2'] as EditionId[])
				refCache = Math.max(refCache, tauxVersion(c, v, ed));
	return refCache;
}

/**
 * Le prix d'un nom découle de sa rareté RÉELLE — celle du palier, qui tient
 * compte de la rareté de la carte, de sa forme et de sa finition. Une Commune
 * Raw et une Commune Full Art SP ne peuvent pas valoir pareil : la seconde sort
 * mille fois moins souvent.
 *
 * Rien n'est saisi à la main : valider une variante au Lab déplace son taux, et
 * son prix suit.
 */
export function prixNom(taux: number): number {
	if (taux <= 0) return PRIX_PLANCHER;
	const brut = PRIX_PLANCHER * Math.pow(tauxReference() / taux, COMPRESSION);
	const arrondi = brut < 100 ? 5 : brut < 500 ? 10 : 50;
	return Math.max(PRIX_PLANCHER, Math.round(brut / arrondi) * arrondi);
}

/* ------------------------------------------------------------------ plancher
   Le prix suit le taux mesuré, et le taux mesuré ne suit pas la rareté : les
   garanties et les god packs promeuvent toujours la carte la plus rare du
   booster, jamais une Rare. Une Rare Full Art SP se retrouvait donc plus dure à
   sortir — et deux fois plus chère — qu'une Prismatique Full Art SP.

   La règle : à forme égale (Full Art, finition, détourage), le prix d'une
   rareté ne peut pas descendre sous celui de la même forme à une rareté
   inférieure. Le tirage reste ce qu'il est, l'échelle des raretés reste
   sincère ; c'est la boutique seule qui garde une hiérarchie lisible. */
const ECHELLE_RARETE: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'prism'];

/** L'identité d'une version, rareté mise à part. */
function forme(
	v: { fullArt: boolean; foil: FoilPreset | null; view?: CardData },
	c: CardData
): string {
	const vue = v.view ?? c;
	const nobg = v.foil === 'showcase' && !!vue.cutout;
	// un alt ne se compare qu'à d'autres alts : ce sont deux échelles distinctes
	const alt = !!vue.alt;
	return `${v.fullArt ? 'fa' : 'n'}|${v.foil ?? 'raw'}|${nobg ? 'nobg' : ''}|${alt ? 'alt' : ''}`;
}

/** forme -> rareté -> prix minimal admissible, hérité des raretés inférieures. */
let planchersCache: Map<string, number[]> | null = null;
function planchers(): Map<string, number[]> {
	if (planchersCache) return planchersCache;

	// prix bruts les plus élevés observés pour chaque (forme, rareté)
	const brut = new Map<string, number[]>();
	for (const c of cards) {
		for (const v of versionsOf(c, FULLART_RATE)) {
			const r = (v.view.sourceRarity ?? v.view.rarity) as Rarity;
			const i = ECHELLE_RARETE.indexOf(r);
			if (i < 0) continue;
			const f = forme(v, c);
			const ligne = brut.get(f) ?? ECHELLE_RARETE.map(() => 0);
			// prix indépendant de l'édition : on prend le taux le plus favorable
			const taux = Math.max(tauxVersion(c, v, 'ed1'), tauxVersion(c, v, 'ed2'));
			ligne[i] = Math.max(ligne[i], prixNom(taux));
			brut.set(f, ligne);
		}
	}

	// puis on propage vers le haut : chaque rareté hérite du maximum d'en dessous
	planchersCache = new Map();
	for (const [f, ligne] of brut) {
		const sol = ECHELLE_RARETE.map(() => 0);
		let acc = 0;
		for (let i = 0; i < ligne.length; i++) {
			sol[i] = acc; // strictement les raretés INFÉRIEURES
			acc = Math.max(acc, ligne[i]);
		}
		planchersCache.set(f, sol);
	}
	return planchersCache;
}

/**
 * Le taux de sortie mesuré détermine le prix de départ. Pour une même finition,
 * chaque palier de rareté applique ensuite un prix plancher au moins égal au
 * prix maximal des paliers inférieurs.
 */
export function prixVersion(
	card: CardData,
	v: { key: string; rate: number; fullArt: boolean; foil: FoilPreset | null; view: CardData }
): number {
	const r = (v.view.sourceRarity ?? v.view.rarity) as Rarity;
	const base: Record<Rarity, number> = {
		common: 40,
		rare: 70,
		epic: 120,
		legendary: 200,
		prism: 300
	};
	const isSpecial = v.foil === 'showcase' && !!v.view.cutout;
	const multiplier = v.view.alt ? 2.5 : v.fullArt && isSpecial ? 2.3 : isSpecial ? 1.8 : v.fullArt ? 1.7 : v.foil ? 1.3 : 1;
	return Math.min(700, Math.round((base[r] * multiplier) / 5) * 5);
}

export function paliers(edition: EditionId = EDITION_DEFAUT): Palier[] {
	const map = new Map<string, Palier>();

	for (const c of cards) {
		if (!carteDansEdition(c.id, edition)) continue; // hors de ce booster
		for (const v of versionsOf(c, FULLART_RATE)) {
			const rarity = v.view.sourceRarity ?? v.view.rarity;
			const nobg = v.foil === 'showcase' && !!v.view.cutout;
			/* L'art alternatif est un palier À PART : sans ça une Alt à 0,1 % se
			   fondait dans la ligne de sa finition de base à 14 %, et la fréquence
			   affichée pour ce palier ne décrivait plus aucune des deux. */
			const alt = !!v.view.alt;
			const key = `${rarity}|${v.fullArt ? 'fa' : 'n'}|${v.foil ?? 'raw'}|${nobg ? 'nobg' : ''}|${alt ? 'alt' : ''}`;

			/* Mesuré, pas déduit : le nombre de fois que cette version exacte est
			   sortie de `openPack`, rapporté au nombre de boosters de l'édition. */
			const taux = tauxVersion(c, v, edition);

			const dejaVu = map.get(key);
			if (dejaVu) {
				dejaVu.membres++;
				dejaVu.taux += taux;
				/* L'exemple montré préfère une carte PROPRE à l'édition affichée : sur
				   « Épique Full Art Cristallin » en 2ᵉ édition, on veut voir la Lampe
				   des noms éteints (nouveauté) plutôt que l'Interstice (partagée). */
				const exclNouveau = editionsDe(c.id).length === 1;
				const exclActuel = editionsDe(dejaVu.exemple.id.split('--')[0]).length === 1;
				if (exclNouveau && !exclActuel) {
					dejaVu.exemple = v.view;
					dejaVu.exempleFullArt = v.fullArt;
				}
				continue;
			}
			map.set(key, {
				key,
				rarity,
				fullArt: v.fullArt,
				foil: v.foil,
				alt,
				nobg,
				classe: classeDe({ alt, fullArt: v.fullArt, nobg, foil: v.foil }).id,
				label: [
					charter.rarities[rarity].name,
					alt ? 'Alt' : null,
					v.fullArt ? 'Full Art' : null,
					v.foil ? foilLabel(v.foil, v.view, v.fullArt) : 'Raw'
				]
					.filter(Boolean)
					.join(' · '),
				membres: 1,
				taux,
				exemple: v.view,
				exempleFullArt: v.fullArt
			});
		}
	}

	// du plus courant au plus rare : l'échelle se lit en montant
	return [...map.values()].sort((a, b) => b.taux - a.taux);
}

/**
 * « 1 booster sur 13 000 » parle plus qu'un pourcentage à quatre décimales.
 * Au-delà d'un exemplaire par booster, la fréquence se dit dans l'autre sens.
 */
export function frequence(taux: number): string {
	if (taux <= 0) return '—';
	if (taux >= 1) return `${taux.toFixed(1).replace('.', ',')} par booster`;
	const n = 1 / taux;
	const arrondi =
		n < 100 ? Math.round(n) : n < 1000 ? Math.round(n / 10) * 10 : Math.round(n / 100) * 100;
	return `1 booster sur ${arrondi.toLocaleString('fr-FR')}`;
}
/* ------------------------------------------------------------------ classes
   Trente-cinq paliers, c'est la vérité du tirage — ce n'est pas un vocabulaire.
   Aucun joueur ne retient trente-cinq niveaux ; MTG en annonce quatre, Lorcana
   six. On expose donc SIX classes, et les paliers deviennent le détail qu'on
   consulte, pas le langage courant.

   Deux exigences ont guidé le découpage :
   — chaque règle se vérifie à l'œil sur la carte, sans table de correspondance ;
   — les classes sont MONOTONES en rareté, vérifié sur la mesure. Une classe qui
     serait parfois plus rare que la suivante mentirait à chaque annonce. */

export interface Classe {
	id: string;
	nom: string;
	regle: string;
	/** exemplaires attendus par booster */
	taux: number;
	paliers: number;
	versions: number;
	exemple: CardData;
	exempleFullArt: boolean;
}

/** La classe d'un palier — de la plus courante à la plus rare. */
function classeDe(p: {
	alt: boolean;
	fullArt: boolean;
	nobg: boolean;
	foil: FoilPreset | null;
}): { id: string; nom: string; regle: string } {
	if (p.alt) return { id: 'alt', nom: 'Alt', regle: 'Une autre illustration du même nom' };
	if (p.fullArt && p.nobg)
		return { id: 'fa-sp', nom: 'Full Art SP', regle: 'Détourée ET pleine illustration' };
	if (p.nobg) return { id: 'sp', nom: 'SP', regle: 'Le sujet détouré, sans fond' };
	if (p.fullArt) return { id: 'fa', nom: 'Full Art', regle: 'Illustration pleine, cadre prismatique' };
	if (p.foil) return { id: 'foil', nom: 'Foil', regle: 'Une matière : reflet, cosmique, galerie…' };
	return { id: 'raw', nom: 'Raw', regle: 'Aucune finition — l’état de base' };
}

const ORDRE_CLASSES = ['raw', 'foil', 'fa', 'sp', 'fa-sp', 'alt'];

/**
 * Les six classes du jeu, avec leur fréquence mesurée.
 * C'est ce que les pages annoncent ; `paliers()` reste le détail.
 */
/* ------------------------------------------------------------------ vedettes
   Les « chase » d'une édition : les cinq cartes qu'on espère en l'ouvrant. On
   prend la version la plus PRÉCIEUSE de chaque carte (son prix de glanage, qui
   suit la rareté × forme × finition), on garde une entrée par carte, et on
   retient les cinq plus fortes — la plus rare départageant les prix plafonnés. */
export interface Vedette {
	card: CardData;
	label: string;
	taux: number;
	prix: number;
}

type VedettePlus = Vedette & { id: string; exclusive: boolean; rarete: Rarity; estAlt: boolean };

export function vedettesDe(edition: EditionId = EDITION_DEFAUT, n = 5): Vedette[] {
	/* la version la plus PRÉCIEUSE de chaque carte de l'édition — pour Avel c'est
	   sa Full Art SP, pour Velsa son Alt, pour un prismatique sa Full Art SP. */
	const meilleure = new Map<string, VedettePlus>();
	for (const c of cards) {
		if (!carteDansEdition(c.id, edition)) continue;
		const exclusive = editionsDe(c.id).length === 1;
		for (const v of versionsOf(c, FULLART_RATE)) {
			const prix = prixVersion(c, v);
			const vue = meilleure.get(c.id);
			const taux = tauxVersion(c, v, edition);
			if (!vue || prix > vue.prix || (prix === vue.prix && taux < vue.taux)) {
				meilleure.set(c.id, {
					id: c.id,
					exclusive,
					rarete: (v.view.sourceRarity ?? v.view.rarity) as Rarity,
					estAlt: !!v.view.alt,
					card: v.view,
					label: v.label,
					taux,
					prix
				});
			}
		}
	}
	const parValeur = (a: Vedette, b: Vedette) => b.prix - a.prix || a.taux - b.taux;
	const toutes = [...meilleure.values()];
	const parId = new Map(toutes.map((v) => [v.id, v]));

	/* Un chase CURÉ, qui raconte l'édition — pas seulement les plus chères :
	   1. le visage du set (la carte en couverture, en Full Art SP) ;
	   2. l'art alternatif, chase visuel unique ;
	   3. une pièce PROPRE à l'édition (une nouveauté en 2ᵉ, une épique en 1ʳᵉ) ;
	   4. les prismatiques puis les légendaires — les « SP rouges », cadre noble ;
	   5. on complète avec les plus fortes restantes. */
	const ordre: string[] = [];
	const add = (id?: string) => {
		if (id && parId.has(id) && !ordre.includes(id)) ordre.push(id);
	};
	const listeParValeur = (pred: (v: VedettePlus) => boolean) =>
		toutes.filter(pred).sort(parValeur);

	add(editionDe(edition).coverId);
	for (const v of listeParValeur((v) => v.estAlt)) add(v.id);
	for (const v of listeParValeur((v) => v.exclusive).slice(0, 1)) add(v.id);
	for (const v of listeParValeur((v) => v.rarete === 'prism')) add(v.id);
	for (const v of listeParValeur((v) => v.rarete === 'legendary')) add(v.id);
	for (const v of listeParValeur((v) => v.exclusive)) add(v.id);
	for (const v of [...toutes].sort(parValeur)) add(v.id);

	return ordre.slice(0, n).map((id) => parId.get(id)!);
}

export function classes(edition: EditionId = EDITION_DEFAUT): Classe[] {
	const map = new Map<string, Classe>();
	for (const p of paliers(edition)) {
		const c = classeDe(p);
		const vu = map.get(c.id);
		if (vu) {
			vu.taux += p.taux;
			vu.paliers++;
			vu.versions += p.membres;
			// on garde l'exemple le plus rare de la classe : le plus parlant
			continue;
		}
		map.set(c.id, {
			...c,
			taux: p.taux,
			paliers: 1,
			versions: p.membres,
			exemple: p.exemple,
			exempleFullArt: p.exempleFullArt
		});
	}
	return ORDRE_CLASSES.map((id) => map.get(id)).filter(Boolean) as Classe[];
}
