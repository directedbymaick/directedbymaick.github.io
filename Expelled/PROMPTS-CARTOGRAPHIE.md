# EXPELLED — Prompts de cartographie

Cartes vues du dessus, style carte de monde fantasy classique. Rien d'exotique : ce sont des
formules que Midjourney sort proprement du premier coup.

Une seule contrainte technique, non négociable : **aucun texte**. Midjourney ne sait pas écrire,
et une carte couverte de faux mots est inutilisable. Les toponymes se composent par-dessus, comme
les labels des cartes à jouer.

---

## 1. Le suffixe de style

Le même sur toutes les planches, pour qu'elles forment un atlas et non onze images séparées :

```text
illustrated fantasy world map, top-down aerial view, hand-drawn cartography,
aged parchment, muted inks, decorative border, no text
--ar 4:3 --no text, letters, labels, words, numbers, watermark, logo
```

Le prompt complet, c'est donc : **[sujet en une phrase] + [suffixe]**. Rien de plus.

---

## 2. Une note avant de lancer

Mis à plat, le monde perd sa verticale : Vasen n'est plus « au-dessus » d'Exen, ce sont deux
territoires voisins. C'est le prix du format, et il est classique — les cartes de plans de Magic
font pareil. Si tu veux garder l'idée de chute, elle passera par les couleurs (l'or en haut de
planche, le rouge en bas) plutôt que par la géométrie.

---

## 3. Les planches

**Le monde**
```text
illustrated fantasy world map of a single continent, a golden radiant city in the north, a red ruined city in the south, an ordinary human city in the centre, misty islands between them, a great cliff coastline on the east edge, top-down aerial view, hand-drawn cartography, aged parchment, muted inks, decorative border, no text --ar 4:3 --no text, letters, labels, words, numbers, watermark, logo
```

**Vasen** — la cité des chœurs
```text
illustrated fantasy map of a circular white and gold city built in concentric rings, tall towers at the centre, radial avenues, farmland and open plains around it, top-down aerial view, hand-drawn cartography, aged parchment, muted inks, decorative border, no text --ar 4:3 --no text, letters, labels, words, numbers, watermark, logo
```

**Exen** — l'Envers
```text
illustrated fantasy map of a dark ruined city sprawling around a vast red chasm, broken walls, bone bridges over the gorge, scorched land at the edges, top-down aerial view, hand-drawn cartography, aged parchment, muted red inks, decorative border, no text --ar 4:3 --no text, letters, labels, words, numbers, watermark, logo
```

**Xenen** — le monde humain
```text
illustrated fantasy map of an ordinary human city, irregular streets and blocks, a river crossing it, bridges, harbours and suburbs spreading outward, top-down aerial view, hand-drawn cartography, aged parchment, muted blue inks, decorative border, no text --ar 4:3 --no text, letters, labels, words, numbers, watermark, logo
```

**L'Interstice** — l'entre-deux
```text
illustrated fantasy map of a scattered archipelago of small islands in thick mist, narrow bridges and causeways linking a few of them, empty water between, top-down aerial view, hand-drawn cartography, aged parchment, muted violet inks, decorative border, no text --ar 4:3 --no text, letters, labels, words, numbers, watermark, logo
```

**Le Bord du monde**
```text
illustrated fantasy map of a coastline where the land simply ends in a straight cliff, golden plains and terraces on the land side, blank empty space beyond the edge, top-down aerial view, hand-drawn cartography, aged parchment, muted gold inks, decorative border, no text --ar 4:3 --no text, letters, labels, words, numbers, watermark, logo
```

**Les Tours de grammaire** — plan de quartier
```text
illustrated fantasy map of a walled precinct of tall slender towers arranged in a circle, courtyards and cloisters between them, a single road leading in, top-down aerial view, hand-drawn cartography, aged parchment, muted inks, decorative border, no text --ar 4:3 --no text, letters, labels, words, numbers, watermark, logo
```

**Les lisières** — la frontière basse de Vasen
```text
illustrated fantasy map of a fortified border region, a line of small watchtowers along a ridge, cultivated land on one side and broken wilderness on the other, top-down aerial view, hand-drawn cartography, aged parchment, muted inks, decorative border, no text --ar 4:3 --no text, letters, labels, words, numbers, watermark, logo
```

---

## 4. Si le rendu déraille

- **Du texte apparaît quand même** — ajoute `blank map` au sujet, ou relance : le `--no` ne garantit
  rien à 100 %.
- **Vue trop oblique** — remplace `top-down aerial view` par `flat top-down view, orthographic`.
- **Trop chargé** — ajoute `simple, few elements, plenty of empty parchment`.
- **Trop moderne** — ajoute `antique, 18th century engraving style`.
