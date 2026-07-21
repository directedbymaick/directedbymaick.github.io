import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// fallback : les URLs non prerendues (404) retombent sur le routeur client
			fallback: '404.html',
			// `strict` fait échouer le build dès qu'une route n'est pas prérendue.
			// C'est exactement le cas de /lab, volontairement exclu du site publié
			// (cf. src/routes/lab/+layout.ts) : on assume donc l'absence.
			strict: false
		})
	}
};

export default config;
