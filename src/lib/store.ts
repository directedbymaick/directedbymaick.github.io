/**
 * Stockage rattaché au compte : chaque donnée du joueur (collection, Éclats,
 * decks, pseudo) est isolée par e-mail — `clé::email` — pour qu'aucune carte
 * ne se mélange ni ne disparaisse d'une session à l'autre.
 *
 * Sans serveur, la persistance reste propre au navigateur ; une vraie auth
 * (Supabase…) pourra remplacer ces fonctions sans toucher au reste de l'app.
 */

const ACCOUNT_KEY = 'expelled-account';

/** Les clés qui appartiennent au joueur (déplacées avec son compte). */
export const PLAYER_KEYS = [
	'travelers-collection-v1',
	'expelled-eco',
	'expelled-decks',
	'expelled-pseudo'
];

/** L'e-mail du compte actif, lu directement du stockage (fiable dès le boot). */
export function currentEmail(): string | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(ACCOUNT_KEY);
		if (!raw) return null;
		const a = JSON.parse(raw);
		return a && typeof a.email === 'string' ? a.email : null;
	} catch {
		return null;
	}
}

/** La clé de stockage effective : `base::email` si connecté, `base` sinon. */
export function nsKey(base: string): string {
	const email = currentEmail();
	return email ? `${base}::${email}` : base;
}

/**
 * À la première connexion d'un compte, on lui donne les données « invité »
 * accumulées avant l'inscription (rien n'est perdu), puis on vide l'invité
 * pour ne pas contaminer un autre compte sur le même navigateur.
 */
export function migrateGuestToAccount(email: string): void {
	if (typeof localStorage === 'undefined') return;
	// le compte a-t-il déjà des données ? (utilisateur qui revient → on n'y touche pas)
	const alreadyHasData = PLAYER_KEYS.some((k) => localStorage.getItem(`${k}::${email}`) !== null);
	if (alreadyHasData) return;

	let migratedSomething = false;
	for (const k of PLAYER_KEYS) {
		const guest = localStorage.getItem(k);
		if (guest !== null) {
			localStorage.setItem(`${k}::${email}`, guest);
			migratedSomething = true;
		}
	}
	// vide les données invité déplacées vers le compte
	if (migratedSomething) for (const k of PLAYER_KEYS) localStorage.removeItem(k);
}
