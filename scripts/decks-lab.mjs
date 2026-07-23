/**
 * Banc d'essai des decks : round-robin IA vs IA pour équilibrer les
 * recommandations. Jetable — lancé à la main, pas branché au build.
 *
 *   node scripts/decks-lab.mjs [parties_par_matchup]
 */
import { createServer } from 'vite';

const N = Number(process.argv[2] ?? 60); // parties par matchup (moitié/moitié premier joueur)

const serveur = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
	const E = await serveur.ssrLoadModule('/src/lib/game/engine.ts');
	const C = await serveur.ssrLoadModule('/src/lib/cards.ts');
	const carte = (id) => {
		const c = C.cards.find((x) => x.id === id);
		if (!c) throw new Error('carte inconnue: ' + id);
		return c;
	};
	const domFaction = (liste) => {
		const n = {};
		for (const c of liste) n[c.faction] = (n[c.faction] ?? 0) + 1;
		return Object.entries(n).sort((a, b) => b[1] - a[1])[0][0];
	};
	const expand = (rec) => {
		const l = [];
		for (const [id, k] of Object.entries(rec)) for (let i = 0; i < k; i++) l.push(carte(id));
		return l;
	};

	/* ---- les decks candidats ---- */
	const DECKS = (await import('./decks-candidats.mjs')).DECKS;

	// contrôle : 30 cartes, ≤2 peuples
	for (const d of DECKS) {
		const total = Object.values(d.cards).reduce((a, b) => a + b, 0);
		const facs = new Set(Object.keys(d.cards).map((id) => carte(id).faction));
		if (total !== 30) console.log(`⚠ ${d.name}: ${total} cartes (attendu 30)`);
		if (facs.size > 2) console.log(`⚠ ${d.name}: ${facs.size} peuples (max 2) — ${[...facs]}`);
	}

	const listes = DECKS.map((d) => ({ ...d, liste: expand(d.cards), fac: domFaction(expand(d.cards)) }));
	const idx = Object.fromEntries(listes.map((d, i) => [d.id, i]));

	// matrice des victoires (ligne = deck, % de victoires vs colonne)
	const wins = listes.map(() => listes.map(() => 0));
	const played = listes.map(() => listes.map(() => 0));

	let graine = 1000;
	for (let i = 0; i < listes.length; i++) {
		for (let j = i + 1; j < listes.length; j++) {
			for (let g = 0; g < N; g++) {
				// alterner qui commence
				const [A, B] = g % 2 === 0 ? [i, j] : [j, i];
				const r = E.simulate(
					C.cards,
					listes[A].fac,
					listes[B].fac,
					graine++,
					[listes[A].liste, listes[B].liste]
				);
				played[i][j]++; played[j][i]++;
				// r.winner : 0 = A, 1 = B, -1 = nul
				if (r.winner === 0) wins[A][B]++;
				else if (r.winner === 1) wins[B][A]++;
			}
		}
	}

	// win-rate global de chaque deck
	console.log(`\n=== ${N} parties par matchup, ${listes.length} decks ===\n`);
	const global = listes.map((d, i) => {
		let w = 0, p = 0;
		for (let j = 0; j < listes.length; j++) { if (i === j) continue; w += wins[i][j]; p += played[i][j]; }
		return { id: d.id, name: d.name, wr: p ? w / p : 0, p };
	}).sort((a, b) => b.wr - a.wr);
	for (const d of global) console.log(`  ${(d.wr * 100).toFixed(1).padStart(5)}%  ${d.name}`);

	// matrice détaillée
	console.log('\n=== matrice (ligne bat colonne, %) ===');
	const noms = listes.map((d) => d.id.slice(0, 10).padStart(11));
	console.log('           ' + noms.join(''));
	for (let i = 0; i < listes.length; i++) {
		let row = listes[i].id.slice(0, 10).padEnd(11);
		for (let j = 0; j < listes.length; j++) {
			if (i === j) { row += '     —     '; continue; }
			const wr = played[i][j] ? wins[i][j] / played[i][j] : 0;
			row += (wr * 100).toFixed(0).padStart(8) + '%  ';
		}
		console.log(row);
	}
	console.log('\nCible : win-rate global 42–58 %, aucun matchup < 20 % ou > 80 %.');
} finally {
	await serveur.close();
}
