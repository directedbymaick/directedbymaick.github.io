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
	'travelers-pity-v1',
	'expelled-eco',
	'expelled-decks',
	'expelled-pseudo',
	'expelled-mail',
	'boutique'
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

/**
 * Sync par version : chaque modification locale incrémente un compteur `rev`
 * (namespacé, persistant). Le bloc poussé au cloud embarque cette version.
 * Au retour du cloud, on n'écrase le local QUE si le cloud est au moins aussi
 * récent — sinon on garde le local (modif non encore poussée) et on resynchro-
 * nise vers le haut. Résultat : rien de supprimé ou gagné ne « revient ».
 */
type Save = Record<string, string | null | number>;

const REV = 'expelled-rev';

function localRev(): number {
	if (typeof localStorage === 'undefined') return 0;
	return Number(localStorage.getItem(nsKey(REV)) ?? '0') || 0;
}
function setLocalRev(n: number): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(nsKey(REV), String(n));
}

/** Rassemble les données locales du joueur (namespacées) + la version. */
export function gatherSave(): Save {
	const save: Save = { __ver: localRev() };
	for (const k of PLAYER_KEYS) save[k] = localStorage.getItem(nsKey(k));
	return save;
}

/** Écrit un bloc dans les clés locales namespacées (sans logique de version). */
function writeSave(save: Save): void {
	for (const k of PLAYER_KEYS) {
		const v = save[k];
		if (typeof v === 'string') localStorage.setItem(nsKey(k), v);
	}
}

/**
 * Applique un bloc cloud au local, protégé par la version.
 * - cloud ≥ local : le cloud fait foi → on écrit et on adopte sa version.
 * - cloud < local : le local a des modifs non poussées → on le garde et on
 *   planifie une remontée. Renvoie true si le cloud a été appliqué.
 */
export function applyCloud(save: Save | null | undefined): boolean {
	if (!save) return false;
	const cloudVer = Number(save.__ver ?? 0) || 0;
	if (cloudVer >= localRev()) {
		writeSave(save);
		setLocalRev(cloudVer);
		return true;
	}
	scheduleCloudSync(); // le local est plus récent : on le fait remonter
	return false;
}

/** Pousse le bloc local vers le compte Supabase (débounce). */
let syncTimer: ReturnType<typeof setTimeout> | undefined;
export function scheduleCloudSync(): void {
	if (typeof localStorage === 'undefined') return;
	if (!currentEmail()) return; // invité : rien à synchroniser
	setLocalRev(localRev() + 1); // marque le local comme plus récent
	clearTimeout(syncTimer);
	syncTimer = setTimeout(pushCloudNow, 1200);
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
