# TRAVELERS TCG — Règles v1

*Socle Hearthstone simple + mécanique signature : la Synchro. Vocabulaire aligné sur la bible Travelers (D:\Travelers\00_BIBLE).*

---

## 1. Le duel

Deux directeurs de mission s'affrontent. Chacun protège sa **Centrale** (30 points d'Intégrité). Réduire l'Intégrité adverse à 0 = victoire.

- **Deck** : 30 cartes. Copies max par rareté : Standard ×3, Rare/Épique ×2, Légendaire/Prismatique ×1.
- **Main de départ** : 3 cartes (4 pour le second joueur, qui reçoit aussi une **Cellule d'Énergie** — carte bonus donnant +1 Énergie une fois, l'équivalent de la pièce).
- **Mulligan** : à la pioche initiale, chaque carte peut être remplacée une fois.

## 2. L'Énergie

La Centrale alloue l'énergie des transferts.

- Tour 1 : **1 Énergie**. +1 Énergie max par tour, plafond **10**.
- L'Énergie se recharge entièrement au début de chaque tour.

## 3. Les cartes

### Travelers (unités RIKKEN / KAIROS)
Déployés par **Transfert** (posés depuis la main, coût en Énergie). Ils arrivent **en civil** : leur CELL n'est pas actif.

- Stats : **Attaque / Intégrité** (les PV de la carte).
- **Mal du transfert** : un Traveler ne peut pas attaquer le tour de son arrivée (sauf Célérité).
- **À l'arrivée :** — effet déclenché au moment du Transfert (équivalent cri de guerre).

### La Synchro — mécanique signature
Un Traveler portant un CELL a une capacité **Synchro (X) : effet**.

- Une fois en jeu, payer **X Énergie** pour **activer son CELL** (une seule fois par carte, à tout moment de votre tour).
- La Synchro déclenche l'effet signature ET la carte **s'embrase** (le foil s'active en jeu — l'aura du mode local).
- Un Traveler synchronisé garde son état embrasé jusqu'à sa mort.
- Certains effets ne ciblent que les Travelers synchronisés ou non-synchronisés.

### Les Époques (unités neutres)
Figures des zones aveugles, jouables dans tous les decks. **Pas de CELL, donc pas de Synchro** — mais des stats supérieures d'un cran à coût égal (ils n'ont rien à activer : ce qu'on voit est ce qu'on affronte).

### Protocoles (sorts)
Effet immédiat, puis défaussé. RIKKEN et KAIROS ont leurs protocoles ; certains sont neutres (zones aveugles).

## 4. Combat

- Vos Travelers/Époques attaquent une fois par tour : une unité adverse ou la Centrale.
- Les dégâts sont simultanés (l'attaquant subit l'Attaque du défenseur).
- **Garde** : les unités adverses doivent attaquer cette unité en priorité.
- **Célérité** : peut attaquer le tour de son arrivée.
- **Insaisissable** : ne peut pas être ciblé par les protocoles ni les Synchros adverses.

## 5. Mots-clés v1 (volontairement peu nombreux)

| Mot-clé | Effet |
|---|---|
| **À l'arrivée :** | Effet au Transfert |
| **Synchro (X) :** | Payer X pour activer le CELL, une fois |
| **Garde** | Doit être attaqué en priorité |
| **Célérité** | Attaque dès l'arrivée |
| **Insaisissable** | Inciblable par protocoles/Synchros adverses |
| **Dernier souffle :** | Effet à la mort |

## 6. Identités de faction

- **RIKKEN** — la rigueur : synergies d'équipe, soins, pioche, protection. Le collectif amplifié (thème CELL-T).
- **KAIROS** — l'opportunisme : contrôle, sabotage des Synchros adverses, vol, sacrifices calculés. Frapper au bon moment.
- **Les Époques** — la masse silencieuse : stats brutes, sans Synchro, l'Histoire qui n'a besoin de personne.

## 7. Équilibrage — repères pour le pipeline

- Budget de stats : `attack + health ≈ statBudgetPerCost × cost` (voir charter.json par rareté).
- **Barème détaillé du coût des effets : docs/SET01.md §2** (source de vérité pour le design de cartes).
- Les Époques : +1 de budget à coût égal (compensation de l'absence de Synchro).
- Contrainte du lore : **pas de magie** — tout effet doit être exprimable en termes CELL/tech/temporel.

---

*Non couvert en v1 (backlog assumé) : arme/équipement, héros alternatifs, effets persistants de zone, deck Époques pur. On équilibre le socle d'abord.*
