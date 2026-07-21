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
		style: 'Midrange · renforts et murs',
		difficulty: 1,
		cards: {
			'vasna': 1,
			'norel': 3,
			'renna': 3,
			'doras': 3,
			'korven': 3,
			'dasen': 2,
			'talvas': 2,
			'koren': 1,
			'doran': 1,
			'chant-daube': 3,
			'recitation': 3,
			'dorvel': 2,
			'doublement-des-choeurs': 2,
			'vasis-assemble': 1
		},
		guide: {
			resume:
				"Le deck le plus simple pour apprendre : on pose des Êtres bon marché, on les renforce d'un coup quand Dasen et Koren arrivent, et on laisse les Serments encaisser pendant que la chorale frappe. Ces renforts sont ponctuels et non plus permanents : posez vos corps AVANT, sinon le bonus tombe dans le vide.",
			plan: [
				"Tours 1-2 : Vasna, Norel et Renna occupent le terrain — Norel et Chant d'aube vous gardent en cartes.",
				"Tours 3-4 : Doras monte la garde (Serment) pendant que Korven neutralise la plus grosse menace d'en face. Le Doublement des chœurs remplit deux emplacements d'un coup.",
				"Tours 5+ : posez d'abord vos corps, PUIS Dasen et Koren — leur bonus s'applique une fois, à l'arrivée, sur ce qui est déjà là. Doran enchaîne leur meilleur Être, le Vasis assemblé fige tout leur camp pour un tour." 
			],
			forces: [
				'Très régulier : presque toutes les mains de départ sont jouables.',
				'Les Serments protègent le Korum — les decks agressifs s’épuisent dessus.',
				'Les renforts sont définitifs : une fois donnés, tuer Dasen ou Koren ne les reprend pas.'
			],
			faiblesses: [
				'Le Dernier Mot (3 dégâts à tous) fait très mal aux choristes 1/2.',
				'Les renforts étant ponctuels, une main mal ordonnée gâche Koren : joué sur un terrain vide, il ne donne rien.',
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
			garder: ['vasna', 'renna', 'norel', 'chant-daube']
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
			'exel': 2,
			'exna': 3,
			'thanor': 2,
			'rompre': 2,
			'morna': 3,
			'sentence-retournee': 2,
			'dernier-mot': 2,
			'korsa': 1,
			'exoran': 2,
			'exva': 2,
			'rasen': 1,
			'premiere-armee': 2,
			'exen': 1,
			'porte-du-dehors': 1,
			'couronne-dos': 2,
			'clameur-dexen': 2
		},
		guide: {
			resume:
				"La mort comme carburant. Exna grossit à chaque carte alliée détruite, Exel s'allume quand un allié tombe, Exen pioche sur chaque perte — vos échanges vous rapportent au lieu de vous coûter. Rompre et le Dernier Mot forcent ces échanges quand l'adversaire les refuse. En dernier recours, Rasen efface le terrain et la Première Armée le réoccupe.",
			plan: [
				"Tours 2-3 : Exna et Exel entrent tôt — ce sont eux qui encaissent les bénéfices de tout ce qui meurt ensuite.",
				"Tours 3-4 : posez Exen (le Lieu) pour que chaque perte devienne une pioche, puis Morna et Thanor pressent. Rompre achève un Être entamé ; la Couronne d'os transforme n'importe quel corps en menace.",
				"Tours 5+ : le Dernier Mot balaie leur terrain — vos petits corps meurent aussi, et c'est voulu. Exva Prononce, ou Rasen efface tout avant que la Première Armée réoccupe les cendres."
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
			garder: ['exel', 'exna', 'morna', 'rompre']
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
			'doras': 2,
			'dorvel': 2,
			'thessa': 2,
			'talvas': 2,
			'thalen': 2,
			'koren': 1,
			'eshin': 3,
			'eshna': 3,
			'eskor': 2,
			'eshel': 1,
			'brume-memorielle': 2,
			'interstice': 2,
			'vasis-assemble': 1,
			'doublement-des-choeurs': 2,
			'dasen': 2,
			'recitation': 1
		},
		guide: {
			resume:
				"Le deck du joueur patient : on ne gagne pas la partie, on gagne CHAQUE carte. Les Eshar recyclent tout (défausse, exil, deck), Dorvel pioche à chaque fin de tour, la Brume mémorielle creuse, et pendant que l'adversaire s'essouffle les murs Vasar tiennent la ligne. À la fin, vous avez simplement plus de tout.",
			plan: [
				'Tours 2-3 : Eshin et Brume mémorielle creusent votre deck, Doras tient la ligne.',
				"Tours 3-5 : Eshna et Eskor ramènent vos meilleures cartes mortes ; l'Interstice double chaque récupération. Thalen révèle leur main, Thessa taxe leurs Prononcer.",
				"Tours 5+ : Eshel cherche LA carte qu'il faut — souvent le Vasis assemblé, qui fige leur camp entier. Koren referme en renforçant tout ce que vous avez accumulé."
			],
			forces: [
				'Avantage de cartes écrasant : Dorvel pioche chaque tour, Eshna et Eskor recyclent sans fin.',
				'Thessa taxe les Prononcer adverses — Exva et Rasen arrivent trop tard.',
				'Presque rien n’est vraiment perdu : même l’exil est une réserve.'
			],
			faiblesses: [
				'Départ lent et peu de soin : les aggros peuvent vous punir avant que les Archives tournent.',
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
			garder: ['eshin', 'eshna', 'doras', 'brume-memorielle']
		}
	},
	{
		id: 'grand-saut',
		name: 'Le Grand Saut',
		faction: 'exar',
		tagline: 'Pourquoi attendre son tour quand on peut sauter tout de suite ?',
		style: 'Tempo-burn · Exar/Velar',
		difficulty: 2,
		cards: {
			'morna': 1,
			'thanor': 3,
			'exna': 2,
			'korsa': 2,
			'clameur-dexen': 2,
			'bruler-le-jour': 3,
			'exoran': 2,
			'dernier-mot': 2,
			'couronne-dos': 2,
			'morek': 1,
			'velna': 1,
			'bord-du-monde': 1,
			'rasen': 1,
			'premiere-armee': 2,
			'exen': 1,
			'exva': 2,
			'echo-du-dixieme-mot': 1,
			'porte-du-dehors': 1
		},
		guide: {
			resume:
				"La course : des corps agressifs, la Clameur pour passer en force, et Brûler le jour pour finir par-dessus les murs. Neuf dégâts dorment dans vos trois Brûler le jour — le reste du deck n'a qu'à amener l'adversaire à portée. Korsa règle son compte aux Lieux et Reliques qui vous ralentissent, le Dernier Mot dégage la voie quand la défense tient trop.",
			plan: [
				'Tours 2-3 : Morek et Thanor frappent tôt ; la Clameur d’Exen ajoute 2 ATQ pile au bon moment.',
				'Tours 3-4 : Morna presse (4 ATQ), la Couronne d’os transforme n’importe qui en menace, Korsa détruit le Lieu ou la Relique qui vous bloque.',
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
					cards: ['clameur-dexen', 'thanor'],
					text: 'Thanor arrive, Clameur (+2 ATQ) : 5 dégâts surprise avant que la défense se mette en place.'
				}
			],
			garder: ['morna', 'thanor', 'korsa', 'bruler-le-jour']
		}
	}
];

/** Vérification d'intégrité (utilisée par le Laboratoire et les tests). */
export function metaDeckSize(d: MetaDeck): number {
	return Object.values(d.cards).reduce((a, b) => a + b, 0);
}
