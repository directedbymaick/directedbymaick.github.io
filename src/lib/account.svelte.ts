/**
 * Profil local temporaire. Aucune authentification ni donnée distante :
 * chaque navigateur conserve sa propre progression dans localStorage.
 */

export interface Account {
	email: string;
	name: string;
}

const LOCAL_PROFILE = 'local@expelled.browser';
const PSEUDO_KEY = 'expelled-pseudo';
const CURRENT_EMAIL_KEY = 'expelled-current-email';
const BROWSER_KEYS = [
	'travelers-collection-v1',
	'travelers-pity-v1',
	'expelled-eco',
	'expelled-decks',
	'expelled-pseudo',
	'expelled-mail',
	'boutique',
	'expelled-rev'
];

export const session = $state<{ account: Account | null; ready: boolean }>({
	account: null,
	ready: false
});

export function initSession(): void {
	if (session.ready) return;
	if (typeof localStorage !== 'undefined') {
		const previousEmail = localStorage.getItem(CURRENT_EMAIL_KEY);
		if (previousEmail) {
			for (const key of BROWSER_KEYS) {
				const accountValue = localStorage.getItem(`${key}::${previousEmail}`);
				if (accountValue !== null) localStorage.setItem(key, accountValue);
			}
		}
		localStorage.removeItem(CURRENT_EMAIL_KEY);
	}
	const name =
		typeof localStorage === 'undefined'
			? 'Sans-Nom'
			: (localStorage.getItem(PSEUDO_KEY) ?? 'Sans-Nom');
	session.account = { email: LOCAL_PROFILE, name };
	session.ready = true;
}

export function isValidEmail(e: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
}

export async function signOut(): Promise<void> {
	/* Authentification désactivée : la session appartient au navigateur. */
}

export async function setPseudo(name: string): Promise<void> {
	if (typeof localStorage !== 'undefined') localStorage.setItem(PSEUDO_KEY, name);
}
