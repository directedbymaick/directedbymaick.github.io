/**
 * Extraction de palette : le gène chromatique de la carte.
 * Quantifie l'image en buckets RGB et en tire [dominante, sombre, claire] —
 * la sémantique attendue par les presets de foil (c0/c1/c2).
 */
import sharp from 'sharp';

interface Bucket {
	r: number;
	g: number;
	b: number;
	count: number;
}

function hex(r: number, g: number, b: number): string {
	const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
	return `#${h(r)}${h(g)}${h(b)}`;
}

function luma(b: Bucket): number {
	return 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
}

function saturation(b: Bucket): number {
	const max = Math.max(b.r, b.g, b.b);
	const min = Math.min(b.r, b.g, b.b);
	return max === 0 ? 0 : (max - min) / max;
}

export async function extractPalette(imagePath: string): Promise<string[]> {
	const { data, info } = await sharp(imagePath)
		.resize(64, 64, { fit: 'inside' })
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	// Quantification 4 bits par canal → 4096 buckets max.
	const buckets = new Map<number, Bucket>();
	for (let i = 0; i < data.length; i += info.channels) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
		const bucket = buckets.get(key);
		if (bucket) {
			bucket.r += (r - bucket.r) / (bucket.count + 1);
			bucket.g += (g - bucket.g) / (bucket.count + 1);
			bucket.b += (b - bucket.b) / (bucket.count + 1);
			bucket.count++;
		} else {
			buckets.set(key, { r, g, b, count: 1 });
		}
	}

	const all = [...buckets.values()].sort((a, b) => b.count - a.count);

	// Dominante : le bucket le plus présent avec un minimum de saturation,
	// sinon le plus présent tout court.
	const dominant = all.find((b) => saturation(b) > 0.25 && luma(b) > 30) ?? all[0];
	// Sombre : le plus présent des buckets foncés.
	const dark = all.find((b) => luma(b) < 60) ?? all[all.length - 1];
	// Claire : le plus présent des buckets lumineux.
	const light = all.find((b) => luma(b) > 170) ?? dominant;

	// Trois couleurs DISTINCTES garanties : sur une image trop uniforme, les
	// fallbacks convergent — on dérive alors sombre/claire de la dominante.
	// (Des doublons casseraient aussi les each keyés côté rendu.)
	const scale = (b: Bucket, f: number): Bucket => ({
		r: Math.min(255, b.r * f),
		g: Math.min(255, b.g * f),
		b: Math.min(255, b.b * f),
		count: 0
	});
	const picks = [dominant, dark, light];
	const seen = new Set<string>();
	const result = picks.map((b, i) => {
		let candidate = b;
		let f = i === 1 ? 0.45 : 1.9; // sombre → assombrir, claire → éclaircir
		while (seen.has(hex(candidate.r, candidate.g, candidate.b))) {
			candidate = scale(candidate, f);
			// image quasi noire : l'éclaircissement d'un ~0 ne bouge pas — force un gris
			if (hex(candidate.r, candidate.g, candidate.b) === hex(b.r, b.g, b.b)) {
				candidate = { r: 40 + i * 70, g: 40 + i * 70, b: 44 + i * 70, count: 0 };
			}
			b = candidate;
		}
		seen.add(hex(candidate.r, candidate.g, candidate.b));
		return candidate;
	});

	return result.map((b) => hex(b.r, b.g, b.b));
}
