# TRAVELERS TCG — Charte design

*Source de vérité visuelle du TCG. Dérivée de la bible manga (D:\Travelers\00_BIBLE\style_visuel.md) — en cas de doute, la bible fait foi sur l'univers, ce fichier fait foi sur les cartes.*

---

## 1. Principe fondateur

**La carte est un objet CELL.** Chaque carte est traitée comme un artefact biotech de l'univers : matériaux sobres, lumière contenue qui ne s'allume qu'à l'activation (hover = mode local), différenciation par matière et non par couleur criarde.

Interdits absolus (hérités de la bible) : néon partout, couleurs primaires saturées simultanées, esthétique comic-book/Iron Man, arc-en-ciel gratuit.

## 2. La rareté est un matériau

Le cadre de la carte est fait du matériau de sa rareté — hiérarchie directement issue de la palette CELL du manga (standard sombre → blanc rare → or/argent/prismatique très rare) :

| Rareté | Matériau | Rendu du cadre | Foil |
|---|---|---|---|
| Standard | **Carbone** | tissage carbone anthracite mat | aucun (mat) |
| Rare | **Nacre** | blanc perle, reflets froids subtils | holo |
| Épique | **Argent** | métal brossé, stries fines | prismatic |
| Légendaire | **Or** | or brossé chaud, biseau lumineux | galaxy |
| Prismatique | **Prisme** | irisation contenue sur tout le cadre | prism (pleine carte) |

Le prismatique est **réservé** aux cartes d'exception (CELL-T, Kuroda, Hiroshi…) — comme dans la bible.

## 3. Chromatique : monochrome dominant + UN accent

Règle d'or de la bible appliquée aux cartes :

- **Base** : noirs profonds, anthracite, gris-bleu froids.
- **UN accent saturé par carte** (`gene.accent`) : la couleur du CELL ou de la faction (cyan Caduceus, orange Phaeton, rouge mèche d'Hugo, bleu RIKKEN, rouge KAIROS, bronze Époques).
- L'accent pilote : les conduits lumineux du cadre, le sigil de faction, la lueur de Synchro. **Jamais deux accents.**

## 4. Anatomie de la carte

- **Art full-bleed** sur ~58% supérieurs, fondu vers le panneau bas (scrim).
- **Coût** : cellule d'Énergie hexagonale, coin haut-gauche.
- **Nom** sur plaque technique chevauchant le bas de l'art.
- **Ligne CELL** : nom du CELL porté + sigil faction.
- **Cartouche** : verre sombre, bord conduit fin. Texte d'effet, Synchro en évidence (préfixe ⟟ SYNCHRO), flavor en italique gris.
- **Stats** : plaques angulaires HUD (chevrons) bas-gauche (Attaque) / bas-droit (Intégrité).
- **Capteurs** : points fins aux coins du cadre (détail signature).
- **Typographie** : Bahnschrift (DIN) pour HUD/labels — froide, technique ; fallback Segoe UI. Pas de serif fantasy.

## 5. La lumière ne s'allume qu'à l'activation

Au repos, la carte est sobre (matériau + art). Au survol (= mode local) :
1. Tilt 3D avec inertie spring.
2. Les **conduits du cadre s'illuminent** dans la couleur d'accent.
3. Le **foil s'active** selon la rareté (holo/prismatic/galaxy/prism), teinté par la palette de l'artwork.
4. **Glow** externe dans l'accent, proportionnel à l'excentricité du pointeur.

## 6. Direction artistique des artworks

- **Style** : peinture épique sombre — huile numérique, clair-obscur dramatique, touches visibles.
- **Chromatique** : monochrome dominant + un accent (cf. §3) — le prompt l'impose.
- **Sujets** : Travelers en suit CELL (sleek, plaques modulaires, lumière contenue), agents KAIROS, figures des époques (zones aveugles), lieux RIKKEN.
- **Prompt de base et negative** : voir `charter.json → artDirection` (source machine).
- **Format cible** : 4:5 minimum (l'art est croppé en ~4:3.4 full-bleed sur la carte).

## 7. Checklist de curation (avant d'accepter un artwork)

1. Monochrome dominant + un seul accent ?
2. Lumière contenue (pas de néon partout) ?
3. Suit conforme (sleek, pas Iron Man/Power Rangers) ?
4. Anatomie correcte, proportions adultes réalistes ?
5. Composition lisible en format carte (sujet centré-haut) ?

**< 4/5 = rejeter (supprimer le JSON).**
