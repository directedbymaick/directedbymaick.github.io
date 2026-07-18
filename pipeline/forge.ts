/**
 * La Forge : tes images → cartes vivantes. 100% local, zéro API.
 *
 *   npm run forge -- --local ./drop --faction rikken --rarity epic --kind traveler
 *
 * Workflow : tu génères tes artworks (Midjourney, à la main), tu les déposes
 * dans un dossier, la Forge fait le mécanique — WebP optimisé → static/art/,
 * extraction de palette (le gène du holo), gabarit cards/*.json avec stats
 * de départ au budget de la charte. Les champs créatifs (nom, effets, lore)
 * se remplissent ensuite en session avec Claude, ou à la main.
 * Curation : supprimer les JSON ratés. C'est tout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { extractPalette } from './palette.ts';
import { assemble } from './enrich.ts';
import type { Charter, FactionId, Rarity } from '../src/lib/types.ts';

const ROOT = process.cwd();
const ART_DIR = path.join(ROOT, 'static', 'art');
const CARDS_DIR = path.join(ROOT, 'cards');
const charter: Charter = JSON.parse(fs.readFileSync(path.join(ROOT, 'charter.json'), 'utf8'));

const { values: args } = parseArgs({
	options: {
		local: { type: 'string', default: './drop' },
		faction: { type: 'string', default: 'vasar' },
		rarity: { type: 'string', default: 'common' },
		kind: { type: 'string', default: 'etre' },
		name: { type: 'string' },
		/** Régénération : si la carte existe, remplace SEULEMENT l'artwork
		 *  (art, palette, seed) — stats et textes intacts. */
		replace: { type: 'boolean', default: false }
	}
});

function fail(msg: string): never {
	console.error(`✗ ${msg}`);
	process.exit(1);
}

const faction = args.faction as FactionId;
const rarity = args.rarity as Rarity;
const kind = args.kind as 'etre' | 'verbe' | 'relique' | 'lieu';
if (!charter.factions[faction]) fail(`Faction inconnue : ${faction} (${Object.keys(charter.factions).join(', ')})`);
if (!charter.rarities[rarity]) fail(`Rareté inconnue : ${rarity} (${Object.keys(charter.rarities).join(', ')})`);
if (!['etre', 'verbe', 'relique', 'lieu'].includes(kind)) fail(`Kind inconnu : ${kind}`);

function slugify(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 48);
}

function uniqueSlug(base: string): string {
	let slug = base || 'carte';
	let i = 2;
	while (fs.existsSync(path.join(CARDS_DIR, `${slug}.json`))) slug = `${base}-${i++}`;
	return slug;
}

/**
 * Règle absolue : les illustrations sont TOUJOURS en portrait 4:5.
 * Toute image entrante est normalisée en 1200×1500 WebP — une source paysage
 * est recadrée (crop 'attention' : sharp centre sur la zone d'intérêt).
 */
async function normalizePortrait(input: string, outPath: string): Promise<void> {
	const meta = await sharp(input).metadata();
	if ((meta.width ?? 0) > (meta.height ?? 0)) {
		console.warn(
			`  ⚠ ${path.basename(input)} est en paysage (${meta.width}×${meta.height}) — recadrée en portrait 4:5.`
		);
	}
	await sharp(input)
		.resize(1200, 1500, { fit: 'cover', position: sharp.strategy.attention })
		.webp({ quality: 82 })
		.toFile(outPath);
}

async function processImage(file: string): Promise<void> {
	const baseSlug = slugify(args.name ?? path.basename(file, path.extname(file)));
	const existingPath = path.join(CARDS_DIR, `${baseSlug}.json`);

	// Mode --replace : nouvel artwork pour une carte existante, tout le reste intact.
	if (args.replace && fs.existsSync(existingPath)) {
		const artPath = path.join(ART_DIR, `${baseSlug}.webp`);
		await normalizePortrait(file, artPath);
		const palette = await extractPalette(artPath);
		const card = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
		card.art = `/art/${baseSlug}.webp`;
		card.gene.palette = palette;
		card.gene.seed = Math.floor(Math.random() * 1_000_000);
		fs.writeFileSync(existingPath, JSON.stringify(card, null, '\t') + '\n');
		console.log(`↻ ${baseSlug} · artwork remplacé · palette ${palette.join(' ')} (stats/textes conservés)`);
		return;
	}

	const slug = uniqueSlug(baseSlug);
	const artPath = path.join(ART_DIR, `${slug}.webp`);
	await normalizePortrait(file, artPath);

	const palette = await extractPalette(artPath);
	const seed = Math.floor(Math.random() * 1_000_000);

	const card = assemble({
		slug,
		artUrl: `/art/${slug}.webp`,
		palette,
		faction,
		rarity,
		kind,
		seed
	});

	fs.writeFileSync(path.join(CARDS_DIR, `${slug}.json`), JSON.stringify(card, null, '\t') + '\n');
	console.log(`✓ ${slug} · palette ${palette.join(' ')} · seed ${seed} → cards/${slug}.json`);
}

async function main(): Promise<void> {
	fs.mkdirSync(ART_DIR, { recursive: true });
	fs.mkdirSync(CARDS_DIR, { recursive: true });

	const dir = path.resolve(args.local);
	if (!fs.existsSync(dir)) fail(`Dossier introuvable : ${dir} — dépose tes images dedans.`);
	const files = fs
		.readdirSync(dir)
		.filter((f) => /\.(png|jpe?g|webp|svg)$/i.test(f))
		.map((f) => path.join(dir, f));
	if (files.length === 0) fail(`Aucune image (.png/.jpg/.webp/.svg) dans ${dir}`);

	console.log(`Forge : ${files.length} image(s) — ${faction}/${rarity}/${kind}`);
	for (const file of files) await processImage(file);
	console.log(`\nProchaine étape : remplir nom/effets/lore dans les JSON (en session avec Claude, ou à la main), puis supprimer les images traitées de ${path.relative(ROOT, dir)}/.`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
