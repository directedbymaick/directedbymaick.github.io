import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Site 100 % statique (GitHub Pages).
			// NB : c'est CETTE config qui fait foi — les options kit passées via Vite
			// rendent svelte.config.js inopérant (d'où l'avertissement au build).
			adapter: adapter({
				// les URLs non prérendues retombent sur le routeur client
				fallback: '404.html',
				// `strict` fait échouer le build dès qu'une route n'est pas prérendue.
				// C'est le cas de /lab, volontairement exclu du site publié
				// (cf. src/routes/lab/+layout.ts) : on assume son absence.
				strict: false
			})
		})
	]
});
