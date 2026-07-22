/**
 * Calibrage de l'échelle des raretés.
 *
 * Règle les molettes de `tirage.config.ts` puis mesure l'échelle complète, au
 * lieu de deviner. Le produit de quatre probabilités indépendantes ne se lit
 * pas dans la tête : c'est exactement comme ça qu'un sommet à 1 booster sur
 * 15 100 est passé inaperçu.
 *
 *   node scripts/calibrer.mjs            mesure l'échelle actuelle
 *   node scripts/calibrer.mjs --essais   compare plusieurs jeux de molettes
 *
 * La bande visée est BANDE ci-dessous : rien de plus rare que son plafond.
 */
import { createServer } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';

const CONFIG = 'src/lib/tirage.config.ts';
const BOOSTERS = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 250_000);
const ESSAIS = process.argv.includes('--essais');

/** La bande des standards, en « 1 booster sur N ». */
const BANDE = { plancher: 70, plafond: 500 };

/** Jeux de molettes à comparer. */
const CANDIDATS = [
	{ nom: 'actuel', FOIL_RATE: 0.3, FULLART_RATE: 0.12, POIDS_SP: 0.7, ALT_RATE: 0.08, ALT_FULLART_PART: 0.25 },
	{ nom: 'A doux', FOIL_RATE: 0.35, FULLART_RATE: 0.15, POIDS_SP: 0.8, ALT_RATE: 0.1, ALT_FULLART_PART: 0.3 },
	{ nom: 'B', FOIL_RATE: 0.3, FULLART_RATE: 0.14, POIDS_SP: 0.75, ALT_RATE: 0.12, ALT_FULLART_PART: 0.28 },
	{ nom: 'C ferme', FOIL_RATE: 0.28, FULLART_RATE: 0.11, POIDS_SP: 0.65, ALT_RATE: 0.07, ALT_FULLART_PART: 0.22 }
];

function ecrireMolettes(m) {
	let s = readFileSync(CONFIG, 'utf8');
	for (const [cle, val] of Object.entries(m)) {
		if (cle === 'nom') continue;
		const re = new RegExp(`(export const ${cle} = )[0-9.]+;`);
		if (!re.test(s)) throw new Error(`molette introuvable : ${cle}`);
		s = s.replace(re, `$1${val};`);
	}
	writeFileSync(CONFIG, s, 'utf8');
}

async function mesurer() {
	const serveur = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
	try {
		const g = await serveur.ssrLoadModule('/src/lib/gacha.ts');
		const C = await serveur.ssrLoadModule('/src/lib/cards.ts');
		const V = await serveur.ssrLoadModule('/src/lib/variants.ts');

		const compte = new Map();
		const pity = { sansPrism: 0, sansFullArt: 0 };
		for (let i = 0; i < BOOSTERS; i++) {
			for (const p of g.openPack(pity)) {
				compte.set(p.card.id, (compte.get(p.card.id) ?? 0) + 1);
			}
		}

		// agrégation en paliers, même clé que paliers.ts
		const paliers = new Map();
		for (const c of C.cards) {
			for (const v of V.versionsOf(c, g.FULLART_RATE)) {
				const r = v.view.sourceRarity ?? v.view.rarity;
				const nobg = v.foil === 'showcase' && !!v.view.cutout;
				const alt = !!v.view.alt;
				const cle = `${r}|${v.fullArt ? 'fa' : 'n'}|${v.foil ?? 'raw'}|${nobg ? 'nobg' : ''}|${alt ? 'alt' : ''}`;
				const taux = (compte.get(v.key) ?? 0) / BOOSTERS;
				const d = paliers.get(cle) ?? { cle, taux: 0, membres: 0 };
				d.taux += taux;
				d.membres++;
				paliers.set(cle, d);
			}
		}
		const liste = [...paliers.values()].sort((a, b) => b.taux - a.taux);
		const rares = liste.filter((p) => p.taux > 0 && 1 / p.taux > BANDE.plancher);
		const horsBande = liste.filter((p) => p.taux > 0 && 1 / p.taux > BANDE.plafond);
		const plafond = liste.filter((p) => p.taux > 0).at(-1);
		return { liste, rares, horsBande, plafond };
	} finally {
		await serveur.close();
	}
}

const f = (t) => (t >= 1 ? `${t.toFixed(1)}/booster` : `1 sur ${Math.round(1 / t).toLocaleString('fr-FR')}`);

if (!ESSAIS) {
	const { liste, horsBande, plafond } = await mesurer();
	console.log(`\n${liste.length} paliers sur ${BOOSTERS.toLocaleString('fr-FR')} boosters\n`);
	for (const p of liste) console.log(`  ${f(p.taux).padStart(16)}  ${p.cle}  (${p.membres})`);
	console.log(`\nplafond : ${f(plafond.taux)} — ${plafond.cle}`);
	console.log(`hors bande (> 1/${BANDE.plafond}) : ${horsBande.length}`);
	for (const p of horsBande) console.log(`  ✗ ${f(p.taux).padStart(16)}  ${p.cle}`);
} else {
	const original = readFileSync(CONFIG, 'utf8');
	const resultats = [];
	try {
		for (const c of CANDIDATS) {
			ecrireMolettes(c);
			const { liste, horsBande, plafond } = await mesurer();
			resultats.push({ nom: c.nom, paliers: liste.length, plafond: f(plafond.taux), horsBande: horsBande.length, detail: horsBande.map((p) => `${f(p.taux)} ${p.cle}`) });
			console.log(`${c.nom.padEnd(10)} plafond ${f(plafond.taux).padStart(14)}   hors bande : ${horsBande.length}`);
		}
	} finally {
		writeFileSync(CONFIG, original, 'utf8');
		console.log(`\n${CONFIG} restauré à son état d'origine.`);
	}
	console.log('\n' + JSON.stringify(resultats, null, 1));
}
