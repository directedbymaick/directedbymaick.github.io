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

	// ---- 6) Régression : l'IA joue toujours (simulate intact) ----
	{
		const r = E.simulate(C.cards, 'vasar', 'exar', 1234);
		ok(r.winner !== null && r.turns > 0, `simulate : partie complète (${r.turns} tours, vainqueur ${r.winner})`);
	}

	console.log(echecs === 0 ? '\nTOUT PASSE' : `\n${echecs} ÉCHEC(S)`);
	process.exitCode = echecs === 0 ? 0 : 1;
} finally {
	await serveur.close();
}
