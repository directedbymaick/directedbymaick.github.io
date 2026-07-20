/**
 * Dérive la matière visuelle d'une carte depuis son gène (palette + preset + seed).
 * Tout est déterministe : même gène → même foil, partout, à chaque rendu.
 * Les masques de bruit sont générés en SVG (feTurbulence) — aucun asset emprunté.
 */

import type { CardData, FoilPreset } from '$lib/types';

/** PRNG déterministe (mulberry32) — le seed de la carte pilote toutes les variations. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Masque de bruit procédural : SVG feTurbulence encodé en data-URI. */
export function noiseMaskUri(
	seed: number,
	baseFrequency: number,
	octaves = 2,
	table = '0 0 0 .4 .7 1'
): string {
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">` +
		`<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" ` +
		`numOctaves="${octaves}" seed="${seed % 1000}" stitchTiles="stitch"/>` +
		`<feColorMatrix type="saturate" values="0"/>` +
		`<feComponentTransfer><feFuncA type="discrete" tableValues="${table}"/></feComponentTransfer>` +
		`</filter><rect width="256" height="256" filter="url(%23n)"/></svg>`;
	return `url("data:image/svg+xml,${svg.replaceAll('"', "'").replaceAll('#', '%23').replaceAll('<', '%3C').replaceAll('>', '%3E')}")`;
}

/** Paillettes : points BLANCS épars — l'équivalent procédural du glitter.png
 *  de packs.com. Une IMAGE (pas un masque) : posée en fond, INCRUSTÉE dans la
 *  carte (position fixe), elle s'allume par l'opacité et les blend modes. */
export function glitterUri(seed: number, baseFrequency: number): string {
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192">` +
		`<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" ` +
		`numOctaves="2" seed="${seed % 1000}" stitchTiles="stitch"/>` +
		`<feColorMatrix type="saturate" values="0"/>` +
		`<feComponentTransfer>` +
		`<feFuncR type="linear" slope="0" intercept="1"/>` +
		`<feFuncG type="linear" slope="0" intercept="1"/>` +
		`<feFuncB type="linear" slope="0" intercept="1"/>` +
		`<feFuncA type="discrete" tableValues="0 0 0 0 0 0 0 .9 1"/>` +
		`</feComponentTransfer>` +
		`</filter><rect width="192" height="192" filter="url(%23g)"/></svg>`;
	return `url("data:image/svg+xml,${svg.replaceAll('"', "'").replaceAll('#', '%23').replaceAll('<', '%3C').replaceAll('>', '%3E')}")`;
}

export interface FoilParams {
	/** Variables CSS injectées sur l'élément racine de la carte. */
	vars: Record<string, string>;
	preset: FoilPreset;
}

/**
 * Résout les paramètres de foil d'une carte. La palette de l'artwork teinte les
 * gradients — deux cartes de même rareté n'ont jamais exactement le même holo.
 */
export function resolveFoil(card: CardData, frameColor: string): FoilParams {
	const rand = mulberry32(card.gene.seed);
	const [c0 = '#888', c1 = '#556', c2 = '#aa8'] = card.gene.palette;

	const bandAngle = Math.round(95 + rand() * 40 - 20); // bandes holo ± 20° autour de 95°
	const hueShift = Math.round(rand() * 360); // point de départ de la roue prismatique
	const grainFreq = 0.6 + rand() * 0.5; // grain du foil
	const galaxyFreq = 0.012 + rand() * 0.01; // nappes de la galaxie
	const sparkleFreq = 0.9 + rand() * 0.4; // densité des paillettes

	const vars: Record<string, string> = {
		'--c0': c0,
		'--c1': c1,
		'--c2': c2,
		'--frame': frameColor,
		'--accent': card.gene.accent ?? frameColor,
		'--band-angle': `${bandAngle}deg`,
		'--hue-shift': `${hueShift}deg`,
		'--grain': noiseMaskUri(card.gene.seed, grainFreq, 2),
		'--galaxy': noiseMaskUri(card.gene.seed + 7, galaxyFreq, 3),
		'--sparkle': noiseMaskUri(card.gene.seed + 13, sparkleFreq, 1),
		/* Le glitter et le grain viennent des textures de simeydotme (globales,
		   /img/) : on ne les surcharge PAS ici. On ne pose que la graine de
		   position du cosmos, pour que chaque carte ait son ciel. */
		'--cosmosbg': `${Math.round(rand() * 300 - 150)}px ${Math.round(rand() * 300 - 150)}px`,
		'--seedx': `${Math.round(rand() * 100)}%`,
		'--seedy': `${Math.round(rand() * 100)}%`
	};

	return { vars, preset: card.gene.foilPreset };
}

/** Sérialise les variables CSS en attribut style. */
export function styleString(vars: Record<string, string>): string {
	return Object.entries(vars)
		.map(([k, v]) => `${k}: ${v}`)
		.join('; ');
}
