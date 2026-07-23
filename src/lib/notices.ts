/**
 * Une notice par carte : sa place dans le récit.
 *
 * À ne pas confondre avec la citation, qui est la voix de la carte — une phrase
 * qu'on entend dire. La notice est la voix du copiste : elle situe le nom dans
 * l'histoire, dit d'où il vient et pourquoi il compte. Une carte peut donc être
 * bavarde en citation et décisive en notice, ou l'inverse.
 *
 * `livre` rattache la notice au chapitre du Korum où l'événement se joue — les
 * identifiants viennent de LIVRES, dans lore.ts.
 */
export interface Notice {
	livre: string;
	texte: string;
}

export const NOTICES: Record<string, Notice> = {
	/* ---------------------------------------------------------------- VASAR */
	koren: {
		livre: 'prononciation',
		texte:
			"Premier prononcé, donc premier responsable. Ses chœurs ne sont pas un culte : c'est l'entretien matériel du monde, et nul ne le sait mieux que lui — ce qui explique qu'il ait doublé les voix plutôt que d'avouer ce qu'il avait lu dans les tours."
	},
	recitation: {
		livre: 'prononciation',
		texte:
			"La récitation n’est pas un rite : elle maintient le monde en état. Chaque nom répété gagne un jour d’existence. Si les chœurs s’interrompent, nul ne sait combien de temps la Création tiendra."
	},
	vasna: {
		livre: 'prononciation',
		texte:
			"Vasna chante depuis vingt ans sans avoir manqué une seule nuit. Les chœurs comptent des milliers de voix semblables à la sienne ; c’est leur constance, bien plus que l’autorité de Koren, qui retient les noms dans le monde."
	},
	renna: {
		livre: 'prononciation',
		texte:
			"Elle porte les mots aux chœurs sans jamais en connaître le sens. Les Vasar tiennent que comprendre un nom, c'est déjà commencer à le mettre en question."
	},
	'chant-daube': {
		livre: 'prononciation',
		texte:
			"Les chœurs ne chantent pas que la nuit : le premier vers du jour répare ce que les heures sombres ont usé. Tant que l'aube est dite, aucun nom ne ternit d'ici le soir."
	},
	dasen: {
		livre: 'prononciation',
		texte:
			"Il accorde les rangs entre eux. L'office paraît mineur jusqu'à ce qu'on comprenne pourquoi il existe : un chœur désaccordé laisse passer des silences, et un silence est une place vide."
	},
	doras: {
		livre: 'halos',
		texte:
			"Un serment de rang, pas un héros. Doras tient une ligne dans une architecture qui en compte des milliers ; son office est de ne pas bouger, et l'Ordre tient parce que des milliers comme lui ne bougent pas."
	},
	talvas: {
		livre: 'premiers',
		texte:
			"Un Vasar de rang, pas un Premier. Talvas est ce que les six premiers ont fondé : une garde qui ne plie pas, parce qu'on ne lui a jamais demandé de comprendre pourquoi elle garde."
	},
	thalen: {
		livre: 'ex',
		texte:
			"Thalen fut la première à entendre EX sous les chœurs. En rapportant ce mot impossible à Doran, elle accomplit son devoir — et donna au Vasis la connaissance qui allait déchirer le monde."
	},
	senel: {
		livre: 'ex',
		texte:
			"Formée par Thalen, elle a hérité de la seule discipline vasar qui consiste à écouter au lieu de réciter. C'est aussi la plus dangereuse : à force d'écouter sous les chœurs, on finit par entendre EX."
	},
	doran: {
		livre: 'sentences',
		texte:
			"Elle ne juge pas par cruauté. Le silence de KOR a laissé une place vide, et elle n'a pas supporté de la voir inoccupée. Tout ce qui a suivi découle de cette impatience-là."
	},
	'vasis-assemble': {
		livre: 'sentences',
		texte:
			"Le Vasis fut fondé aux premiers jours, quand il n'existait encore ni faute ni fautif ; on riait alors d'un tribunal sans accusés. Assemblé au complet, il prononce d'une seule voix. Plus personne ne rit."
	},
	'sentence-dor': {
		livre: 'sentences',
		texte:
			"Dans la Langue Première, une sentence ne reste pas abstraite : elle prend corps. C'est l'objet le plus littéral de ce monde — un verdict qu'on peut soupeser."
	},
	'premiere-chaine': {
		livre: 'sentences',
		texte:
			"Celle de Rasen. Forgée par la sentence elle-même, tombée avec lui dans Exen, revenue à Vasen sans que nul sache par quelle route. Doran la garde, et la regarde longtemps."
	},
	korven: {
		livre: 'sentences',
		texte:
			"Dans la Langue Première, un mot pèse. Korven a appris à charger les siens jusqu'à ce qu'un être ne puisse plus se relever dessous : une technique de maintien de l'ordre, pas de combat."
	},
	dorin: {
		livre: 'sentences',
		texte:
			"La loi s'est élargie à mesure que la peur de Doran grandissait, et il a fallu des juges pour l'appliquer. Dorin est de la dernière fournée — recruté non pour trancher, mais pour faire nombre."
	},
	dorvel: {
		livre: 'sentences',
		texte:
			"Il connaît par cœur les listes de noms retranchés. Le problème n'est pas qu'il les retienne : c'est qu'une liste qu'on retient devient une liste qu'on peut allonger."
	},
	thessa: {
		livre: 'sentences',
		texte:
			"Le cercle des juges s'élargit chaque année et ne s'est jamais resserré. Thessa administre cet élargissement : elle rend la parole plus coûteuse pour ceux d'en face, ce qui décrit assez bien ce que le Vasis est devenu."
	},
	'appel-a-lordre': {
		livre: 'sentences',
		texte:
			"Le premier geste du Vasis n'est pas la sentence, c'est le rappel. Beaucoup n'ont connu de l'Ordre que cette main ferme sur l'épaule, et n'ont jamais su ce qui attendait au cran suivant."
	},
	norel: {
		livre: 'silence',
		texte:
			"Après le départ d'Eshel, les registres sont restés sans gardien. Norel a repris la charge, avec une différence de destination : Eshel notait pour se souvenir, Norel note pour qu'on retrouve."
	},
	'doublement-des-choeurs': {
		livre: 'silence',
		texte:
			"Koren a mesuré l'élan des mots déjà dits, n'en a parlé à personne, et a doublé les chœurs. L'ordre est passé pour un excès de zèle. C'était un aveu."
	},
	'tours-de-grammaire': {
		livre: 'silence',
		texte:
			"C'est là qu'on mesure combien de temps un nom tiendra encore. Koren y monte seul, la nuit, et personne n'a jamais osé demander ce qu'il y lit."
	},

	/* ----------------------------------------------------------------- EXAR */
	'echo-du-dixieme-mot': {
		livre: 'ex',
		texte:
			"EX n'a été prononcé qu'une fois, mais dans une langue où dire c'est faire, une fois suffit. L'écho ne s'est jamais tu : c'est lui que les Exar entendent quand ils sacrifient l'un des leurs."
	},
	exen: {
		livre: 'fracture',
		texte:
			"Exen n'a pas été fondé : il s'est rempli. Sentence après sentence, la ville a poussé là où le monde ne se regarde pas, et chaque verdict prononcé en haut lui livre un habitant de plus."
	},
	'porte-du-dehors': {
		livre: 'fracture',
		texte:
			"Elle ne s'ouvre que dans un sens, et ce n'est pas une cruauté d'architecte : c'est la nature même d'EX. Un mot qui signifie « hors » ne connaît pas de retour."
	},
	morna: {
		livre: 'fracture',
		texte:
			"Le trait noir est apparu à la Fracture, là où la lumière s'est retirée sans que personne regarde. On l'a marquée pour qu'on la fuie ; le calcul a échoué, parce qu'il y avait déjà trop de marqués."
	},
	korsa: {
		livre: 'fracture',
		texte:
			"Ce monde est fait de cercles : halos, chœurs, tribunal. Korsa a fait de leur rupture une discipline, et c'est devenu la spécialité la plus recherchée d'Exen."
	},
	rasen: {
		livre: 'exar',
		texte:
			"Le premier jugé, donc le premier des Exar. Il ne pose plus qu'une seule question — celle à laquelle Doran n'a pas répondu, et qu'il a emportée dans sa chute."
	},
	renas: {
		livre: 'sentences',
		texte:
			"Tombée assez récemment pour que sa chaîne soit encore tiède. Exen se peuple de ces arrivées : ce que l'Ordre rejette, l'Envers l'enrôle, et le compte monte chaque année."
	},
	senna: {
		livre: 'sentences',
		texte:
			"Elle porte la question de Rasen aux foules, mot pour mot, sans y ajouter le sien. Une question qu'on répète assez longtemps finit par valoir une réponse."
	},
	'sentence-retournee': {
		livre: 'sentences',
		texte:
			"Chaque maillon nomme votre faute, donc chaque maillon nomme votre juge. Les Exar ont fait de la lecture des chaînes un art — et parfois une arme."
	},
	exel: {
		livre: 'exar',
		texte:
			"Né après la chute, il n'a jamais vu Vasen. Pour sa génération, le dehors n'est pas une punition mais un pays natal. Et l'on ne défend pas un pays natal : on l'étend."
	},
	exna: {
		livre: 'exar',
		texte:
			"Elle a retourné son halo brisé au lieu de le cacher. Chez les Exar, la marque de la sentence est devenue l'insigne : ce que l'Ordre voulait infamant, ils le portent devant."
	},
	morek: {
		livre: 'exar',
		texte:
			"Dix ans sous une chaîne d'or avant qu'elle cède. Les sentences ne sont donc pas éternelles — c'est la découverte qui a fondé la doctrine d'Exen, et il en est la preuve vivante."
	},
	exoran: {
		livre: 'exar',
		texte:
			"Il a appris à aimer la chute. Pas à la supporter : à l'aimer. C'est ce qui le rend plus dangereux que les rancuniers — on ne peut plus rien lui reprendre."
	},
	exva: {
		livre: 'exar',
		texte:
			"Beaucoup, en bas, n'osent pas dire EX à voix haute : le mot a coûté trop cher. Elle le prononce pour eux, ce qui fait d'elle autre chose qu'une combattante — une voix publique."
	},
	'premiere-armee': {
		livre: 'exar',
		texte:
			"Levée par son propre juge : chaque sentence de Doran a fourni un soldat à Rasen. L'ironie est complète, et Rasen ne la cache pas — il l'affiche."
	},
	'couronne-dos': {
		livre: 'exar',
		texte:
			"Le premier roi du dehors n'a pas eu droit à l'or. Cette couronne répond directement à la chaîne : même geste, matière opposée, et le message est limpide."
	},
	'clameur-dexen': {
		livre: 'exar',
		texte:
			"L'envers a ses chœurs, mais ils ne répètent rien : ils poussent. Vasen chante pour conserver, Exen crie pour avancer."
	},
	'dernier-mot': {
		livre: 'exar',
		texte:
			"La dernière syllabe d'un nom est la plus lourde : c'est elle qui le referme. Prononcée sur un rang entier, elle referme le rang entier."
	},
	rompre: {
		livre: 'exar',
		texte:
			"Toute la doctrine exar tient là : quand le Vasis met mille sentences à défaire un nom, EX en défait un d'une seule syllabe."
	},
	'seconde-sentence': {
		livre: 'exar',
		texte:
			"On ne condamne pas deux fois — sauf en bas, où la mort d'un allié n'est pas une perte mais un argument. Les Exar retournent contre l'Ordre sa propre grammaire."
	},
	'messe-basse': {
		livre: 'exar',
		texte:
			"En haut on chante fort pour couvrir le doute ; en bas on prêche bas pour qu'il s'entende. Les deux camps ont compris la même chose sur le volume, et en ont tiré des conclusions inverses."
	},
	thanor: {
		livre: 'exar',
		texte:
			"L'envers du monde a des mains. Thanor fait le travail dont Rasen ne parle pas dans ses discours, et qu'aucune de ses questions ne couvre."
	},

	/* ---------------------------------------------------------------- MORAR */
	moras: {
		livre: 'morar',
		texte:
			"Envoyé regarder vivre les humains bien avant la Fracture, il est tombé exactement là où il avait passé des siècles. Sa sentence l'a reconduit chez lui, et c'est pour cela qu'il a souri."
	},
	moren: {
		livre: 'morar',
		texte:
			"Il a connu Vasen avant la chute et Xenen après. Il connaît les deux mondes et n'en regrette qu'un — mais il n'a jamais dit lequel, et on a cessé de le lui demander."
	},
	tala: {
		livre: 'morar',
		texte:
			"Elle a choisi sa forme en pleine chute, ce que les Vasar tiennent pour impossible : un nom reçu ne se négocie pas. Les Morar en ont fait leur quotidien."
	},
	'nouvelle-peau': {
		livre: 'morar',
		texte:
			"On ne remonte pas, on devient. Toute la doctrine morar tient dans ces quatre mots : la mutation n'est pas la dégradation du nom d'origine, c'est sa suite."
	},
	'enfant-de-xenen': {
		livre: 'morar',
		texte:
			"Né dans le monde humain de parents tombés. Il n'a ni halo à perdre ni Vasen à regretter, et reprend les mots des autres avec une aisance qui inquiète les deux camps."
	},

	/* ---------------------------------------------------------------- ESHAR */
	eshel: {
		livre: 'silence',
		texte:
			"Le copiste. Tout ce récit passe par ses yeux, y compris les pages qu'il n'a pas pu écrire. Il est parti de Vasen avec les registres, et c'est la seule raison pour laquelle vous lisez ceci."
	},
	eshna: {
		livre: 'eshar-velar',
		texte:
			"Elle glane les syllabes tombées des noms qui s'effacent. Rien ne se perd tout à fait : c'est la doctrine eshar, et accessoirement une méthode de survie."
	},
	eshin: {
		livre: 'eshar-velar',
		texte:
			"Un nom à moitié dit n'a plus de visage propre. Eshin emprunte ceux qu'il croise, sans malice — il lui faut bien une forme, et les siennes se sont effacées une à une."
	},
	eskor: {
		livre: 'eshar-velar',
		texte:
			"Un nom entier vaut fortune en bas. Eskor sait ce qu'on peut en faire, et ramène de l'exil ce que les autres tenaient pour définitivement perdu."
	},
	'brume-memorielle': {
		livre: 'eshar-velar',
		texte:
			"Les Eshar sont tombés parce qu'on les a oubliés. Ils ont fait de l'oubli lui-même un instrument : la brume se souvient à votre place, et vous rend ce que vous n'avez pas gardé."
	},
	interstice: {
		livre: 'eshar-velar',
		texte:
			"Ni haut ni bas : le seul endroit du monde qui n'ait pas choisi. Les Eshar y vivent parce que c'est le seul lieu où un nom à moitié dit ne passe pas pour une anomalie."
	},

	/* ---------------------------------------------------------------- VELAR */
	velna: {
		livre: 'eshar-velar',
		texte:
			"La voix la plus vive des chœurs, jusqu'au jour où elle a demandé pourquoi répéter quand on a la force de dire du neuf. Elle n'a pas attendu la réponse : elle a sauté."
	},
	velor: {
		livre: 'eshar-velar',
		texte:
			"Chez les Velar, la joie est une arme. Ils tombent en riant parce que rien de ce qu'on leur retire ne leur appartenait vraiment."
	},
	velsa: {
		livre: 'eshar-velar',
		texte:
			"Elle n'a pas été jetée, elle a sauté — comme Velna, et sans la moitié de ses raisons. « Le bord du monde est un plongeoir » est une doctrine velar, pas une bravade."
	},
	'bruler-le-jour': {
		livre: 'eshar-velar',
		texte:
			"Les Velar ne comptent pas leurs jours, ils les dépensent. Brûler le jour n'est pas une image : leur puissance se paie sur le temps qui leur reste."
	},
	'bord-du-monde': {
		livre: 'fracture',
		texte:
			"La limite dont la seule existence a fêlé l'Origine. Les Velar en ont fait leur demeure, ce qui reste la provocation la plus complète jamais adressée à Vasen."
	},

	/* -------------------------------------------------- EXTENSION · ESHAR */
	'selin-ecoute-la-cendre': {
		livre: 'silence',
		texte:
			"Selin fut effacée si jeune qu'elle n'a jamais connu son nom entier. Elle écoute la cendre comme d'autres lisent : ce qui a brûlé parle encore, à condition de se taire plus fort que lui."
	},
	'orel-veilleur-des-restes': {
		livre: 'eshar-velar',
		texte:
			"Les Eshar n'enterrent pas : ils veillent. Orel monte la garde au bord des défausses du monde, non pour retenir les morts, mais pour tenir ouvert le passage qu'ils empruntent en revenant."
	},
	'rendre-au-silence': {
		livre: 'silence',
		texte:
			"Le rite le plus ancien des effacés : rendre un nom au silence, c'est le glisser sous la pile du monde plutôt que de le laisser pourrir en surface. Ce qui redescend ainsi remonte toujours changé."
	},
	'registre-des-absents': {
		livre: 'silence',
		texte:
			"Le grand livre où les noms rayés demeurent lisibles à la lune. Ceux qui savent le consulter paient leurs retours moins cher — le Registre reconnaît les siens."
	},
	'lampe-des-noms-eteints': {
		livre: 'eshar-velar',
		texte:
			"Une lampe qui n'éclaire que ce qui va disparaître. Les papillons qui l'entourent sont les dernières syllabes des noms éteints ; ce qu'elle touche quitte le monde par la porte définitive."
	},

	/* -------------------------------------------------- EXTENSION · MORAR */
	'nemi-deuxieme-allure': {
		livre: 'morar',
		texte:
			"Nemi a appris des Morar la leçon première : on ne choisit pas ce qu'on est, on choisit son allure. Elle en change comme on change de monde — avant que le monde ne l'exige."
	},
	'sorel-mille-postures': {
		livre: 'morar',
		texte:
			"Sorel a survécu à la chute en refusant d'avoir une forme définitive. Chaque fois qu'un corps se retourne quelque part, le sien apprend — mille postures, aucune fausse."
	},
	'preter-une-forme': {
		livre: 'morar',
		texte:
			"Chez les Morar, la forme n'appartient à personne : elle se prête, le temps de tenir. Rendre le corps emprunté à la fin du jour est une politesse — et une loi."
	},
	'courbe-des-possibles': {
		livre: 'morar',
		texte:
			"La route de Xenen ne promet pas d'arriver : elle promet de continuer. Sur la Courbe, chaque bifurcation offre une carte et en reprend une — c'est le prix du possible."
	},
	'halo-a-charniere': {
		livre: 'morar',
		texte:
			"Le cercle fêlé de Moras, monté sur charnière par des mains morar. Il bascule d'un bord à l'autre de la fêlure : la force un jour, l'endurance le lendemain — habitable, jamais immobile."
	},

	/* -------------------------------------------------- EXTENSION · VELAR */
	'sela-premiere-au-vent': {
		livre: 'eshar-velar',
		texte:
			"La plus jeune à avoir sauté. Sela ne demanda ni où menait la route ni ce qu'on y risquait — seulement si elle descendait. Elle court depuis, toujours première au vent."
	},
	'avel-rieur-des-retours': {
		livre: 'eshar-velar',
		texte:
			"Avel rit chaque fois qu'un être recule, car il sait ce que les Velar savent : tout retour est une piste d'élan. Son rire porte jusqu'aux Korum — et il frappe."
	},
	'rebond-de-lumiere': {
		livre: 'eshar-velar',
		texte:
			"Le soleil des Velar frappe deux fois : au départ et au retour. Rappeler un des siens n'est pas une retraite — c'est armer le second coup."
	},
	'route-sans-rambarde': {
		livre: 'fracture',
		texte:
			"Les Velar peignent les virages après les avoir franchis. Leur route n'a pas de rambarde parce qu'une rambarde est une promesse de s'arrêter — et qu'ils n'en font pas."
	},
	'trait-de-soleil': {
		livre: 'fracture',
		texte:
			"Un javelot de pur matin, lancé par-dessus les remparts du Silence. Aucun mur ne l'a jamais arrêté : la lumière ne force pas les portes, elle les ignore."
	}
};
