/**
 * Les éditions de boosters.
 *
 * La 1ʳᵉ édition est le sachet historique : les 60 cartes du set de base,
 * Rasen en couverture. La 2ᵉ édition porte Avel en couverture et introduit
 * les 15 cartes de l'extension des peuples de soutien, complétées par 45
 * reprises du set de base — tous les Eshar, Morar et Velar d'origine, les
 * six Légendaires, les deux Prismatiques, et un socle Vasar/Exar — pour
 * retrouver exactement la taille du sachet d'origine : 60 cartes.
 *
 * Chaque édition a sa propre pitié (les garanties se comptent par sachet
 * acheté, pas par joueur global) — `clePity` la range en localStorage.
 */
import { cards } from '$lib/cards';
import type { CardData } from '$lib/types';

/** Les 15 cartes introduites par l'extension. */
export const EXTENSION_IDS: string[] = [
	'selin-ecoute-la-cendre',
	'orel-veilleur-des-restes',
	'rendre-au-silence',
	'registre-des-absents',
	'lampe-des-noms-eteints',
	'nemi-deuxieme-allure',
	'sorel-mille-postures',
	'preter-une-forme',
	'courbe-des-possibles',
	'halo-a-charniere',
	'sela-premiere-au-vent',
	'avel-rieur-des-retours',
	'rebond-de-lumiere',
	'route-sans-rambarde',
	'trait-de-soleil'
];

/** Les 45 cartes du set de base reprises dans la 2ᵉ édition. */
export const REPRISES_ED2: string[] = [
	// Eshar / Morar / Velar d'origine, au complet
	'eshin', 'eshna', 'brume-memorielle', 'eskor', 'interstice', 'eshel',
	'nouvelle-peau', 'tala', 'moren', 'enfant-de-xenen', 'moras',
	'bruler-le-jour', 'velsa', 'velor', 'bord-du-monde', 'velna',
	// les six Légendaires et les deux Prismatiques restent tirables
	'exen', 'porte-du-dehors', 'rasen', 'doran', 'koren',
	// socle Vasar
	'appel-a-lordre', 'chant-daube', 'doras', 'dorin', 'korven', 'norel',
	'recitation', 'renna', 'senel', 'vasna', 'premiere-chaine', 'sentence-dor',
	// socle Exar
	'echo-du-dixieme-mot', 'exel', 'exna', 'messe-basse', 'morek', 'morna',
	'renas', 'rompre', 'seconde-sentence', 'thanor', 'clameur-dexen', 'couronne-dos'
];

export interface Edition {
	id: 'ed1' | 'ed2';
	nom: string;
	badge: string;
	sousTitre: string;
	cover: string;
	clePity: string;
	cartes: CardData[];
}

const parId = new Map(cards.map((c) => [c.id, c]));
const listeDe = (ids: string[]) =>
	ids.map((id) => parId.get(id)).filter((c): c is CardData => !!c);

export const EDITIONS: Edition[] = [
	{
		id: 'ed1',
		nom: '1ʳᵉ édition',
		badge: '1ʳᵉ Édition',
		sousTitre: 'Nés du silence',
		cover: '/art/rasen.webp',
		clePity: 'travelers-pity-v1', // la clé historique : les compteurs existants continuent
		cartes: cards.filter((c) => !EXTENSION_IDS.includes(c.id))
	},
	{
		id: 'ed2',
		nom: '2ᵉ édition',
		badge: '2ᵉ Édition',
		sousTitre: 'Routes de Xenen',
		cover: '/art/avel-rieur-des-retours.webp',
		clePity: 'expelled-pity-ed2',
		cartes: listeDe([...EXTENSION_IDS, ...REPRISES_ED2])
	}
];

export const editionDe = (id: string): Edition =>
	EDITIONS.find((e) => e.id === id) ?? EDITIONS[0];
