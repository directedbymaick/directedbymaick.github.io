# Référentiel d’audit opérationnel pour CCG et TCG

## Pourquoi le bon livrable est un manuel d’audit

Le document dont ton agent a besoin ne doit pas être une comparaison descriptive de trois licences, mais un **standard de contrôle exploitable**. La raison est simple : **Magic**, **Legends of Runeterra** et **Riftbound** ne sont pas seulement trois “bons jeux de cartes”, ce sont trois **configurations industrielles très différentes**. Magic opère à une échelle exceptionnelle, avec plus de 50 millions de joueurs au total, 13 millions de joueurs numériques enregistrés sur Arena, un réseau WPN présenté comme un canal majeur, et 1,72 milliard de dollars de revenus en 2025 sur l’ensemble tabletop + digital. LoR, à l’inverse, a officiellement réduit la taille et le périmètre de son équipe en 2024 et a annoncé de nouvelles options de monétisation pour Path of Champions afin de rendre le jeu plus soutenable. Riftbound, lui, est un TCG physique beaucoup plus récent, adossé à l’IP League of Legends, avec une feuille de route 2026 très structurée et un jeu organisé en expansion. En pratique, cela veut dire que **copier leurs sorties** serait une erreur, alors qu’**extraire leurs méthodes** est très utile. citeturn27view0turn13search8turn13search1turn16search5turn26view0

Le point central n’est donc pas “quel jeu est le meilleur ?”, mais **quels mécanismes de gouvernance, de design, de packaging, d’itération et de communication** rendent ces jeux auditables, corrigeables et extensibles. Magic montre la valeur d’un système identitaire centralisé et surveillé dans le temps ; LoR montre la force d’une lisibilité systémique très claire, mais aussi le coût d’un modèle économique qui n’atteint pas la soutenabilité visée ; Riftbound montre comment un TCG moderne peut documenter ses règles, son onboarding, ses raretés et son jeu organisé dès les premiers sets. C’est cette translation-là qu’il faut opérer : **de la culture générale vers l’instrument d’audit**. citeturn18view0turn18view1turn4search1turn7search1turn13search8turn17view0turn17view1turn17view2turn17view4

## Ce que les trois cas d’école enseignent vraiment

La première leçon est que les grands jeux durables reposent sur une **colonne vertébrale identitaire explicite**. Chez Magic, cette colonne est le **color pie**, que Wizards décrit comme le centre du jeu, à la fois mécanique, philosophique et flavorful ; Wizards l’a ensuite institutionnalisé via le **Council of Colors**, qui examine les cartes, discute les écarts et peut aller jusqu’à des verdicts de type “Must Change”. Chez LoR, cette colonne est la combinaison **champions + régions**, Riot présentant chaque région comme ayant son propre style et sa propre stratégie, et encourageant les synergies inter-régions. Chez Riftbound, ce rôle est joué par les **six domains**, explicitement définis comme des philosophies de pouvoir qui déterminent ce qu’un deck peut contenir. Pour un audit, la conséquence est directe : si ton jeu n’a pas d’axe identitaire aussi net, ton agent doit le détecter comme un risque systémique, pas comme un simple défaut de lore. citeturn18view0turn18view1turn15search1turn7search1turn25view0

La deuxième leçon est que la **lisibilité des décisions** vaut souvent plus que la sophistication brute. LoR a mis très tôt en avant une structure d’échanges alternés avec gestion du round et du droit d’attaque, ce qui rend chaque initiative lisible et permet d’analyser précisément le tempo, la menace et les fenêtres d’interaction. Riftbound fait quelque chose de proche mais plus “tabletop lisible” : champion, runes, battlefields, score à 8 points, règles de base pensées pour être prises en main rapidement. Magic, de son côté, montre qu’un jeu profond ne devient soutenable que lorsqu’il formalise ses standards : la normalisation du templating, la clarification des règles et la séparation entre règles “moteur” et expérience débutant reviennent explicitement dans ses documents et rétrospectives. Pour ton agent, cela veut dire qu’il doit auditer **la lisibilité des décisions tour par tour**, et pas seulement la richesse combinatoire. citeturn4search1turn17view1turn17view0turn18view1

La troisième leçon est que l’économie d’un CCG/TCG n’est jamais un appendice : c’est une **mécanique de produit**. Magic segmente volontairement ses offres par usage — Starter Kit pour apprendre, Commander Decks pour le multijoueur, Jumpstart pour le quick-play, Play Boosters pour le draft ou l’ouverture “plaisir” — et expose même publiquement les compositions de packs, les traitements spéciaux, les box toppers et les variantes de collection. LoR, en numérique, montre l’autre face du sujet : progression, récompenses, collection, mais aussi nécessité d’un modèle soutenable, ce que Riot a explicitement reconnu en 2024. Riftbound documente très tôt sa collectabilité, la structure de ses boosters, ses foils, ses cartes “rare or better” et publie même des correctifs post-lancement lorsqu’un problème de distribution est détecté. Pour l’audit, cela impose de traiter **collection, rareté, onboarding économique et soutenabilité** comme un seul bloc. citeturn19view0turn19view1turn28view0turn20view1turn13search1turn17view2turn17view3

La quatrième leçon est que la communauté ne se résume pas à un Discord : elle se construit par une **progression d’engagement**. Magic relie magasin local, Regional Championships, Pro Tour et World Championship au sein d’un chemin officiel de qualification. LoR avait installé une échelle compétitive explicite avec ses Seasonal Tournaments et 1 024 qualifiés par shard à l’époque du lancement du circuit. Riftbound a, dès sa première phase de vie, articulé Regional Qualifiers, circuits additionnels, formats Best-of, open decklists, updates de tournoi et calendrier annuel détaillé. Ton agent doit donc contrôler si ton jeu sait créer un **chemin de progression communauté → compétition → fidélité**, même si tu ne vises pas un esport massif. citeturn18view4turn18view5turn7search20turn17view4turn25view1turn26view0

La cinquième leçon est industrielle : les meilleurs jeux ne se contentent pas de “designer de bonnes cartes”, ils bâtissent des **systèmes d’itération documentés**. Wizards publie des rétrospectives annuelles de design et insiste sur l’importance d’un regard critique récurrent sur ses sets. Riot a documenté pour LoR des outils qui permettent aux designers d’itérer sans dépendance constante à l’ingénierie, ainsi qu’une pipeline CI/CD et des bundles de données cartes contenant rendus, arts alternatifs et illustrations full size. Riftbound, dès le départ, sépare Core Rules, Tournament Rules, updates de banlist, changelogs et roadmap. Ton référentiel d’audit doit donc évaluer non seulement le jeu, mais aussi **ta capacité à le corriger proprement**. citeturn18view2turn23view1turn23view2turn23view0turn17view0turn26view1

## Structure obligatoire de chaque module d’audit

Chaque module de ton référentiel doit suivre une structure **rigoureusement identique**, pour que l’agent puisse comparer les résultats entre modules, générer des priorités, puis revenir plus tard avec une analyse stable. Cette exigence n’est pas théorique : Magic formalise déjà des catégories de revue (“Fine”, “Second Look”, “Strongly Reconsider”, “Must Change”) pour ses cartes ; Wizards pratique aussi une rétrospective annuelle ; Riftbound publie des règles centrales, des règles de tournoi et des mises à jour ciblées ; LoR a dû passer par des communications de pivot et de suppression de mode comme Expeditions lorsque certains choix ne justifiaient plus les ressources engagées. Le bon format d’audit doit donc être pensé pour rendre visibles à la fois **la qualité présente** et **la trajectoire corrective**. citeturn18view1turn18view2turn17view0turn26view1turn0search9turn13search8

Le squelette conseillé est le suivant :

| Champ obligatoire | Ce qu’il doit contenir |
|---|---|
| Principe de conception observé | La règle de design ou de production sous-jacente |
| Exemples chez Magic, LoR et Riftbound | Cas comparatifs utiles, pas anecdotes gratuites |
| Pourquoi cela fonctionne ou échoue | Cause réelle, pas simple préférence |
| Signaux d’alerte dans ton jeu | Symptômes détectables carte, règle ou produit en main |
| Questions d’audit précises | Questions fermées ou semi-fermées auxquelles l’agent peut répondre |
| Critères de notation | Barème /10 ou /5 avec définition explicite |
| Actions correctives recommandées | Correctif minimal, correctif ambitieux, dette à long terme |
| Priorité, coût et risque | Impact business + impact expérience + effort + danger secondaire |

Pour éviter que l’agent produise des généralités, chaque constat doit être formulé dans un format probant : **défaut → preuve → conséquence → correctif → protocole de test**. Sur ce point, l’exemple de Riftbound est utile : les docs officiels distinguent déjà règles de base, règles de tournoi, deck registration et changements de banlists ; Magic distingue design system, play design et circuits compétitifs ; LoR montre qu’un jeu qui ne structure pas explicitement ses arbitrages finit par devoir les rendre publics plus brutalement lors d’un pivot stratégique. citeturn25view1turn17view0turn17view4turn17view5turn13search8turn13search1

## Matrice d’audit opérationnelle

La matrice ci-dessous ne doit pas être lue comme une checklist abstraite. Elle est la **traduction opératoire** de ce que montrent les trois cas d’école : Magic met l’accent sur l’identité systémique, la segmentation produit et le jeu organisé ; LoR sur la lisibilité des échanges, l’intégration IP et l’outillage numérique ; Riftbound sur la documentation de lancement, la deck construction contrainte, la rareté et l’OP évolutif. citeturn18view1turn19view0turn20view0turn7search1turn4search1turn23view0turn17view0turn25view0turn17view2turn17view4

| Module | Ce que l’agent doit vérifier | Signaux d’alerte | Indicateurs de notation |
|---|---|---|---|
| Vision et positionnement | La promesse tient-elle en une phrase ? Le jeu a-t-il une raison d’exister autre que “nouveau TCG” ? La complexité cible correspond-elle au public ? | Pitch générique, cible floue, ambition hors moyens, mélange concurrentiel sans angle propre | Clarté de promesse, différenciation, adéquation cible/scope |
| Boucle de jeu fondamentale | La condition de victoire crée-t-elle des décisions intéressantes ? Le système de ressources, le tempo et l’interaction adverse sont-ils lisibles ? | Parties décidées trop tôt, premier joueur trop avantagé, tours sans décision, états bloqués | Lisibilité du tour, densité de décision, tension, comeback |
| Architecture des cartes | Les types, coûts, stats, seuils et mots-clés sont-ils cohérents et extensibles ? | Texte trop long, exceptions en cascade, mémoire cachée, valeurs non normalisées | Cohérence des gabarits, densité textuelle, espace de design restant |
| Factions, couleurs ou classes | Chaque groupe a-t-il une philosophie, une frontière mécanique et une silhouette reconnaissables ? | Factions interchangeables, faiblesses compensées partout, simple variation de chiffres | Identité narrative, identité mécanique, différenciation, extensibilité |
| Deckbuilding | Le deckbuilding produit-il de vrais choix ou seulement un puzzle imposé ? | Decks “solvés” par les designers, sorties trop instables ou trop scriptées, sideboard sans intérêt | Liberté de construction, lisibilité des contraintes, profondeur experte |
| Équilibrage | Existe-t-il une baseline explicite des coûts et des effets ? | Staples omniprésentes, polarisation extrême des matchups, power creep, parties non interactives | Diversité, qualité des archétypes, santé du méta, cadre de correction |
| Narration et worldbuilding | Les mécaniques expriment-elles vraiment le monde et ses conflits ? | Lore décoratif, noms génériques, absence de règles du monde, personnages sans rôle ludique | Cohérence interne, ludonarration, mémorabilité de l’univers |
| Qualité rédactionnelle | Les textes se lisent-ils vite, sans ambiguïté, avec une terminologie stable ? | Synonymes inutiles, clauses contradictoires, ton instable, noms oubliables | Clarté, uniformité, ton, localisation, force mnésique |
| Direction artistique | Les œuvres installent-elles une identité globale et des marqueurs de faction lisibles ? | Illustrations “génériques”, silhouettes confuses, palette incohérente, soupçon d’“AI slop” | Cohérence visuelle, qualité d’exécution, narration visuelle |
| Design graphique des cartes | L’information la plus importante est-elle visible en un coup d’œil ? | Hiérarchie confuse, contraste faible, stats peu visibles, rareté mal signalée | Lisibilité, hiérarchie, accessibilité, reconnaissance à distance |
| Collection et raretés | Chaque rareté a-t-elle une fonction claire distincte de la puissance compétitive ? | Pay-to-win via rareté, chase cards mal calibrées, doublons frustrants | Valeur perçue, équité compétitive, plaisir d’ouverture |
| Produits et modèle économique | L’offre produit sert-elle bien différents profils de joueurs ? | Entrée trop chère, cadence intenable, marge boutique négligée, gamme confuse | Accessibilité, segmentation, soutenabilité, clarté commerciale |
| Onboarding et expérience débutant | Un nouveau joueur prend-il du plaisir avant d’être noyé par les règles ? | Première partie passive, tutoriel trop verbeux, decks d’intro trompeurs | Temps avant première décision intéressante, confiance, retour session 2 |
| Jeu organisé et communauté | Le jeu propose-t-il une boucle locale, sociale et compétitive cohérente ? | Pas de chemin novice→régulier, soutien boutique absent, règles de tournoi floues | Continuité communautaire, spectacle, rétention compétitive |
| Marketing et construction de marque | Le nom, le visuel et la campagne expriment-ils une promesse singulière ? | Branding interchangeable, campagnes sans angle, previews sans dramaturgie | Mémorisation, conversion, cohérence de campagne |
| Production et développement | Le studio peut-il produire, tester, corriger, localiser et imprimer sans chaos ? | Aucune cadence de review, absence de versioning, playtests non instrumentés | Gouvernance, qualité process, vitesse d’itération, traçabilité |

Cette matrice doit être appliquée **dans cet ordre**, parce qu’un défaut amont fausse souvent l’aval. Si la vision est floue, le deckbuilding imitera mal l’intention ; si l’identité des factions est floue, le balancing jugera des cartes dont les frontières sont déjà corrompues ; si le produit est mal segmenté, la communauté et le marketing compenseront mal un problème structurel. Les pratiques observées chez Wizards, Riot et Riftbound montrent toutes qu’un jeu sain traite **systèmes, produits et opérations comme un seul organisme**, pas comme des silos. citeturn18view1turn17view5turn27view0turn23view1turn17view4turn26view0

## Exemple détaillé d’un audit d’identité de faction

Le meilleur exemple de transformation d’une recherche concurrentielle en outil d’audit est l’**identité des factions**. Magic fournit le cas le plus net avec son color pie, défini comme le centre du jeu et protégé par un conseil de revue qui veille à préserver forces et faiblesses ; LoR propose des régions au style et à la stratégie propres, combinables avec des champions et des alliés pour créer des synergies ; Riftbound formalise six domains comme philosophies de pouvoir qui limitent ce qu’un deck peut contenir. Autrement dit, dans les trois cas, l’identité n’est pas un vernis : c’est un **système de permissions et d’interdictions**. citeturn18view0turn18view1turn7search1turn15search1turn25view0

Pour ton agent, le module doit être écrit comme ceci :

| Critère | Ce qu’un 10/10 signifie |
|---|---|
| Identité narrative | La faction exprime une philosophie claire, formulable en une phrase, présente dans les noms, le ton et le monde |
| Identité mécanique | Les actions signatures de la faction sont immédiatement reconnaissables et non interchangeables |
| Cohérence visuelle | Palette, silhouettes, matériaux et motifs permettent la reconnaissance sans symbole |
| Différenciation | La faction n’est pas une simple variante statistique d’une autre |
| Profondeur stratégique | Elle permet plusieurs archétypes sans perdre son cœur identitaire |
| Potentiel d’extension | Elle garde de la place pour trois à cinq extensions sans devoir trahir son ADN |

Les questions d’audit doivent rester très concrètes. L’agent doit pouvoir répondre factuellement à des questions comme : **La faction a-t-elle une faiblesse qu’elle ne peut pas contourner sans aide externe ?** **Peut-on reconnaître trois cartes anonymisées comme appartenant à cette faction ?** **Les mécaniques signatures apparaissent-elles sur plusieurs raretés et plusieurs courbes de coût ?** **Les noms, verbes et métaphores utilisés appartiennent-ils tous au même monde ?** **Les archétypes possibles sont-ils réellement distincts ou simplement des variantes “aggro / midrange / contrôle” sans saveur ?** Ces questions traduisent directement ce que Magic appelle la préservation des forces et faiblesses, ce que LoR recherche via les synergies champion-région, et ce que Riftbound encode via ses domains. citeturn18view1turn7search1turn15search1turn25view0

Les signaux d’alerte doivent aussi être normalisés. Les plus importants sont : **factions qui résolvent toutes les situations**, **mêmes removals et mêmes moteurs de pioche partout**, **vocabulaire inter-factions non différencié**, **mêmes silhouettes ou palettes**, **cartes “signature” jouables indifféremment ailleurs**, **archétypes obtenus uniquement en changeant les nombres**, et **nécessité d’ajouter des exceptions pour que la faction fonctionne**. Dans Magic, ce sont précisément les glissements que le Council of Colors essaie de stopper ; dans LoR, Riot a dû reconnaître que certaines constructions de champions “par paires” ou “par trois” compliquaient la rotation ; dans tout TCG naissant, ces glissements deviennent vite des dettes impossibles à corriger sans refonte. citeturn18view1turn0search18

La sortie de l’agent pour ce module doit ressembler à ceci :

| Champ | Contenu attendu |
|---|---|
| Défaut constaté | “Les factions A et C partagent la même logique de tempo et de punition” |
| Preuve | Cartes X17, X24, C03, C19 ; règle 4.2 ; guide de factions v0.8 |
| Conséquence sur l’expérience | Draft plus plat, deckbuilding moins expressif, lecture du board affaiblie |
| Solution minimale | Retirer à la faction C l’accès à tel outil de contrôle et réallouer un moteur défensif plus thématique |
| Solution ambitieuse | Réécrire la philosophie de la faction C et redistribuer 20 à 30 cartes sur trois extensions |
| Cartes ou systèmes affectés | Set de base, règles de keywords, guide d’illustration, decks d’intro |

En pratique, ce module doit être relié à deux tests. Le premier est un **blind test de reconnaissance** : on masque le symbole de faction et on mesure si des joueurs reconnaissent la faction via art, nom, frame et mécanique. Le second est un **test de frontière** : on demande à des designers de proposer dix nouvelles cartes pour chaque faction ; si les propositions convergent toutes vers les mêmes zones de mécanique et de ton, la frontière est claire ; si elles dérivent dans tous les sens, l’identité est sous-spécifiée. C’est exactement le type de robustesse que l’on voit dans les systèmes les plus encadrés : le color pie de Magic, les régions de LoR et les domains de Riftbound. citeturn18view0turn18view1turn7search2turn25view0

## Modèle de scoring, backlog et sortie agentique

Le score global doit être **pondéré par l’ambition réelle du jeu**, pas par un idéal abstrait. Un TCG physique collectionnable n’a pas les mêmes priorités qu’un CCG numérique très onboarding-first. Les cas étudiés le montrent bien : Magic opère avec une segmentation produit lourde, une chaîne compétitive complète et une forte valeur de collection ; LoR a longtemps mis en avant lisibilité, synergies et accessibilité numérique ; Riftbound documente très fortement ses produits, sa deck construction, sa collectabilité et son calendrier d’événements. Il faut donc cesser de viser une note “universelle” et calculer un score aligné sur la promesse du projet. citeturn19view0turn20view0turn20view1turn17view2turn25view1turn26view0

Une pondération par défaut crédible pour un TCG compétitif accessible pourrait être la suivante :

| Module | Poids |
|---|---:|
| Vision et positionnement | 8 |
| Boucle de jeu fondamentale | 12 |
| Architecture des cartes | 10 |
| Factions, couleurs ou classes | 8 |
| Deckbuilding | 8 |
| Équilibrage | 12 |
| Narration et worldbuilding | 5 |
| Qualité rédactionnelle | 6 |
| Direction artistique | 5 |
| Design graphique des cartes | 6 |
| Collection et raretés | 5 |
| Produits et modèle économique | 4 |
| Onboarding débutant | 5 |
| Jeu organisé et communauté | 3 |
| Marketing et marque | 2 |
| Production et développement | 11 |
| **Total** | **100** |

La carte des risques doit être indépendante de la note. Un jeu peut avoir 74/100 et porter pourtant un risque **critique** si sa rareté pilote la puissance compétitive, si son texte de règles n’est pas arbitralement stable, ou si son identité de factions est déjà corrompue. Magic traite ce point via des procédures d’escalade de design et un écosystème compétitif très encadré ; Riftbound le formalise tôt via deck registration, open decklists et updates fréquents de règles ou de banlists ; LoR montre qu’un système ou un mode qui n’atteint plus son objectif doit être réévalué, voire retiré, plutôt que protégé par inertie. citeturn18view1turn18view4turn25view1turn26view1turn0search9turn13search8

Le backlog d’amélioration doit donc être structuré au minimum comme suit :

| Problème | Impact | Urgence | Effort | Recommandation |
|---|---:|---:|---:|---|
| Identités de factions trop proches | Élevé | Élevée | Moyen | Redéfinir leurs frontières mécaniques |
| Textes trop longs | Élevé | Moyenne | Faible | Normaliser le templating |
| Rareté liée à la puissance | Critique | Élevée | Moyen | Séparer valeur compétitive et valeur de collection |
| Cadence produits intenable | Élevé | Élevée | Élevé | Réduire la fréquence des sorties avant l’impression à grande échelle |

Enfin, la sortie idéale de l’agent ne doit pas être un texte libre, mais un **objet exploitable**. Voici une structure de référence :

```json
{
  "global_score": 0,
  "weights": {},
  "module_scores": [
    {
      "module": "",
      "score": 0,
      "confidence": 0,
      "evidence": [],
      "alerts": [],
      "strengths": [],
      "weaknesses": [],
      "recommended_actions": []
    }
  ],
  "risks": [
    {
      "severity": "critique|majeur|modere|mineur",
      "module": "",
      "issue": "",
      "why_it_matters": "",
      "proof": [],
      "mitigation": "",
      "test_protocol": "",
      "success_metrics": []
    }
  ],
  "backlog": [
    {
      "title": "",
      "impact": "",
      "urgency": "",
      "effort": "",
      "owner": "",
      "depends_on": [],
      "before_after_example": ""
    }
  ],
  "roadmap": {
    "immediate": [],
    "before_public_prototype": [],
    "before_print": [],
    "post_launch": [],
    "later_extensions": []
  },
  "proof_annex": {
    "cards": [],
    "rules": [],
    "products": [],
    "playtest_logs": [],
    "art_guides": []
  }
}
```

Le point décisif est le dernier champ : **proof_annex**. La recherche sur Magic, LoR et Riftbound reste précieuse, mais uniquement comme **bibliothèque de preuves et de méthodes**. Elle doit réunir, par exemple, les documents sur le color pie et ses revues, les product guides et la segmentation des boosters chez Magic ; les docs sur régions, rounds, tooling, CI/CD, state of the game et pivot de soutenabilité chez LoR ; les Core Rules, deckbuilding rules, collectability breakdowns, roadmap, OP updates et postmortems de lancement chez Riftbound. Le cœur du document, lui, doit rester un **manuel d’audit agentique** capable d’examiner ton jeu carte par carte, règle par règle, produit par produit, puis de proposer des corrections applicables. citeturn18view1turn18view2turn19view0turn20view1turn23view0turn23view1turn23view2turn13search8turn17view0turn17view2turn17view3turn17view4turn26view0