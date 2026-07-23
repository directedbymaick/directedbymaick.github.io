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
			'sela-premiere-au-vent': 2,
			'avel-rieur-des-retours': 2,
			'thanor': 3,
			'exna': 2,
			'clameur-dexen': 2,
			'bruler-le-jour': 3,
			'exoran': 2,
			'dernier-mot': 2,
			'couronne-dos': 2,
			'morna': 1,
			'velna': 1,
			'bord-du-monde': 1,
			'rasen': 1,
			'premiere-armee': 2,
			'exen': 1,
			'exva': 1,
			'korsa': 1,
			'porte-du-dehors': 1
		},
		guide: {
			resume:
				"La course : des corps agressifs, la Clameur pour passer en force, et Brûler le jour pour finir par-dessus les murs. Sela ouvre au premier tour avec Élan, Avel punit chaque renvoi de 2 dégâts directs, et neuf dégâts dorment dans vos trois Brûler le jour — le reste du deck n'a qu'à amener l'adversaire à portée. Le Dernier Mot dégage la voie quand la défense tient trop.",
			plan: [
				'Tours 1-3 : Sela attaque dès son arrivée, Thanor suit ; la Clameur d’Exen ajoute 2 ATQ pile au bon moment.',
				'Tours 3-4 : Morna et Avel pressent, la Couronne d’os transforme n’importe qui en menace. Chaque Être renvoyé en main — même le vôtre — coûte 2 Korum à l’adversaire tant qu’Avel rit.',
				'Tours 5+ : le Bord du monde donne Élan à tout le monde — videz votre main et frappez la même seconde. Finissez aux Brûler le jour.'
			],
			forces: [
				'Le tempo : vos Êtres à Élan attaquent le tour où ils arrivent — un tour d’avance permanent.',
				'Le burn passe par-dessus les Serments : 9 dégâts qui ignorent le plateau, plus les rires d’Avel.',
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
					cards: ['avel-rieur-des-retours', 'dernier-mot'],
					text: 'Avel sur le terrain, puis l’adversaire renvoie ou vous rappelez un Être : 2 dégâts gratuits au Korum, une fois par tour, qui s’ajoutent au burn.'
				},
				{
					cards: ['clameur-dexen', 'thanor'],
					text: 'Thanor arrive, Clameur (+2 ATQ) : 5 dégâts surprise avant que la défense se mette en place.'
				}
			],
			garder: ['sela-premiere-au-vent', 'thanor', 'exna', 'bruler-le-jour']
		}
	},
	{
		id: 'mille-postures',
		name: 'Mille Postures',
		faction: 'morar',
		tagline: 'Aucune forme n’est fausse si elle permet de rester.',
		style: 'Mutation-midrange · Morar/Vasar',
		difficulty: 2,
		cards: {
			'nemi-deuxieme-allure': 3,
			'nouvelle-peau': 3,
			'sorel-mille-postures': 2,
			'moren': 2,
			'enfant-de-xenen': 1,
			'talvas': 1,
			'moras': 1,
			'doras': 3,
			'renna': 3,
			'korven': 3,
			'dasen': 2,
			'dorvel': 2,
			'koren': 1,
			'recitation': 2,
			'vasna': 1
		},
		guide: {
			resume:
				"Le deck de la Mutation : des corps Vasar solides que Morar retourne au meilleur moment. Faire peau neuve transforme un mur en attaquant, Sorel grossit à chaque échange, Moras retourne tout le camp d'un coup. L'ossature Vasar (Doras, Renna, Korven) tient la ligne pendant que les formes changent — l'adversaire ne sait jamais ce qu'il affronte vraiment.",
			plan: [
				'Tours 1-2 : Nemi ouvre (choisissez sa mutation selon le camp d’en face), Renna et Vasna posent des corps.',
				'Tours 3-4 : Doras monte la garde, Korven neutralise, Sorel s’installe — chaque échange de stats le nourrit (+1/+1 permanent).',
				'Tours 5+ : Faire peau neuve retourne votre plus gros mur en attaquant, Moras retourne tout le camp, Koren et Dasen renforcent ce qui est déjà là.'
			],
			forces: [
				'Imprévisible : un plateau de murs devient une armée d’attaquants en un tour.',
				'Sorel devient énorme si la partie dure — chaque mutation le grossit définitivement.',
				'L’ossature Vasar donne des mains de départ stables, rare pour un deck à combo.'
			],
			faiblesses: [
				'Les retournements sont temporaires ou uniques : mal minutés, ils ne font rien.',
				'Peu de dégâts directs — un adversaire qui soigne reprend l’avantage.',
				'L’Enfant de Xenen dépend du dernier Verbe joué : parfois il n’y a rien à copier.'
			],
			combos: [
				{
					cards: ['nouvelle-peau', 'doras'],
					text: 'Doras 1/4 tient trois tours en Serment, puis Faire peau neuve : 4/1 qui frappe. Le mur devient la sentence.'
				},
				{
					cards: ['sorel-mille-postures', 'moras'],
					text: 'Moras échange les stats de chacun de vos Êtres — et chaque échange donne +1/+1 à Sorel. Un tour de Moras avec Sorel en jeu, c’est un Sorel géant.'
				},
				{
					cards: ['enfant-de-xenen', 'recitation'],
					text: 'Récitation (+2 Intégrité au camp), puis l’Enfant la copie : quatre points d’Intégrité de plus sur toute la ligne en deux cartes.'
				}
			],
			garder: ['nemi-deuxieme-allure', 'renna', 'doras', 'nouvelle-peau']
		}
	},
	{
		id: 'cendres-du-silence',
		name: 'Cendres du Silence',
		faction: 'eshar',
		tagline: 'Ce qui brûle parle encore. Il suffit d’écouter.',
		style: 'Défausse-valeur · Eshar/Vasar',
		difficulty: 3,
		cards: {
			'eshin': 3,
			'rendre-au-silence': 2,
			'eshna': 3,
			'brume-memorielle': 2,
			'orel-veilleur-des-restes': 2,
			'lampe-des-noms-eteints': 2,
			'eskor': 2,
			'eshel': 1,
			'doras': 3,
			'korven': 3,
			'dorvel': 2,
			'thalen': 2,
			'chant-daube': 2,
			'koren': 1
		},
		guide: {
			resume:
				"Le deck qui joue avec sa défausse comme d'autres avec leur main. Rendre au silence recycle, Eshna récupère, et chaque mouvement de défausse arme Orel (+1 ATQ) et la Lampe des noms éteints (exil chez l'adversaire). Orel devient une menace permanente pendant que les murs Vasar tiennent et que Thalen lit la main d'en face — vous savez tout, vous gardez tout.",
			plan: [
				'Tours 1-3 : Eshin regarde, la Brume creuse, Doras tient. Votre défausse se remplit — c’est voulu.',
				'Tours 3-5 : Orel s’installe, puis chaque Rendre au silence ou Eshna le réveille (+1 ATQ) ET déclenche la Lampe, qui exile la meilleure carte de la défausse adverse.',
				'Tours 5+ : Orel a grossi à chaque mouvement (+1 ATQ permanent), Eshel va chercher la pièce manquante, Koren referme. L’adversaire n’a plus de ressources ; vous n’avez jamais cessé d’en avoir.'
			],
			forces: [
				'Double moteur : chaque mouvement de défausse donne de l’ATQ (Orel) et détruit leurs ressources (Lampe).',
				'Thalen + Korven : vous savez ce qui arrive et vous le neutralisez.',
				'Presque rien n’est perdu : la défausse est une seconde main.'
			],
			faiblesses: [
				'Le deck le plus exigeant du jeu : l’ordre des déclencheurs fait tout.',
				'Départ lent — les aggros rapides peuvent passer avant que la machine tourne.',
				'La Lampe exile aussi VOS cartes si votre défausse bouge chez l’adversaire.'
			],
			combos: [
				{
					cards: ['rendre-au-silence', 'orel-veilleur-des-restes', 'lampe-des-noms-eteints'],
					text: 'Rendre au silence : une carte quitte votre défausse → Orel +1 ATQ, la Lampe exile chez eux, et vous piochez. Trois effets pour deux Volonté.'
				},
				{
					cards: ['chant-daube', 'eshna'],
					text: 'Chant d’aube soigne, pioche… puis finit à la défausse — et Eshna le ramène (coût 4 ou moins). Le même souffle deux fois par partie.'
				},
				{
					cards: ['thalen', 'korven'],
					text: 'Thalen révèle leur main : vous savez exactement quoi neutraliser avec Korven avant même que ça arrive.'
				}
			],
			garder: ['eshin', 'doras', 'eshna', 'brume-memorielle']
		}
	}
];

/** Vérification d'intégrité (utilisée par le Laboratoire et les tests). */
export function metaDeckSize(d: MetaDeck): number {
	return Object.values(d.cards).reduce((a, b) => a + b, 0);
}
