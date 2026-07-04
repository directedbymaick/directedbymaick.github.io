/**
 * Provider Midjourney via relais Apiframe (api.apiframe.ai).
 *
 * ⚠️ Midjourney n'a pas d'API officielle : ce relais pilote un compte MJ et
 * viole les CGU Midjourney — risque de bannissement du compte, assumé en
 * connaissance de cause (décision user du 2026-07-04). Le pipeline reste
 * agnostique : si le relais meurt, on bascule de provider sans toucher au reste.
 *
 * Endpoints (docs.apiframe.ai) :
 *   POST /pro/imagine  { prompt, mode? }            → { task_id }
 *   POST /fetch        { task_id }                  → { status, ... image urls }
 * Auth : header `Authorization: <clé afk_...>`.
 */

const BASE_URL = process.env.APIFRAME_BASE_URL ?? 'https://api.apiframe.ai';
const POLL_INTERVAL_MS = 8_000;
const TIMEOUT_MS = 5 * 60_000;

function apiKey(): string {
	const key = process.env.APIFRAME_API_KEY;
	if (!key) {
		throw new Error(
			'APIFRAME_API_KEY manquante. Crée un compte relais (apiframe.ai), mets la clé dans .env — ou utilise --local <dossier> pour ingérer des images Midjourney téléchargées à la main.'
		);
	}
	return key;
}

async function post(pathname: string, body: unknown): Promise<any> {
	const res = await fetch(`${BASE_URL}${pathname}`, {
		method: 'POST',
		headers: { Authorization: apiKey(), 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Apiframe ${pathname} → HTTP ${res.status} ${text.slice(0, 300)}`);
	}
	return res.json();
}

/** Cherche des URLs d'images dans une réponse de fetch, quel que soit son format exact. */
function findImageUrls(result: any): string[] {
	for (const key of ['image_urls', 'images', 'urls']) {
		const v = result?.[key];
		if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v;
	}
	for (const key of ['image_url', 'url']) {
		const v = result?.[key];
		if (typeof v === 'string' && v.startsWith('http')) return [v];
	}
	return [];
}

/**
 * Lance une génération et attend le résultat. Retourne les URLs des images
 * (Midjourney produit une grille de 4 par défaut).
 */
export async function imagine(prompt: string): Promise<string[]> {
	const { task_id } = await post('/pro/imagine', { prompt, mode: 'fast' });
	if (!task_id) throw new Error('Apiframe : pas de task_id dans la réponse imagine.');
	console.log(`  ↳ tâche Midjourney ${task_id} lancée, polling…`);

	const deadline = Date.now() + TIMEOUT_MS;
	while (Date.now() < deadline) {
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
		const result = await post('/fetch', { task_id });
		const status = String(result?.status ?? '').toLowerCase();
		if (['failed', 'error', 'cancelled'].includes(status)) {
			throw new Error(`Tâche Midjourney ${task_id} en échec : ${JSON.stringify(result).slice(0, 300)}`);
		}
		const urls = findImageUrls(result);
		if (urls.length > 0 && ['finished', 'completed', 'done', ''].includes(status)) {
			return urls;
		}
		if (urls.length > 0 && !['pending', 'processing', 'starting', 'staged'].includes(status)) {
			return urls;
		}
	}
	throw new Error(`Tâche Midjourney ${task_id} : timeout après ${TIMEOUT_MS / 1000}s.`);
}

export async function download(url: string): Promise<Buffer> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Téléchargement image → HTTP ${res.status} (${url})`);
	return Buffer.from(await res.arrayBuffer());
}
