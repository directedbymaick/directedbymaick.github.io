import sharp from 'sharp';

/** Renormalise une source en portrait 1200×1500 WebP (crop attention). */
async function normalize(input: string, out: string) {
	await sharp(input)
		.resize(1200, 1500, { fit: 'cover', position: sharp.strategy.attention })
		.webp({ quality: 82 })
		.toFile(out);
	console.log(`${out} ←`, input);
}

const jobs: [string, string][] = [
	['Expelled/tests/set 01 midjourney raw illustration/moras.png', 'static/art/moras.webp'],
	['Expelled/tests/set 01 midjourney raw illustration/Morna (2).png', 'static/art/morna.webp']
];
for (const [i, o] of jobs) await normalize(i, o);
console.log('OK');
