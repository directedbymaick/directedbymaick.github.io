/**
 * Le compte : identité locale liée à un e-mail, partagée entre la nav et
 * l'espace utilisateur via un état réactif (pas encore de serveur — l'espace
 * vit dans ce navigateur ; une vraie auth pourra s'y brancher).
 */
export interface Account {
	email: string;
	name: string;
	createdAt: number;
}

const KEY = 'expelled-account';

/** L'état partagé : toute l'app lit et réagit à session.account. */
export const session = $state<{ account: Account | null }>({ account: null });

/** À appeler une fois côté client (layout) pour recharger la session. */
export function initSession(): void {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return;
		const a = JSON.parse(raw);
		if (a && typeof a.email === 'string') session.account = a;
	} catch {
		session.account = null;
	}
}

export function isValidEmail(e: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
}

/** Connexion : crée (ou rouvre) l'espace lié à cet e-mail. */
export function signIn(emailRaw: string): Account {
	const email = emailRaw.trim().toLowerCase();
	const local = email.split('@')[0] ?? 'Sans-Nom';
	const existingName = localStorage.getItem('expelled-pseudo');
	const account: Account = {
		email,
		name: existingName ?? local.charAt(0).toUpperCase() + local.slice(1),
		createdAt: Date.now()
	};
	localStorage.setItem(KEY, JSON.stringify(account));
	localStorage.setItem('expelled-pseudo', account.name);
	session.account = account;
	return account;
}

export function signOut(): void {
	localStorage.removeItem(KEY);
	session.account = null;
}
