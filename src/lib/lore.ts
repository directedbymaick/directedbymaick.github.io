/**
 * Le Korum, découpé pour la lecture web.
 *
 * Source : Expelled/KORUM.md, le récit d'Eshel. Chaque livre est rattaché à
 * l'illustration de la carte du personnage qu'il raconte, avec une note qui
 * explique ce que montre cette illustration et comment elle rejoint le texte —
 * sans ça, une image posée à côté d'un paragraphe n'est qu'une décoration.
 */

export interface Livre {
	id: string;
	num: string;
	titre: string;
	sousTitre: string;
	/** id de la carte dont l'illustration sert de gravure au chapitre */
	carte: string;
	/** ce que montre l'image, et pourquoi elle est ici */
	lecture: string;
	paragraphes: string[];
	/** une phrase détachée, mise en exergue */
	exergue?: string;
	/** liste optionnelle (les Neuf Prononcés, les trois états du halo…) */
	liste?: { terme: string; sens: string }[];
	/** autres cartes du set évoquées dans ce livre */
	renvois?: string[];
}

export const LIVRES: Livre[] = [
	{
		id: 'prononciation',
		num: 'I',
		titre: 'La Prononciation',
		sousTitre: 'Avant le temps, il n’y avait pas de mots',
		carte: 'koren',
		lecture:
			'Koren dirige les chœurs : mille voix qui répètent les Neuf jour et nuit. L’illustration le montre au centre de cette architecture sonore — le halo derrière lui n’est pas un ornement, c’est son nom encore tenu dans la parole de KOR.',
		paragraphes: [
			'Avant le temps, il n’y avait que les Concepts, silencieux, endormis dans ce qui n’était pas encore un monde. Puis KOR se prononça lui-même.',
			'Nul n’a jamais compris cet acte. Comment un mot peut-il se dire seul ? Les sages de tous les peuples butent encore sur cette question. Il existe des mystères qu’on ne traverse pas : on apprend seulement à bâtir autour d’eux.',
			'KOR parla, et parler fut faire. Neuf mots furent dits, en comptant le sien. On les nomme les Neuf Prononcés.'
		],
		exergue: 'Le dixième mot n’appartient pas encore à ce livre. Il viendra comme il est venu dans le monde : sans être invité.',
		liste: [
			{ terme: 'VAS', sens: 'la Création devint possible' },
			{ terme: 'XEN', sens: 'l’Existence donna une place aux choses' },
			{ terme: 'DOR', sens: 'l’Ordre sépara ce qui se confondait' },
			{ terme: 'ESH', sens: 'chaque être reçut un dedans' },
			{ terme: 'NER', sens: 'la Volonté entra dans les êtres' },
			{ terme: 'VEL', sens: 'la Puissance suivit la Volonté' },
			{ terme: 'MOR', sens: 'les choses apprirent à changer sans mourir' },
			{ terme: 'THA', sens: 'les volontés purent s’opposer' }
		],
		renvois: ['koren', 'vasis-assemble']
	},
	{
		id: 'halos',
		num: 'II',
		titre: 'Les Halos',
		sousTitre: 'Un nom rendu visible',
		carte: 'doras',
		lecture:
			'Le cercle de lumière au-dessus de la tête n’est ni une couronne ni une récompense : c’est le nom encore tenu dans la parole de KOR. Regardez-le sur chaque illustration du Registre — son état raconte la situation du personnage avant même son texte de règles.',
		paragraphes: [
			'Quand KOR eut prononcé le monde, il prononça les noms. Chaque être reçut le sien : une syllabe de l’Origine, dite une fois pour toutes. Et parce que dans cette langue dire c’est faire, le nom resta visible.',
			'Tant que le halo brille, l’être demeure accordé à l’Origine. Quand il se brise, ses fragments tombent avec celui qui le portait.'
		],
		liste: [
			{ terme: 'Un nom qu’on oublie', sens: 'ternit' },
			{ terme: 'Un nom retranché', sens: 'se fend' },
			{ terme: 'Un nom banni', sens: 'se brise' }
		],
		renvois: ['doras', 'eshna']
	},
	{
		id: 'premiers',
		num: 'III',
		titre: 'Les Premiers',
		sousTitre: 'Ceux par qui tout ce qui suivit passa',
		carte: 'talvas',
		lecture:
			'Les Vasar ne créaient pas : ils tenaient ouverts les mots déjà dits. C’est pourquoi leurs illustrations sont des postures de garde, jamais d’action — ils sont là pour que rien ne se referme.',
		paragraphes: [
			'Les premiers êtres furent prononcés pour garder le monde. On les nomma les Vasar, peuple de la Création.',
			'Koren fut le premier prononcé ; KOR lui confia les chœurs. Il aimait les mots d’un amour entier — c’était sa grandeur, et sa faille. Il aimait parfois les mots plus que ce qu’ils faisaient vivre.',
			'Doran reçut la syllabe de l’Ordre. Juste, patient, sans cruauté. Il avait pourtant une peur : que le monde se défasse par négligence. Chez les êtres d’ordre, la peur se déguise volontiers en devoir.',
			'Thalen portait le Conflit ; on en fit une sentinelle aux lisières. Velna était la voix la plus vive des chœurs, et demandait pourquoi répéter quand on a la force de dire du neuf. Moras portait la Mutation, et fut envoyé regarder vivre les humains. Rasen était jeune, sans office, et posait tout haut les questions que les autres taisaient.',
			'Et Eshel tenait les registres des noms. De peu d’importance. C’est peut-être pour cela qu’il a survécu.'
		],
		renvois: ['koren', 'doran', 'thalen', 'velna', 'moras', 'rasen', 'eshel']
	},
	{
		id: 'ex',
		num: 'IV',
		titre: 'Le mot que nul n’avait dit',
		sousTitre: 'EX. Hors.',
		carte: 'thalen',
		lecture:
			'Thalen est représenté en écoute, pas en garde : la sentinelle qui entend ce que les chœurs couvrent. Son regard ne vise rien — c’est le seul personnage du set dont l’illustration montre une attention tournée vers l’intérieur.',
		paragraphes: [
			'Thalen entendit un jour, sous les chœurs, un mot que les chœurs ne chantaient pas. Il l’entendit comme une fêlure dans une cloche : non pas un autre son, mais le même son devenu faux.',
			'Il fit son office et rapporta la chose à Doran. Le mot était impossible : la Création contient tout ce qui est. Un mot qui signifie « hors » affirme qu’il existe un dehors. Donc une limite. Donc une fin.',
			'Doran comprit cela d’un seul coup. Sa peur cessa d’être une prudence. Elle devint une fondation.'
		],
		exergue: 'Il ne s’en remit jamais.',
		renvois: ['thalen', 'echo-du-dixieme-mot']
	},
	{
		id: 'fracture',
		num: 'V',
		titre: 'La Fracture',
		sousTitre: 'EX entra dans KOR',
		carte: 'exen',
		lecture:
			'L’Envers n’est pas un lieu construit : c’est le négatif de Vasen, ce qui reste quand la lumière se retire. L’illustration garde l’architecture des chœurs mais l’éclaire par en dessous — même forme, autre régime.',
		paragraphes: [
			'Les pages qui décrivaient cet instant sont devenues blanches dans chaque copie. Ce livre porte sa blessure au milieu de lui, comme le monde. Voici ce qui peut encore s’écrire.',
			'L’Origine ne fut pas détruite : elle fut fêlée. Le cercle garda sa forme, mais perdit son intégrité. Comme tous les noms descendaient de KOR, la fêlure courut dans les noms.',
			'Tous les halos vacillèrent. Sur certains, loin des chœurs, là où personne ne regardait, la lumière se retira en laissant un trait noir — une ligne mince, comme une marée sombre sur la peau.'
		],
		exergue: 'Puis KOR se tut.',
		renvois: ['exen', 'porte-du-dehors', 'korsa']
	},
	{
		id: 'sentences',
		num: 'VI',
		titre: 'Les Sentences',
		sousTitre: 'Le silence est une place vide',
		carte: 'doran',
		lecture:
			'Doran ne brandit rien : il se tient droit, et c’est la chaîne d’or qui occupe l’image. Dans la Langue Première une sentence prend corps — ce que vous voyez n’est pas une arme, c’est un verdict devenu matière, chaque maillon portant un mot.',
		paragraphes: [
			'Tant que l’Origine parlait, nul n’aurait osé juger à sa place. Mais le silence est une place vide, et la peur de Doran s’y assit.',
			'Il convoqua le Vasis, ordre-tribunal fondé aux premiers jours, quand il n’existait encore ni faute ni fautif. On avait ri alors d’un juge sans accusés. Nul ne riait plus.',
			'Le premier jugé fut Rasen. Mille témoins l’avaient entendu prononcer EX, et la loi de Doran était simple : le mot est dans celui qui le dit. Rasen ne se défendit pas. Il posa seulement une question, et Doran ne répondit pas.',
			'La sentence devint une chaîne d’or. On la posa sur les épaules de Rasen ; le poids des mots l’arracha à Vasen, et son halo se brisa dans la chute. Ce fut le premier. Il y en eut d’autres — les marqués du trait noir, ceux qui les avaient fréquentés, ceux qui posaient des questions, ceux qui chantaient trop bas. La loi s’élargissait à mesure que la peur grandissait.'
		],
		exergue: 'Expulser, c’est mettre hors. Mettre hors, c’est prononcer EX. Pour chasser le mot impossible, Doran le prononça mille fois.',
		renvois: ['doran', 'premiere-chaine', 'sentence-dor', 'vasis-assemble']
	},
	{
		id: 'exar',
		num: 'VII',
		titre: 'Rasen et les Exar',
		sousTitre: 'Alors le dehors est à nous',
		carte: 'rasen',
		lecture:
			'Rasen porte sa chaîne — la même que celle de la Sentence, mais tenue autrement. L’illustration la place en évidence sur ses épaules : ce n’est plus un fardeau qu’on subit, c’est un titre qu’on montre.',
		paragraphes: [
			'Rasen tomba en colère. Au fond d’Exen, il reprit sa chaîne d’or et la porta non comme un fardeau mais comme un titre. Autour de lui se rassemblèrent les bannis les plus durs. Ils se nommèrent Exar.',
			'Ils veulent prononcer EX jusqu’au bout et voir ce qui existe de l’autre côté. Rasen ne pose presque plus de questions. Il n’en garde qu’une.'
		],
		exergue: 'Et si EX était le dernier mot de KOR ?',
		renvois: ['rasen', 'exva', 'exel', 'premiere-armee']
	},
	{
		id: 'morar',
		num: 'VIII',
		titre: 'Moras et les Morar',
		sousTitre: 'La chute devenue arrivée',
		carte: 'moras',
		lecture:
			'Le seul personnage du set dont l’illustration montre un sourire. Il tombe, et il sourit : c’est toute l’identité des Morar tenue dans une expression.',
		paragraphes: [
			'Moras tomba dans Xenen, précisément là où il avait passé des siècles à regarder vivre les humains. Il se releva, s’épousseta, puis sourit.',
			'Sa sentence voulait l’éloigner de Vasen. Elle l’avait conduit au seul lieu qu’il avait toujours aimé. Autour de lui se rassemblèrent ceux qui refusaient la colère de Rasen autant que la nostalgie du retour. Ils devinrent les Morar, peuple qui fit de la chute une arrivée.',
			'Un jour, on lui demanda pourquoi il avait souri.'
		],
		exergue: 'Parce que je tombais du bon côté.',
		renvois: ['moras', 'morek', 'morna']
	},
	{
		id: 'eshar',
		num: 'IX',
		titre: 'Les Eshar et les Velar',
		sousTitre: 'À moitié dits, ou brûlant leurs jours',
		carte: 'velna',
		lecture:
			'Velna ne tombe pas : elle saute. L’illustration la montre en chute volontaire, bras ouverts — la Puissance qui suit la Volonté, exactement comme le dit le mot VEL.',
		paragraphes: [
			'D’autres ne furent pas brisés d’un coup : on cessa simplement de les prononcer. Un nom qu’on ne dit plus ternit, puis s’efface. Ces êtres tombèrent lentement, usés syllabe après syllabe, et arrivèrent en bas à moitié dits. Ils devinrent les Eshar — esprits, échos, brumes à visage.',
			'Ils collectionnent les syllabes perdues. Certains d’entre eux en ont rassemblé assez pour reconstituer des noms entiers.',
			'Velna, elle, ne tomba pas : elle sauta. Ceux qui la suivirent devinrent les Velar, et brûlent leurs jours comme des torches.'
		],
		renvois: ['velna', 'eshel', 'eshna', 'eshin', 'velsa']
	},
	{
		id: 'silence',
		num: 'X',
		titre: 'L’âge du Silence',
		sousTitre: 'Le monde à l’heure où j’écris',
		carte: 'eshel',
		lecture:
			'Eshel est le copiste : le seul dont l’illustration montre des registres plutôt qu’une arme ou un halo intact. C’est par ses yeux que tout ce récit vous parvient — y compris ce qu’il n’a pas pu écrire.',
		paragraphes: [
			'En haut, Koren dirige les chœurs. Ils chantent plus fort que jamais : il est de ceux qui croient qu’un doute se noie sous le volume. La nuit, il mesure l’élan des mots déjà dits. Ce qu’il y lit, il ne l’a confié à personne — mais il a doublé les chœurs.',
			'Doran juge encore. Ses sentences se forgent plus vite et pèsent plus lourd. On dit qu’il garde la première chaîne, celle de Rasen, revenue d’Exen par une route que nul ne connaît. On dit qu’il la regarde longtemps.',
			'En bas, Exen grandit, car chaque sentence lui livre des recrues. Entre les mondes, les Eshar comptent les syllabes mortes, et le compte monte. Dans Xenen, les Morar vivent parmi les humains, les Velar brûlent leurs jours, et parfois, le soir, un enfant prononce un mot qui porte.',
			'Alors cinq peuples retiennent leur souffle.'
		],
		exergue: 'Très loin, ou très près — car la distance n’a pas de sens pour lui — KOR se tait.',
		renvois: ['eshel', 'doublement-des-choeurs', 'premiere-chaine']
	}
];

/** La question sur laquelle le copiste referme son livre. */
export const QUESTION_FINALE =
	'Le silence d’un créateur est-il un abandon, une punition, une attente, ou une place laissée libre ?';
