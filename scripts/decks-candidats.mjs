/** Decks candidats — liste FINALE des 6 recommandés, équilibrée par decks-lab. */
export const DECKS = [
	/* 1. Chorale d'Or — Vasar midrange (débutant) */
	{
		id: 'chorale-dor', name: "La Chorale d'Or",
		cards: {
			vasna: 1, norel: 3, renna: 3, doras: 3, korven: 3, dasen: 2, talvas: 2,
			koren: 1, doran: 1, 'chant-daube': 3, recitation: 3, dorvel: 2,
			'doublement-des-choeurs': 2, 'vasis-assemble': 1
		}
	},
	/* 2. Prix de la Chute — Exar aggro-sacrifice */
	{
		id: 'prix-de-la-chute', name: 'Le Prix de la Chute',
		cards: {
			exel: 2, exna: 3, thanor: 2, rompre: 2, morna: 3, 'sentence-retournee': 2,
			'dernier-mot': 2, korsa: 1, exoran: 2, exva: 2, rasen: 1, 'premiere-armee': 2,
			exen: 1, 'porte-du-dehors': 1, 'couronne-dos': 2, 'clameur-dexen': 2
		}
	},
	/* 3. Archives Vivantes — Vasar/Eshar contrôle-valeur */
	{
		id: 'archives-vivantes', name: 'Les Archives Vivantes',
		cards: {
			doras: 2, dorvel: 2, thessa: 2, talvas: 2, thalen: 2, koren: 1, eshin: 3,
			eshna: 3, eskor: 2, eshel: 1, 'brume-memorielle': 2, interstice: 2,
			'vasis-assemble': 1, 'doublement-des-choeurs': 2, dasen: 2, recitation: 1
		}
	},
	/* 4. Grand Saut — Exar/Velar tempo-burn (intègre Sela + Avel) */
	{
		id: 'grand-saut', name: 'Le Grand Saut',
		cards: {
			'sela-premiere-au-vent': 2, 'avel-rieur-des-retours': 2, thanor: 3, exna: 2,
			'clameur-dexen': 2, 'bruler-le-jour': 3, exoran: 2, 'dernier-mot': 2,
			'couronne-dos': 2, morna: 1, velna: 1, 'bord-du-monde': 1, rasen: 1,
			'premiere-armee': 2, exen: 1, exva: 1, korsa: 1, 'porte-du-dehors': 1
		}
	},
	/* 5. Mille Postures — Morar/Vasar mutation (NOUVEAU) */
	{
		id: 'mille-postures', name: 'Mille Postures',
		cards: {
			'sorel-mille-postures': 2, 'nouvelle-peau': 3, moras: 1, 'nemi-deuxieme-allure': 3,
			moren: 2, 'enfant-de-xenen': 1, talvas: 1,
			doras: 3, renna: 3, korven: 3, dasen: 2, dorvel: 2, koren: 1,
			recitation: 2, vasna: 1
		}
	},
	/* 6. Cendres du Silence — Eshar/Vasar défausse-valeur (NOUVEAU) */
	{
		id: 'cendres-du-silence', name: 'Cendres du Silence',
		cards: {
			// Eshar : moteur défausse (Orel, Lampe, Rendre) + récupération
			eshin: 3, 'rendre-au-silence': 2, eshna: 3, 'orel-veilleur-des-restes': 2,
			'lampe-des-noms-eteints': 2, 'brume-memorielle': 2, eskor: 2, eshel: 1,
			// Vasar : murs, soin et fin de partie
			doras: 3, korven: 3, dorvel: 2, thalen: 2, 'chant-daube': 2, koren: 1
		}
	}
];
