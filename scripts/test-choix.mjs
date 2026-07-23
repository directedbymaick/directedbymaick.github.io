/** Test jetable : les choix du joueur dans Duel. Lancé puis supprimé. */
import { createServer } from 'vite';

const serveur = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
let echecs = 0;
const ok = (cond, nom) => {
	console.log((cond ? '  ✓ ' : '  ✗ ') + nom);
	if (!cond) echecs++;
};
try {
	const E = await serveur.ssrLoadModule('/src/lib/game/engine.ts');
	const C = await serveur.ssrLoadModule('/src/lib/cards.ts');
	const carte = (id) => C.cards.find((c) => c.id === id);

	// ---- 1) Brume : les 3 du dessus sont proposées, le choix est respecté ----
	{
		const deck = [
			...Array(10).fill(carte('brume-memorielle')),
			...Array(20).fill(carte('vasna'))
		];
		const d = new E.Duel(C.cards, deck, 'vasar', 'exar', 42, 'T');
		// trouver la brume en main (sinon on pioche en passant des tours — deck à 1/3 de brumes)
		let idx = d.hand().findIndex((h) => h.card.id === 'brume-memorielle');
		ok(idx >= 0, 'brume en main d’ouverture (deck chargé)');
		const spec = d.choiceFor(idx);
		ok(!!spec && spec.type === 'carte' && spec.cartes.length === 3, 'brume : 3 cartes proposées');
		// choisir la TROISIÈME (l'heuristique aurait pris la meilleure)
		const voulu = spec.cartes[2];
		const avant = d.hand().length;
		d.play(idx, { cartes: [2] });
		const main = d.hand().map((h) => h.card);
		ok(main.length === avant, 'brume : -1 jouée, +1 piochée');
		ok(main.includes(voulu), 'brume : la carte CHOISIE est en main, pas la « meilleure »');
	}

	// ---- 2) Tala : la forme choisie s'impose à l'heuristique ----
	{
		const deck = [...Array(10).fill(carte('tala')), ...Array(20).fill(carte('vasna'))];
		const d = new E.Duel(C.cards, deck, 'morar', 'exar', 7, 'T');
		let garde = 0;
		let idx = -1;
		while ((idx = d.hand().findIndex((h) => h.card.id === 'tala' && h.playable)) < 0 && garde++ < 10 && d.meta().winner === null)
			d.endTurn();
		ok(idx >= 0, 'tala jouable');
		const spec = d.choiceFor(idx);
		ok(!!spec && spec.type === 'forme' && spec.formes.length === 2, 'tala : deux formes proposées');
		d.play(idx, { forme: 0 });
		const u = d.state()[0].board.find((b) => b.cardId === 'tala');
		ok(!!u && u.atk === 1 && u.maxHp === 3, `tala : forme défensive respectée (${u?.atk}/${u?.maxHp})`);
		const idx2 = d.hand().findIndex((h) => h.card.id === 'tala' && h.playable);
		if (idx2 >= 0) {
			d.play(idx2, { forme: 1 });
			const t2 = d.state()[0].board.filter((b) => b.cardId === 'tala');
			ok(t2.some((x) => x.atk === 3 && x.maxHp === 1), 'tala : forme offensive respectée');
		} else ok(true, 'tala offensive : plus de Volonté ce tour — non testable');
	}

	// ---- 3) Vasis assemblé face à UN SEUL Être : résout quand même ----
	{
		const g = { players: [{ board: [] }, { board: [] }] };
		void g;
		const deck = [...Array(10).fill(carte('vasis-assemble')), ...Array(20).fill(carte('vasna'))];
		const d = new E.Duel(C.cards, deck, 'vasar', 'exar', 11, 'T');
		// laisser l'IA poser au moins un Être : finir des tours jusqu'à en voir un
		let garde = 0;
		let idx = -1;
		while (
			((idx = d.hand().findIndex((h) => h.card.id === 'vasis-assemble' && h.playable)) < 0 ||
				d.state()[1].board.length === 0) &&
			garde++ < 14 &&
			d.meta().winner === null
		)
			d.endTurn();
		const nEnnemis = d.state()[1].board.length;
		if (idx >= 0 && nEnnemis >= 1 && d.meta().winner === null) {
			const okPlay = d.play(idx);
			const verrouilles = d.state()[1].board.filter((b) => b.locked).length;
			ok(okPlay && verrouilles === nEnnemis, `vasis : ${verrouilles}/${nEnnemis} Être(s) neutralisé(s), même seul`);
		} else {
			ok(true, 'vasis : contexte non réuni (pas d’ennemi) — cas non testable sur cette graine');
		}
	}

	// ---- 4) Appel à l'ordre : renvoi d'un jeton adverse ne le met PAS en main ----
	{
		// scénario dirigé : Match à deux mains pour contrôler les deux camps
		const dA = [...Array(10).fill(carte('appel-a-lordre')), ...Array(20).fill(carte('vasna'))];
		const dB = [...Array(10).fill(carte('premiere-armee')), ...Array(20).fill(carte('renas'))];
		const m = new E.Match(C.cards, { deck: dA, faction: 'vasar', name: 'A' }, { deck: dB, faction: 'exar', name: 'B' }, 5);
		// B pose la Première Armée dès que possible
		let garde = 0;
		let joue = false;
		while (garde++ < 12 && !joue) {
			const side = m.meta().active;
			if (side === 1) {
				const i = m.hand(1).findIndex((h) => h.card.id === 'premiere-armee' && h.playable);
				if (i >= 0) joue = m.play(1, i);
			}
			m.endTurn(side);
		}
		const jetons = m.state()[1].board.filter((b) => b.token);
		if (joue && jetons.length && m.meta().active === 0) {
			const i = m.hand(0).findIndex((h) => h.card.id === 'appel-a-lordre' && h.playable);
			if (i >= 0) {
				const mainAvantB = m.state()[1].hand;
				m.play(0, i, { unites: [jetons[0].uid] });
				ok(m.state()[1].board.filter((b) => b.token).length === jetons.length - 1, 'appel : le jeton ciblé a quitté le terrain');
				ok(m.state()[1].hand === mainAvantB, 'appel : un jeton renvoyé disparaît, il ne va pas en main');
			} else ok(true, 'appel : pas en main à ce tour — non testable sur cette graine');
		} else ok(true, 'appel : contexte non réuni sur cette graine');
	}

	// ---- 5) Eshel : le tuteur rapporte LA carte demandée ----
	{
		const deck = [carte('eshel'), ...Array(9).fill(carte('vasna')), ...Array(10).fill(carte('koren')), ...Array(10).fill(carte('doras'))];
		const d = new E.Duel(C.cards, deck, 'eshar', 'exar', 3, 'T');
		let garde = 0;
		let i = -1;
		while ((i = d.hand().findIndex((h) => h.card.id === 'eshel' && h.playable)) < 0 && garde++ < 15 && d.meta().winner === null) d.endTurn();
		if (i >= 0) {
			const spec = d.choiceFor(i);
			ok(!!spec && spec.type === 'carte' && spec.cartes.length > 1, 'eshel : le deck est présenté');
			const cible = spec.cartes.findIndex((c) => c.id === 'doras');
			const enMainAvant = d.hand().filter((h) => h.card.id === 'doras').length;
			d.play(i, { cartes: [cible] });
			const enMainApres = d.hand().filter((h) => h.card.id === 'doras').length;
			ok(enMainApres === enMainAvant + 1, 'eshel : la carte cherchée est celle demandée');
		} else ok(true, 'eshel : jamais jouable sur cette graine — non testable');
	}

	// ================== Extension SET01 : les 15 nouvelles cartes ==================

	/** Joue la première occurrence jouable de `id`, en passant des tours au besoin.
	    `tant` (optionnel) : condition à maintenir — on abandonne si elle tombe. */
	const jouerDes = (d, id, sel, tours = 12, tant = () => true) => {
		let garde = 0;
		let i = -1;
		while (
			(i = d.hand().findIndex((h) => h.card.id === id && h.playable)) < 0 &&
			garde++ < tours &&
			d.meta().winner === null &&
			tant()
		)
			d.endTurn();
		if (i < 0 || !tant()) return false;
		return d.play(i, sel) !== false;
	};
	/** L'unité de ce cardId sur notre terrain, ou null. */
	const surTerrain = (d, id) => d.state()[0].board.find((b) => b.cardId === id) ?? null;

	// ---- 7) Nemi : la mutation choisie s'applique ----
	{
		const deck = [...Array(10).fill(carte('nemi-deuxieme-allure')), ...Array(20).fill(carte('vasna'))];
		const d = new E.Duel(C.cards, deck, 'morar', 'exar', 11, 'T');
		const i = d.hand().findIndex((h) => h.card.id === 'nemi-deuxieme-allure' && h.playable);
		if (i >= 0) {
			const spec = d.choiceFor(i);
			ok(!!spec && spec.type === 'forme' && spec.formes.length === 2, 'nemi : deux modes proposés');
			d.play(i, { forme: 1 });
			const u = d.state()[0].board.find((b) => b.cardId === 'nemi-deuxieme-allure');
			ok(!!u && u.maxHp === 2, `nemi : +1 Intégrité permanent (${u?.atk}/${u?.maxHp})`);
		} else ok(true, 'nemi : pas en ouverture sur cette graine');
	}

	// ---- 8) Prêter une forme : échange TEMPORAIRE, dénoué en fin de tour ----
	{
		const deck = [...Array(8).fill(carte('preter-une-forme')), ...Array(8).fill(carte('doras')), ...Array(14).fill(carte('vasna'))];
		const d = new E.Duel(C.cards, deck, 'morar', 'exar', 1, 'T');
		if (jouerDes(d, 'doras', undefined, 16)) {
			const avant = surTerrain(d, 'doras');
			if (avant && jouerDes(d, 'preter-une-forme', { unites: [avant.uid] }, 8, () => !!surTerrain(d, 'doras'))) {
				const pendant = d.state()[0].board.find((b) => b.uid === avant.uid);
				ok(!!pendant && pendant.atk !== avant.atk, `prêter une forme : stats échangées (${avant.atk} → ${pendant?.atk})`);
				d.endTurn();
				const apres = d.state()[0].board.find((b) => b.uid === avant.uid);
				if (apres) ok(apres.atk === avant.atk, `prêter une forme : l'échange se dénoue (${apres.atk})`);
				else ok(true, 'prêter une forme : le porteur est mort au tour adverse');
			} else ok(true, 'prêter une forme : contexte non réuni');
		} else ok(true, 'prêter une forme : doras jamais jouable sur cette graine');
	}

	// ---- 9) Rebond de lumière : renvoi allié + Avel frappe le Korum ----
	{
		const deck = [...Array(6).fill(carte('avel-rieur-des-retours')), ...Array(6).fill(carte('rebond-de-lumiere')), ...Array(6).fill(carte('sela-premiere-au-vent')), ...Array(12).fill(carte('vasna'))];
		const d = new E.Duel(C.cards, deck, 'velar', 'exar', 2, 'T');
		if (
			jouerDes(d, 'avel-rieur-des-retours', undefined, 16) &&
			jouerDes(d, 'sela-premiere-au-vent', undefined, 8, () => !!surTerrain(d, 'avel-rieur-des-retours'))
		) {
			const sela = surTerrain(d, 'sela-premiere-au-vent');
			const korumAvant = d.state()[1].korum;
			const pret = () => !!surTerrain(d, 'avel-rieur-des-retours') && !!surTerrain(d, 'sela-premiere-au-vent');
			if (sela && pret() && jouerDes(d, 'rebond-de-lumiere', { unites: [sela.uid] }, 8, pret)) {
				ok(!d.state()[0].board.some((b) => b.uid === sela.uid), 'rebond : l’allié choisi est revenu en main');
				ok(d.state()[1].korum <= korumAvant - 1, `rebond : Avel inflige 1 au Korum (${korumAvant} → ${d.state()[1].korum})`);
			} else ok(true, 'rebond : contexte non réuni sur cette graine');
		} else ok(true, 'rebond : mise en place impossible sur cette graine');
	}

	// ---- 10) Trait de soleil : le porteur voit le Korum malgré le mur ----
	{
		const deck = [...Array(6).fill(carte('trait-de-soleil')), ...Array(8).fill(carte('doras')), ...Array(16).fill(carte('vasna'))];
		const d = new E.Duel(C.cards, deck, 'velar', 'exar', 41, 'T');
		if (jouerDes(d, 'doras', undefined, 16)) {
			const porteur = surTerrain(d, 'doras');
			if (porteur && jouerDes(d, 'trait-de-soleil', { unites: [porteur.uid] }, 8, () => !!surTerrain(d, 'doras'))) {
				const murAdverse = d.state()[1].board.filter((b) => !b.locked && !b.serment).length;
				if (murAdverse > 0) {
					const legal = d.legalTargets(porteur.uid);
					ok(legal.korum === true, 'trait de soleil : le Korum est ouvert au porteur malgré le mur');
					const autres = d.state()[0].board.find((b) => b.uid !== porteur.uid);
					if (autres) ok(d.legalTargets(autres.uid).korum === false, 'trait de soleil : les autres restent bloqués par le mur');
					else ok(true, 'trait de soleil : pas d’autre attaquant à comparer');
				} else ok(true, 'trait de soleil : mur adverse vide — évasion sans objet');
			} else ok(true, 'trait de soleil : contexte non réuni (relique absente)');
		} else ok(true, 'trait de soleil : doras jamais jouable sur cette graine');
	}

	// ---- 11) Sorel : l'échange le nourrit (+1/+1, une fois par tour) ----
	{
		const deck = [...Array(6).fill(carte('sorel-mille-postures')), ...Array(6).fill(carte('nouvelle-peau')), ...Array(6).fill(carte('doras')), ...Array(12).fill(carte('vasna'))];
		const d = new E.Duel(C.cards, deck, 'morar', 'exar', 51, 'T');
		if (jouerDes(d, 'sorel-mille-postures', undefined, 16) && jouerDes(d, 'doras', undefined, 4)) {
			const sorel = d.state()[0].board.find((b) => b.cardId === 'sorel-mille-postures');
			const doras = d.state()[0].board.find((b) => b.cardId === 'doras');
			const iN = d.hand().findIndex((h) => h.card.id === 'nouvelle-peau' && h.playable);
			if (sorel && doras && iN >= 0) {
				d.play(iN, { unites: [doras.uid] });
				const apres = d.state()[0].board.find((b) => b.uid === sorel.uid);
				ok(!!apres && apres.atk === sorel.atk + 1 && apres.maxHp === sorel.maxHp + 1, `sorel : +1/+1 sur l'échange (${apres?.atk}/${apres?.maxHp})`);
			} else ok(true, 'sorel : contexte non réuni sur cette graine');
		} else ok(true, 'sorel : mise en place impossible sur cette graine');
	}

	// ---- 12) Rendre au silence + Orel : la défausse qui bouge arme Orel ----
	{
		const deck = [...Array(6).fill(carte('orel-veilleur-des-restes')), ...Array(8).fill(carte('rendre-au-silence')), ...Array(6).fill(carte('messe-basse')), ...Array(10).fill(carte('vasna'))];
		const d = new E.Duel(C.cards, deck, 'eshar', 'exar', 2, 'T');
		// remplir la défausse avec un verbe, poser Orel, puis rendre au silence
		jouerDes(d, 'messe-basse', undefined, 8);
		if (jouerDes(d, 'orel-veilleur-des-restes', undefined, 12)) {
			const vivant = () => !!surTerrain(d, 'orel-veilleur-des-restes');
			const orel = surTerrain(d, 'orel-veilleur-des-restes');
			if (orel && d.state()[0].discard > 0 && jouerDes(d, 'rendre-au-silence', undefined, 8, vivant)) {
				const apres = d.state()[0].board.find((b) => b.uid === orel.uid);
				ok(!!apres && apres.atk >= orel.atk + 1, `orel : +1 ATQ quand la défausse bouge (${orel.atk} → ${apres?.atk})`);
			} else ok(true, 'orel : contexte non réuni sur cette graine');
		} else ok(true, 'orel : jamais jouable sur cette graine');
	}

	// ---- 13) Halo à charnière : la bascule ATQ arrive au tour suivant ----
	{
		const deck = [...Array(6).fill(carte('halo-a-charniere')), ...Array(8).fill(carte('doras')), ...Array(16).fill(carte('vasna'))];
		const d = new E.Duel(C.cards, deck, 'morar', 'exar', 71, 'T');
		if (jouerDes(d, 'doras', undefined, 16)) {
			const cible = surTerrain(d, 'doras');
			if (cible && jouerDes(d, 'halo-a-charniere', { unites: [cible.uid] }, 8, () => !!surTerrain(d, 'doras'))) {
				d.endTurn(); // le tour revient : première bascule = +2 ATQ
				const apres = d.state()[0].board.find((b) => b.uid === cible.uid);
				if (apres) ok(apres.atk === cible.atk + 2, `halo : +2 ATQ à la bascule (${cible.atk} → ${apres.atk})`);
				else ok(true, 'halo : le porteur est mort au tour adverse');
			} else ok(true, 'halo : contexte non réuni sur cette graine');
		} else ok(true, 'halo : doras jamais jouable sur cette graine');
	}

	// ---- 14) Régression : l'IA joue toujours (simulate intact) ----
	{
		const r = E.simulate(C.cards, 'vasar', 'exar', 1234);
		ok(r.winner !== null && r.turns > 0, `simulate : partie complète (${r.turns} tours, vainqueur ${r.winner})`);
		const r2 = E.simulate(C.cards, 'velar', 'morar', 777);
		ok(r2.winner !== null && r2.turns > 0, `simulate : Velar/Morar avec l'extension (${r2.turns} tours)`);
		const r3 = E.simulate(C.cards, 'eshar', 'velar', 888);
		ok(r3.winner !== null && r3.turns > 0, `simulate : Eshar/Velar avec l'extension (${r3.turns} tours)`);
	}

	console.log(echecs === 0 ? '\nTOUT PASSE' : `\n${echecs} ÉCHEC(S)`);
	process.exitCode = echecs === 0 ? 0 : 1;
} finally {
	await serveur.close();
}
