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
		faction: { type: 'string', default: 'epoques' },
		rarity: { type: 'string', default: 'common' },
		kind: { type: 'string', default: 'traveler' },
		name: { type: 'string' }
	}
});

function fail(msg: string): never {
	console.error(`✗ ${msg}`);
	process.exit(1);
}

const faction = args.faction as FactionId;
const rarity = args.rarity as Rarity;
const kind = args.kind as 'traveler' | 'epoque' | 'protocole';
if (!charter.factions[faction]) fail(`Faction inconnue : ${faction} (${Object.keys(charter.factions).join(', ')})`);
if (!charter.rarities[rarity]) fail(`Rareté inconnue : ${rarity} (${Object.keys(charter.rarities).join(', ')})`);
if (!['traveler', 'epoque', 'protocole'].includes(kind)) fail(`Kind inconnu : ${kind}`);
if (kind === 'epoque' && faction !== 'epoques') fail('Les unités epoque appartiennent à la faction epoques.');

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

async function processImage(file: string): Promise<void> {
	const slug = uniqueSlug(slugify(args.name ?? path.basename(file, path.extname(file))));
	const artPath = path.join(ART_DIR, `${slug}.webp`);

	// Optimisation : WebP ≤ 1200px de large (cf. DESIGN.md, ~100-200 Ko)
	await sharp(file)
		.resize(1200, 1500, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 82 })
		.toFile(artPath);

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
