/**
 * Convertit les logos de factions fournis (blanc sur fond gris) en PNG
 * blanc-sur-transparent, teintables en CSS via mask-image.
 * Usage : npx tsx pipeline/faction-icons.ts
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'Expelled/tests/set 01 midjourney raw illustration/logo factions';
const OUT = 'static/factions';

const MAP: Record<string, string> = {
	vasar: 'ChatGPT Image 18 juil. 2026, 18_18_03.png', // halo rayonnant serein
	exar: 'ChatGPT Image 18 juil. 2026, 18_19_01.png', // anneau brisé, fragments
	eshar: 'ChatGPT Image 18 juil. 2026, 18_19_56.png', // croissant et orbe
	morar: 'ChatGPT Image 18 juil. 2026, 18_20_45.png', // cercle mi-parti suturé
	velar: 'ChatGPT Image 18 juil. 2026, 18_21_38.png' // soleil à pointes
};

/** lum 0..255 → alpha : seuil doux, seuls les blancs du glyphe passent. */
function alphaOf(v: number): number {
	const lo = 225;
	const hi = 250;
	if (v <= lo) return 0;
	if (v >= hi) return 255;
	return Math.round(((v - lo) / (hi - lo)) * 255);
}

mkdirSync(OUT, { recursive: true });

for (const [faction, file] of Object.entries(MAP)) {
	const img = sharp(join(SRC, file)).greyscale();
	const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
	const rgba = Buffer.alloc(info.width * info.height * 4);
	for (let i = 0; i < info.width * info.height; i++) {
		const a = alphaOf(data[i]);
		rgba[i * 4] = 255;
		rgba[i * 4 + 1] = 255;
		rgba[i * 4 + 2] = 255;
		rgba[i * 4 + 3] = a;
	}
	await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
		.trim({ threshold: 1 })
		.resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
		.png()
		.toFile(join(OUT, `${faction}.png`));
	console.log(`${faction} ← ${file}`);
}
console.log('OK');
