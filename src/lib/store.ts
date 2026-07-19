/**
 * Stockage du joueur : localStorage comme cache rapide (namespacé par
 * e-mail, `clé::email`) + synchronisation cloud dans les métadonnées du
 * compte Supabase. Rien ne se mélange ni ne disparaît, et le compte suit
 * le joueur d'un appareil à l'autre.
 */
import { supabase } from '$lib/supabase';

/** L'e-mail du compte actif, miroir local mis à jour par la couche auth. */
const CURRENT = 'expelled-current-email';

/** Les clés qui appartiennent au joueur (synchronisées avec le compte). */
export const PLAYER_KEYS = [
	'travelers-collection-v1',
	'expelled-eco',
	'expelled-decks',
	'expelled-pseudo',
	'expelled-mail'
];

export function currentEmail(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(CURRENT);
}

export function setCurrentEmail(email: string | null): void {
	if (typeof localStorage === 'undefined') return;
	if (email) localStorage.setItem(CURRENT, email);
	else localStorage.removeItem(CURRENT);
}

/** La clé de stockage effective : `base::email` si connecté, `base` sinon. */
export function nsKey(base: string): string {
	const email = currentEmail();
	return email ? `${base}::${email}` : base;
}

/** Première connexion d'un compte : lui donner les données « invité »
 *  accumulées avant l'inscription (rien n'est perdu), puis vider l'invité. */
export function migrateGuestToNamespace(email: string): void {
	if (typeof localStorage === 'undefined') return;
	const hasData = PLAYER_KEYS.some((k) => localStorage.getItem(`${k}::${email}`) !== null);
	if (hasData) return;
	let moved = false;
	for (const k of PLAYER_KEYS) {
		const guest = localStorage.getItem(k);
		if (guest !== null) {
			localStorage.setItem(`${k}::${email}`, guest);
			moved = true;
		}
	}
	if (moved) for (const k of PLAYER_KEYS) localStorage.removeItem(k);
}

/* ---------------------------- sauvegarde cloud ---------------------------- */

type Save = Record<string, string | null>;

/** Rassemble les données locales du joueur (namespacées) en un bloc. */
export function gatherSave(): Save {
	const save: Save = {};
	for (const k of PLAYER_KEYS) save[k] = localStorage.getItem(nsKey(k));
	return save;
}

/** Écrit un bloc de sauvegarde dans les clés locales namespacées. */
export function applySave(save: Save | null | undefined): void {
	if (!save) return;
	for (const k of PLAYER_KEYS) {
		const v = save[k];
		if (typeof v === 'string') localStorage.setItem(nsKey(k), v);
	}
}

/** Pousse le bloc local vers le compte Supabase (débounce). */
let syncTimer: ReturnType<typeof setTimeout> | undefined;
export function scheduleCloudSync(): void {
	if (typeof localStorage === 'undefined') return;
	if (!currentEmail()) return; // invité : rien à synchroniser
	clearTimeout(syncTimer);
	syncTimer = setTimeout(pushCloudNow, 1500);
}

export async function pushCloudNow(): Promise<void> {
	clearTimeout(syncTimer);
	if (!currentEmail()) return;
	try {
		const { data } = await supabase.auth.getSession();
		if (!data.session) return;
		await supabase.auth.updateUser({ data: { save: gatherSave() } });
	} catch {
		/* hors ligne : le cache local garde tout, on resynchronisera plus tard */
	}
}
