/**
 * Salons en ligne : connexion pair-à-pair via PeerJS (broker cloud public,
 * puis données en direct entre les deux navigateurs — aucun serveur à nous).
 */
import Peer, { type DataConnection } from 'peerjs';

const PREFIX = 'expelled-silence-';
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export type { DataConnection };

export function salonCode(): string {
	let c = '';
	for (let i = 0; i < 6; i++) c += ABC[Math.floor(Math.random() * ABC.length)];
	return c;
}

/** Ouvre un salon : le pair écoute sous l'identifiant du code. */
export function createHost(code: string): Promise<Peer> {
	return new Promise((resolve, reject) => {
		const peer = new Peer(PREFIX + code);
		peer.on('open', () => resolve(peer));
		peer.on('error', (e) => reject(e));
	});
}

/** Rejoint un salon par son code. */
export function joinHost(code: string): Promise<{ peer: Peer; conn: DataConnection }> {
	return new Promise((resolve, reject) => {
		const peer = new Peer();
		const bail = (e: unknown) => {
			peer.destroy();
			reject(e);
		};
		peer.on('open', () => {
			const conn = peer.connect(PREFIX + code.trim().toUpperCase(), { reliable: true });
			const timer = setTimeout(() => {
				if (!conn.open) bail(new Error('Salon introuvable — vérifiez le code.'));
			}, 12000);
			conn.on('open', () => {
				clearTimeout(timer);
				resolve({ peer, conn });
			});
			conn.on('error', (e) => {
				clearTimeout(timer);
				bail(e);
			});
		});
		peer.on('error', (e) => bail(e));
	});
}
