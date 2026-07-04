import { error } from '@sveltejs/kit';
import { cards, getCard } from '$lib/cards';
import type { EntryGenerator, PageLoad } from './$types';

// Prerender de toutes les routes /card/* au build depuis cards/*.json
// (exigence des OG tags de partage en déploiement statique).
export const entries: EntryGenerator = () => cards.map((c) => ({ id: c.id }));

export const load: PageLoad = ({ params }) => {
	const card = getCard(params.id);
	if (!card) error(404, `Carte inconnue : ${params.id}`);
	return { card };
};
