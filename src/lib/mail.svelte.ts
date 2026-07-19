/**
 * Le Courrier du Silence : la boîte de réception du joueur.
 * Expelled y adresse des messages et des récompenses (Éclats). L'état lu/
 * réclamé vit en localStorage namespacé et se synchronise avec le compte.
 *
 * Un courrier peut être diffusé à tous (`to` absent) ou adressé à un seul
 * compte (`to` = e-mail). Les récompenses ne se réclament qu'une fois.
 */
import { nsKey, scheduleCloudSync, currentEmail } from '$lib/store';
import { earn } from '$lib/economy.svelte';

export interface MailDef {
	id: string;
	from: string;
	subject: string;
	/** Corps du message : chaque entrée est un paragraphe. */
	body: string[];
	/** Date d'envoi (ISO), pour l'affichage et le tri. */
	date: string;
	/** Éclats offerts (0 = message seul). */
	coins?: number;
	/** Destinataire unique (e-mail). Absent = diffusé à tous les comptes. */
	to?: string;
}

/** La boîte d'envoi d'Expelled — contenu statique livré avec le jeu. */
export const MAILBOX: MailDef[] = [
	{
		id: 'welcome',
		from: 'Le Bureau du Silence',
		subject: 'Bienvenue dans le Silence',
		date: '2026-07-19T09:00:00Z',
		body: [
			'Votre nom a été inscrit au Registre. Les Éclats que vous amasserez ouvriront les boosters, et chaque carte tirée rejoindra votre compte — d’un appareil à l’autre, rien ne se perd.',
			'Que votre voix porte loin dans le Silence.'
		]
	},
	{
		id: 'founder-gift-999999',
		from: 'Le Bureau du Silence',
		subject: 'Dotation de fondateur',
		date: '2026-07-19T10:00:00Z',
		to: 'mcksuperdukegaming@gmail.com',
		coins: 999999,
		body: [
			'À l’architecte du Silence.',
			'Le Bureau vous accorde une dotation exceptionnelle : le trésor maximum qu’un compte puisse détenir. Réclamez-la ci-dessous — votre bourse sera portée à son plafond.',
			'999 999 Éclats vous attendent.'
		]
	}
];

/* ------------------------------- état + persistance ------------------------------- */

interface MailState {
	ready: boolean;
	read: Record<string, boolean>;
	claimed: Record<string, boolean>;
}

const KEY = 'expelled-mail';

export const mail = $state<MailState>({
	ready: false,
	read: {},
	claimed: {}
});

function persist(): void {
	if (typeof localStorage === 'undefined') return;
	const { ready, ...data } = mail;
	localStorage.setItem(nsKey(KEY), JSON.stringify(data));
	scheduleCloudSync();
}

/** Charge l'état du courrier pour le compte actif (ou l'invité). */
export function initMail(): void {
	mail.read = {};
	mail.claimed = {};
	try {
		const raw = localStorage.getItem(nsKey(KEY));
		if (raw) {
			const d = JSON.parse(raw);
			mail.read = d.read ?? {};
			mail.claimed = d.claimed ?? {};
		}
	} catch {
		/* état illisible : on repart propre */
	}
	mail.ready = true;
}

/** Les courriers visibles pour un compte donné, du plus récent au plus ancien.
 *  Le courrier est une fonction de compte : les invités n'en reçoivent pas. */
export function inboxFor(email: string | null): MailDef[] {
	if (!email) return [];
	return MAILBOX.filter((m) => !m.to || m.to === email).sort((a, b) =>
		a.date < b.date ? 1 : -1
	);
}

/** Nombre de courriers non lus (ou récompense non réclamée) pour ce compte. */
export function unreadCountFor(email: string | null): number {
	return inboxFor(email).filter(
		(m) => !mail.read[m.id] || (!!m.coins && !mail.claimed[m.id])
	).length;
}

export function markRead(id: string): void {
	if (mail.read[id]) return;
	mail.read = { ...mail.read, [id]: true };
	persist();
}

/** Réclame la récompense d'un courrier (une seule fois). Renvoie les Éclats crédités. */
export function claimMail(id: string): number {
	const def = MAILBOX.find((m) => m.id === id);
	if (!def || !def.coins) return 0;
	// sécurité : un courrier adressé ne se réclame que par son destinataire
	if (def.to && def.to !== currentEmail()) return 0;
	if (mail.claimed[id]) return 0;
	mail.claimed = { ...mail.claimed, [id]: true };
	mail.read = { ...mail.read, [id]: true };
	earn(def.coins, def.subject);
	persist();
	return def.coins;
}
