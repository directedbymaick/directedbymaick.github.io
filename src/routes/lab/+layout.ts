import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

/**
 * Le Lab (et /lab/decors) est un outil d'auteur : disponible en local, absent
 * du site publié.
 *
 * Deux verrous, parce qu'aucun ne suffit seul :
 *  - `prerender = false` empêche le build statique d'émettre la page. Sans lui,
 *    la racine déclare `prerender = true` et /lab serait écrit dans build/.
 *  - le garde ci-dessous couvre la navigation côté client : le routeur reste
 *    embarqué dans le bundle, on pourrait donc atteindre /lab en tapant l'URL
 *    (le fallback 404.html rend la main au routeur).
 */
export const prerender = false;

export function load() {
	if (!dev) error(404, 'Not found');
}
