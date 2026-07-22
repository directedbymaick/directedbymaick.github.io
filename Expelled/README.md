# EXPELLED — dossier maître

**Expelled** est le nouveau projet mère du TCG.  
L'univers Travelers est abandonné côté lore, cartes, factions et identité. On ne conserve que
certains acquis techniques, notamment le display de carte interactif.

Ce dossier centralise le canon, la direction artistique, le set 01 et les décisions de production.

---

## Index

| Fichier | Rôle |
|---|---|
| [KORUM.md](KORUM.md) | Texte mythologique source. Ses fragments peuvent nourrir les citations d'ambiance et les indices de lore. |
| [LORE.md](LORE.md) | Bible de l'univers : Langue Première, Fracture, peuples, lexique et mécanique `Prononcer`. |
| [CHARTE-EDITORIALE.md](CHARTE-EDITORIALE.md) | Voix française canonique : règles de rédaction, naming, citations et clarté des systèmes. |
| [DA.md](DA.md) | Direction artistique : invariants visuels, style validé, kits par peuple et règles de génération. |
| [SET01.md](SET01.md) | Structure du premier set, **Nés du silence** : factions, raretés, gameplay et protocole de production. |
| [RULES.md](RULES.md) | Règles v1 jouables : tour, Volonté, combat, Prononcer, mots-clés et deckbuilding. |
| [TECHNIQUE.md](TECHNIQUE.md) | Socle technique à conserver : display de carte interactif, holo/tilt, migration hors Travelers. |
| [ASSETS.md](ASSETS.md) | Inventaire et structure cible des références, glyphes, halos, textures et assets de production. |
| [PROMPTS.md](PROMPTS.md) | Logique Midjourney : traduction du lore en signes visuels, prompts par rareté et tests prismatiques. |
| `raw inspiration/` | Références visuelles brutes. Elles servent au style, pas directement à la production finale. |
| `drop/` | Dépôt prévu pour les futures illustrations à importer dans la Forge. |
| `tests/` | Emplacement prévu pour les grilles de tests et étalons de production. |

---

## Décisions fondatrices

- **Expelled remplace Travelers.** Travelers ne doit plus guider le lore, le naming ou les factions.
- **Le mot crée le réel.** La Langue Première n'est pas un décor : c'est la physique du monde et la grammaire du jeu.
- **KOR est l'Origine.** Son glyphe, le cercle, doit structurer le cadre de carte, les halos et la DA.
- **EX est le mot impossible.** Il fonde l'Expulsion, les halos brisés et la mécanique signature.
- **Prononcer** est la mécanique centrale : un effet puissant, payé en Volonté, puis la carte sort définitivement du duel.
- **Le set 01 s'appelle Nés du silence.** Il raconte les premières conséquences de la Fracture.

---

## État actuel

- [x] Canon fondateur posé : Concepts, Fracture, cinq peuples, lexique.
- [x] Direction artistique validée : style graphique, kits de génération, hiérarchie par densité.
- [x] Texte mythologique source rédigé dans `KORUM.md`.
- [x] Squelette du set 01 établi.
- [x] Décision technique : conserver le principe du card display Travelers, mais le reconstruire pour Expelled.
- [ ] Nettoyage complet des assets et création d'une bibliothèque de production.
- [ ] Refonte technique du site autour d'Expelled.
- [ ] Nouveau cadre de carte : cercle de KOR, glyphes, halo intact/fêlé/brisé, état `Prononcer`.
- [x] Règles v1 jouables : Volonté, Intégrité, types, combat, mots-clés.
- [ ] Règles v2 après tests.
- [ ] Production des 60 cartes du set 01.

---

## Prochaine étape recommandée

Construire le **socle technique Expelled** :

1. créer un `charter.json` Expelled ;
2. définir le schéma de carte propre au nouvel univers ;
3. migrer le composant de carte interactif ;
4. produire deux cartes test, une Vasar et une Exar ;
5. valider le nouveau cadre avant de remplir les 60 slots.
