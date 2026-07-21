# Moteur foil — rétro-ingénierie et feuille de route

> Audit technique réalisé le 20 juillet 2026.
>
> Périmètre : travaux publics de Simon Goellner / `simeydotme`, bundles publics actuellement servis par Packs.com, puis comparaison avec le moteur d’Expelled.
>
> Ce document décrit des principes, une architecture et des mesures observées. Aucun asset, modèle 3D, son ou code propriétaire de Packs.com n’a été ajouté au projet.
>
> Le manifeste binaire, les empreintes, les coûts mémoire et la provenance détaillée sont regroupés dans [`PACKS-ASSET-FORENSICS.md`](./PACKS-ASSET-FORENSICS.md).

## Résumé exécutif

Le rendu premium de ces cartes ne vient pas d’un unique dégradé arc-en-ciel. Il repose sur cinq idées combinées :

1. une lumière dépendante du point de vue, pilotée par le pointeur ou le gyroscope ;
2. plusieurs couches de fréquences différentes — halo large, bandes colorées, texture moyenne, grain fin et reflet spéculaire ;
3. des masques précis qui indiquent où chaque finition existe physiquement ;
4. des couches qui se déplacent à des vitesses et parfois dans des directions opposées ;
5. une animation amortie, dont l’intensité disparaît progressivement quand la carte revient au repos.

Le constat prioritaire pour Expelled est plus simple : **33 cartes sur 60 utilisent des identifiants de foil que `Card.svelte` ne reconnaît pas**. Elles n’activent donc aucune recette, même si le moteur CSS est présent.

| Valeur actuelle | Cartes | Valeur canonique attendue | État actuel |
|---|---:|---|---|
| `mat` | 26 | `mat` | mat volontaire |
| `holo` | 16 | `regular` | recette absente |
| `prismatic` | 10 | `cosmos` | recette absente |
| `galaxy` | 6 | `radiant` | recette absente |
| `prism` | 1 | `secret` | recette absente |
| `secret` | 1 | `secret` | active |

Avant d’ajouter de nouvelles couches, il faut donc réparer le contrat de données, valider les JSON et protéger les performances du mur de cartes.

## 1. Sources et méthode

### Sources ouvertes de simeydotme

| Projet | Portée | État analysé | Licence déclarée |
|---|---|---|---|
| [`pokemon-cards-css`](https://github.com/simeydotme/pokemon-cards-css) | finitions Pokémon Sword & Shield | commit `acb1197`, 15 déc. 2025 | GPL-3.0 |
| [`pokemon-cards-151`](https://github.com/simeydotme/pokemon-cards-151) | finitions Scarlet & Violet 151 | commit `98030f9`, 16 fév. 2026 | GPL-3.0 |
| [`hover-tilt`](https://github.com/simeydotme/hover-tilt) | moteur générique Svelte 5 + Web Component | commit `5db58f3`, 16 juin 2026 | ambiguïté, voir § 10 |
| [`poke-holo.simey.me`](https://poke-holo.simey.me/) | démonstrateur historique | version publique courante | suit le dépôt GPL |
| [`poke-151.simey.me`](https://poke-151.simey.me/) | démonstrateur 151 | version publique courante | suit le dépôt GPL |
| [`CodePen abYWJdX`](https://codepen.io/simeydotme/pen/abYWJdX) | vitrine embarquant la démo | version publique | renvoie au projet principal |

Les trois dépôts ont été clonés en lecture seule dans un dossier temporaire. Les fichiers CSS, Svelte, exemples, masques, textures référencées et contrats de composant ont été inventoriés.

Documentation ciblée de la génération `hover-tilt` :

- [Glare Masks](https://hover-tilt.simey.me/advanced/glare-masks) — masques alpha/luminance et opérations de composition ;
- [Custom Gradient](https://hover-tilt.simey.me/advanced/custom-gradient) — matière fournie par le consommateur du composant ;
- [Pokémon Cards](https://hover-tilt.simey.me/bespoke/pokemon-cards) — foil, etching et sparkles séparés par masque.

### Packs.com

L’analyse porte sur le HTML et les bundles publics servis le 20 juillet 2026 :

- page analysée : [`packs.com`](https://packs.com/) ;
- CSS principal : [`index.3609e3fe.css`](https://packs.com/static/css/index.3609e3fe.css), 547 015 octets ;
- JS principal : [`index.1e9c1b1f.js`](https://packs.com/static/js/index.1e9c1b1f.js), 2 959 056 octets ;
- ouverture Three.js : [`396.e25459c0.js`](https://packs.com/static/js/async/396.e25459c0.js), 38 598 octets ;
- expérience d’ouverture : [`968.0a10ddbc.js`](https://packs.com/static/js/async/968.0a10ddbc.js), 141 416 octets ;
- 20 chunks JS et 11 chunks CSS asynchrones examinés.

Empreintes SHA-256 de la capture :

```text
index.3609e3fe.css  4EC81D896E55FFC078FD459F639FA4C15B54C6520728517A995ED648465A6552
index.1e9c1b1f.js   368DA1F3D83195C40085700AF027E6261D1DC0091EC06C28A9D233EBE6D4B9F4
396.e25459c0.js     7B97234080A4909BB582E3B3544BF09B7A3C9284390C052C11D60E6990726797
968.0a10ddbc.js     681C275BAF1390B0EDF7E279AEC84F8470A859E2E5BEC7B5BCC8F7D68668ED9F
```

Les noms de classes et valeurs numériques cités sont des observations techniques. Les fichiers téléchargés sont restés temporaires et ne sont pas vendus avec Expelled.

### Limites

Le contrôle visuel du navigateur intégré n’était pas disponible pendant cet audit. L’analyse Packs est donc une rétro-ingénierie des sources effectivement expédiées, complétée par les pages publiques, et non une capture vidéo subjective.

## 2. L’évolution du travail de simeydotme

Les trois générations montrent une évolution utile pour Expelled.

### Génération 1 — une recette CSS par finition

`pokemon-cards-css` associe une classe de rareté à une recette complète. Un composant Svelte calcule le pointeur, puis alimente des variables CSS communes. Chaque finition compose gradients, textures, filtres et modes de fusion dans `.card__shine`, `.card__glare` et leurs pseudo-éléments.

La grande leçon est la séparation entre :

- le mouvement, générique et continu ;
- la matière, spécifique à la finition ;
- les données de carte, qui choisissent la recette et fournissent éventuellement un masque.

### Génération 2 — les masques deviennent la vérité matérielle

`pokemon-cards-151` conserve le même squelette, mais les finitions modernes utilisent davantage :

- des masques de foil propres à une carte ;
- des masques d’etching séparés ;
- des compositions `intersect`, `exclude` ou équivalentes ;
- plusieurs iridescences superposées ;
- `plus-lighter` pour les reflets très lumineux.

Le réalisme progresse surtout parce que l’effet cesse de couvrir uniformément la carte. Un foil crédible sait où sont le cadre, l’illustration, les symboles imprimés et les zones non métalliques.

### Génération 3 — interaction générique, matière libre

`hover-tilt` extrait le mouvement dans un composant réutilisable. Le composant fournit les coordonnées, l’angle, la distance au centre, la proximité d’un bord, l’opacité, l’ombre et le ressort. Le consommateur construit ensuite sa propre matière dans le slot ou les pseudo-éléments.

Cette génération apporte les améliorations d’architecture les plus pertinentes :

- un `requestAnimationFrame` groupe les mouvements du pointeur ;
- le rectangle de la carte n’est pas relu plusieurs fois dans la même frame ;
- l’activation et la position utilisent deux ressorts seulement ;
- l’échelle est dérivée au lieu d’avoir son propre ressort ;
- les propriétés statiques, notamment les URLs de masque, sont séparées des variables mises à jour à chaque frame ;
- la sortie emploie un ressort plus souple que l’entrée ;
- le masque accepte une image, un SVG, un gradient CSS ou plusieurs sources composées ;
- le composant fonctionne en Svelte ou comme Web Component.

Ce dernier point corrige précisément un risque présent dans Expelled : si une URL de masque est incluse dans un attribut `style` entièrement réécrit à chaque frame, certains navigateurs peuvent redemander ou reparcourir la ressource.

## 3. Anatomie d’un foil convaincant

### 3.1 Les cinq échelles visuelles

| Échelle | Rôle | Outil typique |
|---|---|---|
| base | conserve l’image et la lisibilité | image imprimée, scrim léger |
| macro | simule la source lumineuse | gradient radial lié au pointeur |
| méso | donne la signature de la finition | bandes, cosmos, fracture, surge |
| micro | simule le matériau imprimé | grain, noise, glitter, etching |
| spéculaire | donne le pic de lumière | glare blanc/sombre, `screen` ou `plus-lighter` |

Un simple dégradé arc-en-ciel n’a que l’échelle méso. Sans macro-lumière, microstructure et masque, il ressemble à une surimpression numérique.

### 3.2 Variables d’interaction minimales

Le moteur historique et Packs convergent vers les mêmes entrées :

```text
x, y               position du pointeur dans la carte
centerX, centerY   écart au centre
bgX, bgY           déplacement borné des textures
rotateX, rotateY   inclinaison 3D
angle              angle polaire du pointeur
fromCenter         distance normalisée au centre
fromTop/fromLeft   position normalisée directionnelle
opacity            activation globale du matériau
seedX/seedY        décalage stable propre à la carte
```

La transformation relevée chez Packs est volontairement retenue :

```text
bgX = map(x, 0..100, 37..63)
bgY = map(y, 0..100, 33..67)
rotateX = -(x - 50) / 3.5
rotateY =  (y - 50) / 2.8
angle = atan2(x - 50, 50 - y), normalisé sur 0..360°
fromCenter = clamp(hypot(x - 50, y - 50) / 50, 0, 1)
```

La carte peut beaucoup s’incliner tandis que la texture ne glisse que de quelques pourcents. C’est cette différence d’amplitude qui donne une impression de matière attachée au carton.

### 3.3 Couches recommandées

```text
translator                      translation et zoom
└─ rotator                      tilt, flip, ombre
   ├─ back
   └─ front [isolation:isolate]
      ├─ base image
      ├─ foil-frame             masque du cadre
      ├─ foil-art               masque de l’illustration
      ├─ etch                   microgravure
      ├─ shine                  couleur / texture principale
      ├─ shine-2                contre-parallaxe
      ├─ glare                  lumière diffuse
      ├─ glare-2                pic spéculaire inversé
      ├─ subject cutout         seulement pour showcase
      └─ typography             toujours parfaitement lisible
```

Deux couches ne veulent pas nécessairement dire deux éléments DOM supplémentaires : les pseudo-éléments `::before` et `::after` peuvent porter une partie des textures. En revanche, deux glare réellement indépendants sont utiles.

### 3.4 Rôle des modes de fusion

| Mode | Usage observé | Risque |
|---|---|---|
| `screen` | éclaircir sans assombrir | peut délaver l’art |
| `multiply` | ombrage, contraste et métal | peut salir les couleurs |
| `overlay` | contraste modéré | varie beaucoup selon l’image |
| `hard-light` | reflet tranché | vite agressif |
| `soft-light` | texture douce | parfois trop subtil |
| `color-dodge` | éclat irisé | brûle rapidement les blancs |
| `color-burn` | densité et profondeur | bouche les noirs |
| `difference` / `exclusion` | iridescence changeante | aspect numérique si uniforme |
| `hue` / `luminosity` | dissocier couleur et lumière | dépend du support navigateur |
| `plus-lighter` | addition lumineuse moderne | nécessite de faibles opacités |

Le principe constant est d’utiliser de petites opacités et de confiner chaque mode à un masque pertinent.

### 3.5 Masques

Les masques utiles pour Expelled sont :

- `foilMask` : zones réellement métallisées ;
- `frameMask` : bordure, nom, icônes ou ornements ;
- `artMask` : fenêtre d’illustration ;
- `etchMask` : microgravure ou embossage ;
- `subjectMask` : personnage détouré d’une Showcase ;
- `lightMask` : gradient radial mobile autour du pointeur.

Préférer les masques alpha pour Safari. Les masques luminance fonctionnent bien avec des bitmaps noir et blanc, mais les sources de `hover-tilt` signalent des problèmes Safari. Une URL distante doit aussi envoyer les bons en-têtes CORS, faute de quoi le masque échoue silencieusement.

## 4. Catalogue des recettes simeydotme

### 4.1 Sword & Shield

Le dépôt contient 23 recettes ou variantes, en plus de `base.css` et `basic.css`.

| Fichier | Signature technique |
|---|---|
| `regular-holo.css` | bandes rainbow répétées, reflets croisés, `screen`, `multiply`, `luminosity`, glare radial |
| `reverse-holo.css` | motif hors illustration, contraste `difference`/`soft-light`, lumière en `color-dodge` |
| `cosmos-holo.css` | trois textures bottom/middle/top, tailles et directions différentes, contre-parallaxe |
| `amazing-rare.css` | nappes colorées denses, `color-burn`, `lighten`, `overlay`, saturation localisée |
| `rainbow-alt.css` | glitter + dégradés pastel, sandwich `difference`/`luminosity`/`overlay` |
| `rainbow-holo.css` | texture illusion masquée, pastel durci par `hard-light` et `difference` |
| `secret-rare.css` | motif géométrique doré, deux directions de glitter, masques complémentaires |
| `radiant-holo.css` | texture `trainerbg`, mélange `color-dodge`, `difference`, `exclusion`, `hard-light` |
| `shiny-rare.css` | illusion argentée, `exclusion`, `hue`, `hard-light`, masque de foil |
| `shiny-v.css` | variante argent/noir plus contrastée, double traitement illusion |
| `shiny-vmax.css` | arcs colorés et douceur `soft-light`, masques multiples |
| `v-regular.css` | barres diagonales, écran + hue + hard-light |
| `v-full-art.css` | illusion irisée sur masque d’art complet |
| `v-max.css` | grande texture VMAX lente, `difference`, `luminosity`, `soft-light` |
| `v-star.css` | texture ancienne, iridescence angulaire et masques radiaux |
| `trainer-full-art.css` | fond trainer, `color-burn`, hue, hard-light, glare contenu |
| `trainer-gallery-holo.css` | holo plus doux, `hard-light` et `soft-light` |
| `trainer-gallery-v-regular.css` | adaptation de V Regular au cadre Gallery |
| `trainer-gallery-v-max.css` | adaptation VMAX à l’illustration Gallery |
| `trainer-gallery-secret-rare.css` | or géométrique et luminosité colorée |
| `swsh-pikachu.css` | recette dédiée avec masque illusion et fort contraste |

Textures référencées par cette génération : `ancient`, `angular`, `cosmos-bottom`, `cosmos-middle`, `cosmos-top`, `crossover`, `galaxy`, `geometric`, `glitter`, `grain`, `illusion`, `metal`, `rainbow`, `stylish`, `trainerbg`, `vmaxbg` et `wave`.

Techniques transversales :

- `background-position` lié au pointeur ;
- pseudo-éléments en mouvement opposé ;
- `mask-image` propre à l’art quand disponible ;
- position cosmos pseudo-aléatoire par carte ;
- ressort Svelte pour éviter les snaps ;
- mode actif/zoom qui bloque l’interaction des cartes derrière ;
- gyroscope mobile relatif à la première orientation reçue ;
- zoom centré limité par le viewport et premier spin à 360°.

### 4.2 Scarlet & Violet 151

| Fichier | Apport principal |
|---|---|
| `regular-holo.css` | mise à jour de l’holo classique |
| `reverse-holo.css` | reverse historique conservé |
| `poke-ball-holo.css` | motifs Poké Ball/Master Ball intérieurs et extérieurs, masques composés |
| `radiant-holo.css` | reprise de Radiant avec masque |
| `rainbow-alt.css` | reprise de Rainbow Alt |
| `ex-regular.css` | masque radial mobile + masque de zone, `darken`, `hue`, `difference`, `hard-light` |
| `ex-full-art.css` | illusion en `exclusion`, `hue`, `hard-light`, `soft-light` |
| `illustration-rare.css` | voile très doux en `screen`, `overlay`, `soft-light` |
| `ex-special-illustration-rare.css` | masque exact de foil, `plus-lighter`, hard-light, deuxième shine |
| `hyper-rare.css` | version or/hyper de la recette à masque exact |

Le dossier contient neuf textures d’iridescence `iri-1` à `iri-9`, deux noises, les motifs Poké Ball/Master Ball et une texture Birthday Holo. Le vrai saut de qualité est la multiplication des déclarations de masque : jusqu’à treize dans la recette Poké Ball.

### 4.3 Hover Tilt moderne

Paramètres et décisions notables :

- ressort par défaut : `stiffness 0.2`, `damping 0.8` ;
- ressort de sortie : raideur × 0,2, amortissement × 0,5 ;
- variables `--hover-tilt-x/y`, `opacity`, `scale`, rotations, angle, distance et proximité du bord ;
- glare radial en espace colorimétrique LCH ;
- gradient, ombre, intensité, teinte, blend mode et masque remplaçables ;
- transformation GPU avec un très léger `translate3d` en Z ;
- composition de masques `add`, `subtract`, `exclude` ou `intersect` ;
- activation différée et gestion distincte entrée/sortie ;
- exemples avec foil, etch et sparkle séparés.

Les exemples Pokémon modernes confirment quatre recettes simples et solides :

1. Full Art : image + masque de foil exact + glare hard-light.
2. Special Illustration : masque foil + rainbow doux + texture de sparkles répétée.
3. Reverse : masque foil, parfois combiné à un masque d’etching par `intersect`.
4. Etched Reverse : couche d’etch distincte en `difference`, elle-même révélée par un gradient radial.

## 5. Le moteur de cartes actuel de Packs.com

### 5.1 Contrat DOM

```text
card-interactive
└─ card__translator
   └─ card__rotator
      ├─ card__back
      └─ card__front
         ├─ card__front__image
         ├─ card__glare
         ├─ card__glare--2
         ├─ card__shine
         └─ card__shine--2
```

Avec les pseudo-éléments, une finition peut disposer de six à huit surfaces de composition sans modifier la structure du composant.

### 5.2 Interaction

Les caractéristiques observées :

- React + `react-spring` ;
- suivi pointeur regroupé par `requestAnimationFrame` ;
- rectangle mémorisé et actualisé au besoin ;
- ressort de suivi `{tension:300, friction:30}` ;
- retour/popover autour de `{200,26}` ;
- spin autour de `{150,40}` ;
- valeur générique de repli `{170,26}` ;
- extinction retardée d’environ 300 ms ;
- zoom clic par défaut ×1,75, ou centré dans 90 % du viewport ;
- sens du flip déterminé par la moitié de carte cliquée ;
- premier zoom pouvant déclencher un tour complet ;
- pan borné lorsqu’une carte zoomée est déplaçable ;
- orientation mobile clampée avant d’alimenter les mêmes variables.

Les URLs de masque et paramètres statiques ne sont pas mélangés aux valeurs de frame. La grande image est chargée avant d’activer les recettes grâce à un attribut `data-large-loaded` et un sélecteur `:has(...)`.

### 5.3 Recettes expédiées

| Famille | Recette | Techniques distinctives |
|---|---|---|
| générique | `sunpillar` | grain + spectre répétitif + barres sombres + glare double |
| Pokémon | `basic-holo` | rainbow contenu, croisements angulaires, masque de fenêtre |
| Pokémon | `basic-reverse-holo` | pattern hors art, noise + iridescence, masque radial soustractif |
| Pokémon | `cosmos` | trois plans alignés ; profondeur surtout créée par les facteurs 80/70/60, blends et filtres distincts |
| Pokémon | `rainbow-mirror` | rainbow sur bordure, radial hard-light |
| Pokémon | `rainbow-glitter` | deux directions opposées, `iri-7/8/9`, masque radial générique ; aucun masque per-card injecté |
| MTG | `basic-holo` | miroir rainbow + champ radial en `difference` + foil bump |
| MTG | `surge-holo` | masques Surge complémentaires, crossfade directionnel via `sin()` |
| MTG | `fracture-holo` | trois masques déplacés en sens opposés, hue OKLCH lié à l’angle |
| One Piece | `basic-holo` | highlight opposé au pointeur, couleur dynamique en Oklab |

Le code classe automatiquement les cartes Pokémon selon l’époque, la rareté et le type d’impression. Les Secret Rare, Illustration Rare, promos et Shiny n’emploient pas nécessairement la même finition. Pour MTG, les noms Surge Foil et Fracture Foil sélectionnent des recettes dédiées ; les cadres borderless et extended changent les masques.

Observation secondaire : Riftbound est classé `basic-holo` côté JavaScript, mais aucun sélecteur de finition Riftbound équivalent n’a été trouvé dans les CSS capturés. C’est un exemple utile de contrat de données et CSS pouvant diverger même sur un produit mûr.

### 5.4 Techniques CSS modernes

Le CSS capturé contient notamment :

- 99 règles liées au moteur interactif de carte ;
- 52 usages de `mix-blend-mode` ;
- 31 usages de `mask-composite` ;
- 21 usages de `clip-path` ;
- `lab()`/`oklch()` avec certains fallbacks ;
- `linear-gradient(in oklab, ...)` ;
- fonctions trigonométriques CSS `sin()` ;
- `plus-lighter` ;
- `:has()` ;
- `container-type:inline-size` ;
- `content-visibility` et `contain` dans les listes et reveals ;
- `@property` pour animer proprement quelques variables de glow.

Ces techniques ne doivent pas être adoptées sans stratégie de repli WebKit/anciens navigateurs. Le préfixe `-webkit-mask-*` reste nécessaire.

### 5.5 Bibliothèque de matière observée

Packs déclare des familles de textures correspondant à :

- cosmos bottom/middle/top ;
- glitter et grain ;
- noise base/top ;
- neuf iridescences ;
- gold ;
- foil bump MTG ;
- fracture base/mid/contrast ;
- surge et variantes inversées ;
- pattern de reverse holo.

Seize textures sont effectivement consommées par les recettes capturées ; dix autres sont déclarées mais sans appel `var(...)` observé. Seize fichiers servis par Packs sont en outre byte-identiques à des fichiers publics de simeydotme. Le détail actif/inactif et les égalités SHA-256 figurent dans [`PACKS-ASSET-FORENSICS.md`](./PACKS-ASSET-FORENSICS.md).

La technique est transposable. Les fichiers eux-mêmes ne le sont pas : Expelled doit produire ses propres textures.

## 6. Ouverture de booster Packs.com

Le peel est une expérience WebGL distincte du moteur CSS des cartes.

### 6.1 Modèle et rendu

- Three.js charge [`pack-wide.gltf`](https://packs.com/models/pack-open/pack-wide.gltf) à la demande.
- Le modèle contient une animation avec piste `morphTargetInfluences`.
- Quatre groupes de packs peuvent être empilés en profondeur ; le premier porte l’animation.
- L’art du booster est composé sur un canvas 2D avant d’être injecté comme texture.
- Le composite applique successivement des couches de bord inférieur, assombrissement, fentes, lumière linéaire et dodge. Le premier « masque » est opaque et ne fait rien avec `destination-in` ; seul `shape.png` détoure réellement le pack.
- Le pack charge des cartes PBR de metalness, roughness, bump et normal. La metalness map est uniformément noire et neutralise donc la metalness effective.
- Le matériau est converti ou cloné en matériau PBR ; bump ≈ 0,15 et normal scale ≈ 2.
- Une lumière ambiante et deux lumières directionnelles éclairent la scène.
- Le pixel ratio est plafonné à 2.

Le BIN de 6,81 Mo est composé à 97,48 % de morph targets. Le contrôleur ne peut atteindre que les targets 7 à 90 : 42 targets, soit 2,21 Mo et 32,5 % du buffer, restent inaccessibles. Le coût visuel est convaincant, mais ce modèle n’est pas une référence d’optimisation.

Les autres chemins publics référencés directement par le chunk sont
[`fallback.png`](https://packs.com/models/pack-open/fallback.png),
[`guest-opening.png`](https://packs.com/models/pack-open/guest-opening.png),
[`opening.png`](https://packs.com/models/pack-open/opening.png),
[`open-mask.png`](https://packs.com/models/pack-open/open-mask.png) et
[`tab.png`](https://packs.com/models/pack-open/tab.png). Ce sont des références de reproductibilité, pas des assets à réutiliser.

### 6.2 Drag et animation

Le geste horizontal utilise Pointer Events et la capture de pointeur :

```text
progress = clamp(abs(pointerX - startX) / largeurVisibleDuPack, 0, 1)
```

- fallback de seuil : 130 px ;
- le drag `0..1` est remappé vers une progression modèle `0,4..1` : même à zéro, le clip est déjà vers 0,1167 s / target 7 ;
- le scrub parcourt environ 0,1167..1,1667 s, puis la validation reprend depuis la frame contrôleur 35 à 30 fps ;
- la timeline est positionnée directement et le mixer est actualisé avec un delta nul ;
- le groupe tourne légèrement en Z, jusqu’à environ 0,18 radian ;
- si le drag est relâché avant la fin, retour à zéro en 350 ms avec easing `outQuad` ;
- au seuil, l’animation reprend normalement depuis la frame 35 ;
- la languette suit le geste puis disparaît ;
- un sprite sheet de 48 frames simule une ouverture lumineuse additive, masquée par une texture ;
- l’effet lumineux tourne à environ 60 images/s et boucle sur 0,8 s ;
- une couche de particules diamantées complète l’aura.

Au repos, le pack suit le pointeur jusqu’à ±15° avec un lerp fixe de 0,08 par frame. La boucle peut être mise en pause et les écouteurs sont nettoyés, mais toutes les géométries/textures créées ne sont pas explicitement disposées ; `open-mask` l’est même deux fois.

### 6.3 Son, haptique et reveal

Le site superpose plusieurs familles de son : pré-ouverture, tension de déchirure dont le volume suit la progression, pack ouvert, shuffle, whoosh, trois flips, anticipation et stingers par niveau de victoire. Le drag pilote les gains, pas la tête de lecture : ambient `0,4 × (1-progress)` contre tear `0,5 × progress`. Le reveal gold attend environ une seconde avant son stinger, alors qu’un reveal normal part après environ 150 ms.

Les motifs haptiques comprennent sélection, léger, moyen, lourd, nudge, heartbeat et flip. Ils sont désactivés avec `prefers-reduced-motion`, sauf demande forcée.

Le reveal reste volontairement plus sobre que le peel : entrée opacité + scale, anticipation réservée aux hits, glow par rareté, très petits shakes et swipe garder/vendre. Les cartes hors écran sont limitées ou rendues invisibles, et la pile ne conserve qu’un nombre borné de cartes actives.

### Décision pour Expelled

Le WebGL est pertinent pour un moment héroïque unique — le booster — mais inutile pour chaque carte. Le meilleur rapport qualité/coût est :

- cartes : CSS composité + masques ;
- booster : 2D amélioré à court terme ;
- booster 3D : chunk paresseux et fallback 2D à moyen terme.

## 7. Audit du moteur Expelled

### 7.1 Rupture du contrat de presets

Le type canonique dans `src/lib/types.ts` accepte :

```text
mat | regular | amazing | cosmos | secret | radiant | showcase
```

Sur 34 JSON non mats, 33 emploient des identifiants non reconnus, issus majoritairement de l’ancienne nomenclature. `import.meta.glob<{ default: CardData }>` dans `src/lib/cards.ts` est une assertion TypeScript, pas une validation runtime. Le compilateur fait confiance à des données invalides.

Ensuite, la table de `src/lib/Card.svelte` ne trouve pas la clé et retourne `data-rarity=""`. Les sélecteurs CSS ne correspondent à rien.

Le Lab masque partiellement le problème en remplaçant silencieusement un preset incompatible par le premier preset autorisé pour la rareté.

### 7.2 Structure de couches incomplète

La structure effective est :

```text
art
├─ image
├─ scrim
├─ shine
└─ glare
```

Écarts principaux :

- pas de `shine-2` ;
- pas de `glare-2` ;
- pseudo-éléments de glare sans boîte explicite dans plusieurs recettes ;
- glare sans ordre de pile explicite ;
- masques Pokémon globalement neutralisés ;
- pas de séparation cadre/art ;
- pas de masque radial mobile ;
- effet limité à la fenêtre d’art supérieure, environ 55 % de la carte ;
- opacité qui passe directement de 0 à 0,5 au lieu d’être animée par le ressort ;
- foil invisible au repos et pour `interactive=false`.

Le stacking Showcase est en revanche bien pensé : foil de fond, sujet détouré, voile de lisibilité, texte puis coût/sigil.

### 7.3 Variables générées mais non consommées

`src/lib/effects/foil.ts` génère une matière supposée propre à chaque carte. À l’état audité :

| Variable | Consommation réelle |
|---|---|
| `--c0`, `--c1`, `--c2` | aucune |
| `--frame` | aucune |
| `--band-angle` | aucune |
| `--grain`, `--galaxy`, `--sparkle` générées | aucune par les recettes |
| `--seedx`, `--seedy` | aucune |
| `--pang` | calculée mais non utilisée |
| `--cosmosbg` | utilisée par Cosmos |
| `--hue-shift` | utilisée par le cadre prismatique |
| `--accent` | corps et glow, peu la matière foil |

La palette ne teinte donc pas réellement la plupart des foils et le seed ne suffit pas à rendre chaque impression unique. `glitterUri()` n’est jamais appelé.

Autre coût inutile : les longues valeurs statiques, dont des data-URI, sont concaténées au même attribut `style` que les variables animées. Toute la chaîne peut être reparcourue à chaque frame.

### 7.4 Full Art et finition cosmétique

`data-fullart` est posé mais n’a pas de règle CSS. Une Full Art actuelle est surtout :

- rareté mutée en `prism` ;
- cadre prismatique ;
- preset `showcase` ;
- art toujours contenu dans la fenêtre standard.

La rareté de gameplay et la finition cosmétique sont ainsi confondues. Puisque toute Full Art devient `prism`, le mapping Showcase par rareté sélectionne toujours la recette Secret dans le gacha.

`fullArtView()` est aussi dupliquée entre le gacha et la page de carte. Le champ `fullArt` est décrit comme obsolète dans le type, mais encore utilisé pour l’éligibilité du tirage.

Les détourages Doran, Rasen, Senel, Morek, Morna et Velsa n’ont pas tous la même éligibilité. Ils sont placés dans un conteneur dont le ratio n’est pas identique à celui de l’art source, d’où des corrections verticales carte par carte. Un masque sujet aligné au pixel près sur l’art original est plus robuste.

### 7.5 Performance et mobile

Le mur principal peut instancier environ 61 cartes. Chaque carte possède actuellement un ressort, des calculs pointeur, plusieurs gradients/filtres, des SVG procéduraux et une grande image.

Risques mesurés ou observés :

- 60 arts de base : environ 7,9 Mo compressés ;
- environ 432 Mo possibles une fois décodés en RGBA, avant les surfaces GPU ;
- images 1200×1500 sans miniature responsive, `loading="lazy"` ni `decoding="async"` ;
- `getBoundingClientRect()` à chaque mouvement ;
- `will-change` permanent ;
- aucune virtualisation ou `content-visibility` du mur ;
- `touch-action:none` sur toutes les cartes, même non interactives ;
- pas de mode tactile ni gyroscope ;
- `prefers-reduced-motion` ne coupe pas le tilt ni le foil principal.

Activer brutalement les 33 foils manquants sans ces protections peut dégrader fortement le scroll et la mémoire mobile.

### 7.6 Accessibilité

Points à corriger en même temps que le nouveau composant :

- focus clavier capable d’activer un état de lumière stable ;
- mode statique lisible avec mouvement réduit ;
- images décoratives correctement masquées aux lecteurs d’écran ;
- structure interactive sans `<article>` complet imbriqué dans un `<button>` ;
- modale zoom avec Échap, focus initial et restitution du focus ;
- geste d’ouverture utilisable par Espace, flèches, Home/End et bouton explicite.

## 8. Comparaison synthétique

| Capacité | Simey historique | Hover Tilt | Packs | Expelled audité |
|---|---:|---:|---:|---:|
| tilt amorti | oui | oui | oui | oui |
| rAF pointeur | version récente | oui | oui | non |
| rect mémorisé | partiel | oui | oui | non |
| double shine | via pseudos | libre | oui | non |
| double glare | partiel | extensible | oui | non fonctionnel |
| masque exact par carte | selon données | oui | non observé dans ce build | non |
| masque cadre/art séparé | selon recette | possible | oui | non |
| etch séparé | génération 151 | oui | non injecté par le composant capturé | non |
| seed branché aux textures | oui | à construire | oui | variables mortes |
| activation après image HD | lazy loading | composable | oui | non |
| gyroscope | oui | non central | oui | non |
| reduced motion complet | partiel | à intégrer | oui sur moments clés | non |
| ouverture WebGL | non | non | oui | non |

## 9. Architecture cible pour Expelled

### 9.1 Séparer rareté et finition

Proposition de contrat :

```text
rarity: common | rare | epic | legendary | prism
finish: standard | holo | cosmos | radiant | prismatic | showcase
```

Une finition peut contenir :

```text
id
intensity
hueBias
seed
foilMask
frameMask
etchMask
subjectMask
textureSet
```

La rareté continue de régler le gameplay et le matériau du cadre. La finition décrit exclusivement l’impression visuelle. Une Full Art ne change plus artificiellement la rareté.

### 9.2 Recettes Expelled proposées

| Finition | Identité visuelle | Couches |
|---|---|---|
| `standard` | carton satiné, lumière douce | glare diffus très faible, aucun rainbow |
| `holo` | reflet froid et précis | masque art, bandes fines, glare double |
| `cosmos` | ciel profond et points lumineux | trois plans en contre-parallaxe, palette faction limitée |
| `radiant` | énergie qui émane du sujet | masque sujet/art, rayons, microtexture, halo accent |
| `prismatic` | chase iridescent | masque full card, deux iridescences opposées, etch, pic spéculaire |
| `showcase` | décor foil + sujet parfaitement net | fond full-bleed, subject mask/cutout, voile de texte, finition indépendante |

Pour éviter l’esthétique « IA arc-en-ciel partout », chaque finition doit garder une couleur dominante et réserver le spectre complet aux angles extrêmes ou à `prismatic`.

### 9.3 Pipeline d’assets de première partie

Pour chaque art premium, produire hors runtime :

1. image 320, 640 et 1200 px ;
2. `foil-mask` alpha aligné sur l’original ;
3. `frame-mask` commun au template ;
4. `etch-mask` optionnel ;
5. `subject-mask` ou cutout aligné ;
6. texture de matière issue d’une bibliothèque Expelled ;
7. métadonnées de cadrage et version de pipeline.

Textures Expelled à créer :

- grain papier/carbone ;
- microglitter argent ;
- iridescence nacre ;
- cosmos profond ;
- fracture EX ;
- rayonnement KOR ;
- foil bump métallique ;
- trame prismatique de chase.

Préférer WebP/AVIF ou atlas précalculé. Une `feTurbulence` différente dans chaque instance coûte plus cher qu’une petite texture réutilisée et décalée par seed.

### 9.4 Architecture de performance

- mode `static` pour miniatures, cartes mates et cartes hors viewport ;
- moteur complet uniquement pour la carte active ou proche du viewport ;
- `IntersectionObserver` et `content-visibility:auto` sur les listes ;
- `picture/srcset` 320/640/1200 ;
- chargement HD avant activation du foil ;
- un seul rAF par carte active, ou mieux un contrôleur partagé ;
- rectangle mémorisé entre enter/resize/scroll ;
- URLs et variables statiques posées une fois ;
- variables dynamiques mises à jour seules ;
- `will-change` ajouté à l’entrée, retiré après retour au repos ;
- `touch-action:pan-y pinch-zoom` par défaut ;
- gyroscope facultatif après permission explicite ;
- fallback statique quand `prefers-reduced-motion:reduce`.

### 9.5 Booster

Trois niveaux progressifs :

1. **P0 2D** : geste proportionnel à la largeur, languette, retour amorti, anticipation de sortie.
2. **P1 2.5D** : plusieurs plans, normal map CSS/WebGL légère, lumière liée au geste.
3. **P2 3D** : GLTF original Expelled avec morph target, PBR, canvas compositor, chunk lazy et fallback 2D.

## 10. Licences et clean-room

### Pokémon Cards CSS et 151

Les deux dépôts sont GPL-3.0. Expelled contient actuellement des recettes annoncées comme reprises verbatim, une copie de la licence dans `src/lib/holo/LICENSE.txt` et un crédit dans `CREDITS.md`.

`CREDITS.md` affirme que l’ensemble du projet est de fait GPL-3.0, mais aucune licence racine claire n’a été trouvée. Avant une distribution commerciale, il faut faire qualifier le périmètre exact des obligations. Les options à examiner comprennent :

- distribuer les éléments concernés sous des conditions compatibles et documentées ;
- remplacer ou réécrire indépendamment les éléments concernés ;
- obtenir, lorsque c’est possible, une licence ou autorisation alternative.

Le dépôt Simey attribue en outre certaines ressources Galaxy/Background à des tiers. La licence du code ne garantit pas automatiquement que tout asset tiers est réutilisable dans n’importe quel contexte.

### Hover Tilt

Il existe une contradiction dans le dépôt courant :

- le fichier `LICENSE` à la racine est MIT ;
- le README et `packages/hover-tilt/package.json` indiquent MPL-2.0.

Avant d’intégrer le package, demander une clarification à l’auteur ou conserver une preuve de la licence de la version exacte utilisée. Les idées d’architecture peuvent être réimplémentées sans copier le composant.

### Packs.com

Aucune licence open source n’a été trouvée pour les bundles, assets, modèles ou sons Packs. La voie sûre est :

- étudier les comportements et principes ;
- écrire une implémentation Expelled indépendante ;
- créer nos propres textures, modèles, sons, noms de classes et timings finaux ;
- ne pas conserver les bundles ou médias Packs dans le dépôt.

L’analyse de provenance renforce cette prudence : seize textures servies par Packs sont byte-identiques à des fichiers publics de Simey, sans que le SHA établisse le sens d’une éventuelle copie. Le WAV `gold` embarque une attribution `©Sound Ideas All Rights Reserved`. Le modèle GLTF et les autres assets servis par Packs ne déclarent aucune concession de licence. Être publiquement téléchargeable n’accorde pas un droit de redistribution.

Ce document n’est pas un avis juridique.

## 11. Plan priorisé

### P0 — rendre l’existant vrai

1. Migrer les 33 JSON vers la nomenclature canonique.
2. Ajouter un normaliseur temporaire pour les sauvegardes ou données legacy.
3. Valider tous les JSON au build au lieu de les asserter.
4. Utiliser la charte comme fallback unique.
5. Ajouter un test : aucune carte non mate ne peut produire `data-rarity=""`.
6. Corriger la boîte et le z-index des glare.
7. Animer réellement l’opacité de sortie.
8. Brancher angle et seed aux recettes.

Critère de sortie : 60/60 cartes valides, 34/34 cartes non mates visibles — dont les 33 migrées — et aucune erreur silencieuse.

### P0 — protéger le mur de cartes

1. Miniatures responsives + lazy decoding.
2. `touch-action:pan-y pinch-zoom`.
3. mode statique hors viewport et pour `interactive=false`.
4. rAF + rectangle mémorisé.
5. séparation styles statiques/dynamiques.
6. `will-change` temporaire.
7. `content-visibility:auto` sur la grille.

Critère de sortie : scroll mobile intact et pas de hausse massive de mémoire quand les 33 foils sont réactivés.

### P1 — moteur premium Expelled

1. Introduire `CardFinish` séparé de `Rarity`.
2. Installer la structure double shine/double glare.
3. Ajouter masques `frame`, `art`, `foil`, `etch` et radial mobile.
4. Construire six recettes de finition Expelled.
5. Produire la bibliothèque de textures propriétaire.
6. Refondre Full Art en full-bleed réel.
7. Unifier `fullArtView()`.

Critère de sortie : chaque finition reste identifiable à l’arrêt, au centre et dans les quatre coins, sans compromettre la lecture.

### P2 — finition produit

1. gyroscope facultatif ;
2. reduced motion complet ;
3. tests visuels Chrome, Firefox et WebKit ;
4. captures de référence aux neuf positions ;
5. budgets mémoire/GPU/frame ;
6. accessibilité complète du reveal et de la modale ;
7. prototype de peel 3D original Expelled.

## 12. Matrice de validation

Pour chaque finition et format de carte :

| Test | Attendu |
|---|---|
| repos | texture discrète, texte lisible |
| centre | presque aucun pic spéculaire |
| quatre coins | changement directionnel distinct |
| mouvement lent | aucun saut ou clignotement |
| sortie | extinction amortie |
| zoom/flip | couches restent alignées |
| carte hors viewport | aucune animation active |
| reduced motion | rendu statique premium |
| tactile vertical | scroll non bloqué |
| Safari | masques alpha fonctionnels |
| image HD non chargée | foil non activé |

Budgets initiaux proposés :

- au plus une mise à jour par frame ;
- aucune lecture de layout répétée dans la même frame ;
- aucune data-URI reconstruite pendant le mouvement ;
- une seule carte héroïque pleinement compositée à la fois sur mobile ;
- miniatures de grille ≤ 640 px ;
- mode réduit sans animation infinie.

## Conclusion

La technique à retenir n’est pas « mettre un rainbow gradient ». C’est construire un petit modèle de lumière en couches, contraint par la géométrie imprimée de chaque carte.

Expelled possède déjà une partie de cette architecture et plusieurs bonnes textures. Le chemin le plus rentable est :

1. réparer le contrat de presets ;
2. protéger la grille ;
3. installer les vrais masques et couches doubles ;
4. créer une matière visuelle propre à l’univers ;
5. réserver la 3D au rituel d’ouverture.

Cette progression donnera un résultat plus crédible, plus distinctif et juridiquement plus propre qu’une copie directe de Packs ou de Pokémon Cards CSS.
