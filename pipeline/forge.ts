/**
 * La Forge : artwork → carte vivante.
 *
 *   npm run forge -- --local ./drop --faction epoques --rarity common --kind epoque
 *   npm run forge -- --mj "un rōnin sous la lune, zone aveugle" --faction epoques --rarity rare
 *
 * Sources d'images (agnostique par design, cf. design doc) :
 *   --local <dossier>   ingère les images (Midjourney manuel, ou autre) d'un dossier
 *   --mj "<concept>"    génère via Midjourney (relais Apiframe — APIFRAME_API_KEY requis)
 *
 * Chaque image : optimisation WebP → static/art/ → extraction palette →
 * enrichissement Claude (stats/lore, ANTHROPIC_API_KEY sinon stub) → cards/*.json.
 * Curation : supprimer les JSON ratés. C'est tout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { loadEnv } from './env.ts';
import { extractPalette } from './palette.ts';
import { enrich } from './enrich.ts';
import { imagine, download } from './providers/midjourney.ts';
import type { Charter, FactionId, Rarity } from '../src/lib/types.ts';

loadEnv();

const ROOT = process.cwd();
const ART_DIR = path.join(ROOT, 'static', 'art');
const CARDS_DIR = path.join(ROOT, 'cards');
const charter: Charter = JSON.parse(fs.readFileSync(path.join(ROOT, 'charter.json'), 'utf8'));

const { values: args } = parseArgs({
	options: {
		local: { type: 'string' },
		mj: { type: 'string' },
		faction: { type: 'string', default: 'epoques' },
		rarity: { type: 'string', default: 'common' },
		kind: { type: 'string', default: 'traveler' },
		name: { type: 'string' },
		hint: { type: 'string' },
		count: { type: 'string', default: '1' }
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

/** Construit le prompt Midjourney depuis la charte (monochrome + un accent). */
function buildMjPrompt(concept: string): string {
	const accent = charter.factions[faction].color;
	return (
		`${concept}, ${charter.artDirection.basePrompt}, single accent color ${accent} ` +
		`--ar 4:5 --no ${charter.artDirection.negativePrompt.split(', ').slice(0, 6).join(', ')}`
	);
}

async function processImage(input: Buffer | string, baseName: string): Promise<void> {
	const slug = uniqueSlug(slugify(args.name ?? baseName));
	const artPath = path.join(ART_DIR, `${slug}.webp`);

	// Optimisation : WebP ≤ 1200px de large (cf. DESIGN.md, ~100-200 Ko)
	await sharp(input).resize(1200, 1500, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 82 })
		.toFile(artPath);

	const palette = await extractPalette(artPath);
	const seed = Math.floor(Math.random() * 1_000_000);
	console.log(`  ↳ ${slug} : palette ${palette.join(' ')} · seed ${seed}`);

	const card = await enrich({
		slug,
		artPath,
		artUrl: `/art/${slug}.webp`,
		palette,
		faction,
		rarity,
		kind,
		hint: args.hint ?? args.mj,
		seed
	});

	fs.writeFileSync(path.join(CARDS_DIR, `${slug}.json`), JSON.stringify(card, null, '\t') + '\n');
	console.log(`✓ carte forgée : cards/${slug}.json — « ${card.name} »`);
}

async function main(): Promise<void> {
	fs.mkdirSync(ART_DIR, { recursive: true });
	fs.mkdirSync(CARDS_DIR, { recursive: true });

	if (args.local) {
		const dir = path.resolve(args.local);
		if (!fs.existsSync(dir)) fail(`Dossier introuvable : ${dir}`);
		const files = fs
			.readdirSync(dir)
			.filter((f) => /\.(png|jpe?g|webp|svg)$/i.test(f))
			.map((f) => path.join(dir, f));
		if (files.length === 0) fail(`Aucune image (.png/.jpg/.webp/.svg) dans ${dir}`);
		console.log(`Forge locale : ${files.length} image(s) — ${faction}/${rarity}/${kind}`);
		for (const file of files) {
			await processImage(file, path.basename(file, path.extname(file)));
		}
	} else if (args.mj) {
		const count = Math.max(1, Math.min(4, Number(args.count)));
		const prompt = buildMjPrompt(args.mj);
		console.log(`Forge Midjourney : « ${prompt} »`);
		const urls = await imagine(prompt);
		console.log(`  ↳ ${urls.length} image(s) reçue(s), on garde ${Math.min(count, urls.length)}`);
		for (const url of urls.slice(0, count)) {
			await processImage(await download(url), args.name ?? args.mj.split(',')[0]);
		}
	} else {
		fail('Utilisation : npm run forge -- --local <dossier> | --mj "<concept>" [--faction --rarity --kind --name --hint --count]');
	}
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
