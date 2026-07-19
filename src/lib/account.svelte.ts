/**
 * Le compte : authentification Supabase (e-mail + mot de passe, confirmation
 * par code envoyé par e-mail) et sauvegarde cloud des données du joueur.
 */
import type { Session } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';
import {
	setCurrentEmail,
	applySave,
	pushCloudNow,
	migrateGuestToNamespace
} from '$lib/store';

export interface Account {
	email: string;
	name: string;
}

/** L'état partagé : toute l'app lit et réagit à session.account. */
export const session = $state<{ account: Account | null; ready: boolean }>({
	account: null,
	ready: false
});

function accountOf(s: Session | null): Account | null {
	const email = s?.user?.email;
	if (!email) return null;
	const name = (s.user.user_metadata?.pseudo as string) || email.split('@')[0];
	return { email, name };
}

/** Applique une session : compte actif + rapatriement du cloud vers le cache local. */
function applyAuth(s: Session | null): void {
	const acc = accountOf(s);
	session.account = acc;
	setCurrentEmail(acc?.email ?? null);
	session.ready = true;
	if (s && acc) {
		const cloud = s.user.user_metadata?.save;
		if (cloud && typeof cloud === 'object') applySave(cloud as Record<string, string | null>);
	}
}

let inited = false;
/** À appeler côté client : restaure la session et écoute les changements. */
export function initSession(): void {
	if (inited) return;
	inited = true;
	supabase.auth.getSession().then(({ data }) => applyAuth(data.session));
	supabase.auth.onAuthStateChange((_event, s) => applyAuth(s));
}

export function isValidEmail(e: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
}
export function isValidPassword(p: string): boolean {
	return p.length >= 6;
}

/** Après authentification : cloud → local, ou migration invité → cloud si neuf. */
async function afterAuth(): Promise<void> {
	const { data } = await supabase.auth.getUser();
	const user = data.user;
	const email = user?.email;
	if (!email) return;
	setCurrentEmail(email);
	const cloud = user.user_metadata?.save;
	const hasCloud = cloud && typeof cloud === 'object' && Object.keys(cloud).length > 0;
	if (hasCloud) {
		applySave(cloud as Record<string, string | null>);
	} else {
		migrateGuestToNamespace(email);
		await pushCloudNow();
	}
}

/** Inscription : crée le compte et envoie le code de confirmation par e-mail. */
export async function signUp(
	emailRaw: string,
	password: string
): Promise<{ ok: boolean; needsCode: boolean; error?: string }> {
	const email = emailRaw.trim().toLowerCase();
	const { data, error } = await supabase.auth.signUp({ email, password });
	if (error) return { ok: false, needsCode: false, error: error.message };
	// session non nulle = confirmation e-mail désactivée (connexion immédiate)
	if (data.session) {
		await afterAuth();
		return { ok: true, needsCode: false };
	}
	return { ok: true, needsCode: true };
}

/** Valide le code à 6 chiffres reçu par e-mail. */
export async function verifyCode(
	emailRaw: string,
	token: string
): Promise<{ ok: boolean; error?: string }> {
	const email = emailRaw.trim().toLowerCase();
	const { error } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: 'email' });
	if (error) return { ok: false, error: error.message };
	await afterAuth();
	return { ok: true };
}

/** Renvoie un code de confirmation. */
export async function resendCode(emailRaw: string): Promise<{ ok: boolean; error?: string }> {
	const email = emailRaw.trim().toLowerCase();
	const { error } = await supabase.auth.resend({ type: 'signup', email });
	return error ? { ok: false, error: error.message } : { ok: true };
}

/** Connexion e-mail + mot de passe. */
export async function signIn(
	emailRaw: string,
	password: string
): Promise<{ ok: boolean; needsCode?: boolean; error?: string }> {
	const email = emailRaw.trim().toLowerCase();
	const { error } = await supabase.auth.signInWithPassword({ email, password });
	if (error) {
		// compte non confirmé : proposer la saisie du code
		if (/confirm/i.test(error.message)) {
			await supabase.auth.resend({ type: 'signup', email }).catch(() => {});
			return { ok: false, needsCode: true, error: 'Compte non confirmé — entrez le code reçu.' };
		}
		return { ok: false, error: error.message };
	}
	await afterAuth();
	return { ok: true };
}

export async function signOut(): Promise<void> {
	await pushCloudNow(); // dernière sauvegarde avant de partir
	await supabase.auth.signOut();
	setCurrentEmail(null);
	session.account = null;
}

/** Met à jour le pseudo (local + métadonnées du compte). */
export async function setPseudo(name: string): Promise<void> {
	if (session.account) {
		try {
			await supabase.auth.updateUser({ data: { pseudo: name } });
			session.account = { ...session.account, name };
		} catch {
			/* hors ligne : le pseudo local reste, resync plus tard */
		}
	}
}
