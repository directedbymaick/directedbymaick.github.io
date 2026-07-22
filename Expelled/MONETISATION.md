# EXPELLED — Modèle de monétisation

État : **modèle arrêté, paiement non connecté.** Le catalogue et les droits sont
implémentés (`src/lib/boutique.ts`) ; il manque un prestataire de paiement, qui
demande un compte, un back-end et les obligations légales listées en §6.

---

## 1. La règle qui prime sur tout

> **L'argent achète du rythme, jamais du contenu.**

Expelled est un jeu de duel. Vendre de la puissance, c'est vendre des victoires,
et un TCG qui fait ça meurt de sa communauté avant de mourir de ses chiffres.

Quatre conséquences, non négociables :

1. **Aucune carte, aucune version n'est exclusive à l'argent.** Les 195 versions
   s'obtiennent toutes en boosters gagnés ou en Syllabes.
2. **Les taux sont identiques** dans un booster acheté et dans un booster gagné.
   Ils sont publiés et mesurés sur le moteur réel (cf. `scripts/taux.mjs`).
3. **Les cosmétiques ne sont jamais des cartes** et n'ont aucun effet en duel.
4. **La générosité actuelle ne baisse pas.** Le joueur gratuit garde ses 3 à 5
   boosters par jour. La monétisation s'ajoute, elle ne prélève pas.

Le repère chiffré : un joueur gratuit complète le set de base en **114 boosters**,
soit environ un mois. Aucune offre ne doit rendre ce chemin plus long qu'il ne
l'est aujourd'hui.

---

## 2. Ce qui se vend

### Boosters — l'accélérateur

Le joueur gratuit gagne ~350 Éclats par jour, le booster en coûte 100. L'offre
payante vise donc le joueur qui veut avancer plus vite, pas celui qui serait
bloqué sans elle.

| Offre | Contenu | Prix | Par booster |
|---|---|---|---|
| Poignée | 5 boosters | 4,99 € | 1,00 € |
| Réquisition | 12 boosters | 9,99 € | 0,83 € |
| Grande réquisition | 30 boosters + 1 Full Art garanti | 19,99 € | 0,67 € |

Repères du marché : Pokémon Pocket et Hearthstone se situent entre 0,80 € et
1,00 € le booster. On est dedans, avec une dégressivité classique.

### Cosmétiques — le seul contenu réellement exclusif

Sans effet sur une partie, donc sans risque d'équilibrage. C'est là que doit
porter l'effort de désirabilité.

| Objet | Prix |
|---|---|
| Dos de carte | 3,99 € |
| Plateau de duel | 5,99 € |
| Cadre de profil | 2,99 € |

### Passe du Silence — la saison

Huit semaines, deux voies. La voie gratuite donne des Éclats et des boosters ;
la voie payante ajoute des cosmétiques exclusifs et double les Éclats.

| | Prix |
|---|---|
| Passe du Silence | 9,99 € |

Le passe est le seul produit récurrent. C'est celui qui fait un revenu prévisible,
et c'est aussi celui qui structure le calendrier de jeu — ce qui répond au
problème de rétention identifié : une fois le set de base complété vers le
114ᵉ booster, il ne restait aucun objectif intermédiaire.

---

## 3. Ce qui ne se vendra pas

- **Aucune carte à l'unité.** Cela transformerait le Glanage en boutique et
  viderait le tirage de son sens.
- **Aucun avantage de duel** : pas d'énergie, pas de relance, pas de deck préfait
  payant, pas de bonus de récompense en combat.
- **Aucun coffre à taux caché.** Nos taux sont publiés ; un produit payant à taux
  secret serait une régression, et un risque réglementaire (§6).

---

## 4. Ce que ça change dans l'économie actuelle

Rien, par construction. Les Éclats gagnés, les Syllabes, les quêtes et les
garanties restent tels quels. La boutique n'ajoute qu'une seconde source
d'Éclats et une catégorie d'objets qui n'existait pas.

Un point à surveiller après ouverture : si les acheteurs terminent le set en
quelques jours, la falaise de rétention arrive plus tôt pour eux. Le passe et le
rythme des sets doivent absorber ça — pas un durcissement des taux.

---

## 5. Implémentation

`src/lib/boutique.ts` porte le catalogue et les droits du joueur (ce qu'il
possède, quels cosmétiques sont actifs). Tout y est fonctionnel **sauf l'acte de
paiement**, qui est un point d'intégration unique et documenté.

L'entrée de boutique reste masquée tant que le paiement n'est pas connecté :
mieux vaut pas de boutique qu'une boutique qui ne prend pas l'argent.

---

## 6. Prérequis avant d'ouvrir la boutique

Ce ne sont pas des détails, et aucun ne se règle dans le code seul.

**Technique**
- Un prestataire de paiement (Stripe recommandé pour l'Europe) et un compte.
- Un back-end pour valider les paiements : jamais côté client, sans quoi les
  droits se falsifient depuis la console du navigateur.
- Les droits stockés côté serveur, rattachés au compte — aujourd'hui la
  collection vit en `localStorage`, ce qui convient à des cartes gagnées mais pas
  à des cartes payées.

**Légal (vente de biens numériques à des consommateurs en France et dans l'UE)**
- Mentions légales et CGV.
- TVA : guichet OSS si vente hors de France.
- Droit de rétractation de 14 jours, avec renonciation expresse au moment de
  l'achat pour le contenu numérique délivré immédiatement — sans cette
  renonciation, tout achat est remboursable pendant deux semaines.
- Affichage des probabilités : déjà en place, et c'est un atout. La Belgique
  interdit les coffres payants à taux aléatoire, les Pays-Bas les encadrent, et
  la réglementation européenne se durcit. Vendre des boosters aléatoires demande
  de vérifier chaque marché visé.
- Si des mineurs peuvent jouer : contrôle parental et information sur les achats.

**Recommandation** : ouvrir d'abord les **cosmétiques et le passe**, qui ne sont
pas aléatoires et échappent donc à la question des coffres. Les boosters payants
viennent ensuite, une fois les marchés vérifiés.
