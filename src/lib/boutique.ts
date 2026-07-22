/**
 * La boutique : catalogue et droits du joueur.
 *
 * Le modèle complet est décrit dans Expelled/MONETISATION.md. La règle qui
 * prime : l'argent achète du RYTHME, jamais du contenu. Aucune carte n'est
 * exclusive à l'argent, les taux d'un booster acheté sont ceux d'un booster
 * gagné, et les cosmétiques n'ont aucun effet en duel.
 *
 * ATTENTION — le paiement n'est PAS connecté. `acheter()` refuse délibérément,
 * et c'est le seul point d'intégration à écrire le jour où un prestataire est
 * choisi. Deux raisons de ne pas l'avoir simulé :
 *
 *   — un écran d'achat qui ne prend pas l'argent est pire que pas d'écran ;
 *   — les droits doivent être validés PAR UN SERVEUR. Tant qu'ils vivent dans
 *     le navigateur, n'importe qui se les accorde depuis la console. C'est
 *     acceptable pour une collection gagnée, jamais pour un bien payé.
 */

import { nsKey } from '$lib/store';

export type FamilleOffre = 'boosters' | 'cosmetique' | 'passe';

export interface Offre {
	id: string;
	famille: FamilleOffre;
	nom: string;
	detail: string;
	/** en centimes, pour ne jamais manipuler de flottant sur de l'argent */
	prixCentimes: number;
	/** boosters crédités, le cas échéant */
	boosters?: number;
	/** cosmétique débloqué, le cas échéant */
	cosmetique?: string;
}

/* Prix calés sur le marché : Pokémon Pocket et Hearthstone situent le booster
   entre 0,80 € et 1,00 €, avec dégressivité. Cf. MONETISATION.md §2. */
export const CATALOGUE: Offre[] = [
	{
		id: 'poignee',
		famille: 'boosters',
		nom: 'Poignée',
		detail: '5 boosters',
		prixCentimes: 499,
		boosters: 5
	},
	{
		id: 'requisition',
		famille: 'boosters',
		nom: 'Réquisition',
		detail: '12 boosters',
		prixCentimes: 999,
		boosters: 12
	},
	{
		id: 'grande-requisition',
		famille: 'boosters',
		nom: 'Grande réquisition',
		detail: '30 boosters, dont un Full Art garanti',
		prixCentimes: 1999,
		boosters: 30
	},
	{
		id: 'dos-chaines',
		famille: 'cosmetique',
		nom: 'Dos — Chaînes d’or',
		detail: 'Un dos de carte. Aucun effet en duel.',
		prixCentimes: 399,
		cosmetique: 'dos-chaines'
	},
	{
		id: 'plateau-exen',
		famille: 'cosmetique',
		nom: 'Plateau — Exen',
		detail: 'Un terrain de duel. Aucun effet en duel.',
		prixCentimes: 599,
		cosmetique: 'plateau-exen'
	},
	{
		id: 'passe-silence',
		famille: 'passe',
		nom: 'Passe du Silence',
		detail: 'Huit semaines : Éclats doublés et cosmétiques exclusifs.',
		prixCentimes: 999
	}
];

export function prix(o: Offre): string {
	return (o.prixCentimes / 100).toFixed(2).replace('.', ',') + ' €';
}

/* ------------------------------------------------------------------- droits */

export interface Droits {
	/** identifiants d'offres possédées */
	achats: string[];
	/** cosmétiques débloqués */
	cosmetiques: string[];
	/** cosmétique actuellement porté, par emplacement */
	actifs: Record<string, string>;
}

const CLE = 'boutique';

export function chargerDroits(): Droits {
	const vide: Droits = { achats: [], cosmetiques: [], actifs: {} };
	if (typeof localStorage === 'undefined') return vide;
	try {
		return { ...vide, ...JSON.parse(localStorage.getItem(nsKey(CLE)) ?? '{}') };
	} catch {
		return vide;
	}
}

export function enregistrerDroits(d: Droits): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(nsKey(CLE), JSON.stringify(d));
}

/** Porte un cosmétique déjà possédé. Sans effet s'il ne l'est pas. */
export function porter(emplacement: string, cosmetique: string): Droits {
	const d = chargerDroits();
	if (!d.cosmetiques.includes(cosmetique)) return d;
	d.actifs = { ...d.actifs, [emplacement]: cosmetique };
	enregistrerDroits(d);
	return d;
}

/* ------------------------------------------------------------------ paiement
   LE point d'intégration. À écrire quand un prestataire aura été choisi, et
   à écrire CÔTÉ SERVEUR : cette fonction ne doit que déclencher un tunnel et
   attendre la confirmation du back-end, jamais accorder un droit elle-même. */

export class PaiementNonConnecte extends Error {
	constructor() {
		super(
			"Le paiement n'est pas connecté. Voir Expelled/MONETISATION.md §6 : " +
				'prestataire, back-end de validation, CGV, TVA et droit de rétractation.'
		);
		this.name = 'PaiementNonConnecte';
	}
}

/** La boutique est-elle ouverte ? Non tant que le paiement n'existe pas. */
export const BOUTIQUE_OUVERTE = false;

export async function acheter(_offre: Offre): Promise<never> {
	throw new PaiementNonConnecte();
}
