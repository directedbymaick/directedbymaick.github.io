/**
 * Optimiseur de decks : cherche les compositions les PLUS FORTES contre le
 * gauntlet des decks recommandés, par hill-climbing avec confirmation.
 *
 * Objectif double :
 *   1. mesurer le PLAFOND des decks personnalisés (un joueur peut-il
 *      construire un deck qui écrase les recommandés ?) ;
 *   2. identifier les cartes sur-représentées dans les meilleurs builds.
 *
 *   node scripts/decks-opt.mjs [iterations_par_graine]
 */
import { createServer } from 'vite';
import { DECKS } from './decks-candidats.mjs';

const ITERS = Number(process.argv[2] ?? 250);
const G_RAPIDE = 96; // parties par évaluation rapide (16 par adversaire)
const G_CONFIRME = 288; // confirmation d'une amélioration (48 par adversaire)

const serveur = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
	const E = await serveur.ssrLoadModule('/src/lib/game/engine.ts');
	const C = await serveur.ssrLoadModule('/src/lib/cards.ts');
	const carte = (id) => {
		const c = C.cards.find((x) => x.id === id);
		if (!c) throw new Error('carte inconnue: ' + id);
		return c;
	};
	const MAX_COPIES = { common: 3, rare: 2, epic: 2, legendary: 1, prism: 1 };

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

	/* ---- le gauntlet : les 6 recommandés ---- */
	const gauntlet = DECKS.map((d) => {
		const liste = expand(d.cards);
		return { id: d.id, liste, fac: domFaction(liste) };
	});

	/* ---- légalité ---- */
	function legal(rec) {
		let total = 0;
		const facs = new Set();
		for (const [id, k] of Object.entries(rec)) {
			const c = carte(id);
			if (k < 1 || k > MAX_COPIES[c.rarity]) return false;
			total += k;
			facs.add(c.faction);
		}
		return total === 30 && facs.size <= 2;
	}

	/* ---- évaluation : % de victoires contre tout le gauntlet ---- */
	let compteurEval = 0;
	function evaluer(rec, G) {
		const liste = expand(rec);
		const fac = domFaction(liste);
		const parAdv = Math.max(2, Math.floor(G / gauntlet.length / 2) * 2);
		let w = 0, p = 0;
		const base = 100_000 + (compteurEval++ % 997) * 10_000;
		for (let a = 0; a < gauntlet.length; a++) {
			for (let g = 0; g < parAdv; g++) {
				const seed = base + a * 1000 + g;
				const jeSuisA = g % 2 === 0;
				const r = jeSuisA
					? E.simulate(C.cards, fac, gauntlet[a].fac, seed, [liste, gauntlet[a].liste])
					: E.simulate(C.cards, gauntlet[a].fac, fac, seed, [gauntlet[a].liste, liste]);
				p++;
				if ((jeSuisA && r.winner === 0) || (!jeSuisA && r.winner === 1)) w++;
			}
		}
		return w / p;
	}

	/* ---- voisin : échange 1-2 copies contre des ajouts légaux ---- */
	function voisin(rec, rngPool) {
		const r = structuredClone(rec);
		const ids = Object.keys(r);
		const nRetraits = 1 + Math.floor(Math.random() * 2);
		for (let i = 0; i < nRetraits; i++) {
			const id = ids[Math.floor(Math.random() * ids.length)];
			if (!r[id]) continue;
			r[id]--;
			if (r[id] === 0) delete r[id];
		}
		// compléter à 30 avec des cartes du pool autorisé
		let garde = 0;
		while (Object.values(r).reduce((a, b) => a + b, 0) < 30 && garde++ < 200) {
			const c = rngPool[Math.floor(Math.random() * rngPool.length)];
			const k = r[c.id] ?? 0;
			if (k >= MAX_COPIES[c.rarity]) continue;
			const facs = new Set([...Object.keys(r).map((id) => carte(id).faction), c.faction]);
			if (facs.size > 2) continue;
			r[c.id] = k + 1;
		}
		return legal(r) ? r : null;
	}

	/* ---- graines : recommandés + hypothèses dégénérées ---- */
	const SEEDS = [
		...DECKS.map((d) => ({ nom: `reco:${d.id}`, cards: d.cards })),
		{
			nom: 'hypo:trait-evasion', // percer les murs en boucle
			cards: {
				'trait-de-soleil': 2, 'couronne-dos': 2, velor: 3, velsa: 3, velna: 1, rompre: 1,
				'bord-du-monde': 2, 'bruler-le-jour': 3, 'sela-premiere-au-vent': 3,
				morna: 3, thanor: 3, 'clameur-dexen': 2, 'avel-rieur-des-retours': 2
			}
		},
		{
			nom: 'hypo:swap-murs', // retourner des murs 2/7 en attaquants 7/2
			cards: {
				'nouvelle-peau': 3, 'preter-une-forme': 3, 'sorel-mille-postures': 2, moras: 1,
				talvas: 2, doras: 3, dorvel: 2, korven: 3, renna: 3, dasen: 2,
				'nemi-deuxieme-allure': 3, moren: 2, koren: 1
			}
		},
		{
			nom: 'hypo:korven-lock', // neutralisation en chaîne
			cards: {
				korven: 3, doran: 1, 'vasis-assemble': 1, 'sentence-dor': 2, 'premiere-chaine': 2,
				doras: 3, talvas: 2, renna: 3, norel: 3, dasen: 2, koren: 1,
				'chant-daube': 3, recitation: 2, dorvel: 2
			}
		},
		{
			nom: 'hypo:recursion', // Interstice + Eshna : rejouer les mêmes verbes
			cards: {
				eshna: 3, eskor: 2, interstice: 2, eshel: 1, eshin: 3, 'brume-memorielle': 2,
				'dernier-mot': 2, rompre: 2, exva: 2, exna: 3, morna: 3, thanor: 3,
				'orel-veilleur-des-restes': 2
			}
		}
	];

	console.log(`gauntlet: ${gauntlet.map((g) => g.id).join(', ')}`);
	console.log(`${ITERS} itérations/graine · éval ${G_RAPIDE} parties · confirmation ${G_CONFIRME}\n`);

	const resultats = [];
	for (const seed of SEEDS) {
		if (!legal(seed.cards)) {
			console.log(`⚠ graine illégale ignorée : ${seed.nom}`);
			continue;
		}
		// pool de mutation : cartes des (max 2) peuples de la graine, sinon tous les duos possibles
		const facsSeed = [...new Set(Object.keys(seed.cards).map((id) => carte(id).faction))];
		const pool = C.cards.filter((c) => facsSeed.includes(c.faction));

		let courant = structuredClone(seed.cards);
		let scoreCourant = evaluer(courant, G_CONFIRME);
		const depart = scoreCourant;
		for (let i = 0; i < ITERS; i++) {
			const cand = voisin(courant, pool);
			if (!cand) continue;
			const rapide = evaluer(cand, G_RAPIDE);
			if (rapide <= scoreCourant) continue;
			const confirme = evaluer(cand, G_CONFIRME);
			if (confirme > scoreCourant) {
				courant = cand;
				scoreCourant = confirme;
			}
		}
		resultats.push({ nom: seed.nom, depart, final: scoreCourant, deck: courant });
		console.log(
			`  ${seed.nom.padEnd(26)} ${(depart * 100).toFixed(1)}% → ${(scoreCourant * 100).toFixed(1)}%`
		);
	}

	/* ---- rapport ---- */
	resultats.sort((a, b) => b.final - a.final);
	console.log('\n=== PLAFOND DES DECKS PERSONNALISÉS ===');
	for (const r of resultats.slice(0, 5)) {
		console.log(`\n${r.nom} — ${(r.final * 100).toFixed(1)}% vs gauntlet :`);
		const tri = Object.entries(r.deck).sort((a, b) => carte(a[0]).cost - carte(b[0]).cost);
		console.log('  ' + tri.map(([id, k]) => `${id}×${k}`).join(', '));
	}

	// cartes sur-représentées dans les 5 meilleurs builds
	const compte = {};
	for (const r of resultats.slice(0, 5))
		for (const [id, k] of Object.entries(r.deck)) compte[id] = (compte[id] ?? 0) + k;
	console.log('\n=== CARTES LES PLUS PRÉSENTES (top 5 builds) ===');
	for (const [id, k] of Object.entries(compte).sort((a, b) => b[1] - a[1]).slice(0, 15))
		console.log(`  ${String(k).padStart(2)}  ${id}`);
} finally {
	await serveur.close();
}
