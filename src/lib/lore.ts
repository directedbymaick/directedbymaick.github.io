/** Le Korum, adapté en mini-livres pour la lecture web. */

export interface PageLore {
	surtitre?: string;
	titre?: string;
	paragraphes: string[];
	citation?: string;
}

export interface Livre {
	id: string;
	num: string;
	titre: string;
	sousTitre: string;
	carte: string;
	lecture: string;
	pages: PageLore[];
	liste?: { terme: string; sens: string }[];
	renvois?: string[];
}

export const LIVRES: Livre[] = [
	{
		id: 'prononciation',
		num: 'I',
		titre: 'La Prononciation',
		sousTitre: 'Lorsque parler signifiait créer',
		carte: 'koren',
		lecture:
			'Koren ouvre les bras comme un chef de chœur. Son épée demeure suspendue, pointe basse : à cette heure du récit, sa voix compte davantage que sa force. Derrière lui, le cercle intact affirme que son nom est encore pleinement tenu par KOR.',
		pages: [
			{
				surtitre: 'Avant le premier matin',
				titre: 'Le mot qui se dit lui-même',
				paragraphes: [
					'Avant le temps, rien ne pouvait encore être nommé. Il n’existait ni ciel sous lequel lever les yeux, ni sol sur lequel se tenir. Seuls demeuraient les Concepts : des vérités sans forme, immobiles dans ce qui n’était pas encore le silence.',
					'Alors KOR se prononça lui-même. Nulle bouche ne forma le son. Nul témoin ne put dire s’il avait entendu une voix ou senti le vide se refermer autour d’un centre. Pourtant, à l’instant où le mot exista, l’Origine fut là.',
					'Les sages butent encore sur ce paradoxe. Comment un mot peut-il précéder celui qui le prononce ? Eshel écrivit dans la marge de la plus ancienne copie : certains mystères ne sont pas des portes. On ne les franchit pas ; on apprend à bâtir autour.'
				],
				citation: 'KOR parla, et parler fut faire.'
			},
			{
				surtitre: 'Les Neuf Prononcés',
				titre: 'Une loi pour chaque chose',
				paragraphes: [
					'KOR dit VAS, et la Création devint possible. Il dit XEN, et chaque chose reçut une place. DOR sépara ce qui se confondait ; ESH donna un dedans aux êtres ; NER fit naître en eux le désir d’agir.',
					'Puis vinrent VEL, la puissance qui accomplit la volonté ; MOR, le changement qui permet de devenir sans disparaître ; et THA, le conflit qui oppose deux volontés sans abolir le monde entre elles.',
					'À mesure que les mots étaient prononcés, le vide reculait. Les premières montagnes ne furent pas soulevées : elles répondirent à leur nom. Les mers ne furent pas versées : elles comprirent où finir. Ainsi naquit un monde dont chaque frontière était une phrase de l’Origine.'
				]
			},
			{
				surtitre: 'La première voix',
				titre: 'Koren reçoit les chœurs',
				paragraphes: [
					'Lorsque la Création fut assez vaste pour porter des êtres, KOR prononça Koren. Il fut le premier à ouvrir les yeux sous un ciel déjà nommé. L’Origine lui confia les chœurs et une tâche dont il ne mesurerait le poids que bien plus tard : répéter les Neuf afin que le monde n’oublie jamais sa forme.',
					'Koren chanta seul, puis mille voix naquirent autour de la sienne. Il aimait les mots avec une ferveur entière. Il apprit leur mesure, leurs intervalles, la durée exacte pendant laquelle une syllabe pouvait vibrer sans altérer ce qu’elle soutenait.',
					'Cette dévotion fut sa grandeur. Elle devint aussi sa faille. Koren finit par aimer la perfection d’un mot davantage que l’être fragile dont ce mot était le nom.'
				],
				citation: '« Ce qui fut dit doit être redit. » — Koren'
			}
		],
		liste: [
			{ terme: 'VAS', sens: 'la Création' },
			{ terme: 'XEN', sens: 'l’Existence' },
			{ terme: 'DOR', sens: 'l’Ordre' },
			{ terme: 'ESH', sens: 'l’Essence' },
			{ terme: 'NER', sens: 'la Volonté' },
			{ terme: 'VEL', sens: 'la Puissance' },
			{ terme: 'MOR', sens: 'la Mutation' },
			{ terme: 'THA', sens: 'le Conflit' }
		],
		renvois: ['koren', 'recitation', 'vasis-assemble']
	},
	{
		id: 'halos',
		num: 'II',
		titre: 'Les Halos',
		sousTitre: 'Le nom rendu visible',
		carte: 'doras',
		lecture:
			'Le halo de Doras est un anneau plein, sans rupture. Il représente l’état d’un nom encore accordé à l’Origine. Chez les bannis, cette même géométrie se fend, se renverse ou devient une absence lumineuse.',
		pages: [
			{
				surtitre: 'Le don de KOR',
				titre: 'Une syllabe au-dessus de chaque front',
				paragraphes: [
					'Après avoir prononcé le monde, KOR se pencha sur les êtres qui l’habitaient. À chacun, il donna un nom véritable : non pas un son choisi pour le distinguer des autres, mais une syllabe de l’Origine qui définissait sa place, sa forme et sa continuité.',
					'Dans la Langue Première, un nom ne pouvait demeurer invisible. Il apparut au-dessus de chaque tête sous la forme d’un cercle de lumière. Les premiers êtres levèrent les yeux vers les halos de leurs voisins sans pouvoir contempler le leur.',
					'Ils crurent d’abord à des couronnes. KOR leur enseigna qu’il ne s’agissait ni d’un honneur ni d’une récompense. Le halo était une promesse : tant que le nom demeurerait dans sa parole, celui qui le portait aurait une place dans le monde.'
				]
			},
			{
				surtitre: 'Les gardiens des noms',
				titre: 'Ce que les Vasar surveillent',
				paragraphes: [
					'Les Vasar apprirent à lire la lumière. Une variation de couleur annonçait la fatigue ; un tremblement révélait un nom mal récité ; une ombre sur l’anneau signalait parfois qu’un être s’éloignait de la fonction pour laquelle il avait été prononcé.',
					'Doras fut chargé des lignes extérieures de Vasen. Chaque matin, il parcourait les rangs et observait les halos avant même les visages. Il connaissait la géométrie exacte de milliers de noms, mais ignorait les rêves de presque tous ceux qui les portaient.',
					'Cette discipline fonda la sécurité de Vasen. Elle fonda aussi sa froideur. À force de protéger les noms, les gardiens oublièrent peu à peu d’écouter les êtres.'
				],
				citation: '« Chacun à sa place. Le monde tient ainsi. » — Doras'
			},
			{
				surtitre: 'Trois blessures',
				titre: 'Ternir, fendre, briser',
				paragraphes: [
					'Un nom oublié ternit. Sa lumière pâlit d’abord sur les bords, comme si le monde hésitait à reconnaître celui qu’elle désigne. Un nom retranché se fend : la sentence introduit dans le cercle une limite qui n’existait pas auparavant.',
					'Un nom banni se brise. Les fragments suivent l’être dans sa chute, mais leur éclat ne disparaît pas entièrement. Ils continuent de graviter autour de lui, témoins d’une appartenance refusée et d’une Origine incapable de reprendre tout à fait ce qu’elle a donné.',
					'Les Vasar nomment cela une déchéance. Les Exar y voient la preuve qu’une sentence ne peut abolir un nom. Les Eshar, eux, recueillent les fragments et se demandent depuis toujours si un cercle brisé peut être recomposé.'
				]
			}
		],
		liste: [
			{ terme: 'Oublié', sens: 'le halo ternit' },
			{ terme: 'Retranché', sens: 'le halo se fend' },
			{ terme: 'Banni', sens: 'le halo se brise' }
		],
		renvois: ['doras', 'eshna', 'exna']
	},
	{
		id: 'premiers',
		num: 'III',
		titre: 'Les Premiers',
		sousTitre: 'Six voix au commencement de Vasen',
		carte: 'talvas',
		lecture:
			'Talvas n’est pas un Premier, mais leur héritage : armure close, ailes déployées, mains sans arme. Derrière lui, les silhouettes se répètent. Chez les Vasar, l’individu s’efface volontiers derrière le rang.',
		pages: [
			{
				surtitre: 'Vasen',
				titre: 'La cité bâtie comme une phrase',
				paragraphes: [
					'Les premiers Vasar élevèrent Vasen au point où les mots de KOR résonnaient avec le plus de netteté. Les rues suivaient des lignes grammaticales ; les tours marquaient les pauses du chant ; au centre, les chœurs formaient un cercle assez vaste pour que mille voix puissent se voir.',
					'Koren dirigeait. Doran fixait les lois qui empêchaient les récitations de se contredire. Thalen gardait les lisières, là où l’écho des Neuf devenait incertain. Velna portait la note la plus vive. Moras observait les changements du monde. Eshel consignait les noms.',
					'Rasen, le plus jeune, n’avait reçu aucun grand office. Il allait d’un maître à l’autre, posant les questions que leur travail quotidien leur avait appris à éviter.'
				]
			},
			{
				surtitre: 'La mesure et l’élan',
				titre: 'Koren et Velna',
				paragraphes: [
					'Un soir, Velna interrompit sa propre note au milieu d’une répétition. Le silence fut si brutal que plusieurs choristes portèrent la main à leur halo. Koren abaissa la sienne et attendit.',
					'« Pourquoi répéter ce qui existe déjà ? demanda Velna. Si la Puissance vit en nous, pourquoi ne pas dire du neuf ? » Koren répondit que la force n’accordait aucun mandat. La Création appartenait à KOR ; leur devoir était de la maintenir, non de l’augmenter.',
					'Velna reprit sa place. Elle chanta juste jusqu’à l’aube. Pourtant, Moras remarqua qu’elle regardait désormais au-delà du cercle des chœurs chaque fois qu’elle prononçait VEL.'
				],
				citation: '« Pourquoi nous donner une voix, si toute parole nouvelle est interdite ? » — Velna'
			},
			{
				surtitre: 'La peur de l’Ordre',
				titre: 'Doran au bord du doute',
				paragraphes: [
					'Doran était juste. Elle écoutait chaque plainte jusqu’au bout et ne rendait jamais deux fois la même décision. Pourtant, elle observait le monde avec l’inquiétude de celle qui voit dans toute irrégularité le commencement d’un effondrement.',
					'Elle demanda à Eshel de tenir un second registre : non plus celui des noms, mais celui de leurs écarts. Eshel obéit. Les premières pages restèrent presque blanches. Une note trop longue, une aile déployée hors cérémonie, une question de Rasen dans la marge.',
					'Personne n’y vit alors la naissance d’un tribunal. Le Vasis n’était encore qu’une précaution sans accusé. Aux premiers jours, on plaisantait sur la gravité de Doran. Plus tard, nul ne se souvint exactement du moment où les rires cessèrent.'
				]
			}
		],
		renvois: ['koren', 'doran', 'thalen', 'velna', 'moras', 'rasen', 'eshel']
	},
	{
		id: 'ex',
		num: 'IV',
		titre: 'Sous les chœurs',
		sousTitre: 'Le mot que nul n’avait dit',
		carte: 'thalen',
		lecture:
			'Thalen n’est pas représentée en garde, mais en écoute. Son regard cherche une source invisible et les anneaux derrière elle refusent de former un cercle unique. L’image suspend l’instant où une sentinelle découvre que le danger vient de la parole elle-même.',
		pages: [
			{
				surtitre: 'La lisière occidentale',
				titre: 'Une fêlure dans la note',
				paragraphes: [
					'Thalen montait seule la garde lorsque le son lui parvint. Les chœurs récitaient au loin, réguliers comme le mouvement des astres. Entre deux reprises de VAS, quelque chose froissa l’harmonie.',
					'Ce n’était pas une autre voix. C’était la même voix devenue fausse, une fêlure courant à l’intérieur d’une cloche. Thalen retint son souffle. Le son revint, plus bas que le silence, et cette fois son esprit lui donna un sens.',
					'Hors. Le mot n’indiquait aucun lieu qu’elle connût. Il désignait précisément ce que la Création interdisait : un espace au-delà de tout ce qui existe.'
				],
				citation: 'EX.'
			},
			{
				surtitre: 'L’Oreille du silence',
				titre: 'Le rapport de Thalen',
				paragraphes: [
					'Doran reçut Thalen dans une salle sans fenêtre. Eshel se tenait derrière elle, plume levée. Thalen décrivit la note, l’intervalle et la sensation d’une limite ouverte sous ses pieds.',
					'« Répète le mot », ordonna Doran. Thalen refusa. Le visage de la juge ne trahit aucune colère, seulement une peur si nue qu’Eshel baissa les yeux. Doran demanda alors qu’on ferme les portes et qu’aucune copie du rapport ne quitte la salle.',
					'Thalen comprit trop tard le piège de son devoir : en révélant le danger, elle lui avait donné une place dans la pensée de trois êtres. Le mot impossible possédait désormais trois mémoires où survivre.'
				]
			},
			{
				surtitre: 'Le secret impossible',
				titre: 'Rasen pose la question',
				paragraphes: [
					'Un ordre de silence laisse toujours une forme autour de ce qu’il interdit. Rasen remarqua les portes closes, les gardes doublées et le tremblement nouveau dans la voix de Thalen. Il suivit cette absence jusqu’au registre d’Eshel.',
					'Devant les Vasar assemblés, il demanda pourquoi la lisière occidentale avait été placée sous scellés. Doran lui ordonna de se taire. Rasen leva les yeux vers les mille halos et posa la seule question qui pouvait rompre l’interdit.',
					'« Si dire, c’est faire, qui a fait hors ? » Mille êtres entendirent EX. Le mot entra dans mille mémoires. Ce ne fut ni une attaque ni une trahison, seulement une question innocente à laquelle la peur allait répondre par la violence.'
				]
			}
		],
		renvois: ['thalen', 'rasen', 'echo-du-dixieme-mot']
	},
	{
		id: 'fracture',
		num: 'V',
		titre: 'La Fracture',
		sousTitre: 'Le jour où l’Origine se tut',
		carte: 'exen',
		lecture:
			'Une cité vue d’en bas se referme autour d’un foyer rouge, à la manière d’un halo éclairé depuis l’Envers. C’est la seule gravure sans personnage : la Fracture dépasse tous ceux qui en furent témoins.',
		pages: [
			{
				surtitre: 'La page blanche',
				titre: 'Ce qui refuse d’être écrit',
				paragraphes: [
					'Eshel tenta sept fois de décrire la Fracture. Sept fois, l’encre disparut avant de sécher. Dans toutes les copies du Korum, les mêmes feuilles demeurent blanches, comme si la blessure du monde refusait de devenir un récit.',
					'Les survivants parlent d’une lumière repliée sur elle-même. Certains entendirent tous les mots à la fois ; d’autres n’entendirent rien et perdirent pourtant la voix pendant plusieurs jours. Koren affirma avoir senti une syllabe étrangère traverser le nom de chaque être.',
					'Voici la seule certitude que la page accepte encore : EX entra dans KOR.'
				],
				citation: 'Le livre porte sa blessure au milieu de lui, comme le monde.'
			},
			{
				surtitre: 'L’onde',
				titre: 'Tous les halos vacillèrent',
				paragraphes: [
					'L’Origine ne fut pas détruite. Son cercle conserva sa forme, mais une fêlure le traversa. Puisque tous les noms descendaient de KOR, la blessure courut en eux comme une ombre sous la peau.',
					'Dans les chœurs, les halos clignèrent d’un seul mouvement. Aux lisières, certains se ternirent. Sur des êtres que nul ne regardait, la lumière se retira en laissant un trait noir. Morna contempla la marque nouvelle sur son bras ; Morek sentit sa chaîne future avant même qu’elle fût forgée.',
					'Koren ordonna de reprendre la récitation. Les voix obéirent, d’abord tremblantes, puis de plus en plus fortes. Elles couvrirent les pleurs, les questions et le bruit léger des premiers noms qui commençaient à se défaire.'
				]
			},
			{
				surtitre: 'Après la dernière note',
				titre: 'Le silence de KOR',
				paragraphes: [
					'Ils attendirent une instruction. Koren prononça les formules d’appel. Doran réclama un jugement. Velna demanda seulement que l’Origine leur réponde. Aucun mot ne vint.',
					'Le monde continua pourtant. Les fleuves suivirent leur cours, le ciel resta suspendu et les êtres respirèrent encore. Mais tout avançait désormais sur l’élan d’une parole ancienne, comme une roue lancée par une main qui s’était retirée.',
					'Koren doubla les chœurs. Doran convoqua le Vasis. Eshel ouvrit un nouveau registre et écrivit au sommet de la première page : Âge du Silence.'
				],
				citation: 'Puis KOR se tut.'
			}
		],
		renvois: ['exen', 'porte-du-dehors', 'morna']
	},
	{
		id: 'sentences',
		num: 'VI',
		titre: 'Les Sentences',
		sousTitre: 'Quand la peur prit la place du silence',
		carte: 'doran',
		lecture:
			'Doran lève une main vide : un geste de verdict, non de combat. Son halo demeure entier au moment même où elle brise celui d’un autre. La sentence ne laisse aucune marque visible sur celle qui la prononce.',
		pages: [
			{
				surtitre: 'Le Vasis',
				titre: 'Un tribunal trouve ses accusés',
				paragraphes: [
					'Doran réunit le Vasis dans la salle des cercles. L’ordre avait été fondé aux premiers jours pour résoudre les contradictions de la Langue Première. Jusqu’alors, il n’avait connu ni crime véritable ni coupable.',
					'La juge présenta les marques noires comme une contamination. Elle affirma que le silence de KOR exigeait davantage de vigilance, non moins. Koren ne donna pas son assentiment. Il ne s’y opposa pas non plus.',
					'Ce silence-là suffit. Le Vasis vota la mise à l’écart de tous ceux qui avaient prononcé EX, puis de ceux dont le halo portait une marque, puis de ceux qui refusaient de dénoncer les marqués.'
				]
			},
			{
				surtitre: 'Le premier procès',
				titre: 'Rasen face à Doran',
				paragraphes: [
					'Rasen entra sans chaînes. Mille témoins l’avaient entendu poser sa question ; il ne nia rien. Doran lui demanda s’il regrettait d’avoir donné EX aux mémoires de Vasen.',
					'« Le mot était déjà dans la tienne », répondit-il. La salle se contracta autour de cette phrase. Doran répéta que le mot vivait dans celui qui le disait. Rasen leva alors les yeux vers elle.',
					'« Et dans celui qui le juge, le mot ne vit-il pas ? » Doran ne répondit pas. Elle prononça la sentence.'
				],
				citation: 'Une question fut jugée comme une faute, parce qu’aucune réponse ne pouvait lui survivre.'
			},
			{
				surtitre: 'La Première Chaîne',
				titre: 'Le poids des mots',
				paragraphes: [
					'Dans la Langue Première, une sentence ne demeure pas abstraite. Les mots de Doran se changèrent en maillons d’or et s’enroulèrent autour des épaules de Rasen. Chaque fragment du verdict ajoutait son poids au précédent.',
					'Le sol de Vasen refusa celui que sa loi venait de placer hors du monde. Rasen fut arraché à la cité. Son halo se fendit, puis éclata lorsqu’il franchit la lisière. Il tomba sans crier, les yeux fixés sur Doran.',
					'Il y en eut d’autres. Les listes s’allongèrent, et chaque nouveau nom rendit le suivant plus facile à condamner. Eshel comprit enfin l’ironie que le Vasis refusait de voir : expulser, c’était mettre hors. Mettre hors, c’était prononcer EX.'
				],
				citation: 'Pour chasser le mot impossible, Doran le prononça mille fois.'
			}
		],
		renvois: ['doran', 'rasen', 'premiere-chaine', 'sentence-dor', 'vasis-assemble']
	},
	{
		id: 'exar',
		num: 'VII',
		titre: 'Les Bannis',
		sousTitre: 'Rasen et la naissance des Exar',
		carte: 'rasen',
		lecture:
			'Le halo de Rasen est devenu un disque noir qui occulte au lieu d’éclairer. La chaîne a disparu du portrait : il l’a déjà transformée en titre, puis en bannière.',
		pages: [
			{
				surtitre: 'La chute',
				titre: 'Exen reçoit le premier banni',
				paragraphes: [
					'Rasen tomba longtemps. Au-dessus de lui, Vasen se réduisit à un cercle de lumière, puis à un point. Autour, il ne vit d’abord qu’une nuit sans étoiles et les fragments de son halo qui chutaient à la même vitesse que lui.',
					'Lorsqu’il heurta Exen, la chaîne absorba le choc. Le sol était noir, parcouru de veines rouges qui répondaient faiblement à chaque maillon. Rasen resta étendu jusqu’à ce qu’une autre silhouette tombe au loin.',
					'Il se releva pour la chercher. Ce fut son premier acte dans l’Envers : non pas la vengeance, mais le refus de laisser un autre banni se réveiller seul.'
				]
			},
			{
				surtitre: 'Un peuple sans permission',
				titre: 'La chaîne devient un titre',
				paragraphes: [
					'Les condamnés arrivèrent par dizaines. Certains suppliaient qu’on les renvoie ; d’autres ne parlaient plus. Rasen leur montra sa chaîne et lut à voix haute les mots du verdict. À la dernière ligne, il rit.',
					'« Ils ont écrit que je n’ai plus de place dans leur monde. Alors cette absence sera la nôtre. » Il passa la chaîne sur ses épaules comme on revêt un manteau. Un à un, les bannis firent de même avec les leurs.',
					'Ils se nommèrent Exar : non parce que le Vasis le leur ordonnait, mais parce qu’ils choisissaient enfin le mot par lequel le monde les reconnaîtrait.'
				],
				citation: '« Vous nous avez jetés dehors. Nous en avons fait un royaume. »'
			},
			{
				surtitre: 'La Porte',
				titre: 'Ce qui attend de l’autre côté',
				paragraphes: [
					'Au plus profond d’Exen, les Exar découvrirent une arche qui ne menait nulle part. Lorsque Rasen prononça EX devant elle, l’espace entre ses montants devint plus sombre que la nuit environnante.',
					'Exva entendit quelque chose répondre. Korsa voulut briser l’arche. Rasen les arrêta toutes deux. Il avait appris ce que coûte une question posée trop tôt, mais il n’avait pas renoncé à obtenir une réponse.',
					'Depuis, les Exar rassemblent assez de Volonté pour ouvrir la Porte. Ils ne cherchent plus seulement à survivre au dehors. Ils veulent savoir si EX fut la blessure de KOR — ou son dernier mot.'
				]
			}
		],
		renvois: ['rasen', 'exva', 'exel', 'premiere-armee', 'porte-du-dehors']
	},
	{
		id: 'morar',
		num: 'VIII',
		titre: 'Le Bon Côté',
		sousTitre: 'Moras et ceux qui choisirent Xenen',
		carte: 'moras',
		lecture:
			'Moras sourit en pleine chute. Son halo se désagrège loin derrière lui, mais il ne le regarde pas. Sous ses pieds apparaissent les toits de Xenen : pour la première fois, tomber ressemble à une arrivée.',
		pages: [
			{
				surtitre: 'Xenen',
				titre: 'Une chute au milieu des vivants',
				paragraphes: [
					'Moras traversa un ciel chargé de pluie et s’écrasa dans une rue de Xenen. Les humains s’enfuirent devant ses ailes noircies. Une enfant resta pourtant sous un porche, trop fascinée pour avoir peur.',
					'Il se releva, vérifia que rien n’était brisé, puis contempla les enseignes, les fenêtres éclairées et les vêtements tendus entre les maisons. Pendant des siècles, il avait observé ce monde depuis les lisières. Il en respirait enfin l’odeur.',
					'L’enfant lui demanda s’il était tombé du ciel. Moras regarda le halo qui s’éteignait derrière les nuages et sourit. « Oui, répondit-il. Mais du bon côté. »'
				]
			},
			{
				surtitre: 'Apprendre à changer',
				titre: 'La première vie des Morar',
				paragraphes: [
					'D’autres bannis retrouvèrent Moras. Il leur apprit à dissimuler leurs ailes, à réparer leurs halos avec du métal humain et à porter des noms que la Langue Première n’avait jamais prononcés.',
					'Ce qui aurait été un sacrilège à Vasen devint une manière de survivre. Leur essence changea au contact de Xenen : les blessures se muèrent en motifs, les chaînes en bijoux, les anciennes fonctions en métiers choisis.',
					'Ils prirent le nom de Morar. Leur peuple ne serait défini ni par la sentence reçue ni par le retour espéré, mais par la liberté de devenir autre chose.'
				],
				citation: '« Nous ne remonterons pas. Nous deviendrons autre chose. »'
			},
			{
				surtitre: 'Les mots humains',
				titre: 'Le mensonge et le miracle',
				paragraphes: [
					'Les humains fascinaient Moras parce que leurs mots ne contraignaient pas le réel. Ils pouvaient promettre sans accomplir, nommer ce qui n’existait pas et raconter un avenir que personne n’avait encore créé.',
					'Les Vasar appelaient cela mentir. Moras y voyait une forme de liberté : les humains bâtissaient d’abord des mondes dans leur esprit, puis tentaient de les rendre vrais avec leurs mains.',
					'Un soir, l’enfant du porche prononça un mot qui porta. Une lampe éteinte se ralluma dans sa paume. Moras cessa de sourire. Très loin, cinq peuples tournèrent la tête vers Xenen.'
				]
			}
		],
		renvois: ['moras', 'tala', 'moren', 'enfant-de-xenen']
	},
	{
		id: 'eshar-velar',
		num: 'IX',
		titre: 'Deux Refus',
		sousTitre: 'Ceux qu’on oublia et ceux qui sautèrent',
		carte: 'velna',
		lecture:
			'Velna est vue de dos, tournée vers la lumière. Rien dans sa posture ne subit la chute. Son visage demeure caché parce que ce qu’elle choisit de regarder compte davantage que ce qu’elle abandonne.',
		pages: [
			{
				surtitre: 'Les noms effacés',
				titre: 'La naissance lente des Eshar',
				paragraphes: [
					'Tous les bannis ne reçurent pas de sentence. Certains furent simplement retirés des chants. Leur nom, privé de voix, pâlit nuit après nuit. Ils continuèrent de vivre assez longtemps pour assister à leur propre effacement.',
					'Lorsqu’ils tombèrent, ils n’avaient plus assez de forme pour atteindre Exen ou Xenen. Ils demeurèrent entre les mondes, silhouettes de brume dont le visage changeait selon celui qui les regardait.',
					'Eshel les rejoignit avec les registres volés au Vasis. Ensemble, ils recueillirent les syllabes abandonnées. Ils se nommèrent Eshar et firent de la mémoire un refuge que nul tribunal ne pourrait fermer.'
				],
				citation: 'Rien de dit ne se perd tout à fait.'
			},
			{
				surtitre: 'Le dernier chant de Velna',
				titre: 'La porte d’une maison vide',
				paragraphes: [
					'Velna ne fut jamais jugée. Elle était la gloire des chœurs, celle dont la note ramenait les autres voix à leur mesure. Pourtant, le silence de KOR avait changé le sens de chaque récitation.',
					'Au milieu d’un vers, elle cessa de chanter. Les mille voix s’arrêtèrent avec elle. Koren descendit de son estrade et lui ordonna de reprendre. Velna contempla les rangs, les halos parfaits et les portes fermées de Vasen.',
					'« Tu gardes la porte d’une maison vide, Koren. Moi, je choisis le ciel. » Elle lui tourna le dos et marcha jusqu’au bord du monde.'
				]
			},
			{
				surtitre: 'Les Velar',
				titre: 'Sauter au lieu de tomber',
				paragraphes: [
					'Velna écarta les ailes et sauta. Nulle chaîne ne la suivit. Son halo resta entier pendant la chute, puis se fendit de lui-même lorsque sa volonté l’emporta sur le nom reçu de KOR.',
					'D’autres la rejoignirent : les impatients, les brûlants, ceux que l’éternelle répétition étouffait. Ils prirent le nom de Velar et jurèrent de ne jamais demander la permission d’exister.',
					'Le Vasis les hait davantage encore que les Exar. Rasen conteste l’Ordre ; Velna démontre qu’on peut simplement s’en passer.'
				],
				citation: 'La Volonté suffit.'
			}
		],
		renvois: ['velna', 'eshel', 'eshna', 'eshin', 'velsa', 'bord-du-monde']
	},
	{
		id: 'silence',
		num: 'X',
		titre: 'L’Âge du Silence',
		sousTitre: 'Le monde à l’heure où Eshel écrit',
		carte: 'eshel',
		lecture:
			'Eshel ne tient ni arme ni chaîne, seulement un livre et une plume. Son halo n’est plus un cercle, mais des fragments violets encore capables de s’ordonner autour d’une page.',
		pages: [
			{
				surtitre: 'En haut',
				titre: 'Vasen chante plus fort',
				paragraphes: [
					'Koren dirige toujours les chœurs. Les rangs ont doublé, puis doublé encore. Il prétend que cette ferveur honore KOR, mais monte seul chaque nuit dans les Tours de la Syntaxe pour mesurer combien de temps les mots tiendront encore.',
					'Doran juge toujours. Les sentences sont plus rapides, les chaînes plus lourdes et les motifs d’accusation plus nombreux. Dans sa chambre, elle conserve la Première Chaîne, revenue d’Exen par une route que nul ne connaît.',
					'Parfois, elle en suit les mots du doigt jusqu’à la question de Rasen. Aucun garde ne sait si elle cherche une erreur dans la chaîne ou dans sa propre réponse.'
				]
			},
			{
				surtitre: 'En bas et entre les mondes',
				titre: 'Cinq peuples retiennent leur souffle',
				paragraphes: [
					'Exen grandit à chaque sentence. Les Exar fortifient la Porte et préparent le jour où ils prononceront EX d’une seule voix. À Xenen, les Morar vivent parmi les humains tandis que les Velar traversent le ciel comme des incendies.',
					'Entre les mondes, les Eshar comptent les syllabes mortes. Leur collection forme désormais des phrases entières. Eshel sait ce qu’elles pourraient accomplir, mais refuse encore de l’écrire.',
					'Puis un enfant humain prononce un mot qui porte. Une lampe se rallume. Une blessure se ferme. Une porte reste ouverte malgré le vent. Chaque fois, les cinq peuples l’entendent.'
				]
			},
			{
				surtitre: 'Dernière page du copiste',
				titre: 'La place laissée libre',
				paragraphes: [
					'J’écris pour toi, enfant de Xenen. Les Vasar te chercheront pour faire taire ce qu’ils ne contrôlent pas. Les Exar voudront que ta voix ouvre leur Porte. Les Eshar te demanderont de rendre les noms disparus. Les Morar te protégeront. Les Velar t’encourageront à parler encore.',
					'Je ne peux te dire lequel de ces chemins est juste. Je peux seulement te transmettre ce que le Vasis voulait effacer : aucun peuple ne possède toute la vérité, et même une sentence prononcée dans la Langue Première peut être fausse.',
					'Très loin, ou très près — car la distance n’a pas de sens pour lui — KOR se tait. Peut-être attend-il une nouvelle bouche. Peut-être son silence n’est-il pas une absence, mais une place laissée libre.'
				],
				citation: 'À présent, choisis le prochain mot.'
			}
		],
		renvois: ['eshel', 'koren', 'doran', 'rasen', 'enfant-de-xenen']
	}
];

export const QUESTION_FINALE =
	'Le silence d’un créateur est-il un abandon, une punition, une attente ou une place laissée libre ?';
