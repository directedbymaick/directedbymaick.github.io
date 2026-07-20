# PACKS.COM — INGÉNIERIE INVERSE COMPLÈTE

> Analyse menée sur https://packs.com (singles + flux d'ouverture), le 2026-07-20.
> Méthode : inspection DOM/styles calculés en live, téléchargement et lecture des
> bundles (index.css 547 Ko, 11 chunks CSS async, 20 chunks JS async), extraction
> du composant d'ouverture (chunk 396) et du moteur de carte (index.js).
> Rien d'inventé : tout ce qui suit est lu dans leur code.

---

## 1. Verdict d'architecture

| Sous-système | Technologie |
|---|---|
| Cartes (tilt, holo, foil, glare) | **100 % CSS** (aucun canvas) + variables CSS pilotées par React |
| Mouvement des cartes | **react-spring** (physique de ressort, jamais de tween à durée fixe) |
| Transitions/entrées CSS | Courbes **`linear(...)` springs** (ressorts échantillonnés en CSS pur) |
| Ouverture du pack (peel) | **three.js** : GLTF avec animation morph-target pré-cuite (Blender), le drag « scrubbe » la timeline |
| Reveal des cartes après peel | CSS keyframes très sobres (fade + scale 0.9→1) |
| Base | React SPA (rspack), BEM (`card__shine`, `packopen--card--…`) |

La filiation du moteur holo est claire : c'est le système open-source
**pokemon-cards-css de simeydotme** (les variables `--sunpillar-*`, les couches
`shine/glare`, les masques radiaux) industrialisé.

## 2. Le moteur de carte (holo/tilt) — le cœur

### 2.1 Structure DOM (BEM)

```html
<div class="card-interactive pokemon rainbow-glitter"  <!-- variante d'effet par rareté -->
     style="--card-effect-x:…%; --card-effect-y:…%; --card-effect-rx:…deg; …">
  <div class="card__translator">        <!-- translate3d(tx,ty) scale(s), perspective:600px -->
    <button class="card__rotator">      <!-- rotateY(rx) rotateX(ry), box-shadow -->
      <div class="card__back">…</div>   <!-- scaleX(-1) translateZ(-1px) -->
      <div class="card__front">         <!-- container-type:inline-size, overflow:hidden -->
        <img class="card__image">
        <span class="card__glare">      <!-- lumière radiale qui suit le pointeur -->
        <span class="card__glare--2">
        <span class="card__shine">      <!-- couches holo (+ ::before/::after) -->
        <span class="card__shine--2">
      </div>
    </button>
  </div>
</div>
```

### 2.2 Variables CSS injectées par React (les seules entrées du système)

```
--card-effect-x / -y        position pointeur en % (50% au repos)
--card-effect-rx / -ry      rotation carte (deg) — rx inclut flip (180°) + spin (360°)
--card-effect-rd            flip+spin seuls (pour compenser dans les holos)
--card-effect-bgx / -bgy    position du fond holo (bornée ! voir 2.3)
--card-effect-opacity       0 au repos → 1 au survol : TOUT l'holo fade par elle
--card-effect-scale         zoom (clic) ; --card-effect-tx/-ty translation du zoom
--card-effect-from-center   0..1 distance au centre (pilote l'intensité)
--card-effect-from-top/left 0..1 (pilote teintes et parallaxe des textures)
--card-effect-seedx/seedy   graine aléatoire PAR CARTE (chaque foil est unique)
--card-effect-r             angle atan2 du pointeur (rotation des barres holo)
```

### 2.3 La maths exacte du pointeur (extraite du bundle)

```js
// helper : rect + clientX/Y -> percents
xPercent = clamp(100/rect.width  * (clientX-rect.left), 0, 100)
yPercent = clamp(100/rect.height * (clientY-rect.top ), 0, 100)
centerX  = xPercent - 50   // -50..50
centerY  = yPercent - 50

// mapping -> variables
background.x = map(xPercent, 0,100 -> 37,63)   // le fond holo ne bouge QUE de ±13 %
background.y = map(yPercent, 0,100 -> 33,67)   //   (c'est ça, la retenue premium)
rotate.x     = -(centerX / 3.5)                // max ±14.3°
rotate.y     =   centerY / 2.8                 // max ±17.9°
rotate.z     = (atan2(xPercent-50, 50-yPercent) * 180/PI + 360) % 360  // angle barres
glare.x/y    = xPercent / yPercent
fromCenter   = clamp(hypot(centerX, centerY)/50, 0, 1)
```

Gyroscope mobile : gamma clampé ±18, beta ±16 → mêmes variables.

### 2.4 La physique : react-spring partout

Configs relevées dans le bundle : `{tension:300,friction:30}` (suivi pointeur),
`{tension:200,friction:26}`, `{tension:170,friction:26}` (retours), `{tension:150,friction:40}`
(zoom), `{tension:120,friction:8}` / `{tension:40,friction:5}` (oscillations lentes).

- **Sortie du survol** : spring vers `{effectX:50, effectY:50, rotate:0, opacity:0}` —
  jamais de « snap », l'holo s'éteint en fondu via `--card-effect-opacity`.
- **Flip** : `flipAngle: ±180°`, le **sens dépend de la moitié cliquée**
  (`xPercent<50 ? +1 : -1`).
- **Premier zoom** : `spinAngle: 360` — la carte fait un tour complet, une seule fois.
- CSS de secours : `.card__rotator { transition: .66s var(--ease-out) }` au hover.

### 2.5 Les recettes holo (par rareté, en couches)

Palette arc-en-ciel commune (les « sunpillars ») :
```css
--sunpillar-1:#fe7b76; --sunpillar-2:#ffed60; --sunpillar-3:#a9ff5e;
--sunpillar-4:#86fff7; --sunpillar-5:#7a95ff; --sunpillar-6:#d776ff;
--holo: var(--sunpillar-1),…,var(--sunpillar-6),var(--sunpillar-1);
```

Bibliothèque de textures (masques/patterns répétés) : `glitter.png`, `stars.png`,
`grain.webp`, `noise-base/top.webp`, `iri-1..9.webp` (iridescences), `cosmos-top/
middle/bottom.png` (foil cosmos en 3 plans parallaxe), `gold.webp`, `fracture-*.webp`,
`surge-*.webp`, `foil-bump-mtg.webp`, `packs-pattern-lg.png` (reverse holo).

Principes de composition (identiques dans chaque recette) :
1. `.card__shine` porte un `repeating-linear-gradient` des sunpillars, dont l'angle
   dépend de `--card-effect-r` (atan2 !) et la position de `--card-effect-bgx/y`.
2. `::before/::after` ajoutent barres de contraste (`background-blend-mode:exclusion`,
   `mix-blend-mode:hard-light`) ou textures (`--iri8/9` en `plus-lighter`/`overlay`).
3. **Masque radial au pointeur** : `mask-image: var(--pattern), radial-gradient(
   farthest-corner at var(--card-effect-x) var(--card-effect-y), #fff 20%, transparent 80%)`
   → l'holo ne s'allume QUE près du curseur.
4. `.card__glare` : `radial-gradient(farthest-corner circle at x y, blanc 10%, sombre 90%)`
   en `overlay`/`plus-lighter` ; `.card__glare--2` en `multiply` inversé
   (`background-position: calc(100% - x) calc(100% - y)`).
5. Tout est multiplié par `--card-effect-opacity` (fondu d'ensemble) et souvent par
   `--card-effect-from-center` (plus fort vers les bords).
6. `clip-path` sépare cadre et fenêtre d'art : `--clip-frame` (polygone de la fenêtre),
   `--clip-frame-invert` (tout SAUF la fenêtre), `--clip-border` (inset arrondi).
   Chaque ère de carte a ses coordonnées. → l'holo du cadre ≠ l'holo de l'art.
7. `--card-effect-seedx/seedy` décale les textures par carte (unicité du foil).
8. Perf : recettes activées seulement quand `:has(.card__front__image[data-large-loaded="true"])`.

### 2.6 Le système d'easing global (à voler tel quel)

```css
:root{
  --duration-short:.125s; --duration-medium:.25s; --duration-long:.5s; --duration-huge:1s;
  --ease: cubic-bezier(.65,.05,.36,1);
  --ease-out: cubic-bezier(.22,.61,.36,1);
  --ease-cubic: cubic-bezier(.66,0,.34,1);
  --ease-out-cubic: cubic-bezier(.33,1,.68,1);
  --ease-out-expo: cubic-bezier(.16,1,.3,1);
  /* LE secret du feel : des ressorts échantillonnés en linear() — CSS pur, compositor-friendly */
  --ease-spring: linear(0,.009 1.1%,.038 2.3%,.084 3.5%,.155 4.9%,.315 7.4%,.788 14%,
    1.007 17.8%,1.089 19.7%,1.149 21.5%,1.192 23.3%,1.22 25.2%,1.231 27.9%,1.213 31%,
    1.175 34%,1.059 41%,1.01 44.5%,.971 48.4%,.951 52.3%,.951 58.6%,.996 71.6%,1.01 78.5%,1);
  --ease-out-overshoot: linear(0,.528 7%,.921 14.4%,1.07 18.3%,1.19 22.4%,1.28 26.7%,
    1.34 31.2%,1.366 34.5%,1.378 38%,1.377 41.7%,1.363 45.6%,1.308 53.3%,1.13 71.3%,
    1.059 80.1%,1.013 89.7%,1);
}
```

## 3. L'ouverture de pack (le « rip »)

### 3.1 Le peel = un modèle 3D scrubbé au doigt

- `pack-wide.gltf` : modèle three.js du sachet **avec animation pré-cuite dans
  Blender** (tracks `morphTargetInfluences` = la déchirure/déformation du plastique).
- Textures PBR : base + `texture_metalness.png` + `texture_roughness.png` (foil réaliste),
  et l'art du pack composité par pack.
- **Interaction** : drag horizontal ; `progress = |x - startX| / largeurPackPx`
  (seuil = la largeur du pack à l'écran, fallback 130 px).
  - Le progress **scrubbe la timeline** : `action.time = progress * clip.duration; mixer.update(0)`
  - `+ rotation.z = 0.18 * progress` sur le groupe (le sachet s'incline en tirant)
  - `progress ≥ 1` → haptique + son + l'animation **continue toute seule** depuis la frame courante
  - relâché avant 1 → retour élastique à 0
- Une **languette** (`tab.png`, plan three.js) suit le doigt : `position.x = -0.1 + 0.2*progress`.
- Idle : parallaxe pointeur sur le modèle, rotation max ±15° (π/12), **lerp 0.08** par frame.
- 4 sachets empilés en Z (la pile visible derrière), seul le premier est animé.
- Effet de lumière derrière la déchirure : plans additifs masqués (`opening.png`,
  `open-mask.png`), `mix-blend-mode: plus-lighter`, teinte via `mix-blend-mode: hue`.

### 3.2 L'entrée/sortie du pack (CSS, sobre)

```css
.pack-opening        { opacity:0; transform: translateY(200px) scale(.9); }
.pack-opening.is-ready { transition: all var(--duration-huge) var(--ease-spring);
                         opacity:1; transform:none; }   /* monte avec un ressort */
@keyframes pack-opening-exit {      /* après le peel : anticipation puis chute */
  0%  { opacity:1; transform: translateY(0)    scale(1); }
  14% { opacity:1; transform: translateY(-8px) scale(1.02); }  /* petit sursaut */
  to  { opacity:0; transform: translateY(75%)  scale(.95); }   /* tombe + fond */
}
/* durée .7s cubic-bezier(.33,0,.18,1) */
```

### 3.3 Le reveal des cartes — LA leçon de sobriété

```css
@keyframes reveal-card {           /* c'est TOUT. */
  0% { opacity:0; transform: scale(.9); }
  to { opacity:1; transform: scale(1); }
}
```
- Les hits rares : shake horizontal minuscule (`±2px` subtle, `±6px` extended).
- Glow d'ambiance par rareté : `radial-gradient(400px 300px at top center,
  var(--reveal-glow) -20%, transparent 80%)` — gold/red/pink/purple/blue à ~0.2-0.25 d'alpha.
- Rareté « special » : conic-gradient multicolore + **bordure dégradée animée**
  (border 2px + double mask `content-box/border-box` + `mask-composite: exclude`).
- Swipe gauche/droite (garder/vendre) : overlay avec
  `--swipe-left/right-intensity` 0..1 pilotées par le geste, texte en
  `transition: transform .3s var(--ease-spring)`.
- `prefers-reduced-motion` respecté (animations coupées).

## 4. La grille de packs (hover premium)

```css
.pack-item--preview--pack   { transform: rotate(-5deg) translate(-10px,10px); }
.pack-item--preview--card   { transform: rotate(5deg)  translate(10px);  filter: brightness(.8); }
.pack-item:hover .pack-item--preview--pack { transform: scale(1.2) translateY(-5px); }
.pack-item:hover .pack-item--preview--card { opacity:0; transform:none; }
.pack-item--preview--glow   { filter: blur(50px); opacity:0; }   /* halo flouté derrière */
.pack-item:hover .pack-item--preview--glow { opacity:.7; }
.pack-item:before           { background: url(gold.webp); opacity:0; }  /* texture or */
.pack-item:hover:before     { opacity:1; transition-delay:.2s; }
/* le header glisse via mask-position (masque dégradé), pas via opacity */
```

## 5. Transposition à EXPELLED (plan d'action)

1. **Tokens motion** : adopter `--ease-spring`, `--ease-out-overshoot`, `--ease-out-cubic`,
   les durées, et les utiliser PARTOUT (cartes, modales, reveals). ✅ fait avec la cascade ×5.
2. **Reveal sobre** : cascade ×5 et récap = `opacity 0→1 + scale .9→1 + stagger ~40ms`,
   ressort CSS, zéro rotation aléatoire. ✅ fait.
3. **Card.svelte v3** : adopter la structure translator/rotator, les variables
   `--card-effect-*`, la maths exacte (rotations divisées /3.5 et /2.8, fond borné 37-63 %,
   atan2 pour l'angle holo), le retour-ressort à la sortie, le fondu par
   `--card-effect-opacity`, le masque radial au pointeur, et le glare double.
   Générer NOS textures (glitter/grain/iri) en SVG procédural — pas les leurs.
4. **Peel 2D évolué** : notre PackVisual garde le drag ; adopter le mapping
   progress = dx/largeur, l'inclinaison `rotate(0.18*progress rad)`, la languette qui
   suit le doigt, le retour élastique sous le seuil, et l'anticipation-chute à la sortie.
5. **Grille /packs** : hover à la packs.com (pack qui grossit, glow flouté, éventail
   de cartes derrière qui s'efface).

## 6. Ce qu'on ne copie PAS

- Leurs assets (textures, modèles, sons) : on génère les nôtres.
- Le rendu three.js du peel : hors budget pour l'instant — la version 2D en garde le feel.
- Les couleurs sunpillar seront recalibrées sur la charte (or/argent/ivoire du Silence,
  prismatique réservé aux full arts).
