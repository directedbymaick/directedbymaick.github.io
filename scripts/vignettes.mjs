/**
 * Régénère static/art/w640/ — le miroir 640 px des illustrations.
 *
 * Les grilles (Registre, galerie du profil) affichent les cartes autour de
 * 285 px : décoder le fichier 1200×1500 d'origine y coûte 7 Mo de bitmap par
 * vignette pour rien. Card.svelte bascule sur ce miroir via son prop `thumb`.
 *
 * À relancer après tout ajout ou remplacement d'artwork :  node scripts/vignettes.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'static/art';
const OUT = 'static/art/w640';
const LARGEUR = 640;

/** Liste les .webp de static/art, en sautant le miroir lui-même. */
function lister(dir, rel = '') {
	const out = [];
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		if (e.name === 'w640') continue;
		const p = path.join(dir, e.name);
		if (e.isDirectory()) out.push(...lister(p, path.join(rel, e.name)));
		else if (e.name.endsWith('.webp')) out.push({ src: p, rel: path.join(rel, e.name) });
	}
	return out;
}

const fichiers = lister(SRC);
let avant = 0;
let apres = 0;

for (const f of fichiers) {
	const dest = path.join(OUT, f.rel);
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	// withoutEnlargement : un artwork déjà petit reste tel quel, jamais upscalé
	await sharp(f.src)
		.resize({ width: LARGEUR, withoutEnlargement: true })
		.webp({ quality: 82 })
		.toFile(dest);
	avant += fs.statSync(f.src).size;
	apres += fs.statSync(dest).size;
}

const Mo = (n) => `${(n / 1048576).toFixed(1)} Mo`;
console.log(`${fichiers.length} vignettes — ${Mo(avant)} → ${Mo(apres)}`);
