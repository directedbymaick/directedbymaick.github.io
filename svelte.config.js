import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// fallback : les URLs non prerendues (404) retombent sur le routeur client
			fallback: '404.html'
		})
	}
};

export default config;
