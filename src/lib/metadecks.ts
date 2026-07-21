/**
 * Les decks recommandés du Silence : archétypes construits main, avec guide.
 * 30 cartes, limites de copies respectées (C×3, R×2, É×2, L×1, P×1).
 */
import type { FactionId } from '$lib/types';

export interface MetaCombo {
	cards: string[];
	text: string;
}

export interface MetaDeck {
	id: string;
	name: string;
	faction: FactionId;
	tagline: string;
	style: string;
	/** 1 = facile à piloter, 3 = exigeant */
	difficulty: 1 | 2 | 3;
	cards: Record<string, number>;
	guide: {
		resume: string;
		plan: string[];
		forces: string[];
		faiblesses: string[];
		combos: MetaCombo[];
		garder: string[];
	};
}

export const META_DECKS: MetaDeck[] = [
	{
		id: 'chorale-dor',
		name: "La Chorale d'Or",
		faction: 'vasar',
		tagline: "L'Ordre récite, et chaque voix rend l'autre plus forte.",
		style: 'Midrange · auras et murs',
		difficulty: 1,
		cards: {
			dorin: 3,
			vasna: 3,
			norel: 3,
			renna: 3,
			doras: 3,
			korven: 3,
			dasen: 2,
			talvas: 2,
			koren: 1,
			doran: 1,
			'chant-daube': 3,
			recitation: 3
		},
		guide: {
			resume:
				"Le deck le plus simple et le plus solide pour apprendre : on pose des Êtres bon marché, on les rend collectivement plus gros (Dasen, Koren, Récitation), et on laisse les Serments encaisser pendant que la chorale frappe. Aucune décision piège — juste la bonne courbe et des échanges gagnants.",
			plan: [
				'Tours 1-2 : posez Dorin, Vasna, Renna — occupez le terrain tout de suite.',
				"Tours 3-5 : Doras et Talvas montent la garde (Serment) pendant que Korven neutralise la plus grosse menace d'en face.",
				'Tours 6+ : Koren transforme votre petit monde en armée (+1/+1 global), Doran enchaîne leur meilleur Être, et Récitation rend vos échanges tous gagnants.'
			],
			forces: [
				'Très régulier : presque toutes les mains de départ sont jouables.',
				'Les Serments protègent le Korum — les decks agressifs s’épuisent dessus.',
				'Les auras punissent les éliminations une par une : le tout est plus grand que la somme.'
			],
			faiblesses: [
				'Le Dernier Mot (3 dégâts à tous) fait très mal aux choristes 1/2.',
				'Peu de dégâts directs : si la partie s’enlise face à plus gros, on perd la course.'
			],
			combos: [
				{
					cards: ['dasen', 'koren', 'recitation'],
					text: 'Dasen (+1 ATQ Vasar) puis Koren (+1/+1) puis Récitation (+0/+2) : un Dorin 2/1 devient un 4/6. Empilez les auras avant de Réciter.'
				},
				{
					cards: ['korven', 'doran'],
					text: "Korven neutralise leur gros Être un tour, Doran l'enchaîne définitivement derrière : la menace ne jouera jamais."
				},
				{
					cards: ['renna', 'doras'],
					text: 'La syllabe de Renna sur Doras en fait un Serment 3/4 dès le tour 3 — un mur que les aggros détestent.'
				}
			],
			garder: ['dorin', 'renna', 'norel', 'chant-daube']
		}
	},
	{
		id: 'prix-de-la-chute',
		name: 'Le Prix de la Chute',
		faction: 'exar',
		tagline: 'Chaque mort nourrit la suivante. Même les vôtres. Surtout les vôtres.',
		style: 'Aggro-sacrifice · la mort comme ressource',
		difficulty: 3,
		cards: {
			'renas': 3,
			'morek': 3,
			'exel': 3,
			'exna': 3,
			'thanor': 3,
			'rompre': 3,
			'morna': 2,
			'sentence-retournee': 2,
			'dernier-mot': 2,
			'korsa': 1,
			'exoran': 1,
			'exva': 1,
			'rasen': 1,
			'premiere-armee': 1,
			'exen': 1
		},
		guide: {
			resume:
				"Le deck le plus explosif — et le plus dangereux à piloter. On inonde le plateau de corps pas chers, puis on les brûle comme du combustible : chaque sacrifice pioche, grossit Exna, allume Exel, arme Seconde sentence. La partie doit finir vite ; si elle dure, Rasen efface tout et on repart devant.",
			plan: [
				'Tours 1-2 : Renas et Morek frappent dès que possible — ce deck attaque, toujours.',
				"Tours 3-5 : installez Exen (le Lieu), puis sacrifiez avec l'Écho : chaque mort devient deux cartes et des +1/+1 sur Exna.",
				'Tours 6+ : Exva Prononce (5 dégâts répartis), ou Rasen Prononce et détruit tous les autres Êtres — posez la Première Armée juste après pour régner sur les cendres.'
			],
			forces: [
				'Pression immédiate : l’adversaire réagit dès le tour 1 ou saigne.',
				'Le sacrifice transforme les pires cartes en pioche — le deck ne tombe jamais à court.',
				'Deux fins de partie : la course (Exva) ou la table rase (Rasen).'
			],
			faiblesses: [
				'Se blesse tout seul : un deck de soin (Chant d’aube) peut vous faire manquer d’essence.',
				'Les Serments (Doras, Talvas) bloquent vos petits attaquants.',
				'Exigeant : sacrifier le mauvais corps au mauvais moment perd la partie.'
			],
			combos: [
				{
					cards: ['rompre', 'exel', 'exna', 'exen'],
					text: 'Rompre achève un Être adverse déjà entamé — et si l’échange coûte un allié, Exel gagne +2 ATQ, Exna +1/+1 définitif, Exen pioche. La mort vous rapporte.'
				},
				{
					cards: ['dernier-mot', 'exna', 'exen'],
					text: 'Dernier Mot balaie le terrain adverse pour 5. Vos petits corps meurent aussi : Exna grossit, Exen pioche. Vous sortez du massacre en avance.'
				},
				{
					cards: ['rasen', 'premiere-armee'],
					text: 'Rasen Prononce (tout meurt, lui exilé) puis la Première Armée pose trois Bannis 2/1 sur un plateau vide. Peu de decks s’en relèvent.'
				}
			],
			garder: ['renas', 'morek', 'exna', 'rompre']
		}
	},
	{
		id: 'archives-vivantes',
		name: 'Les Archives Vivantes',
		faction: 'vasar',
		tagline: 'Rien ne se perd. Ni dans la défausse, ni dans l’exil, ni dans le deck.',
		style: 'Contrôle-valeur · Vasar/Eshar',
		difficulty: 2,
		cards: {
			'chant-daube': 3,
			norel: 3,
			doras: 3,
			dorvel: 2,
			thessa: 2,
			talvas: 2,
			thalen: 1,
			koren: 1,
			eshin: 3,
			eshna: 3,
			eskor: 2,
			eshel: 1,
			'brume-memorielle': 2,
			interstice: 1,
			'vasis-assemble': 1
		},
		guide: {
			resume:
				"Le deck du joueur patient : on ne gagne pas la partie, on gagne CHAQUE carte. Les Eshar recyclent tout (défausse, exil, deck), Dorvel et Norel piochent, et pendant que l'adversaire s'essouffle, les murs Vasar tiennent la ligne. À la fin, vous avez simplement plus de tout.",
			plan: [
				'Tours 1-3 : Chant d’aube, Norel, Eshin — cyclez, encaissez, apprenez leur main avec Thalen si possible.',
				"Tours 4-6 : Eshna et Eskor ramènent vos meilleures cartes mortes ; l'Interstice double chaque récupération.",
				"Tours 7+ : Eshel cherche LA carte qu'il faut (souvent le Vasis assemblé — leur camp entier neutralisé), Koren referme la partie."
			],
			forces: [
				'Avantage de cartes écrasant sur la longueur.',
				'Thessa taxe les Prononcer adverses — Exva et Rasen arrivent trop tard.',
				'Presque rien n’est vraiment perdu : même l’exil est une réserve.'
			],
			faiblesses: [
				'Départ lent : les aggros peuvent vous punir avant les Archives.',
				'Demande de connaître sa liste : Eshel ne vaut que si vous savez quoi chercher.'
			],
			combos: [
				{
					cards: ['interstice', 'eshna'],
					text: "L'Interstice double la Mémoire : Eshna ramène DEUX cartes de la défausse. Rejouez le même Chant d'aube toute la partie."
				},
				{
					cards: ['eshel', 'vasis-assemble'],
					text: "Eshel va chercher le Vasis assemblé au moment exact où leur plateau est le plus large — un tour entier d'attaques gratuites."
				},
				{
					cards: ['eskor', 'interstice'],
					text: 'Vos Prononcer partent en exil… et Eskor (doublé par l’Interstice) les en sort. L’« irréversible » ne vous concerne pas.'
				}
			],
			garder: ['chant-daube', 'norel', 'eshin', 'doras']
		}
	},
	{
		id: 'grand-saut',
		name: 'Le Grand Saut',
		faction: 'exar',
		tagline: 'Pourquoi attendre son tour quand on peut sauter tout de suite ?',
		style: 'Tempo-burn · Exar/Velar/Morar',
		difficulty: 2,
		cards: {
			'renas': 2,
			'velsa': 2,
			'morna': 3,
			'thanor': 3,
			'exna': 2,
			'korsa': 2,
			'clameur-dexen': 2,
			'bruler-le-jour': 3,
			'exoran': 2,
			'dernier-mot': 2,
			'couronne-dos': 1,
			'morek': 1,
			'velna': 1,
			'bord-du-monde': 1,
			'rasen': 1,
			'premiere-armee': 1,
			'exen': 1
		},
		guide: {
			resume:
				"La course pure : des corps agressifs, l'Élan pour frapper sans attendre, et Brûler le jour pour finir par-dessus les murs. On ne fait pas d'échanges — on compte les dégâts au Korum et on planifie la mort à l'avance. Neuf dégâts dorment dans vos trois Brûler le jour : le reste du deck n'a qu'à amener l'adversaire à portée.",
			plan: [
				'Tours 1-2 : Renas, Velsa (Élan : elle frappe immédiatement), Tala en forme 3/1.',
				'Tours 3-4 : Morna et Velor maintiennent la pression ; la Couronne d’os transforme n’importe qui en menace.',
				'Tours 5+ : le Bord du monde donne Élan à tout le monde — videz votre main et frappez la même seconde. Finissez aux Brûler le jour.'
			],
			forces: [
				'Le tempo : vos Êtres à Élan attaquent le tour où ils arrivent — un tour d’avance permanent.',
				'Le burn passe par-dessus les Serments : 9 dégâts qui ignorent le plateau.',
				'Velna en fin de course arrive à 7-8 ATQ avec Élan.'
			],
			faiblesses: [
				'Aucun plan B : si la course échoue, le deck n’a pas de fin de partie.',
				'Chant d’aube et les soins effacent vos Brûler le jour.',
				'Les gros Serments (Talvas 2/7) coûtent cher à franchir.'
			],
			combos: [
				{
					cards: ['bord-du-monde', 'velna'],
					text: 'Le Bord du monde donne Élan à tous — Velna gagne +1 ATQ par allié à Élan : posée après, elle attaque immédiatement à 7+.'
				},
				{
					cards: ['couronne-dos', 'morna'],
					text: 'La Couronne (+2/+1) sur Morna en fait une 6/3 dès le tour 4 — sa blessure d’attaque devient un détail.'
				},
				{
					cards: ['clameur-dexen', 'velsa'],
					text: 'Velsa arrive, Clameur (+2 ATQ) : 4 dégâts surprise dès le tour 3, avant toute défense.'
				}
			],
			garder: ['renas', 'velsa', 'morna', 'bruler-le-jour']
		}
	}
];

/** Vérification d'intégrité (utilisée par le Laboratoire et les tests). */
export function metaDeckSize(d: MetaDeck): number {
	return Object.values(d.cards).reduce((a, b) => a + b, 0);
}
