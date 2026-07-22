# EXPELLED — Règles v1

Version de travail destinée aux premiers tests.  
Objectif : obtenir un jeu lisible, rapide à prototyper, assez stable pour produire les premières
cartes du set **Nés du silence**.

---

## 1. But du jeu

Chaque joueur protège son **Korum**, fragment d'Origine qui maintient son camp dans le duel.

Un joueur gagne si le Korum adverse tombe à **0 Intégrité**.

Valeur de départ recommandée :

```text
Korum : 25 Intégrité
```

---

## 2. Matériel

Chaque joueur utilise :

- un deck de 30 cartes ;
- un Korum à 25 Intégrité ;
- une réserve de Volonté ;
- une zone de jeu ;
- une défausse ;
- une zone d'exil.

---

## 3. Types de cartes

### Être

Un Être reste en jeu. Il possède généralement :

- un coût en Volonté ;
- une Attaque ;
- une Intégrité ;
- un peuple ;
- parfois un effet d'arrivée, un mot-clé ou une capacité `Prononcer`.

### Verbe

Un Verbe est une action ponctuelle. Il est joué, résolu, puis mis en défausse sauf indication
contraire.

Un Verbe peut aussi avoir `Prononcer`.

### Korum

Le Korum représente l'objectif à protéger. Il n'est pas dans le deck. Il commence à 25 Intégrité.

---

## 4. Mise en place

1. Chaque joueur mélange son deck.
2. Le premier joueur pioche 4 cartes ; le second joueur pioche **5 cartes**.
3. Chaque joueur peut faire un mulligan : remettre sa main sous le deck, mélanger, puis re-piocher
   le même nombre.
4. Le premier joueur commence avec 1 Volonté maximale mais ne pioche pas au premier tour.
5. Le second joueur pioche normalement.

*(Équilibrage v1.1 : la 5ᵉ carte compense l'initiative du premier joueur, mesurée à 63 % de
victoires sur 1 000 parties simulées.)*

---

## 5. Volonté

La Volonté est la ressource principale.

Au début de votre tour :

1. augmentez votre Volonté maximale de 1, jusqu'à un maximum de 10 ;
2. restaurez toute votre Volonté disponible ;
3. piochez 1 carte.

Exemple :

- tour 1 : 1 Volonté ;
- tour 2 : 2 Volonté ;
- tour 3 : 3 Volonté ;
- jusqu'à 10.

---

## 6. Déroulement d'un tour

Un tour se déroule ainsi :

1. **Réveil** : les effets de début de tour se déclenchent.
2. **Volonté** : augmentez et restaurez votre Volonté.
3. **Pioche** : piochez 1 carte.
4. **Action** : jouez des cartes, attaquez, utilisez des capacités.
5. **Fin** : les effets de fin de tour se déclenchent.

Pendant la phase d'Action, vous pouvez faire ces actions dans l'ordre de votre choix :

- jouer un Être ;
- jouer un Verbe ;
- attaquer avec un Être prêt ;
- activer une capacité ;
- `Prononcer`.

---

## 7. Jouer des cartes

Pour jouer une carte, payez son coût en Volonté.

Un Être arrive en jeu prêt, mais ne peut pas attaquer le tour où il arrive, sauf s'il a **Élan**.

Un Verbe résout son effet puis va en défausse.

---

## 8. Combat

Chaque Être prêt peut attaquer une fois par tour.

**Le Korum est protégé tant que son camp garde au moins un Être capable de défendre** : un
attaquant doit cibler un Être adverse. Le Korum devient attaquable lorsque le camp adverse n'a
plus de défenseur valide — un Être **neutralisé ou enchaîné ne monte pas la garde**. Les effets
qui précisent « directement » (ex. Brûler le jour) ignorent cette protection.

*(Équilibrage v1.2 : la frappe libre au Korum rendait l'initiative écrasante — 40 % des parties
se gagnaient avec plus de 20 Intégrité restantes.)*

### Attaquer le Korum

Le Korum perd une Intégrité égale à l'Attaque de l'Être attaquant.

### Attaquer un Être

Les deux Êtres s'infligent simultanément des dégâts égaux à leur Attaque.

Un Être dont l'Intégrité tombe à 0 ou moins est détruit et va en défausse.

**Les dégâts sur les Êtres persistent** : ils ne sont retirés que par un effet de soin explicite.

*(Équilibrage v1.1 : l'ancien soin automatique de fin de tour annulait tout plan d'usure et de
dégâts directs — il tuait le gameplan Exar, mesuré à 16 % de victoires.)*

---

## 9. Prononcer

`Prononcer` est la mécanique signature d'Expelled.

```text
Prononcer (n) : payez n Volonté. Résolvez cet effet, puis exilez cette carte définitivement.
```

Règles :

- une carte ne peut `Prononcer` qu'une seule fois ;
- si un Être `Prononce`, il est exilé après résolution ;
- si un Verbe `Prononce`, il est exilé au lieu d'aller en défausse ;
- une carte exilée par `Prononcer` ne peut pas revenir en jeu sauf effet exceptionnel ;
- le coût de `Prononcer` est payé en plus des autres coûts éventuels.

Intention :

`Prononcer` doit être plus puissant qu'un effet normal, car la carte quitte définitivement le duel.

---

## 10. Zones

### Deck

Votre pioche. Si vous devez piocher et que votre deck est vide, votre Korum perd 1 Intégrité à la
place pour chaque carte que vous ne pouvez pas piocher.

### Main

Cartes disponibles à jouer.

### Jeu

Zone où restent les Êtres.

### Défausse

Cartes utilisées ou détruites.

### Exil

Cartes mises hors du duel. Les cartes exilées par `Prononcer` sont considérées comme définitivement
hors de portée, sauf texte contraire explicite.

---

## 11. Mots-clés v1

### Serment

Un Être avec **Serment** doit être attaqué en priorité parmi les Êtres de son camp, tant qu'il
est prêt. (v1.2 : le Korum étant protégé par défaut, le Serment dirige désormais l'ordre du mur.)

Ancien rôle : garde/provocation.

### Élan

Un Être avec **Élan** peut attaquer le tour où il arrive en jeu.

Ancien rôle : célérité.

### Mémoire

Effet qui regarde, récupère ou copie une carte de la défausse ou de l'exil.

À utiliser surtout chez les Eshar.

### Rupture

Effet qui se déclenche lorsqu'une carte est détruite, sacrifiée ou exilée.

À utiliser surtout chez les Exar.

### Mutation

Effet qui permet de choisir entre plusieurs modes ou de modifier les statistiques d'un Être.

À utiliser surtout chez les Morar.

---

## 12. Identités de peuple

### Vasar

Ordre, protection, buffs, Serment, punition des `Prononcer` adverses.

### Exar

Rupture, sacrifice, destruction ciblée, meilleurs effets `Prononcer`, dégâts auto-infligés.

### Eshar

Pioche, information, Mémoire, interactions limitées avec l'exil.

### Morar

Mutation, adaptation, réduction de coûts, changement de rôle.

### Velar

Élan, dégâts directs, pression rapide, dépenses explosives de Volonté.

---

## 13. Construction de deck

Format de test :

- deck de 30 cartes ;
- maximum 3 copies d'une commune ;
- maximum 2 copies d'une rare ou épique ;
- maximum 1 copie d'une légendaire ou prismatique ;
- maximum 2 peuples majeurs par deck ;
- les cartes mineures peuvent être jouées comme renforts.

Pour le set 01, les deux decks principaux sont :

- Vasar avec renforts Eshar/Morar/Velar ;
- Exar avec renforts Eshar/Morar/Velar.

---

## 14. Wording recommandé

La rédaction française suit la [charte éditoriale](CHARTE-EDITORIALE.md). Utiliser des formulations
courtes, régulières et littérales : moment, action, cible, valeur, puis durée.

Exemples :

```text
À l'arrivée : gagnez 1 Volonté.
```

```text
Prononcer (2) : infligez 4 dégâts à un Être.
```

```text
Rupture : quand cette carte quitte le jeu, piochez 1 carte.
```

```text
Mutation : choisissez l'un — gagne +2 ATQ ce tour-ci ; ou gagne +2 Intégrité ce tour-ci.
```

---

## 15. Points à tester

Les valeurs suivantes sont provisoires :

- Korum à 25 Intégrité ;
- main de départ à 4 cartes ;
- dégâts retirés à la fin du tour ;
- premier joueur qui ne pioche pas ;
- fatigue à 1 dégât par pioche manquée ;
- `Prononcer (n)` avec effet valant environ `2 × n`.

Ces paramètres doivent être validés par des parties test avant la production complète des 60 cartes.
