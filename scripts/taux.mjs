/**
 * Mesure les taux réels du booster.
 *
 * Le modèle analytique qui vivait dans paliers.ts calculait
 * P(rareté) × P(carte) × P(version) à partir de SLOT_ODDS. Il ignorait deux
 * mécanismes bien présents dans openPack : les god packs (0,8 % des boosters,
 * cinq cartes toutes foil, distribution de versions entièrement différente) et
 * les deux pity. Résultat : quinze paliers sur trente-trois étaient faux, tous
 * Full Art, tous plus généreux qu'annoncé — jusqu'à un facteur 18 sur les
 * Prismatiques.
 *
 * On ne modélise donc plus : on ouvre des boosters et on compte. Le tirage
 * reste la seule source de vérité, y compris quand on lui ajoutera des
 * mécanismes auxquels personne n'a encore pensé.
 *
 *   node scripts/taux.mjs [boosters]
 *   node scripts/taux.mjs --si-obsolete     ne remesure que si les entrées ont bougé
 *
 * Le second mode est branché sur `prebuild` : ajouter une carte, valider une
 * variante ou toucher au moteur de tirage suffit à invalider la mesure, et le
 * site ne peut plus partir avec des probabilités périmées.
 */
import { createServer } from 'vite';
import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const SI_OBSOLETE = args.includes('--si-obsolete');
const BOOSTERS = Number(args.find((a) => /^\d+$/.test(a)) ?? 3_000_000);
const SORTIE = 'src/lib/taux-mesures.json';

/**
 * Empreinte de tout ce qui peut changer un taux : les fiches de cartes et les
 * trois modules qui décident des versions et du tirage. Elle est rangée dans le
 * fichier produit ; si elle ne correspond plus, la mesure est périmée.
 */
function empreinte() {
	const h = createHash('sha256');
	for (const f of readdirSync('cards').filter((f) => f.endsWith('.json')).sort()) {
		h.update(f);
		h.update(readFileSync(`cards/${f}`));
	}
	for (const f of ['src/lib/gacha.ts', 'src/lib/variants.ts', 'src/lib/cards.ts']) {
		h.update(readFileSync(f));
	}
	h.update(String(BOOSTERS));
	return h.digest('hex').slice(0, 16);
}

const attendue = empreinte();

if (SI_OBSOLETE) {
	try {
		const actuel = JSON.parse(readFileSync(SORTIE, 'utf8'));
		if (actuel.empreinte === attendue) {
			console.log(`${SORTIE} : à jour (empreinte ${attendue}), rien à remesurer`);
			process.exit(0);
		}
		console.log(`${SORTIE} : périmé (${actuel.empreinte ?? 'aucune empreinte'} → ${attendue}), remesure`);
	} catch {
		console.log(`${SORTIE} : absent ou illisible, mesure initiale`);
	}
}

/* Le fichier produit est commité : il doit être reproductible à l'identique.
   Math.random ne l'est pas, on le remplace par un mulberry32 semé. */
const GRAINE = 0x5eed1e5;
function mulberry32(a) {
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const serveur = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
	const gacha = await serveur.ssrLoadModule('/src/lib/gacha.ts');

	const vrai = Math.random;
	Math.random = mulberry32(GRAINE);

	const versions = new Map();
	// un joueur unique qui ouvre tout à la suite : les pity se comportent comme en jeu
	const pity = { sansPrism: 0, sansFullArt: 0 };
	let cartes = 0;
	const t0 = Date.now();

	/* Statistiques au BOOSTER et non à la carte : c'est ce qu'un joueur ressent, et
	   c'est ce que la page Réquisition annonce en toutes lettres. Les mesurer ici
	   empêche ce paragraphe de se périmer à son tour. */
	const compteur = () => ({ prism: 0, fullArt: 0, dPrism: 0, dFA: 0, pirePrism: 0, pireFA: 0 });
	const avec = compteur();

	function releverBooster(pulls, st) {
		const aPrism = pulls.some((p) => (p.card.sourceRarity ?? p.card.rarity) === 'prism');
		const aFA = pulls.some((p) => p.fullArt);
		if (aPrism) { st.prism++; st.dPrism = 0; }
		else { st.dPrism++; st.pirePrism = Math.max(st.pirePrism, st.dPrism); }
		if (aFA) { st.fullArt++; st.dFA = 0; }
		else { st.dFA++; st.pireFA = Math.max(st.pireFA, st.dFA); }
	}

	for (let i = 0; i < BOOSTERS; i++) {
		const pulls = gacha.openPack(pity);
		releverBooster(pulls, avec);
		for (const pull of pulls) {
			// versEnPull pose card.id = clé de version : c'est notre identifiant
			versions.set(pull.card.id, (versions.get(pull.card.id) ?? 0) + 1);
			cartes++;
		}
		if (i > 0 && i % 500_000 === 0) {
			process.stdout.write(`  ${(i / 1000).toFixed(0)}k boosters…
`);
		}
	}

	/* Deuxième passe SANS garanties : la référence « avant pity » que la page
	   compare au tirage réel. Plus courte, elle n'a qu'à donner l'ordre de grandeur. */
	const REF = Math.min(BOOSTERS, 400_000);
	const sans = compteur();
	for (let i = 0; i < REF; i++) releverBooster(gacha.openPack(undefined), sans);

	Math.random = vrai;

	// tri par fréquence décroissante : le fichier se relit à l'œil
	const trie = Object.fromEntries([...versions.entries()].sort((a, b) => b[1] - a[1]));

	writeFileSync(
		SORTIE,
		JSON.stringify(
			{
				_: 'Généré par scripts/taux.mjs — ne pas éditer à la main.',
				empreinte: attendue,
				boosters: BOOSTERS,
				graine: GRAINE,
				cartes,
				/* part de boosters contenant au moins un exemplaire, et pire disette
				   observée — avec les garanties, puis sans, pour la comparaison */
				boostersAvec: {
					prism: avec.prism / BOOSTERS,
					fullArt: avec.fullArt / BOOSTERS,
					pireDisettePrism: avec.pirePrism,
					pireDisetteFullArt: avec.pireFA
				},
				boostersSansGarantie: {
					reference: REF,
					prism: sans.prism / REF,
					fullArt: sans.fullArt / REF,
					pireDisettePrism: sans.pirePrism,
					pireDisetteFullArt: sans.pireFA
				},
				versions: trie
			},
			null,
			'\t'
		) + '\n'
	);

	const s = ((Date.now() - t0) / 1000).toFixed(1);
	console.log(
		`${SORTIE} : ${versions.size} versions vues sur ${BOOSTERS.toLocaleString('fr-FR')} boosters ` +
			`(${cartes.toLocaleString('fr-FR')} cartes, ${(cartes / BOOSTERS).toFixed(4)} par booster) en ${s} s`
	);
} finally {
	await serveur.close();
}
