/**
 * Le compte : authentification Supabase sans mot de passe, par code à usage
 * unique envoyé à chaque connexion, et sauvegarde cloud des données du joueur.
 */
import type { Session } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';
import {
	setCurrentEmail,
	applyCloud,
	pushCloudNow,
	migrateGuestToNamespace
} from '$lib/store';

export interface Account {
	email: string;
	name: string;
}

const WELCOME_CREDITS = 300000;
const ECONOMY_KEY = 'expelled-eco';
const WELCOME_GRANT_VERSION = 1;

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
		if (cloud && typeof cloud === 'object') applyCloud(cloud as Record<string, string | null>);
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

/** Après authentification : cloud → local, ou migration invité → cloud si neuf. */
function grantWelcomeCredits(email: string): void {
	if (typeof localStorage === 'undefined') return;
	const key = `${ECONOMY_KEY}::${email}`;
	let economy: Record<string, unknown> = {};
	try {
		const raw = localStorage.getItem(key);
		if (raw) economy = JSON.parse(raw) as Record<string, unknown>;
	} catch {
		/* sauvegarde illisible : le cadeau recrée un socle économique sain */
	}
	if (Number(economy.welcomeGrantVersion ?? 0) >= WELCOME_GRANT_VERSION) return;
	economy.balance = Math.max(Number(economy.balance ?? 0) || 0, WELCOME_CREDITS);
	economy.welcomeGrantVersion = WELCOME_GRANT_VERSION;
	localStorage.setItem(key, JSON.stringify(economy));
}

async function afterAuth(newAccount = false): Promise<void> {
	const { data } = await supabase.auth.getUser();
	const user = data.user;
	const email = user?.email;
	if (!email) return;
	setCurrentEmail(email);
	const cloud = user.user_metadata?.save;
	const hasCloud = cloud && typeof cloud === 'object' && Object.keys(cloud).length > 0;
	if (hasCloud) {
		applyCloud(cloud as Record<string, string | null>);
	} else {
		migrateGuestToNamespace(email);
		if (newAccount) grantWelcomeCredits(email);
		await pushCloudNow();
	}
}

/** Envoie un code de connexion. Supabase crée le compte s'il n'existe pas. */
export async function requestLoginCode(
	emailRaw: string
): Promise<{ ok: boolean; error?: string }> {
	const email = emailRaw.trim().toLowerCase();
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: { shouldCreateUser: true }
	});
	return error ? { ok: false, error: error.message } : { ok: true };
}

/** Valide le code à usage unique reçu par e-mail. */
export async function verifyCode(
	emailRaw: string,
	token: string
): Promise<{ ok: boolean; error?: string }> {
	const email = emailRaw.trim().toLowerCase();
	const { error } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: 'email' });
	if (error) return { ok: false, error: error.message };
	await afterAuth(true);
	return { ok: true };
}

/** Renvoie un nouveau code de connexion. */
export async function resendCode(emailRaw: string): Promise<{ ok: boolean; error?: string }> {
	return requestLoginCode(emailRaw);
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
