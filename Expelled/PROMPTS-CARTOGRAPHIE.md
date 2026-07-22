# EXPELLED — Prompts de cartographie

Distinct de `PROMPTS-LIEUX.md`, qui produit l'**illustration** d'une carte à jouer. Ici on produit
une **carte géographique** : un objet de papier, une planche gravée arrachée aux registres
d'Eshel. Ce n'est pas une vue, c'est un document.

---

## 1. Les deux règles propres à la cartographie

### Le monde est vertical

Vasen est en haut, Xenen au milieu, Exen en bas, l'Interstice entre les deux, le Bord du monde sur
le côté. Toute la géographie d'Expelled est un axe haut-bas — la chute en est le seul déplacement
qui compte. La **coupe verticale** est donc le mode par défaut, et le plan vu du dessus l'exception,
réservé à ce qui tient dans un seul étage du monde (une cité, une salle, une tour).

C'est l'inverse d'une carte de fantasy ordinaire, et c'est ce qui rendra ces planches
reconnaissables au premier coup d'œil.

### Aucun texte

Un générateur d'images ne sait pas écrire : toute étiquette sortira en charabia, et une carte
couverte de faux mots est inutilisable. On demande donc explicitement des marques d'annotation
**illisibles et ornementales**, et les vrais toponymes se composent par-dessus, dans le cadre —
exactement la règle déjà posée dans la DA : « les labels appartiennent au cadre, pas à
l'illustration générée ».

---

## 2. Gabarit

```text
[mode : vertical cross-section | orthographic top-down plan] of [lieu],
[structure dominante], [le cercle, en rose des vents ou en glyphe],
[ce qui borde, en haut et en bas], [échelle : silhouettes minuscules],
faint illegible engraved annotation marks, no readable writing,
antique engraved map plate on aged vellum, [couleur] ink with gold leaf accents,
generous margins, plate border
--ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

Le créneau **« ce qui borde »** est le plus important : sur une carte verticale, un lieu se définit
par ce qu'il a au-dessus et au-dessous de lui. C'est ce qui fait qu'on comprend le monde en
regardant une seule planche.

---

## 3. La planche maîtresse

**Le monde** — celle qu'on oublie, et la seule qui explique toutes les autres.

```text
vertical cross-section of an entire world drawn as one continuous fall, five stacked regions from top to bottom, a radiant choir city of concentric white terraces at the summit, a broad band of ordinary human rooftops in the middle, a violet mist layer of drifting circles between them, an inverted red city hanging downward into an abyss at the bottom, a golden cliff edge closing the right side, one enormous cracked ring spanning the full height as the cartographic rose, tiny falling silhouettes marking the route between tiers, faint illegible engraved annotation marks, no readable writing, antique engraved map plate on aged vellum, sepia and gold ink with gold leaf accents, generous margins, plate border --ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

---

## 4. Les cinq régions

**Vasen** — la cité des chœurs · plan vu du dessus, parce qu'elle tient dans un seul étage
```text
orthographic top-down plan of a vast circular choir city, concentric ivory terraces radiating from a single central rosace, radial avenues cutting the rings like the spokes of a halo, a cluster of impossibly tall towers off-centre, the outer ring fraying into open golden void, thousands of dot-sized figures suggesting ranks, faint illegible engraved annotation marks, no readable writing, antique engraved map plate on aged vellum, pale gold and ivory ink with gold leaf accents, generous margins, plate border --ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

**Exen** — l'Envers · coupe verticale, bâtie vers le bas
```text
vertical cross-section of an inverted city growing downward into a red abyss, cathedrals hanging like stalactites from a broken ceiling of rock, streets running along the undersides, cracked rings glowing as lanterns at each level, a colossal gate shaped as a broken ring at the very top where the city meets the world above, bone bridges spanning the void, tiny silhouettes climbing downward, faint illegible engraved annotation marks, no readable writing, antique engraved map plate on aged vellum, deep crimson and bone ink with gold leaf accents, generous margins, plate border --ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

**Xenen** — le monde humain · plan vu du dessus, volontairement banal
```text
orthographic top-down plan of an ordinary human city, irregular blocks and roads with no sacred geometry at all, a single faint ring drawn over one rooftop as the only mark of the other world, a river crossing the sheet, the margins fading into cloud rather than into void, a few dot-sized winged figures on rooftops, faint illegible engraved annotation marks, no readable writing, antique engraved map plate on aged vellum, dusty pastel blue ink with gold leaf accents, generous margins, plate border --ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

**L'Interstice** — l'entre-deux · coupe verticale, sans sol ni plafond
```text
vertical cross-section of a layer of drifting violet mist with no ground and no ceiling, dozens of round doorways of different sizes floating at different depths, long pale staircases connecting some of them and leading nowhere from others, a full moon disk suspended at the centre as the cartographic rose, white moths marking the currents, half-erased silhouettes drifting between openings, faint illegible engraved annotation marks, no readable writing, antique engraved map plate on aged vellum, violet and moonlight ink with silver leaf accents, generous margins, plate border --ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

**Le Bord du monde** — la limite · coupe verticale prise de côté
```text
vertical cross-section taken at the outermost edge of the world, a golden cliff wall filling the left half of the sheet and pure empty light filling the right half, an enormous half sun forming a broken ring on the horizon line, terraces and jumping platforms cut into the cliff face, an ocean of clouds far below, tiny falling silhouettes with open glass wings scattered across the void, faint illegible engraved annotation marks, no readable writing, antique engraved map plate on aged vellum, bright gold and white ink with gold leaf accents, generous margins, plate border --ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

---

## 5. Les lieux intérieurs

Trop petits pour une région, trop importants pour être oubliés. Format plan d'architecte.

**Les Tours de grammaire** — coupe, parce que leur intérêt est leur hauteur
```text
vertical architectural cutaway of a cluster of impossibly slender white towers, each floor a ring-shaped reading gallery open at the centre, round windows aligned into one continuous column of halos, a single spiral stair running the whole height, measuring instruments suspended in the central void, one dot-sized climbing figure near the top, faint illegible engraved annotation marks, no readable writing, antique engraved map plate on aged vellum, pale gold and ivory ink with gold leaf accents, generous margins, plate border --ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

**La salle du Vasis** — plan au sol du tribunal
```text
orthographic floor plan of a circular tribunal chamber, a perfect ring of seats facing an empty central disk, a single break in the ring marking the accused's entrance, radial floor engravings converging on the centre, coiled chain motifs drawn in the margins as ornament, no figures at all, faint illegible engraved annotation marks, no readable writing, antique engraved map plate on aged vellum, pale gold and ivory ink with gold leaf accents, generous margins, plate border --ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

**Les lisières** — la frontière basse de Vasen, où Thalen écoutait
```text
vertical cross-section of the lower boundary of a radiant city, the last inhabited terrace at the top of the sheet, a thin luminous ring marking the limit below it, and beneath that nothing but open descending void, a small watchpost built directly onto the boundary, hairline cracks spreading outward from one point of the ring, one dot-sized sentinel figure facing downward, faint illegible engraved annotation marks, no readable writing, antique engraved map plate on aged vellum, pale gold ink with gold leaf accents, generous margins, plate border --ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

**La Porte du dehors** — la route entre les deux cités
```text
vertical cross-section of a single passage connecting an upper radiant world to a lower red abyss, a colossal gate with an arch shaped as a broken ring set at the midpoint, heavy chains anchoring it to both sides, the route above drawn as a clean gold line and the route below as a fractured red one, one-way arrow-like engraved marks along the descent, tiny silhouettes only ever moving downward, faint illegible engraved annotation marks, no readable writing, antique engraved map plate on aged vellum, crimson and gold ink with gold leaf accents, generous margins, plate border --ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

---

## 6. La planche cosmologique

Ni région ni bâtiment : un diagramme. C'est la pièce d'ouverture d'un atlas.

**L'Origine et les Neuf** — le cercle fêlé
```text
antique cosmological diagram plate, one large perfect circle at the centre split by a single thin black fracture, nine smaller circles arranged around it and connected to it by fine engraved rays, one of the nine rays broken and trailing off the plate edge, concentric measuring rings and compass arcs drawn faintly behind everything, ornamental illegible marks where each label would sit, no readable writing, engraved on aged vellum, sepia and gold ink with gold leaf accents, generous margins, plate border --ar 3:4 --no text, letters, labels, numbers, watermark, logo
```

---

## 7. Cohérence entre les planches

Pour que l'ensemble ressemble à un atlas et non à onze images séparées :

- **même support** — `antique engraved map plate on aged vellum`, `generous margins`, `plate border`
- **même encre de base** — sépia, la couleur du peuple ne venant que par-dessus
- **même rose des vents** — le cercle, toujours, jamais une étoile à branches
- **même échelle humaine** — des silhouettes de la taille d'un point, jamais un personnage lisible
- **même format** — `--ar 3:4`, celui d'une page de registre

Si une planche doit s'écarter de la série, que ce soit **Xenen** : c'est le seul lieu du monde qui
ne sait pas qu'il est sur une carte, et sa banalité assumée fait le contraste.
