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

## 4bis. La couche rétro-tech (Evangelion / Psycho-Pass / Blade Runner)

Par-dessus l'anatomie, le corps de la carte est traité comme un **terminal CRT d'archive RIKKEN** :

- **L'ambre système `#ffb454`** — la couleur du HUD (référence EVA/Blade Runner), distincte de l'accent de faction : cellule de coût, labels, hachures, micro-texte. Deux couleurs par carte maximum : l'ambre système + l'accent de faction.
- **Scanlines CRT** + vignette chaude subtile — **uniquement sur la fenêtre d'illustration** (décision user : la moitié inférieure reste nette). Pas de brackets de visée (retirés — surcharge).
- **Numéro de série vertical** (`RIK·S01//SLUG`) le long de l'art — le dossier d'archive incarné.
- **Hachures d'avertissement** (repeating 45°) sous la plaque de nom.
- **Monospace phosphore** (Consolas) pour les micro-labels : ⟨CELL⟩, ATQ/INT, SYNCHRO — avec léger glow.
- **Barre de titre terminal** ambre en tête du cartouche de texte.

**Règle de matérialité (référence qualité : Pokémon TCG Pocket)** : aucun élément décoratif ne doit être un aplat. Chaque badge/plaque/panneau est un objet imprimé : gloss en tête + assise sombre (biseau), ombre portée (via `filter: drop-shadow` quand un clip-path avale les box-shadow), panneaux de texte en creux (inner shadow), fenêtre d'art enchâssée, gemmes serties (reflet + facette), corps teinté faction (radial bas).

**Le système d'identité (références : Riftbound, MTG, One Piece TCG)** :
- **La gravure** — l'ornement propriétaire : un filet ambre fin tracé au bord intérieur de la carte, SOUS les badges et le contenu (il encadre, il ne croise rien). En full art, la gravure passe par-dessus l'artwork. Pas de pastilles ni de second filet (retirés — bruit).
- **Le sigil de faction** — le glyphe accent seul, avec glow, sans médaillon ni anneau (retirés — élément sans fonction).
- **La ligne de taxonomie** — `TRAVELER ◆ [chip CELL] ───── FACTION` : type de carte en ambre, CELL en chip taillé accent, filet dégradé, faction en acier espacé.
- **Les pills étiquetées** — la Synchro est une pill accent à texte sombre (`⟟ SYNCHRO n`), pas un label flottant.
- **Le filigrane** — le sigil de faction en grand, fantômé (~10%) dans le coin du cartouche de texte.

## 4ter. Le full art (TOUTES les cartes)

**Toutes les cartes sont full art** (décision : refonte v5.2) : l'artwork couvre toute la carte, les foils s'étendent avec lui, et les panneaux (plaque de nom, cartouche) sont du **verre flouté** (backdrop-blur) posé sur l'image, avec un scrim sombre progressif sur le tiers inférieur pour la lisibilité. Le champ `fullArt` du JSON est obsolète (ignoré par Card.svelte). L'ancien format à fenêtre d'art est retiré. Contrainte artwork : sujet dans les 55% supérieurs (cf. PROMPTS.md).

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
- **Format cible : portrait 4:5, toujours** — la Forge normalise chaque artwork en 1200×1500 exact (crop `cover` avec détection de zone d'intérêt) ; une source paysage est recadrée avec perte. Sur la carte, l'art est croppé en ~4:3.4 (standard) ou plein cadre (full art).

## 7. Checklist de curation (avant d'accepter un artwork)

1. Monochrome dominant + un seul accent ?
2. Lumière contenue (pas de néon partout) ?
3. Suit conforme (sleek, pas Iron Man/Power Rangers) ?
4. Anatomie correcte, proportions adultes réalistes ?
5. Composition lisible en format carte (sujet centré-haut) ?

**< 4/5 = rejeter (supprimer le JSON).**
