# IZANAMI — extraction des codes & effets

> Analyse de https://izanami-official.com (18/07/2026) — bundle décompilé, shaders extraits, CSS lue.
> Objectif : s'en inspirer pour plonger dans l'univers Expelled et afficher les cartes de façon originale.

---

## 1. Le verdict en une phrase

Le site est un **rituel d'apparition** : tout émerge du noir (images, textes, sections), rien ne
« s'affiche ». La technologie sert un seul effet : la lenteur sacrée. C'est exactement la grammaire
qu'il faut au Silence.

---

## 2. La stack (identifiée dans le bundle)

| Brique | Usage chez eux | Dispo chez nous |
|---|---|---|
| **Three.js** | tout le rendu : images, textes, transitions sont des meshes WebGL | à installer |
| **GSAP + ScrollTrigger + SplitText** | timelines, reveals au scroll, découpe des titres | gsap installé |
| **Lenis** | smooth scroll inertiel (le « poids » du scroll) | à installer (~4 ko) |
| **Stable Fluids (custom)** | simulation de fluides GPU pilotée par le curseur, en post-effect | à écrire (shader connu) |
| Fonts | Shippori Mincho (JP), **Cinzel**, Playfair Display, Satoshi | on a déjà Cinzel/Cormorant/Inter |

Leur palette : fond `#0a0801` (noir chaud), texte `#d9d7d4` (ivoire), accent **`#caa100` (or)**.
C'est littéralement la palette Expelled (`#0a0a0d` / `#f2f0ea` / `#c9a445`). Aucune adaptation à faire.

---

## 3. Les codes visuels (captures dans `tests/izanami/`)

1. **Émergence du noir** — le hero est une image plein écran très sombre (brume, forêt) qui se fond
   dans le fond noir par le bas. Pas de bord d'image : le noir de l'image EST le fond du site.
2. **Composition en escalier** — les titres serif légers se décalent ligne par ligne
   (« Sharing / the Japanese Spirit / of Harmony »). Jamais centrés-empilés.
3. **Fenêtres flottantes asymétriques** — les images sont des rectangles de tailles différentes qui
   se chevauchent et flottent sur le noir, chacune avec son parallax interne.
4. **Texte vertical** en marge (« PROJECTS » tourné 90°) comme repère de section.
5. **Chapitrage** — 01 / 02 / 03 devant chaque section. Une seule idée par écran, ~100vh de noir
   entre les sections.
6. **Nav fantôme** — logo, EN/JA, MENU : trois mots, des points de 2px comme puces. Rien d'autre.
7. **Footer vivant** — horloges temps réel des deux villes (Dubai/Tokyo), marquee du wordmark.

## 4. Les effets (shaders extraits du bundle)

### 4.1 Reveal d'image « déroulé » (vertex shader)
Le mesh se déplie : chaque rangée de vertex arrive avec un léger retard (smoothstep par position Y),
avec une sur-largeur de 25 % qui se résorbe.
```glsl
float posIn = (-newPosition.y + 1.) * 0.5;
float inProgress = smoothstep(posIn * POS_IN_RATIO, 1.0, u_inViewProgress);
newPosition.x *= 1.0 + (0.25 * (1.0 - inProgress));
newPosition.y += -1.0 * (1.0 - u_inViewProgress);
```
Déclenché par IntersectionObserver, tween GSAP `u_inViewProgress 0→1`.

### 4.2 Parallax interne par UV (le secret des images qui « respirent »)
Les textures sont exportées avec **200px de marge** en haut/bas. Le scroll ne bouge pas le mesh :
il glisse les UV à l'intérieur de la marge.
```glsl
float paddingRatio = 400.0 / u_textureSize.y;
float parallaxOffset = -paddingRatio*0.5 + (u_uvParallaxProgress * paddingRatio);
uv.y -= parallaxOffset;
```

### 4.3 Ouverture letterbox (transition de section)
Un masque couleur-du-fond (`vec3(10.,8.,1.)/255.` = #0a0801) couvre le haut et le bas de l'image
et s'ouvre comme un rideau de cinéma (`u_mask 0.5→0`).

### 4.4 Lentille + aberration chromatique (entrée du hero)
À l'apparition, l'image est bombée (distortion de lentille CC) et ses canaux R/G/B sont décalés
verticalement, puis tout revient à plat (`u_inViewProgress 0→1`) :
```glsl
float lensProgress = 1.0 - u_inViewProgress;
// ... uvScale par ccLensScale(multiplier * lensProgress) ...
float r = texture2D(u_texture, uvTexture + vec2(0., u_redOffset * offsetProgress)).r;
```

### 4.5 Texte WebGL à ondulation (le reveal signature des titres)
Le texte est dessiné dans un `<canvas>` 2D (même font/size que le DOM), converti en texture, posé
sur un plane. Reveal : ondulation `tan()` sur les UV + translation + alpha.
```glsl
float ripple(float uv, float time, float prog) {
  return tan(length(uv + time * 2.0)) * (prog * -1.85);
}
// uRippleStrength: 14 → 0, uTranslateProgress: 1.2 → 0, uAlpha: 0 → 1
```
Variante hover pour les liens : le texte glisse verticalement (`slideUvY`) avec la même ondulation.

### 4.6 Fluides stables (la brume interactive)
Post-effect plein écran : une sim de fluides GPU (`u_velocity`, `u_disturb_power`) est alimentée
par les mouvements du curseur, et déforme le rendu final de la scène. C'est la « fumée » qui suit
la souris.

### 4.7 Rythme des tweens
`quart.out 0.7s` partout (micro), `expo.out / circ.out 1.4s` (reveals), `quart.out 3s` (hero).
Lent, jamais élastique.

---

## 5. Adaptation Expelled — « Le Sanctuaire »

Ce qu'on construit avec ces codes (dans l'ordre de valeur) :

1. **Lenis + rythme** — smooth scroll inertiel, sections chapitrées `KOR / VAS / NER…`,
   texte vertical en marge, ~1 écran de noir entre les peuples. Zéro WebGL requis. (rapide)
2. **Hero « émergence »** — un artwork Vasar plein écran fondu dans le noir par les bords
   (mask-image CSS), l'auréole penchée au-dessus du titre, reveal SplitText ligne par ligne. (rapide)
3. **Le mur devient galerie** — cartes en fenêtres flottantes asymétriques qui se chevauchent,
   tailles variées, parallax léger par carte (GSAP, pas besoin de WebGL pour commencer). (moyen)
4. **Letterbox** — transitions de section : deux rideaux `#0a0a0d` qui s'ouvrent sur chaque
   faction (CSS clip-path + ScrollTrigger, pas besoin du shader). (rapide)
5. **WebGL layer** (phase 2) — planes Three.js pour les artworks avec reveal déroulé (4.1),
   parallax UV (4.2 — nos illustrations MJ ont de la marge à recadrer, parfait), et la
   **brume de fluides** dorée qui suit le curseur (4.6) : la Langue Première qui traîne dans l'air.
6. **Titres à ondulation** (phase 2) — le reveal 4.5 pour « Le Silence » et les noms de peuples :
   le texte se prononce, il ondule comme une syllabe dans l'air.

Détails d'orfèvrerie à copier : horloge(s) du footer (« An 12 après le Silence » ?), marquee du
wordmark, puces-points 2px, compteur 22/60 en chiffre or.
