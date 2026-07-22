# Audit complet — économie et gacha d’Expelled

Date : 22 juillet 2026  
Périmètre : dépôt `D:/Online TCG`, code source, routes, cartes, scripts, documentation, persistance, multijoueur, catalogue payant et fichiers générés.

## Verdict

L’économie actuelle est **beaucoup trop généreuse, circulaire et non sécurisée pour une mise en production**. Elle fonctionne comme prototype local, mais pas comme économie live :

- un gain de victoire IA paie exactement un booster ;
- les quêtes remboursent une partie des boosters qu’elles demandent d’ouvrir ;
- les doublons remboursent de plus en plus le booster à mesure que la collection avance ;
- une Prismatique doublon peut produire 75 Syllabes automatiquement, puis 50 de plus si elle est défaite ;
- une Full Art apparaît dans 20,90 % des boosters ;
- le God Pack tombe à 0,8 %, soit environ un sur 125 ;
- les données économiques et les récompenses sont modifiables côté navigateur ;
- les decks recommandés permettent de jouer des cartes non possédées, ce qui annule la fonction économique de la collection.

Note de maturité économique : **34/100**.

| Axe | Note | Diagnostic |
|---|---:|---|
| Lisibilité des taux | 8/10 | Taux publiés et simulation réelle de 3 M de boosters |
| Cohérence des monnaies | 4/10 | Bonne identité Éclats/Syllabes, mais boucles de remboursement excessives |
| Progression F2P | 3/10 | Débit illimité, objectifs consommés trop vite |
| Valeur du gacha | 4/10 | Full Art et God Pack trop fréquents pour rester désirables |
| Protection contre la malchance | 7/10 | Double pity claire, mais pity Full Art presque inutile |
| Boutique/crafting | 4/10 | Achat ciblé pertinent, prix et rendement incompatibles |
| Intégrité/anti-fraude | 0/10 | Autorité client, localStorage et metadata utilisateur modifiables |
| Monétisation | 2/10 | Produits payants cannibalisés par le gratuit et non déployables en l’état |
| Mesure/LiveOps | 2/10 | Pas de télémétrie, cohortes, sinks, budget ou tests économiques |

## 1. Périmètre réellement examiné

- `src/lib` : gacha, variantes, taux, paliers, économie, boutique, sauvegarde, compte, courrier, decks et moteur de jeu.
- `src/routes` : boosters, Glanage/Invocations, fiche carte, profil, decks, Arène IA, salons PvP, duel, raretés, registre et navigation.
- `cards` et `charter.json` : 60 cartes, répartition des raretés, variantes et limites de copies.
- `scripts` : mesure sur 3 M de boosters, calibration, génération des assets et tests de choix.
- `Expelled` et `docs` : monétisation, règles, set, lore, production, playtests et rapport de recherche.
- `pipeline` : forge/enrichissement des cartes; aucun flux économique supplémentaire.
- `static`, `drop`, assets de test et inspirations : aucun paramètre économique exécutable.
- `.github`, `.vscode`, `.gstack`, `.claude` : aucune règle live économique; traces historiques utiles pour identifier l’évolution du système.
- `tests` : règles de deck et moteur seulement; aucun test économique ou gacha.
- `build`, `.svelte-kit`, `node_modules` : artefacts générés ou dépendances, non considérés comme sources de vérité.

## 2. Carte de l’économie

### Éclats

Sources :

- dotation initiale : 300 ;
- victoire IA : 100 ; défaite IA : 40 ;
- victoire PvP : 150 ; défaite PvP : 60 ;
- quêtes quotidiennes : 130/jour ;
- quêtes hebdomadaires : 500/semaine, soit 71,4/jour ;
- 31 succès : 8 950 au total ;
- revente de surplus : 5/10/20/40/80 selon la rareté affichée ;
- courriers statiques, dont 100 000 et 999 999 pour un compte de test précis.

Sink principal : un booster = 100. Il n’existe aucun sink récurrent concurrent significatif.

### Syllabes

Sources :

- première Prismatique : 25 ;
- Prismatique déjà possédée : 75 ;
- déconstruction manuelle d’une Prismatique : 50 ;
- SP non prismatique : 15 ;
- Full Art ordinaire : 8.

Sink unique : acheter directement une version exacte, de 20 à 700 Syllabes.

Prix observés sur les 195 versions : médiane 95, quartiles 35/330, 90e percentile 550. Une Prismatique doublon finance donc presque à elle seule la version médiane; défaite ensuite, elle produit 125 Syllabes, plus que 50 % du catalogue.

## 3. Gacha réel

Un booster contient 5 cartes : 3 Communes, puis 80 % Rare/20 % Épique, puis 60 % Rare/25 % Épique/12 % Légendaire/3 % Prismatique.

Paramètres actuels :

- foil : 35 % par tirage éligible ;
- Full Art : 15 % sur les cartes éligibles ;
- art alternatif : 10 % **par art alternatif** ;
- God Pack : 0,8 % ;
- pity Prismatique : 40 boosters ;
- pity Full Art : 25 boosters.

Mesure existante sur 3 000 000 boosters :

- booster avec Prismatique : 4,52 %, soit environ 1 sur 22,1 ;
- booster avec Full Art : 20,90 %, soit environ 1 sur 4,8 ;
- sans pity, Full Art : 20,67 % ; la pity n’ajoute donc presque rien ;
- pire disette mesurée : 39 sans Prismatique, 25 sans Full Art.

Le God Pack à 1/125 donne 5 Full Arts. Sur un parcours de 114 boosters, la probabilité d’en voir au moins un est d’environ **60 %**. Ce n’est pas un événement mythique : il devient une étape attendue de la complétion.

La Full Art garantie de l’offre payante de 30 boosters n’a pratiquement aucune valeur : avec un taux naturel de 20,9 % par booster, la probabilité de n’en voir aucune sur 30 est voisine de 0,1 %, avant même la pity.

## 4. Progression et inflation

### Débit quotidien

Avec une seule victoire IA et toutes les quêtes correspondantes, un joueur reçoit environ 301 Éclats/jour en incluant la part hebdomadaire, soit 3 boosters. Cinq victoires le portent autour de 701 Éclats/jour, soit 7 boosters. Il n’existe ni plafond journalier de récompense de match, ni rendement décroissant, ni coût d’entrée.

La première victoire crée en plus une cascade : récompense de match, quête quotidienne, succès de première victoire, progression hebdomadaire et souvent quête de cartes jouées. Le onboarding distribue donc plusieurs boosters après une seule partie.

### Boucle auto-financée

- ouvrir un booster quotidien rembourse 30 Éclats ;
- ouvrir 5 boosters hebdomadaires rembourse 150, donc 30 par booster ;
- les surplus rendent des Éclats ;
- les cartes premium rendent des Syllabes ;
- les Syllabes achètent les trous de collection, accélérant encore les surplus.

Simulation d’un parcours avec conservation de 3 copies, déconstruction des Prismatiques excédentaires et revente automatique :

| Boosters | Syllabes cumulées | Syllabes/booster | Revente Éclats/booster |
|---:|---:|---:|---:|
| 10 | 55 | 5,50 | 0,00 |
| 100 | 625 | 6,25 | 12,05 |
| 500 | 4 200 | 8,40 | 34,24 |
| 1 000 | 9 336 | 9,34 | 44,26 |
| 10 000 | 105 113 | 10,51 | 57,79 |

Le rendement augmente avec l’ancienneté, exactement au moment où les sinks disparaissent. En fin de collection, la revente rembourse près de 58 % du coût brut moyen d’un booster; les quêtes d’ouverture peuvent rapprocher le coût net de zéro.

### Complétion du set

La documentation annonce 114 boosters. Une simulation de 1 000 parcours donne :

- moyenne : 122 ;
- médiane : 112 ;
- 90e percentile : 193 ;
- 95e percentile : 222 ;
- seulement 52 % des joueurs ont fini à 114.

L’affirmation devrait être remplacée par une distribution, et préciser si « finir » signifie les 60 cartes de base, une copie jouable, un playset ou les 195 versions.

## 5. Défauts et exploits critiques

### P0 — toute l’économie est sous autorité client

Éclats, Syllabes, collection, decks, quêtes et succès vivent dans `localStorage`, puis sont copiés dans les metadata Supabase modifiables par l’utilisateur. Un joueur peut s’accorder monnaie, cartes et succès depuis la console. Aucune boutique payante ni classement compétitif ne peut s’appuyer dessus.

### P0 — les decks recommandés contournent la collection

L’atelier empêche correctement l’ajout d’une carte non possédée. En revanche, « Ajouter à mes decks » copie directement les 30 cartes d’un metadeck sans vérifier la collection. L’Arène et les salons valident la légalité structurelle, pas la propriété. Un joueur peut donc jouer gratuitement toutes les cartes recommandées; collectionner n’apporte plus de puissance jouable.

### P0 — récompenses PvP client et adversaire non fiable

Chaque client crédite localement sa récompense de fin de duel. Le transport PeerJS et l’hôte ne constituent pas une autorité économique serveur. Les résultats, actions et récompenses sont rejouables ou falsifiables.

### P1 — pity non synchronisée

`travelers-pity-v1` manque dans `PLAYER_KEYS`. La collection et l’économie montent dans le cloud, mais pas la pity. Changer d’appareil, nettoyer le stockage ou migrer un invité désynchronise les garanties. Le compteur est aussi directement éditable.

### P1 — mauvaise rareté lors de la revente automatique

La Full Art force visuellement `card.rarity = prism`. La revente automatique utilise cette rareté promue et paie donc 80 Éclats pour certains surplus Full Art, même lorsque la rareté source est Commune, Rare ou Épique. Le profil utilise ailleurs `sourceRarity`, ce qui crée deux valeurs de revente selon le chemin utilisé.

### P1 — double rémunération des Prismatiques

Une Prismatique doublon paie 75 Syllabes sans être consommée, puis peut être défaite pour 50. Le commentaire affirme éviter toute vente automatique, mais le résultat économique est une prime totale de 125 pour le même exemplaire.

### P1 — pré-tirage observable

Le prochain booster est tiré avant paiement afin de colorer sa lueur selon le meilleur contenu. Même sans afficher la carte, cette fuite d’information permet de distinguer la qualité du prochain pack. Un rechargement recrée le pré-tirage sans consommer le booster ni la pity : le joueur peut reroll jusqu’à obtenir une lueur favorable.

### P1 — reset et multi-comptes

La dotation de 300 est attribuée à tout nouvel espace local/nouveau compte. Sans ledger serveur, création de comptes, nettoyage de stockage et conflits de synchronisation permettent de répéter le starter grant.

### P2 — prix dynamiques instables

Les prix en Syllabes dérivent d’une simulation de 3 M de boosters et de la version la plus fréquente. Modifier une carte, une variante ou un taux peut donc changer le prix de tout le catalogue. Cela rend les soldes des joueurs et les objectifs de long terme imprévisibles entre deux versions.

### P2 — arts alternatifs non bornés globalement

`ALT_RATE` vaut 10 % pour chaque art. Ajouter des arts augmente donc mécaniquement la probabilité totale de quitter l’illustration de base. Il faut un budget total d’alts par carte, réparti entre les variantes.

### P2 — absence de tests économiques

Les tests vérifient les règles de deck, mais pas les invariants monétaires : atomicité achat/carte, non-négativité, idempotence des récompenses, bornes de pity, taux, valeur de revente, propriété des decks ou migration cloud.

## 6. Monétisation et conformité

Le catalogue prévoit 5 boosters à 4,99 €, 12 à 9,99 € et 30 à 19,99 €. À 3–7 boosters gratuits par jour, le gros lot représente seulement 4 à 10 jours d’activité. Le bonus « Full Art garantie » est statistiquement vide. Le passe promet en plus de doubler les Éclats, ce qui aggraverait l’inflation et accélérerait la falaise de contenu.

Le document de monétisation se contredit : il affirme que l’argent achète du rythme, puis vend directement des boosters aléatoires; il affirme ne vendre aucune carte à l’unité, alors que le Glanage vend exactement une version contre une monnaie secondaire — distinction narrative, pas économique.

Pour l’UE, les principes CPC 2025 exigent notamment un prix réel clair, l’absence de coûts masqués par les monnaies virtuelles, le respect du droit de rétractation et une protection renforcée des enfants. Les lignes directrices DSA sur les mineurs demandent d’éviter l’exposition des mineurs aux loot boxes payantes et aux mécanismes aléatoires assimilables. Une revue juridique par pays reste indispensable avant toute vente.

## 7. Recalibrage recommandé

### Cible de progression

- joueur léger : 1,5–2 boosters/jour ;
- joueur engagé : 2,5–3/jour ;
- plafond rémunéré : 3 victoires/jour, puis jeu non rémunéré ou XP cosmétique ;
- set de base médian : 6–8 semaines ;
- 90e percentile protégé par crafting/wildcards, pas par davantage de hasard ;
- versions premium : objectif de saison, pas conséquence automatique de la complétion de base.

### Éclats proposés

Point de départ à playtester :

- booster : 100 ; starter : 300 à conserver ;
- victoire IA 25, défaite 8 ; victoire PvP 35, défaite 12 ;
- récompense de match limitée aux 3 premières parties terminées par jour ;
- quotidiennes : 90–110 au total ; hebdomadaires : 250–350 ;
- supprimer les quêtes « ouvrir un booster » ou les transformer en XP/cosmétique ;
- succès totaux : viser 3 000–4 500 Éclats, surtout non répétables et étalés ;
- revente : utiliser toujours la rareté source et viser un remboursement tardif de 15–25 %, pas 58 %.

### Gacha proposé

Point de départ à mesurer, pas valeur finale :

- foil : 24 % ;
- Full Art : 6 % sur carte éligible, avec cible réelle d’un booster contenant une Full Art tous les 8–12 boosters ;
- arts alternatifs : budget total 8 % par carte, partagé entre ses alts ;
- God Pack : 0,10–0,20 % (1/1 000 à 1/500), ou conserver 0,8 % mais réduire fortement son contenu ;
- pity Prismatique : 40 acceptable ;
- pity Full Art : 35–40 après réduction du taux ;
- publier le taux par booster, le taux par version exacte et l’effet réel de la pity.

### Syllabes proposées

- première Prismatique : 5 ;
- doublon automatique : 0 ;
- défaire une Prismatique : 25 ;
- SP : 3 ; Full Art : 1 ;
- aucun cumul pour un même exemplaire ;
- prix fixes par classes lisibles, révisés seulement entre saisons : par exemple 40/70/120/200/300, avec multiplicateurs premium ;
- afficher la valeur de déconstruction avant confirmation et conserver un verrou sur les 3 premières copies jouables.

## 8. Architecture cible avant lancement

1. Mettre inventaire, soldes, pity, achats, résultats et récompenses dans des tables serveur.
2. Utiliser un ledger append-only : chaque crédit/débit a un identifiant idempotent, une raison et une date.
3. Ouvrir les boosters côté serveur avec transaction atomique : débit, tirage, pity, collection et doublons dans une seule opération.
4. Valider côté serveur la propriété des cartes d’un deck et le résultat des matchs rémunérés.
5. Séparer contenu jouable et versions cosmétiques : une version premium ne doit pas être une carte supplémentaire nécessaire au deck.
6. Ajouter télémétrie : sources/sinks quotidiens, solde médian, boosters/joueur, complétion P10/P50/P90, taux de craft, surplus, rétention après complétion.
7. Ajouter des tests Monte-Carlo et des invariants économiques bloquant le build si une dérive dépasse les bandes prévues.

## 9. Ordre d’action

### Immédiat — avant tout nouveau contenu

1. Corriger le contournement des decks recommandés.
2. Supprimer le double paiement des Prismatiques.
3. Corriger la rareté de revente automatique.
4. Retirer la fuite du pré-tirage et synchroniser la pity.
5. Réduire les récompenses répétables et supprimer les remboursements de quêtes d’ouverture.
6. Recalibrer Full Art/God Pack, puis régénérer les 3 M de boosters.

### Avant bêta publique

7. Créer le ledger serveur et les endpoints autoritaires.
8. Ajouter les tests économiques et un simulateur de cohortes.
9. Définir précisément « collection complète » et les objectifs de saison.
10. Tester deux économies sur de vrais joueurs pendant au moins 4–6 semaines.

### Avant monétisation

11. Retirer les boosters payants du premier lancement; commencer par les cosmétiques directs.
12. Repenser le passe sans doublement brut des Éclats.
13. Faire valider paiement, TVA, rétractation, mineurs et loot boxes pour chaque marché.

## Conclusion

Le cœur thématique est bon : Éclats pour explorer, Syllabes pour nommer. Le problème est mathématique et architectural. Aujourd’hui, chaque couche accélère la suivante, aucune ne freine durablement la création de valeur, et le client contrôle le registre. La priorité n’est donc pas de « rendre le gacha plus dur » isolément, mais de supprimer les boucles circulaires, fixer une vitesse de progression cible, protéger le joueur malchanceux par du ciblage, puis déplacer toute valeur sur une autorité serveur.
