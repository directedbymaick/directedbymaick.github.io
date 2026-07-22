/**
 * Matchmaking temps réel : une file d'attente partagée via la présence
 * Supabase Realtime — aucun serveur à nous, aucune table, aucun compte requis.
 *
 * Chaque joueur entre dans la file en hébergeant DÉJÀ son propre salon PeerJS :
 * il annonce son code et sa date d'entrée. Tous les clients voient le même
 * annuaire et s'apparient de la même façon (tri par date d'entrée, paires
 * d'indices adjacents) : le premier de la paire reste hôte, le second ferme
 * son salon et rejoint celui du premier. Un nombre impair laisse le dernier
 * en attente du prochain arrivant.
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
 * Entre dans la file avec le code du salon qu'on héberge.
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

	canal.on('presence', { event: 'sync' }, () => {
		if (fini) return;
		const etat = canal.presenceState<Entree>();
		const file = Object.values(etat)
			.flat()
			.sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
		const moi = file.findIndex((e) => e.key === key);
		if (moi === -1) return;
		const autre = file[moi % 2 === 0 ? moi + 1 : moi - 1];
		if (!autre) return; // seul dans la paire : on attend le prochain
		const a: Appariement = { code: autre.code, hote: moi % 2 === 0 };
		quitter();
		surAppariement(a);
	});

	canal.subscribe((statut) => {
		if (statut === 'SUBSCRIBED') {
			void canal.track({ key, code, at: Date.now() } satisfies Entree);
		}
	});

	return quitter;
}
