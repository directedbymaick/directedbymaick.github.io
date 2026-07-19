/**
 * Le compte : identité locale liée à un e-mail, partagée entre la nav et
 * l'espace utilisateur via un état réactif (pas encore de serveur — l'espace
 * vit dans ce navigateur ; une vraie auth pourra s'y brancher).
 */
import { nsKey, migrateGuestToAccount } from '$lib/store';

export interface Account {
	email: string;
	name: string;
	createdAt: number;
}

const KEY = 'expelled-account';
const PSEUDO = 'expelled-pseudo';

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

/** Connexion : ouvre (ou crée) l'espace lié à cet e-mail. Les données du
 *  joueur sont rattachées au compte ; rien ne disparaît d'une session à
 *  l'autre. Recharge la page pour réinitialiser tous les stores. */
export function signIn(emailRaw: string): Account {
	const email = emailRaw.trim().toLowerCase();
	const local = email.split('@')[0] || 'Sans-Nom';
	// écrire le compte AVANT toute lecture namespacée (nsKey lit ce compte)
	const account: Account = { email, name: '', createdAt: Date.now() };
	localStorage.setItem(KEY, JSON.stringify(account));
	// première connexion : hériter des données « invité » accumulées
	migrateGuestToAccount(email);
	// nom : celui déjà sauvé pour ce compte, sinon dérivé de l'e-mail
	account.name =
		localStorage.getItem(nsKey(PSEUDO)) ?? local.charAt(0).toUpperCase() + local.slice(1);
	localStorage.setItem(KEY, JSON.stringify(account));
	localStorage.setItem(nsKey(PSEUDO), account.name);
	session.account = account;
	if (typeof location !== 'undefined') location.assign('/profil');
	return account;
}

export function signOut(): void {
	localStorage.removeItem(KEY);
	session.account = null;
	if (typeof location !== 'undefined') location.assign('/');
}
