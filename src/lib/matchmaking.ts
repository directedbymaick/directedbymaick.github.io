/**
 * Matchmaking temps réel : une file d'attente partagée via Supabase Realtime
 * (présence + broadcast) — aucun serveur à nous, aucune table, aucun compte.
 *
 * Chaque joueur entre dans la file en annonçant le code du salon qu'il
 * HÉBERGERA si l'appariement le désigne hôte. L'annuaire est trié par date
 * d'entrée et découpé en paires d'indices adjacents : le premier de la paire
 * sera l'hôte, le second l'invité.
 *
 * L'initiative appartient à l'INVITÉ seul. Quand il voit sa paire complète,
 * il prévient l'hôte par un broadcast explicite puis part rejoindre son code.
 * L'hôte, lui, n'agit QUE sur ce broadcast : on ne peut pas se fier aux
 * événements de présence pour lui, car un invité qui s'apparie quitte le
 * canal en quelques millisecondes et Phoenix compresse les diffs — un
 * join+leave dans la même fenêtre s'annule et l'hôte ne verrait jamais rien
 * (constaté en test : l'invité partait, l'hôte attendait pour toujours).
 */
import { supabase } from '$lib/supabase';

interface Entree {
	key: string;
	code: string;
	at: number;
}

export interface Appariement {
	/** Le code du salon de l'adversaire (utile seulement si on devient invité). */
	code: string;
	/** Vrai : on reste hôte, l'adversaire arrive. Faux : on doit le rejoindre. */
	hote: boolean;
}

/**
 * Entre dans la file avec le code du salon qu'on hébergera.
 * Retourne une fonction pour quitter la file (annulation ou appariement conclu).
 */
export function entrerFile(code: string, surAppariement: (a: Appariement) => void): () => void {
	const key = code; // 6 caractères aléatoires : identifiant suffisant
	let fini = false;
	const canal = supabase.channel('matchmaking-v1', { config: { presence: { key } } });

	const quitter = () => {
		if (fini) return;
		fini = true;
		void supabase.removeChannel(canal);
	};

	/* L'hôte est prévenu ici, et seulement ici. */
	canal.on('broadcast', { event: 'apparie' }, ({ payload }) => {
		if (fini || payload?.hote !== key) return;
		quitter();
		surAppariement({ code: String(payload.inviteCode ?? ''), hote: true });
	});

	/* L'invité détecte sa paire par la présence (sync à l'arrivée, join si
	   l'hôte se présentait après lui) et prend l'initiative. */
	let engage = false; // l'envoi est asynchrone : un second sync ne doit pas doubler
	const evaluer = () => {
		if (fini || engage) return;
		const etat = canal.presenceState<Entree>();
		const file = Object.values(etat)
			.flat()
			.sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
		const moi = file.findIndex((e) => e.key === key);
		if (moi === -1 || moi % 2 === 0) return; // absent, ou hôte : on attend le broadcast
		const hote = file[moi - 1];
		if (!hote) return;
		engage = true;
		const envoi = canal.send({
			type: 'broadcast',
			event: 'apparie',
			payload: { hote: hote.key, inviteCode: code }
		});
		void Promise.resolve(envoi).finally(() => {
			quitter();
			surAppariement({ code: hote.code, hote: false });
		});
	};
	canal.on('presence', { event: 'sync' }, evaluer);
	canal.on('presence', { event: 'join' }, evaluer);

	canal.subscribe((statut) => {
		if (statut === 'SUBSCRIBED') {
			void canal.track({ key, code, at: Date.now() } satisfies Entree);
		}
	});

	return quitter;
}
