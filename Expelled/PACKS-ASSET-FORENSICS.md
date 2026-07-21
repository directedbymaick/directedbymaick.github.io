# Packs.com — analyse forensique des assets visuels, 3D et audio

> Capture analysée le 20 juillet 2026.
>
> Complément de [`FOIL-ENGINE-RESEARCH.md`](./FOIL-ENGINE-RESEARCH.md).
>
> Les fichiers ont été téléchargés uniquement dans des dossiers temporaires pour inspection. Aucun asset, son, modèle, buffer ou bundle de Packs.com n’est inclus dans Expelled.

## Résumé exécutif

L’analyse binaire change une partie du diagnostic initial : « servi par Packs » ne signifie pas forcément « créé par Packs ».

- **16 textures servies par Packs sont byte-identiques à des assets publics de simeydotme.** Ce résultat est établi par égalité SHA-256, pas seulement par ressemblance visuelle ; il ne permet pas, à lui seul, d’établir le sens d’une éventuelle copie.
- Le moteur foil actif n’utilise que 16 textures, pour environ **1,08 Mio compressé** et **36,9 Mio une fois décodées en RGBA**. Les images sont partageables entre cartes, mais les surfaces compositées et filtres restent coûteux par instance.
- Dix autres textures sont déclarées comme variables CSS, mais aucune consommation `var(...)` n’a été trouvée dans le build capturé. Elles représentent 594 Kio et 19,9 Mio RGBA potentiels.
- Les techniques spécifiques observées dans ce build, et non retrouvées dans le corpus Simey comparé, sont surtout les finitions MTG `surge-holo` et `fracture-holo`, le masque reverse Packs, le foil bump MTG, l’orchestration du reveal et le peel WebGL.
- Contrairement à une première lecture, le CSS Packs capturé **ne fournit pas de masque foil exact par carte**. Il emploie des clips géométriques génériques par génération/cadre, des masques de motifs, des gradients radiaux et des masques de matière. Les exemples modernes de simeydotme savent faire du per-card exact ; ce n’est pas ce que montre ce build de Packs.
- Certains assets spectaculaires appartiennent à d’autres expériences : le WebP `gold-video` est un one-shot de Single Pull, tandis que les gros PNG `type-a/b/c` ne sont référencés que par une vue de développement.
- Le peel 3D normal transfère environ **17,32 Mo** hors illustration dynamique et JavaScript. Son buffer est composé à **97,48 % de morph targets** ; 42 des 126 targets occupent 2,21 Mo sans pouvoir être atteintes par le contrôleur actuel.
- Deux assets 3D sont fonctionnellement neutralisés : la metalness map est uniformément noire et `composite/mask.png` est opaque alors que Canvas attend son alpha. Une troisième intention, la variation de teinte des packs arrière, est déclarée mais jamais transmise au compositor.
- Le lot audio contient 23 fichiers pour **9,64 Mo**. La séquence booster/reveal en mobilise seize pour 1,34 Mo ; les trois WAV de roulette expliquent l’essentiel du reste. Un WAV `gold` conserve des métadonnées explicites de bibliothèque Sound Ideas : il provient apparemment d’une bibliothèque de stock soumise à licence, mais le statut de licence de Packs n’est pas vérifié.

La bonne leçon pour Expelled reste le pipeline, pas les pixels : créer une bibliothèque de matières originale, légère et documentée, puis la contraindre par des masques Expelled.

## 1. Méthode

L’inventaire vient des bundles publics suivants :

- [`index.3609e3fe.css`](https://packs.com/static/css/index.3609e3fe.css) — moteur de cartes ;
- [`968.09b0139d.css`](https://packs.com/static/css/async/968.09b0139d.css) — ouverture et reveal ;
- [`504.0a75601e.css`](https://packs.com/static/css/async/504.0a75601e.css) — expérience Single Pull ;
- [`805.730f22e2.css`](https://packs.com/static/css/async/805.730f22e2.css) — landing ;
- [`396.e25459c0.js`](https://packs.com/static/js/async/396.e25459c0.js) — rendu Three.js ;
- [`968.0a10ddbc.js`](https://packs.com/static/js/async/968.0a10ddbc.js) — orchestration de l’ouverture ;
- [`index.1e9c1b1f.js`](https://packs.com/static/js/index.1e9c1b1f.js) — composants partagés et vues de développement.

Pour chaque fichier accessible :

1. extraction de l’URL depuis les bundles ;
2. téléchargement temporaire depuis l’URL publique ;
3. SHA-256 et taille compressée ;
4. dimensions, format, mode couleur et canal alpha ;
5. inspection visuelle à la résolution originale ;
6. recherche de chaque référence et variable dans tous les CSS/JS ;
7. comparaison binaire avec les dépôts et CDN publics de simeydotme ;
8. mesure du coût de décodage théorique en RGBA.

Les bundles ne publient pas de source maps. Les noms de chunks sont volatils ; les hashes de ce document figent la capture.

## 2. Provenance : seize égalités binaires avec simeydotme

### 2.1 Sword & Shield

Ces cinq fichiers de Packs sont byte-identiques aux fichiers du commit analysé de [`pokemon-cards-css`](https://github.com/simeydotme/pokemon-cards-css/tree/acb1197/public/img) :

| Asset Packs | Dimensions | SHA-256 | Source identique |
|---|---:|---|---|
| `cosmos-bottom.ad1b667b.png` | 734×1024 | `3a6fa183c3d2…` | `public/img/cosmos-bottom.png` |
| `cosmos-middle-trans.7fc40412.png` | 734×1024 | `8bb9d4c6dcff…` | `public/img/cosmos-middle-trans.png` |
| `cosmos-top-trans.176ab82b.png` | 734×1024 | `013535789bca…` | `public/img/cosmos-top-trans.png` |
| `glitter.60d885af.png` | 630×540 | `57d04837c3f0…` | `public/img/glitter.png` |
| `grain.25cf602d.webp` | 500×500 | `a3085cdb018e…` | `public/img/grain.webp` |

La recette Cosmos de Packs reprend aussi la même structure, les mêmes trois images, la même séquence de couleurs, les mêmes tailles de fond, les mêmes modes de fusion et les mêmes facteurs `10/80`, `15/70`, `20/60` que [`cosmos-holo.css`](https://github.com/simeydotme/pokemon-cards-css/blob/acb1197/public/css/cards/cosmos-holo.css). Les sélecteurs et variables ont été adaptés à React/Packs.

Le README amont attribue le Galaxy Holo à `aschefield101` et certains backgrounds à Vecteezy. Cela rend la chaîne de droits plus complexe qu’un simple « GPL donc réutilisable ».

### 2.2 Scarlet & Violet 151

Les onze fichiers suivants sont byte-identiques aux URLs `poke-holo.b-cdn.net` déclarées dans le CSS du commit analysé de [`pokemon-cards-151`](https://github.com/simeydotme/pokemon-cards-151/tree/98030f9) :

| Famille | Fichiers | Dimensions | Résultat |
|---|---|---:|---|
| bruit | `noise-base`, `noise-top` | 300×300 | SHA-256 identique |
| iridescence claire | `iri-1`, `iri-2`, `iri-3` | 300×300 | SHA-256 identique |
| iridescence saturée | `iri-4`, `iri-5`, `iri-6` | 300×300 | SHA-256 identique |
| sparkle sombre | `iri-7`, `iri-8`, `iri-9` | 300×300 | SHA-256 identique |

Sources directes :

- [`iri-1.webp`](https://poke-holo.b-cdn.net/foils/151/iri-1.webp) à [`iri-9.webp`](https://poke-holo.b-cdn.net/foils/151/iri-9.webp) ;
- [`noise-base.webp`](https://poke-holo.b-cdn.net/foils/151/noise-base.webp) ;
- [`noise-top.webp`](https://poke-holo.b-cdn.net/foils/151/noise-top.webp).

Les noms hashés de Packs donnent l’apparence d’assets de build propres au site, mais le contenu binaire est inchangé.

### 2.3 Conséquence

Il faut distinguer :

1. le fichier servi par l’infrastructure Packs ;
2. l’auteur réel ou la source amont ;
3. la licence du code qui le référence ;
4. les droits spécifiques éventuels sur l’image elle-même.

Pour Expelled, la voie la plus sûre est de ne conserver **aucun** de ces seize fichiers dans une future bibliothèque propriétaire.

## 3. Bibliothèque foil réellement active

### 3.1 Inventaire actif

| Famille | Assets actifs | Format et dimensions | Fonction réelle |
|---|---|---|---|
| Sunpillar | `grain` | WebP RGB, 500×500 | micro-texture sombre fusionnée en `screen` |
| Cosmos | `cosmos-bottom/middle/top` | PNG, 734×1024 | trois densités d’étoiles, base opaque puis deux plans alpha binaires |
| Reverse Pokémon | `packs-pattern-lg`, `noise-base`, `iri-1` | PNG RGBA 1031×550 + 2 WebP 300² | motif alpha, bruit et iridescence claire |
| Rainbow Glitter | `iri-7/8/9` | WebP RGB 300² | trois fréquences sombres de micro-sparkles |
| MTG Basic | `foil-bump-mtg` | WebP RGB 800² | pseudo-height map douce utilisée en `multiply` |
| MTG Surge | `surge-3`, `surge-3-invert` | WebP RGB 1146×1411 | deux cartes de luminance croisées |
| MTG Fracture | `fracture-base/mid/contrast` | WebP RGBA 760×1000 | trois distributions de facettes |

Total : 16 fichiers, 1 110 Kio compressés, environ 36,9 Mio décodés en RGBA.

### 3.2 Assets déclarés mais non consommés

Le `:root` du CSS expose plus de matière que les recettes actives n’en utilisent.

| Variables sans consommation observée | Fichiers |
|---|---|
| `--glitter` | `glitter.60d885af.png` |
| `--noise-top` | `noise-top.01765079.webp` |
| `--iri2` à `--iri6` | `iri-2` à `iri-6` |
| `--surge1`, `--surge1-invert`, `--surge2` | `surge-1`, `surge-1-invert`, `surge-sharp` |

Cela représente dix fichiers, 594 Kio compressés et 19,9 Mio RGBA s’ils sont décodés. Ils constituent vraisemblablement une bibliothèque de variantes ou des restes d’itérations ; ils ne participent pas au rendu de la capture analysée.

## 4. Déconstruction des matières

### 4.1 Cosmos

Les trois PNG ont exactement le ratio d’une carte et partagent la même composition stellaire :

- `bottom` est opaque, coloré bleu/rose, très dense ;
- `middle-trans` conserve environ 17,2 % de pixels opaques ;
- `top-trans` ne conserve qu’environ 2,9 %, en blanc/gris.

Chaque plan reçoit le même offset aléatoire `--card-effect-cosmos-pos`. Ce n’est donc pas la texture bitmap elle-même qui produit trois vitesses de parallaxe. La profondeur vient surtout des trois traitements :

- gradient arc-en-ciel déplacé sur 80 % pour le fond ;
- 70 % pour le milieu ;
- 60 % pour le dessus ;
- fusions successives `color-burn`, `overlay`, puis `multiply` ;
- contrastes et luminosités différents.

Le résultat semble plus profond parce que les couleurs et densités répondent différemment, même lorsque les étoiles restent alignées.

### 4.2 Reverse Pokémon

`packs-pattern-lg` est un masque pur : RGB entièrement noir, 93,1 % transparent, 1,8 % semi-transparent et 5,1 % opaque.

La recette combine :

1. un gradient diagonal à treize stops ;
2. `noise-base` à 266×266 ;
3. `iri-1` à 266×266 ;
4. des offsets pseudo-aléatoires propres à l’instance ;
5. un masque de pattern ;
6. un radial centré sur le pointeur ;
7. `mask-composite: subtract` ;
8. `plus-lighter` pour la sortie.

Le motif n’est donc pas une couleur imprimée. Il sélectionne les zones où la micro-iridescence peut exister, tandis que le radial en ouvre ou en retire une partie au mouvement.

### 4.3 Rainbow Glitter

Le nom est trompeur : le fichier `glitter.png` n’est pas utilisé. La finition repose sur `iri-7`, `iri-8` et `iri-9`.

- `iri-9` forme le lit principal ;
- `iri-8` se déplace dans le sens du pointeur ;
- `iri-7` se déplace en sens inverse ;
- les opacités des deux pseudo-éléments sont complémentaires selon la hauteur du pointeur ;
- `overlay` et `plus-lighter` transforment les textures sombres en flashs ponctuels ;
- un masque radial transparent au centre et opaque vers l’extérieur limite l’effet.

La texture paraît vivante parce qu’un même champ de micro-points n’est jamais seulement translaté : deux variantes croisent direction, contraste et opacité.

### 4.4 MTG Surge

Les assets sont de grandes cartes de luminance obliques. La version dite `invert` n’est pas une simple inversion mathématique : elle conserve surtout des contours doux et lumineux autour des formes.

Le CSS actif n’utilise que `surge-3` et `surge-3-invert` :

- masque agrandi à 140 % × 120 % ;
- intersection avec un radial mobile ;
- deux surfaces `shine` et `shine--2` ;
- première opacité : `sin((from-left - .1) / .8 * 180deg)` ;
- seconde opacité : `1 - sin(...)` ;
- sortie `plus-lighter`.

Ce crossfade sinusoïdal évite un changement sec entre la masse blanche et son contour. Le mouvement horizontal simule l’alternance de deux orientations de micro-rainures.

### 4.5 MTG Fracture

Les trois WebP ne sont pas des couleurs finales, mais des cartes de luminance de facettes :

- `base` est le champ le plus dense et le plus clair ;
- `mid` contient davantage de creux noirs ;
- `contrast` ne garde que des éclats très sélectifs.

Le moteur ajoute ensuite la couleur :

- base : radial OKLCH, hue opposée à l’angle, `plus-lighter` ;
- milieu : radial OKLCH + bande arc-en-ciel, hue multipliée par trois, `difference` ;
- contraste : petite lumière OKLCH au pointeur ;
- toutes les cartes sont intersectées avec un radial transparent jusqu’à 20 %, noir vers 55 % ;
- le masque base se déplace de −5 %, les deux autres de +5 %.

Le relief ne vient donc pas d’un shader 3D. Il vient d’une désynchronisation volontaire de trois cartes 2D corrélées.

### 4.6 Foil bump MTG

`foil-bump-mtg` est un height field gris, doux, isotrope, de 800×800. Il n’est ni interprété comme normal map ni éclairé par WebGL.

Il est posé sur `shine--2:after` :

- taille 120 % × 110 % ;
- position fixe au centre ;
- `mix-blend-mode:multiply` ;
- contraste ×2 ;
- opacité égale à environ un tiers de l’opacité interactive.

C’est une modulation de papier/film, pas un bump physique. Cette technique est très rentable pour Expelled si la texture est originale et beaucoup plus légère.

## 5. Ce que les masques Packs font réellement

Le build capturé définit des polygones génériques par famille de cadre : Pokémon base, e-card, EX, Diamond & Pearl, HGSS, Black & White, XY, Sun & Moon, Sword & Shield, Scarlet & Violet ; MTG classic, original, 2003 et 2015.

Les primitives observées sont :

- `clip-path: inset(...)` pour la bordure ;
- `polygon(...)` pour la fenêtre d’illustration ;
- polygone inversé pour l’extérieur de la fenêtre ;
- gradient vertical pour les cadres MTG extended ;
- radial dynamique pour proximité du pointeur ;
- image de luminance pour Surge/Fracture ;
- pattern alpha pour le reverse.

Aucun champ JS `foilMask`, `etchMask`, `glareMask` ou style inline `--mask:url(...)` n’a été trouvé. La structure sait accepter `--mask`, mais le composant capturé ne lui injecte pas de masque propre à une carte.

Conclusion : Packs fait une excellente **segmentation par format de carte**, mais pas une segmentation sémantique précise de chaque illustration dans cette version.

## 6. Assets de rareté et révélation

### 6.1 Atlas d’étoiles 856×856

Les fichiers `blue`, `purple`, `pink`, `red`, `gold`, `grey` et `rainbow` sont des champs d’étoiles quatre branches sur fond transparent.

- environ 94 % de l’atlas est transparent ;
- `blue` et `purple` partagent exactement le même canal alpha ;
- `pink`, `red` et `gold` partagent un deuxième canal alpha identique ;
- la variation principale est donc la colorimétrie, avec deux distributions de formes ;
- l’atlas est affiché à seulement 200 px dans les cartes de produit.

Le statut `special` superpose l’atlas rainbow à un conic-gradient OKLCH. Il ne dépend pas d’un gros shader ou d’une vidéo.

### 6.2 Reveal moderne

Le reveal de booster n’emploie pas ces PNG de glow pour border la carte. Il construit le halo avec CSS :

- radial de fond par rareté ;
- huit box-shadows externes/internes calculées ;
- `@property --glow-progress` et `--glow-factor` ;
- anticipation limitée aux cartes fortes ;
- flare de deux secondes après flip ;
- pour `special`, bordure dégradée OKLCH et masque `exclude`.

C’est un bon exemple d’asset avoidance : la forme est générique, donc CSS est plus souple qu’une image précalculée.

### 6.3 Keep / sell

Deux lames verticales de 104×456 servent au swipe :

- `keep-sell-off` : violet sombre, état neutre ;
- `keep-sell-over` : rouge sombre, état déclenché ;
- affichage à 60 px de large ;
- symétrie horizontale via `scaleX(-1)` ;
- opacité pilotée par `--swipe-left-trigger` et `--swipe-right-trigger` ;
- transition de 150 ms.

Une seule paire d’images produit donc les deux côtés et tous les niveaux de feedback.

### 6.4 Single Pull : glows et animation gold

Le chunk `504` appartient à l’expérience de roulette Single Pull :

- six PNG de glow 170×170 par rareté ;
- un splash violet 572×572 ;
- plusieurs halos CSS floutés et particules canvas ;
- `gold-poster.png`, 500×500 ;
- `gold-video.webp`, 500×500, 6 376 000 octets.

Le WebP animé gold contient :

- 180 frames ;
- 17 ms par frame ;
- 3 060 ms au total, soit environ 58,82 fps ;
- lecture one-shot ;
- extension rapide pendant les dix premières frames ;
- pic de mouvement à la frame 4 ;
- pic d’alpha vers la frame 45 ;
- pic de luminance vers la frame 63 ;
- fin presque statique à partir d’environ la frame 169.

À 6,08 Mio pour un seul accent, c’est visuellement riche mais coûteux. Pour Expelled, un WebM VP9 avec alpha et fallback, ou un sprite original plus petit, serait plus rationnel.

### 6.5 Assets uniquement présents dans la vue de développement

`front-2.png`, `type-a.png`, `type-b.png` et `type-c.png` totalisent environ 6,4 Mio. Ils sont référencés par `dev-view-packitem-examples`, avec trois faux packs Pokémon de démonstration.

Ils ne doivent pas être interprétés comme le moteur d’ouverture actuel et ne justifient aucune reproduction.

## 7. Manifeste visuel SHA-256

### 7.1 Matières foil

Le nom de fichier inclut le hash de build Packs ; la colonne suivante donne le SHA-256 réel du contenu.

```text
cosmos-bottom.ad1b667b.png  131547  3a6fa183c3d2f6f61b04f031153ba01ad4a483cbabe25088c0856319ed18aa49
cosmos-middle-trans.7fc40412.png  109878  8bb9d4c6dcff500a141a48a3b851a61137d5f4511c40b95ac9b2586f24f39c5b
cosmos-top-trans.176ab82b.png  31684  013535789bca6d65c3e2da05fc56fbf3b5227913bb4b31a846cdaa450bc5d33f
foil-bump-mtg.3038d49d.webp  28710  7d00340b46a1580f461e8ad092be4b27078f0f1ec7c3eb20023082c55aa59d3d
fracture-base-2.bc00f7d6.webp  133580  1c435a2fbdd19c994a17e94b28d617f7ef266a0fa5abecbe084290cac840f413
fracture-contrast-2.b8874c19.webp  104874  3d776b05cc6aaf6224d303eedfeb96aa4bedc392381c72bf656aa688918ad952
fracture-mid-2.9f7b1f7e.webp  122564  eefd45997c2def03ea1881313d1faf2f05fab616113ddf2cb55baea60c2a4af2
glitter.60d885af.png  113310  57d04837c3f0fd09221a80284b2e5dd8d1881b2dce5c0bfa3c800db27863d40f
grain.25cf602d.webp  59244  a3085cdb018e6b356fe9c8be08ddf489cb14c42423d5c74483ca008d153ee862
iri-1.2ee94c0c.webp  24000  e586d8d2c768e83e070a831ed824902c40e85e40377217893bc96adcfcc2611f
iri-2.33be56c8.webp  26080  f9580d66f1897aa57c122eb7727f68d4838d0e10176a546abeba69a84738571a
iri-3.d610c5e0.webp  28662  5aee27dedae18948b8d90af896fb3e47bcdbc99f879108e774e0e62ee3d4316d
iri-4.75c8a641.webp  52634  e8b965ab3a0ae97fdbb71d246927c4498adcd48b13496f6c3b8a07838feb54c8
iri-5.a2f86c83.webp  49664  706c72caf1284922f190fe8eed8af0d76d611a391da51c8827d25164296812c1
iri-6.fba83f18.webp  46652  583ca8e0ce03fb5ad680a264f70f4ef583fb79fc7df6d401e9ef679f915076cd
iri-7.3cbe0a17.webp  36650  8840244877a54032b88beccb06d467c85c95e749d332699cc61e79e05ecb633d
iri-8.02ae9f66.webp  36404  1fec0c57c69d4f5d04b498f8748f65e4d1e8a0d972186d5556e7780b7c379520
iri-9.24cc7cbf.webp  34010  4d3f33e6e9453a0a7a179ca5c077d6add11a4ec4e362726a99502093369ca78e
noise-base.3c8991b3.webp  34920  4d38c5c77180fbea78da363da26cb96b7aae34f3c43627c48836fe5e73e9026f
noise-top.01765079.webp  38242  926adba7e5b6f85f8b411c37eb7b06fcdab3c6a2402622ebcb6fd4addaeaf2dd
packs-pattern-lg.b4019283.png  16339  153f6ff01988bd2bbf6130c3ea8b39c938c92c4429a035da0ad5af28d6c8d235
surge-1.64044755.webp  146366  75cbc61b3e2d6b81a83ac1feccf09e3587f8108e2f4a596280c4fb040123a34b
surge-1-invert.64b4e169.webp  73408  d6983960cdcbeb4d1f64fec62a32be43708c21bd4ff86717ff76d0f2dba087ef
surge-3.23d2069b.webp  162484  ad8b9b05fdfc412cc1697300b4ab1335fdab95ce045f430c34a1e546c9926820
surge-3-invert.e58a2495.webp  70082  c9d97bc8262d541cfd9609568ce9cd8ea8515011714329b879e78904d9e384b5
surge-sharp.8e855a05.webp  33512  c1e9f4338eaee930e8b409dc1578aa0ba879d4b1a1cd72e55339f861c48d2f42
```

### 7.2 Rareté, reveal, Single Pull et landing

```text
blue.63128184.webp            41982  856x856    340da6cf3ed48ba3d295da8e9e01d17040964c868fdb5f45c5120014ef943c57
purple.24dcd776.webp          41620  856x856    fedac2904ab6ba71a512c787e70285fe0835d75e9b35c5254e37b20151fe5b92
pink.4dca4fb6.webp            60408  856x856    7ed4b6e60de555bbe9b9d1f5cb155c84550fbaf48efa3a9c932f31d216540d9a
red.734f1d21.webp             60618  856x856    07c85c6d8632a606f3239eddf43737bfbccd3775f0d5a2d42bfa36a221d97c2f
gold.023e64e8.webp            62208  856x856    0c35beb30f30206fdd1443e0424ab2a12032f37d63642433d6a917a3ea069cb5
grey.f87ae9af.webp            44642  856x856    15d7240a59bf4c94bbef1c6a0912e229c9dd9b618c11ccfb7382cf3d091ca86c
rainbow.80a14a30.webp         52550  856x856    0a2fa7eeb4be2913f6d779827b8ffb59dc10512f5fd0192beb3a82a75d315d61
blue-glow.1d5c05f1.png        30350  170x170    7bd544fbb23178d484318c44947f8b5479c247499770b4008b8b8c2946559f8f
purple-glow.fa0c3857.png      29950  170x170    a97d50a6a43824999cb870832180d452572f900d1f10f2fc1cbc8f0cd7b71092
pink-glow.6d71fafd.png        35991  170x170    b9ebc0ee92bf0f9e77bbbc3aa95f5bd661371cbed6fce303a61b4bcb885f6c2f
red-glow.f76b8cd1.png         30306  170x170    667b9617bda301896f3567a3ee90dcd87319f8cbd7bd4a6ea6944c8f66c53719
gold-glow.8a3615a3.png        30089  170x170    79c1aa8cae626a5413e076be29673c282baa76f42e90270f7ff757cbef3937ba
gray-glow.abd7c7e3.png        22505  170x170    bfd0763cb91750e0d8fc33fd835aa1fbad0a07e3f6a0c2e1526f1c4f049158fb
glow-purple.fb62e942.png      46494  572x572    8319d2f428c6c117534ca7e9b1f5ad2082758f6dccc59fc4429e228fbd547255
keep-sell-off.fa9dec95.png    38514  104x456    da08f42ccf7dd15f94e829c8f1d1c22c9c3770f5484101de08a7b4572b969649
keep-sell-over.12b885b5.png   33541  104x456    5bbbcdc7bca67d5c9b3f791b2d77763dbfcb1e6b04b52a64318e926540706907
gold-poster.png               65733  500x500    1f08767af1a8a4698bae8375d3ebf36f3a8e3b820eaa254eeba312b5e9a8afac
gold-video.webp             6376000  500x500    0ef7c47a609f819e1f785f02369001ca29f62cc1963adc77d6a2b914e6a2636f
stars.a4e218b1.png            10247  136x81     d660cffa2ed5a1cb8d23d3d330709762caac234a3f847a987914e35c90392534
shimmer.b09208c4.webp        116646  1024x1024  a5f7b16f21b157976f0ce6fac5acd299e3ae33b9e423d64e29a2fe04ffc104bf
front-2.png                  2023293  1079x1500  ae41940b948a2cf781a72c106803ff06f837278ed3f4217ecd8f1b62017ea74a
type-a.png                    584194  414x735    7e0fbfd331e8c487c4e8cd2384ac7db05b2cffd3a4882d02d183f3c5f355b117
type-b.png                   1539047  778x1427   900f8dbb0884da70071be8900fd956bdc1627fc7217bb0aa867b23313bd76bbb
type-c.png                   2563103  780x1429   5339930ce071c8d23ddcf11c82f13af0d169f6bfd46a77d6caf972aaa00f82b3
```

Les glows appartiennent à Single Pull, `shimmer` à la landing et `front-2/type-a/b/c` à une vue de développement. Leur présence dans les bundles ne signifie donc pas qu’ils participent à l’ouverture moderne. Les manifests 3D et audio suivent dans leurs sections respectives.

## 8. Pipeline 3D du booster

Sources principales : [`pack-wide.gltf`](https://packs.com/models/pack-open/pack-wide.gltf), [`pack-wide.bin`](https://packs.com/models/pack-open/pack-wide.bin) et [chunk d’ouverture Three.js](https://packs.com/static/js/async/396.e25459c0.js).

### 8.1 Budget et chemin de chargement

Le chemin standard transfère environ 17,32 Mo d’assets avant l’illustration dynamique du booster et les bundles JavaScript. Le chemin invité, dont le sprite est plus compressible, en transfère environ 13,46 Mo.

Les ressources réellement utilisées sont :

- GLTF + buffer externe ;
- normal, roughness et height maps ;
- cinq overlays de lumière, puis `shape.png` ;
- `open-mask.png`, `tab.png` et un seul des deux sprites d’ouverture ;
- `fallback.png` uniquement si aucune illustration de pack n’est fournie.

Deux fichiers chargés n’apportent aucun pixel au résultat :

- `texture_metallic.png` contient 4 194 304 pixels à zéro. Multipliée par `metalness=1`, elle rend toute la surface non métallique ;
- `composite/mask.png` est un PNG RGB entièrement opaque. L’opération Canvas `destination-in` lit l’alpha, pas la luminance : ce masque ne retire donc rien.

`fallback.png` n’est pas un fallback WebGL. Si le GLTF échoue, le code journalise l’erreur mais ne bascule pas vers une véritable expérience 2D.

### 8.2 Géométrie et morph targets

Le GLTF 2.0 a été exporté par `Khronos glTF Blender I/O v5.0.21`. Il ne contient ni Draco, ni Meshopt, ni quantification, ni texture KTX2, ni licence embarquée.

| Élément | Mesure |
|---|---:|
| JSON | 82 962 octets |
| BIN | 6 811 444 octets |
| meshes / primitives | 2 / 2 |
| sommets | 2 731 |
| triangles | 5 432 |
| morph targets | 126, position + normale |
| poids des données morph | 6 639 716 octets, soit 97,48 % du BIN |
| morphs inaccessibles | 42, soit 2 213 568 octets et 32,5 % du BIN |

Le corps compte 535 sommets et 1 048 triangles. La bande déchirable concentre 2 196 sommets, 4 384 triangles et les 126 formes `frame_0` à `frame_125`.

Le contrôleur ne parcourt pourtant que les targets 7 à 90 :

```text
drag 0..1
→ progression modèle 0,4..1
→ temps du clip 0,1167..1,1667 s
→ targets approximativement 7..70
→ validation puis lecture 1,1667..1,65 s
→ targets 70..90
```

Les deux clips finissent à 1,65 s. Les 96 clés utiles de la bande sont échantillonnées à 60 Hz et activent les morphs en one-hot. Le corps ne chute qu’entre 1,3667 s et 1,65 s. L’expérience est donc un point-cache à 60 Hz, malgré les constantes du contrôleur exprimées à 30 fps.

Three.js r180 génère une boucle sur les 126 targets pour la position et une autre pour la normale. Cela implique 252 tests par sommet de la bande alors qu’un seul target, ou deux pendant l’interpolation, possède un poids utile. C’est le principal coût structurel à ne pas reproduire.

### 8.3 Matériau et éclairage

Le matériau du GLTF est remplacé par un `MeshStandardMaterial` double face :

- illustration utilisée comme `map` et `emissiveMap`, intensité 0,5 ;
- metalness nominale 1, mais résultat effectif 0 à cause de la map noire ;
- roughness nominale 1 multipliée par des valeurs 16..48, soit environ 0,063..0,188 ;
- bump scale 0,15 ;
- normal scale `(2,2)` ;
- lumière ambiante 0,85 et deux directionnelles 0,6 / 0,5 ;
- aucun environnement HDR, aucune ombre et aucune postproduction.

Les quatre textures PBR font 2048×2048. Chargées sans format GPU compact, même les cartes monochromes peuvent devenir des RGBA8 complètes côté GPU.

La scène clone quatre packs. La géométrie peut rester partagée, mais les matériaux et appels de rendu sont multipliés. Seul le pack supérieur reçoit l’animation, le mixer et le flash de rupture.

### 8.4 Compositor de l’emballage

L’illustration de pack est précalculée dans un canvas 562×912. L’ordre des overlays est important :

1. `bottom-edge.png` — `multiply`, alpha 0,5 ;
2. `darken.png` — `multiply`, alpha 0,5 ;
3. `bottom-slits.png` — `multiply`, alpha 0,5 ;
4. `linear-light.png` — mode Canvas `screen`, alpha 0,7 ;
5. `linear-dodge.png` — `color-dodge`, alpha 0,7 ;
6. `composite/mask.png` — `destination-in`, sans effet ;
7. `shape.png` — `destination-in`, détourage réellement fonctionnel.

Un second canvas pose un violet `rgb(55,30,135)` sur la partie basse. Les packs arrière sont recolorés en `#401f99` via `darken` puis `color`.

Le tableau `el=[0,.5,.65,.8]` semble devoir varier l’intensité de teinte en profondeur, mais ses valeurs ne sont jamais passées à `fillGlobalAlpha`. Trois canvases arrière sont ainsi produits avec le même alpha par défaut de 0,9. La précomposition reste une très bonne idée ; son paramétrage est simplement inachevé dans ce build.

### 8.5 Sprite de rupture

`opening.png` et `guest-opening.png` ne sont jamais chargés ensemble :

- atlas RGBA 1618×6672 ;
- 48 frames en grille 2×24 ;
- cellule 809×278 ;
- boucle de 48 frames à 60 fps, période 0,8 s, active jusqu’au fade ;
- blending additif, sans depth test ni depth write ;
- `open-mask.png` lu comme `alphaMap`, donc via son canal vert ;
- disparition sur 100 ms.

Les deux sprites ont un canal alpha byte-identique (`3250a64ed294…`) : seule la couleur change. Une intensité monochrome recolorée dans le shader éviterait deux variantes RGBA. La hauteur de 6672 px dépasse aussi la limite de texture 4096 encore fréquente sur mobile ; Three peut être obligé de redimensionner l’atlas.

### 8.6 Manifeste 3D complet

Préfixe : `https://packs.com/models/pack-open/`.

| Asset | Octets | Dimensions / rôle | SHA-256 |
|---|---:|---|---|
| `pack-wide.gltf` | 82 962 | GLTF JSON | `97603d0935664f81bcea465b8a5ee2b5372309a7a5cabad0dfeb7079e7b36e4e` |
| `pack-wide.bin` | 6 811 444 | buffer brut | `53999ec166372b6775e9a6f4625d4dc08c51a4d0c6f3093342d8414072385277` |
| `texture_metallic.png` | 4 166 | 2048² L, valeur 0 uniforme | `41a8c2d58782abca9d4b79dc2b4d59fa460a731b081212ba4723c7b64017b780` |
| `texture_roughness.png` | 277 229 | 2048² L, valeurs 16..48 | `effff703b09c3b9fc951e47f18aebc89f7fb8bf996b5113b6981027a161660e3` |
| `texture_height.png` | 162 589 | 2048² L, valeurs 46..255 | `740efa603ab6cff3a5d260f5fd88f2f0a820f3c2eee1554d19e90d59e963faed` |
| `texture_normal.png` | 2 098 741 | 2048² RGB | `5d63515d1b83cf9a524c5e46ecddb1412e2da3dd267ddf2a01d5515218abb487` |
| `composite/bottom-edge.png` | 6 466 | 562×912 RGBA | `4544951a2d1f52b149251e545d0f15d0419247c5acb1e0e2e3a4c31901dbe63c` |
| `composite/bottom-slits.png` | 27 136 | 562×912 RGBA | `b83ff733e7bffdf150e55c5370657598b905102e33cc044b17e2059ace6ceb5d` |
| `composite/darken.png` | 10 210 | 562×912 RGBA | `858af1c5361b91a0b3cb8714e86c96e7dea6333d3c48e7e06c960f4bc93dac13` |
| `composite/linear-light.png` | 146 652 | 562×912 RGBA | `baea1a18af9f2d58d17289fcbd0941c31888232f5bf5a3c7602cfbc68fd7bcf7` |
| `composite/linear-dodge.png` | 184 207 | 562×912 RGBA | `5bbfc1270a0f2937026360e91beb9750867d33e79161275a504b2edcdb48ec86` |
| `composite/mask.png` | 7 252 | 562×912 RGB opaque, no-op Canvas | `126a48284f0bd78b214b233aa442b4a38faac72e3c253e82095691cc1a09573e` |
| `composite/shape.png` | 6 361 | 562×912 RGBA, silhouette | `f076513b9bc757081f7de9265cfcdf3443d37cc23307f6f4199fb6a651737c4a` |
| `opening.png` | 7 423 494 | 1618×6672 RGBA, 48 frames | `1d2c3de838d559bec4754dbb740a7f6ce4a7f6b18297cb4cccf036c567d2a386` |
| `guest-opening.png` | 3 561 266 | 1618×6672 RGBA, 48 frames | `aafd56bedca8190a6977b40552397ae6bd612f5ed3c30cce255d40779de0da66` |
| `open-mask.png` | 4 876 | 1000×278 RGB, alphaMap verte | `7ba8a4544e4c49f2d3121e13d9eea6cd09ddb0cfffe073ed52dcbc941ad70a34` |
| `tab.png` | 70 298 | 716×425 RGBA | `7ff3310bcb1b3f72bc4d44c237bc16668ab20017bfc15ba81ef94155ae0f2e21` |
| `fallback.png` | 425 591 | 620×912 RGBA opaque | `3454b591e9e79f0010d9c03aef908e7bcfb1ff67e8b364144a9aa7a057c2659b` |

Le chunk d’ouverture fait 38 598 octets (`7b97234080a4…`) et le chunk Three.js r180 587 329 octets (`839dcc8c2ff7…`). Aucun des 18 assets ci-dessus n’est byte-identique aux 301 fichiers image/3D comparés dans les dépôts Simey.

Les métadonnées donnent seulement des traces d’outil, pas une licence : les sept calques `composite/*` indiquent Photoshop 26.8 sous Windows ; `guest-opening.png` et `tab.png`, Photoshop 26.10 sous macOS ; `fallback.png`, Figma. Le GLTF ne déclare que l’exporteur Blender. Ces indices suggèrent une production propre distincte du lot Simey, sans accorder pour autant de droit de réutilisation.

### 8.7 Mémoire, cycle de vie et leçon clean-room

Estimation du chemin normal : environ 121 Mio d’images décodées, 9,8 Mio de canvases CPU retenus, 109 à 115 Mio de textures GPU avant mipmaps, et potentiellement 146 à 154 Mio avec mipmaps. Les framebuffers, l’art dynamique et le reste de la page ne sont pas inclus.

Le contrôleur ne dispose pas explicitement toutes les géométries et textures qu’il crée ; `open-mask` est disposé deux fois ; aucun chargement n’est annulable ; le lerp de rotation fixe à 0,08 dépend du framerate. Le BIN et le GLTF ne sont pas compressés par le serveur, et leurs URLs ne sont pas versionnées.

Pour Expelled, conserver la chorégraphie mais reconstruire le support : une bande animée par 6 à 12 os ou un shader de courbure, PBR original regroupé par canaux et KTX2, `metalness=0` sans map noire, un atlas original en grille plus carrée, un seul masque d’intensité recoloré et un vrai fallback 2D.

## 9. Pipeline audio

### 9.1 Inventaire et budget

Les 23 fichiers audio publics représentent 9 641 905 octets. Les seize sons de l’ouverture/reveal totalisent seulement 1 339 063 octets ; les trois `CardSpin_*.wav` 96 kHz / 24 bits expliquent environ 7,54 Mo du reste.

Les niveaux ci-dessous sont des mesures LUFS intégrées du fichier brut, avant le gain appliqué par Howler.

| Fichier | Octets | Codec | Durée | LUFS-I | SHA-256 abrégé |
|---|---:|---|---:|---:|---|
| `pack-pre-opening.90b740f2.mp3` | 173 914 | MP3 44,1 kHz stéréo 128k | 10,804 s | -37,30 | `0b8b2f2bdc07…` |
| `pack-opening.b7e6e8fe.mp3` | 198 573 | MP3 44,1 kHz stéréo 128k | 12,343 s | -24,41 | `1457a0e8ba74…` |
| `pack-opened.5fd722d5.mp3` | 47 463 | MP3 44,1 kHz stéréo 128k | 2,821 s | -20,98 | `cb3f2fee8ed9…` |
| `pack-shuffle.7787dd51.mp3` | 20 523 | MP3 44,1 kHz stéréo 128k | 1,209 s | -24,59 | `43e058ec6643…` |
| `card-whoosh.da38d5d4.mp3` | 35 342 | MP3 44,1 kHz stéréo 128k | 2,074 s | -30,43 | `607c554bfef8…` |
| `card-slide-4.cec68d1c.mp3` | 6 312 | MP3 44,1 kHz stéréo 128k | 0,324 s | -36,36 | `8b99c5518143…` |
| `card-slide-5.4ed654dd.mp3` | 5 894 | MP3 44,1 kHz stéréo 128k | 0,298 s | -42,94 | `b825dc6fe144…` |
| `card-slide-6.c91eca7d.mp3` | 16 761 | MP3 44,1 kHz stéréo 128k | 0,989 s | -34,78 | `16daf81f098f…` |
| `card-anticipate.17571d1b.mp3` | 450 603 | MP3 44,1 kHz stéréo 128k | 28,076 s | -33,71 | `439ec6e975f8…` |
| `win-fail.5378d1b4.mp3` | 34 689 | MP3 44,1 kHz stéréo 128k | 2,093 s | -24,55 | `2f554109ad59…` |
| `win-small.d76a5fad.mp3` | 46 209 | MP3 44,1 kHz stéréo 128k | 2,765 s | -19,48 | `76e977e3c051…` |
| `win-big.0ae333e8.mp3` | 69 615 | MP3 44,1 kHz stéréo 128k | 4,228 s | -20,22 | `dc0687ea8935…` |
| `win-huge.5305a41e.mp3` | 60 420 | MP3 44,1 kHz stéréo 128k | 3,639 s | -18,68 | `10e26989f47a…` |
| `purchase-success.002a4fca.mp3` | 71 932 | MP3 44,1 kHz stéréo 128k | 4,432 s | -28,14 | `b67340e28cf1…` |
| `sell-single.e10c6b2d.mp3` | 28 046 | MP3 44,1 kHz stéréo 128k | 1,676 s | -25,01 | `400fa8e1c9f2…` |
| `sell-bulk.f456564b.mp3` | 72 767 | MP3 44,1 kHz stéréo 128k | 4,470 s | -23,97 | `902ead83038b…` |
| `CardSpin_V1.c303f5d9.wav` | 3 072 080 | PCM 96 kHz / 24-bit stéréo | 5,333 s | -28,23 | `6010d243fc34…` |
| `CardSpin_Win_Normal.d995c0cd.wav` | 2 234 826 | PCM 96 kHz / 24-bit stéréo | 3,878 s | -22,21 | `c37dcd0bd416…` |
| `CardSpin_Win_Grand.156e71a4.wav` | 2 232 164 | PCM 96 kHz / 24-bit stéréo | 3,875 s | -19,96 | `8efb2c949b49…` |
| `gold.722daef4.wav` | 654 474 | PCM 44,1 kHz / 16-bit stéréo | 3,042 s | -16,83 | `98234787dc65…` |
| `click.5c3bb7b9.wav` | 19 470 | PCM 48 kHz / 16-bit stéréo | 0,033 s | -28,30 | `4a76c17df3b8…` |
| `chest.8464e599.wav` | 56 804 | PCM 44,1 kHz / 16-bit stéréo | 0,322 s | -18,93 | `277359e5052d…` |
| `click-pop.4c5b95e1.mp3` | 33 024 | MP3 48 kHz stéréo 256k | 1,032 s | -17,84 | `fb2cd4956612…` |

Les seize premières lignes appartiennent au flux pack/reveal. Les sept suivantes servent aux expériences de roulette, coffre ou interaction globale. Tous les fichiers ont au moins un consommateur actif, même si quelques anciennes fonctions d’enveloppe ne sont plus appelées.

Empreintes complètes :

```text
pack-pre-opening.90b740f2.mp3  0b8b2f2bdc07f7ba9ac08c0f6667bfaa266155ff2f8eff505d0b5543c5559757
pack-opening.b7e6e8fe.mp3      1457a0e8ba74973373dd489dde36c570bd030769662182902e739f350590d9a4
pack-opened.5fd722d5.mp3       cb3f2fee8ed9024279303b8944bc59185adbd06388c36dedba20d8f2d82422b2
pack-shuffle.7787dd51.mp3      43e058ec66437c8ce4173e2f587dee5647eac2d4bdbe13a16d8f6e1f8cf4ed80
card-whoosh.da38d5d4.mp3       607c554bfef8cf78088f3bac536c9ae893eebd94f24870772840faf6aa918211
card-slide-4.cec68d1c.mp3      8b99c5518143a5d15bc38cbe583d05d1a9b9938d6ef67deb2511c57847923307
card-slide-5.4ed654dd.mp3      b825dc6fe144790b6e9960626d935f4e6528f6365a3b51e06d06a38e9dd99749
card-slide-6.c91eca7d.mp3      16daf81f098f6884053a07f61a3770d08a4f9ef25099538b9aa919a5c8536391
card-anticipate.17571d1b.mp3   439ec6e975f89b83f599ac4de7b7ac09d693a05f6ac45dc7dbec0e99c1000ac5
win-fail.5378d1b4.mp3          2f554109ad593f5cbd3067037a385ed2f37c244a1bcddd8256c8fece083cfb17
win-small.d76a5fad.mp3         76e977e3c051b60ff43f353c4f68eefdb77b5536b5efba695de22828cca45c25
win-big.0ae333e8.mp3           dc0687ea89354ad70ee3e85af60ee6e5c859e1a7f2f2aa9ef01e46b79dd8f8c9
win-huge.5305a41e.mp3          10e26989f47a2d019b127aeff9434dd52417f75b329e120bf1009cbf84063a38
purchase-success.002a4fca.mp3 b67340e28cf16932bbfe688f3d1c71de0cd879f5616f094b6061e4956b38b13e
sell-single.e10c6b2d.mp3       400fa8e1c9f22c32046cf973e10f4bad2abc0621fe759654eedf4f7262c70340
sell-bulk.f456564b.mp3         902ead83038b2dc2ff92f64e94989c901befd5b9c4248a23bce123ae969a5c3d
CardSpin_V1.c303f5d9.wav       6010d243fc34b57171155376b63f689a5d45475a122148913f01ac616260c485
CardSpin_Win_Normal.d995c0cd.wav c37dcd0bd416fc27cb5986bef116e9c801c40b833a61f4f6a24235768ac9f2b6
CardSpin_Win_Grand.156e71a4.wav 8efb2c949b4939ae792720e2fd7270c76bce0ce632b35a973628b9446ce16466
gold.722daef4.wav              98234787dc65fe8e65d37edf713dae5b35c5c9139742195e264ab4f1978b8e80
click.5c3bb7b9.wav             4a76c17df3b80bbfb5dc91fdb8ee2172c07e9ab8c4472d350e7d64a76ec594a8
chest.8464e599.wav             277359e5052d0999afa6c98432e4fa61e0254cf71e464d2185739e41ad089aef
click-pop.4c5b95e1.mp3        fb2cd4956612655bbd6cb56afaae27ebb344ada37c4171ffa2c6fbbaebec4dd8
```

### 9.2 Timeline exacte de l’ouverture

Le système n’essaie pas de synchroniser un long fichier avec la vidéo. Il compose plusieurs couches indépendantes :

1. à l’achat, `sell-single` sert de clic à 80 % du volume puis `purchase-success` joue après la réponse réseau ;
2. `pack-pre-opening` boucle à un gain maximal de 0,4 ;
3. au premier pointer down, `pack-opening` démarre depuis zéro ;
4. le drag ne scrubbe pas le son : il règle seulement les gains ;
5. avant validation, l’ambient suit `0,4 × (1-progress)` et le tear `0,5 × progress` ;
6. en cas d’abandon, le tear s’arrête immédiatement et l’ambient revient en 200 ms ;
7. à la validation, les deux couches fondent en 300 ms, s’arrêtent vers 340 ms, puis `pack-opened` joue à 0,7 ;
8. la pile entre environ une seconde plus tard ; `pack-shuffle` arrive encore 550 ms après, soit environ 1,55 s après l’ouverture.

Le crossfade est linéaire, pas equal-power. Comme le fichier de déchirure est environ 13 dB plus fort que l’ambient, il prend perceptuellement le dessus dès 20 à 25 % de drag. En cas de nouveau drag après un abandon, le tear repart de zéro : la continuité de matière n’est pas parfaite.

### 9.3 Reveal, anticipation et stingers

Les flips ordinaires choisissent aléatoirement `card-slide-4/5/6` et partent après environ `150 ± 25 ms`. La dernière carte, ou une rareté violette et supérieure, active une anticipation :

- boucle `card-anticipate`, avec départ aléatoire entre 0 et 5 s ;
- montée vers 0,38 en 220 ms ;
- heartbeat haptique toutes les 850 ms ;
- baisse en 200 ms au reveal.

La hiérarchie sonore est :

| Résultat | Stinger |
|---|---|
| gris non final | simple slide |
| gris final ou bleu | `win-fail` |
| violet | `win-small` |
| rose ou rouge | `win-big` |
| gold / special | `win-huge` |

Les reveals normaux partent après `150 ± 25 ms`. Le gold attend `1000 ± 25 ms`, avec un impact sonore principal vers 1,43 s. Ce délai, plus que le volume, crée la sensation de jackpot.

### 9.4 Ce que révèle le signal

- `pack-pre-opening` concentre environ 70 % de son énergie au-dessus de 6 kHz ; `pack-opening` est centré entre 250 et 800 Hz. Le crossfade change donc de matière, pas seulement de niveau.
- La corrélation stéréo passe approximativement de 0,67 pour l’ambient à 0,23 pour le tear et -0,05 pour le whoosh, puis revient à 0,78 sur `pack-opened`. L’espace s’élargit pendant le geste puis se recentre sur la récompense.
- `card-anticipate` concentre environ 94 % de son énergie entre 250 et 800 Hz ; il soutient la tension sans masquer les aigus du reveal.
- Les trois slides ont des balances gauche/droite différentes, avec jusqu’à 4,6 dB d’écart. Le choix aléatoire produit une impression de mouvement même sans spatialisation runtime.
- Les seams des deux boucles principales sont autour de -55 à -57 dBFS, donc discrets.
- `pack-opening` conserve son maximum énergétique vers 10,26 s : le fichier supporte un drag lent sans s’effondrer trop tôt.

Il n’existe pas de bus, compresseur ou limiteur global visible. Les équilibres reposent sur le master des fichiers, les volumes Howler, les fades et l’interruption du son précédent.

### 9.5 Provenance et indices de licence

Le cas le plus clair est `gold.722daef4.wav`. Ses métadonnées embarquées indiquent notamment :

- bibliothèque `MUSIC ACCENTS & LOGOS - ACSYNTH 1` ;
- originator `©Sound Ideas All Rights Reserved` ;
- éditeur Sound Ideas et référence à `sound-ideas.com` ;
- date BWF 2007-03-15 ;
- blocs APIC, GEOB et Soundminer, pour environ 118 Kio de métadonnées.

Il faut le traiter comme un asset issu apparemment d’une bibliothèque de stock soumise à licence, pas comme une création libre de Packs ni comme une référence copiable. Les métadonnées ne prouvent pas que Packs détient une licence valide. `CardSpin_Win_Normal` porte une trace d’export Nuendo ; `click.wav`, une trace Adobe Premiere 2023. Les MP3 ont été encodés par des versions Lavf distinctes, ce qui suggère plusieurs lots de production.

### 9.6 Recommandation clean-room audio

Pour Expelled : enregistrer nos propres froissements mylar/carton, séparer une boucle granulaire asservie à la vitesse du geste d’un impact de rupture et de sa queue, employer un crossfade equal-power via Web Audio, produire trois à cinq variantes de flip avec de faibles écarts de pan/pitch, normaliser les stingers par niveau perçu, limiter les crêtes, exporter en 48 kHz puis Opus/AAC/MP3 selon le support, et supprimer les blocs BWF/ID3/APIC/GEOB avant livraison. Chaque son externe doit avoir une preuve de licence attachée au manifest.

## 10. Spécification clean-room pour Expelled

### Matières à produire

Créer une bibliothèque entièrement nouvelle :

1. `paper-grain` — bruit quasi monochrome, petite tuile ;
2. `micro-spark-dark-a/b/c` — trois champs corrélés mais non identiques ;
3. `cosmic-depth-a/b/c` — composition Expelled, trois densités et alphabets visuels ;
4. `prism-facets-a/b/c` — facettes propres à l’univers, séparées par fréquence ;
5. `energy-ridges-main/edge` — paire masse/contour pour un crossfade ;
6. `foil-height` — height field subtil et réellement tileable ;
7. masques `frame`, `art`, `subject`, `etch` par gabarit de carte.

### Contraintes recommandées

- petites textures répétées : 256 ou 512 px ;
- masques plein cadre : 600×840 maximum pour la grille, version 1200×1680 pour le zoom ;
- WebP lossless ou PNG uniquement si alpha dur nécessaire ;
- AVIF/WebP avec alpha pour les halos doux ;
- atlas seulement si plusieurs frames sont réellement consommées ensemble ;
- aucune texture morte déclarée globalement ;
- provenance, auteur, date et licence enregistrés pour chaque fichier ;
- hash de contenu dans un manifest Expelled ;
- test de seam et contrôle du canal alpha avant intégration.

### Répartition CSS / WebGL

- foil des cartes : CSS, gradients et masques ;
- micro-relief : texture de luminance CSS ;
- révélation : CSS + très petits accents bitmap ;
- booster héroïque : WebGL paresseux ;
- fallback mobile/réduced motion : image 2D et animation courte.

## Conclusion

Les assets montrent que la qualité de Packs vient moins d’un shader secret que d’une excellente combinaison de matières 2D, de masques, de précomposition, de spatialisation et de timings. Le résultat visuel reste fort malgré des fichiers morts, deux maps neutralisées, des morphs inaccessibles et un budget mobile très élevé : la direction de mouvement compense une partie de la dette technique.

Pour Expelled, il faut reprendre les lois visuelles — fréquences séparées, opacités complémentaires, radial mobile, matière en luminance, contre-mouvement, progression unique `0..1` et attente avant le hit — puis reconstruire chaque texture, modèle et son depuis zéro avec une direction artistique propre. C’est à la fois plus distinctif, plus léger et plus sûr juridiquement.
