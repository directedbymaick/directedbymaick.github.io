import { dev } from '$app/environment';
import { error, json } from '@sveltejs/kit';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AltReglage, CardData, CardVariant } from '$lib/types';

/**
 * Écriture d'une fiche de carte depuis le Lab.
 *
 * Outil d'auteur, donc STRICTEMENT local : la route n'est pas prérendue (elle
 * ne part pas dans le build statique) et refuse tout hors `dev`. Le site publié
 * n'a ni cet endpoint ni de quoi l'appeler.
 */
export const prerender = false;

const CARDS_DIR = path.resolve('cards');

/** Champs que le Lab a le droit d'écrire — tout le reste de la fiche est préservé. */
interface Patch {
	name?: string;
	text?: string;
	flavor?: string;
	rarity?: CardData['rarity'];
	faction?: CardData['faction'];
	gene?: Partial<CardData['gene']>;
	fullArtFoil?: CardData['fullArtFoil'];
	/** variante à AJOUTER à la liste (pas un remplacement) */
	addVariant?: CardVariant;
	/** vide la liste des variantes */
	clearVariants?: boolean;
	/** index dans `alts` visé par les trois champs suivants */
	altIndex?: number;
	/** composition officielle de cet art alternatif (fusionnée : finition, détourage) */
	altGene?: Partial<AltReglage>;
	/** variante à ajouter à CET art alternatif */
	addAltVariant?: CardVariant;
	/** vide les variantes de CET art alternatif */
	clearAltVariants?: boolean;
}

export async function POST({ request }) {
	if (!dev) error(404, 'Not found');

	const { id, patch } = (await request.json()) as { id?: string; patch?: Patch };
	// l'id vient du client : il ne doit jamais pouvoir sortir de cards/
	if (!id || !/^[a-z0-9-]+$/i.test(id)) error(400, 'Identifiant de carte invalide');
	if (!patch) error(400, 'Rien à écrire');

	const file = path.join(CARDS_DIR, `${id}.json`);
	if (path.dirname(file) !== CARDS_DIR) error(400, 'Chemin refusé');

	let card: CardData;
	try {
		card = JSON.parse(await readFile(file, 'utf8'));
	} catch {
		error(404, `Carte ${id} introuvable`);
	}

	if (patch.name !== undefined) card.name = patch.name;
	if (patch.text !== undefined) card.text = patch.text;
	if (patch.flavor !== undefined) {
		if (patch.flavor.trim() === '') delete card.flavor;
		else card.flavor = patch.flavor;
	}
	if (patch.rarity) card.rarity = patch.rarity;
	if (patch.faction) card.faction = patch.faction;
	if (patch.gene) card.gene = { ...card.gene, ...patch.gene };
	if (patch.fullArtFoil) card.fullArtFoil = patch.fullArtFoil;

	if (patch.clearVariants) delete card.variants;
	if (patch.addVariant) {
		const list = card.variants ?? [];
		const v = patch.addVariant;
		// pas de doublon : une même paire (foil, fullArt) ne sert à rien deux fois
		const exists = list.some((x) => x.foilPreset === v.foilPreset && !!x.fullArt === !!v.fullArt);
		/* ni doublon de la composition OFFICIELLE : une variante identique à ce que
		   la carte porte déjà ne crée aucune version, elle ne fait qu'apparaître
		   deux fois dans les listes. */
		const officielle = v.fullArt
			? card.fullArtFoil === v.foilPreset
			: card.gene.foilPreset === v.foilPreset;
		if (!exists && !officielle) card.variants = [...list, v];
	}

	/* ---- arts alternatifs ----
	   Le même modèle que la carte de base, mais indexé : une composition
	   officielle par alt, plus une liste de finitions supplémentaires. */
	const viseAlt =
		patch.altGene !== undefined ||
		patch.addAltVariant !== undefined ||
		patch.clearAltVariants !== undefined;
	if (viseAlt) {
		const i = patch.altIndex;
		if (typeof i !== 'number' || !Number.isInteger(i) || i < 0)
			error(400, 'altIndex manquant ou invalide');
		if (i >= (card.alts?.length ?? 0)) error(400, `La carte ${id} n'a pas d'art alternatif ${i}`);

		const liste: AltReglage[] = [...(card.altReglages ?? [])];
		while (liste.length < (card.alts?.length ?? 0)) liste.push({});
		const cible: AltReglage = { ...liste[i] };

		if (patch.altGene) Object.assign(cible, patch.altGene);
		if (patch.clearAltVariants) delete cible.variants;
		if (patch.addAltVariant) {
			const l = cible.variants ?? [];
			const v = patch.addAltVariant;
			const existe = l.some((x) => x.foilPreset === v.foilPreset && !!x.fullArt === !!v.fullArt);
			// même garde que sur la carte de base : pas de doublon de l'officielle
			const officielle = v.fullArt
				? cible.fullArtFoil === v.foilPreset
				: cible.foilPreset === v.foilPreset;
			if (!existe && !officielle) cible.variants = [...l, v];
		}

		liste[i] = cible;
		// on ne garde le tableau que s'il porte au moins un réglage
		card.altReglages = liste.some((r) => Object.keys(r).length > 0) ? liste : undefined;
		if (!card.altReglages) delete card.altReglages;
	}

	// tabulations + newline final : le format des fiches déjà en place
	await writeFile(file, JSON.stringify(card, null, '\t') + '\n', 'utf8');
	return json({ ok: true, card });
}
