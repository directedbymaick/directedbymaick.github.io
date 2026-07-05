# Tests de direction artistique v2 — avant refonte des 60 prompts

> **ROUND 1 REJETÉ** (les 10 tests ci-dessous, conservés pour mémoire). Cap corrigé : **splash art type League of Legends + touche vintage rétro**, porté par le moodboard MJ de Maïck. Voir « Round 2 » ci-dessous.

---

## ROUND 2 — Splash art × vintage (6 tests)

*Le moodboard (profil de personnalisation MJ nourri de splashs LoL) porte le style. Les prompts décrivent l'action, la composition, la lumière et l'époque. Active la personnalisation (`--p`) sur TOUS ces tests.*

### Paramètres

- **S1 en A/B/C** : `--p --stylize 200` vs `--p --stylize 600` vs `--p --stylize 1000` — avec un profil, `--stylize` dose l'influence du moodboard. C'est LE réglage à trancher en premier.
- Si le style dérive encore : ajoute en plus `--sref` avec les URLs de tes 2-3 splashs préférés du moodboard (ceinture + bretelles).
- Pas de `--style raw` : le raw éteint exactement le jus qu'on cherche.
- La dose vintage est DANS les prompts (grain, halation, grading) — S2 teste la version chargée, compare avec S1 pour choisir la dose.

### S1 — Héros solo, action pure (Viktor, nitro) — test de référence

```
epic splash art of a young russian traveler in a sleek black biotech suit leaping between rooftops of 2049 tokyo at night, orange nitro flames bursting from his calf conduits, dramatic foreshortening from below, insolent grin, debris and sparks trailing, volumetric city light, deep shadows with vibrant orange and teal, dynamic action pose, cinematic composition, subtle film grain --no text, watermark
```

### S2 — Même sujet, dose vintage chargée (A/B de la touche rétro)

```
epic splash art of a young russian traveler in a sleek black biotech suit leaping between rooftops of 2049 tokyo at night, orange nitro flames bursting from his calf conduits, dramatic foreshortening from below, insolent grin, debris and sparks trailing, volumetric city light, retro 90s anime poster grading, halation glow, heavy film grain, slightly faded print colors, dynamic action pose --no text, watermark --seed 2049
```

### S3 — Duel (Hugo vs Kuroda) — composition à deux, le clash des accents bleu/rouge

```
epic splash art of two travelers clashing mid-air above a shattered transfer platform, young hero in a blue-lit biotech suit blocking a strike from a masked figure with glitching red conduits, shockwave of blue and red energy at the point of impact, debris frozen in time around them, dramatic low angle, intense expressions, cinematic rim light, vintage film grain --no text, watermark
```

### S4 — Splash en époque (éclaireuse, Paris 1888) — l'ère doit rester lisible à pleine énergie

```
epic splash art of a female scout in a sleek dark biotech suit sprinting up collapsing wooden scaffolding in a 19th century parisian construction site, gaslight ambers and stone dust exploding around her, blue light lines of her suit cutting through the sepia dusk, dramatic diagonal composition, planks and rivets flying, cinematic motion energy, subtle film grain --no eiffel tower, text, watermark
```

### S5 — KAIROS (Kuroda, désactivation) — le rouge signature en mode splash

```
epic splash art of a masked kairos operative crouched on a rain-soaked 2049 rooftop, red glitching conduits flaring as he crushes a glowing CELL core in his fist, sparks and rain frozen in dramatic slow motion, deep noir shadows with controlled crimson highlights, menacing calm, low dutch angle, cinematic composition, subtle film grain --no text, watermark
```

### S6 — Protocole/scène (transfert d'urgence) — vérifier que les cartes sans héros gardent le niveau

```
epic splash art of a traveler being violently yanked backward into a column of blue-white light, body arched, hand reaching toward the viewer, transfer platform fracturing beneath, cables and debris sucked into the light, dramatic wide angle, blinding core against deep shadows, emotional intensity, subtle film grain --no text, watermark
```

### Dépôt

`drop/_tests/` → `s1.png` … `s6.png` (+ variantes stylize `s1-s200.png`, `s1-s600.png`, `s1-s1000.png`). L'image gagnante devient l'ancre du set (`--sref` + moodboard).

---

## ROUND 2 — VERDICT : S2 · S4 · S5 retenus

L'ADN commun des trois gagnants = **la formule v2** :

1. **Énergie splash** (pose/action dynamique, composition cinématique) — mais jamais « pur jus » sans ancrage.
2. **Couche vintage MARQUÉE** : `retro 90s anime poster grading, halation glow, heavy film grain, slightly faded print colors` — c'est elle qui signe le set (S2 > S1).
3. **Palette d'époque contrôlée** qui raconte le lieu/temps : sépia + ambres gaz (1888), noir + cramoisi (KAIROS), etc. (S4, S5).
4. **Hiérarchie sujet > décor** : le background est travaillé et identifiable (c'est lui qui date l'époque) mais reste SECOND — le sujet doit accrocher l'œil en premier. Dans les prompts : sujet net et dominant, décor riche mais en profondeur atmosphérique.
   Tokens : `subject in sharp focus dominating the frame, richly detailed background softened by atmospheric depth, background slightly hazed and desaturated relative to subject`.

**Bloc de style commun v2** (fin de chaque prompt, avant les --no) :

```
retro 90s anime poster grading, halation glow, heavy film grain, slightly faded print colors, cinematic composition
```

### Règle d'écriture v2.1 — SOBRIÉTÉ (correction après essais)

Les prompts chargés en VFX (« debris frozen in time », « light trails », « shockwave », « smearing into light trails ») produisent du fouillis linéaire, des traînées partout et des poses cassées. Désormais :

- **Une scène = une phrase.** Un sujet, une action lisible, un décor. C'est tout.
- **Zéro accumulation de VFX.** Un seul élément d'énergie par image, maximum — et seulement s'il EST le sujet.
- **Poses naturelles.** Debout, accroupi, marchant, tendant la main — les poses « photo d'action » cassent moins que les vols planés.
- Le moment d'AVANT l'action est souvent plus fort (et plus stable) que l'action elle-même.

**Bloc de style commun v2.1** (inchangé) : `retro 90s anime poster grading, halation glow, heavy film grain, slightly faded print colors` + hiérarchie sujet/décor si besoin.

### Confirmation (3 prompts, version sobre)

**C1 — duel : l'instant d'avant, pas le choc**
```
two travelers facing each other on a cracked transfer platform, one in a blue-lit biotech suit, the other masked with faulty red conduits, a heartbeat before the clash, dark hall, tense stillness, retro 90s anime poster grading, halation glow, heavy film grain, slightly faded print colors --no text, watermark
```

**C2 — transfert d'urgence : un civil aspiré par accident, désintégré car sans combinaison**
```
a man in civilian clothes being pulled off his feet into a column of blue-white light, one arm already dissolving into light, terrified face turned toward the viewer, dark transfer chamber, retro 90s anime poster grading, halation glow, heavy film grain, slightly faded print colors --no text, watermark
```

**C3 — présent 2049 : simple et identifiable**
```
a traveler in a sleek black biotech suit standing on a rain-soaked elevated platform, 2049 tokyo skyline behind her softened by rain haze, blue conduits glowing faintly, retro 90s anime poster grading, halation glow, heavy film grain, slightly faded print colors --no cyberpunk pink purple overload, text, watermark
```

Si C1/C2/C3 confirment → choisir LA meilleure image comme **ancre `--sref`**, puis réécriture des 60 prompts en v2.1 : une phrase de scène + époque/palette + bloc de style, moodboard + sref pour le reste.

---

## ROUND 3 — Lecture du moodboard (la vraie cible)

Le moodboard MJ de Maïck décode en 6 ingrédients :

1. **Character-first** : le personnage porte l'image. Cadrages plan américain / plein pied / buste, souvent frontal ou 3/4.
2. **Poses calmes et sûres** : debout, marchant vers nous, main au col, regard par-dessus l'épaule. Zéro vol plané. Le swag > l'action.
3. **Rendu encre + cel propre** (manga/manhwa) : formes nettes, noirs profonds, pas de peinture texturée.
4. **Tenues tactiques noires** : sangles, gants, masques, manteaux — silhouettes lisibles.
5. **Palette noir désaturée + UN accent tenu** (lueur rouge, ambre, enseigne, mèche colorée). Le monochrome ne tue pas le wow — le manque de contraste et d'attitude, si.
6. **Ambiances noir** : pluie, neige, fumée, nuit, néons lointains. Décor présent mais atmosphérique (cf. principe 4).

**Bloc de style v3** (remplace le bloc v2.1) :
```
dark seinen manga cover illustration, clean ink and cel shading, muted noir palette with a single controlled accent, subtle film grain
```

### Tests round 3 (5 prompts, moodboard `--p` actif partout)

**M1 — solo swagger (Viktor, toit, nuit)**
```
young russian traveler in a sleek black tactical biotech suit standing at the edge of a rooftop at night, hands in pockets, insolent grin, light snow falling, faint orange glow from his calf conduits, dark seinen manga cover illustration, clean ink and cel shading, muted noir palette with a single controlled accent, subtle film grain --no text, watermark
```

**M2 — menace KAIROS (masqué, enseigne rouge, pluie)**
```
masked kairos operative standing under a flickering red sign in a rainy alley at night, hands relaxed at his sides, faulty red conduits glowing through his black coat, dark seinen manga cover illustration, clean ink and cel shading, muted noir palette with a single controlled accent, subtle film grain --no text, watermark
```

**M3 — l'organisation (groupe KAIROS marchant dans la neige)**
```
four kairos agents in dark coats walking toward the viewer across a snowy airfield at night, confident stride, one adjusting his glove, distant government building with red lights, dark seinen manga cover illustration, clean ink and cel shading, muted noir palette with a single controlled accent, subtle film grain --no text, watermark
```

**M4 — époque (éclaireuse, Paris 1888, calme)**
```
female scout in a sleek dark biotech suit standing in a foggy 19th century parisian construction site at dusk, looking over her shoulder, warm gaslight in the mist behind her, faint blue lines on her suit, dark seinen manga cover illustration, clean ink and cel shading, muted noir palette with a single controlled accent, subtle film grain --no text, watermark
```

**M5 — protocole (transfert d'urgence, civil aspiré)**
```
a man in civilian clothes being pulled off his feet into a column of blue-white light, one arm already dissolving, terrified face, dark transfer chamber, dark seinen manga cover illustration, clean ink and cel shading, muted noir palette with a single controlled accent, subtle film grain --no text, watermark
```

Dépôt : `drop/_tests/` → `m1.png` … `m5.png`. La gagnante = ancre `--sref` du set, et les 60 prompts se réécrivent sur ce squelette.

### Amendement round 3 — MOODBOARD OFF, PROFIL ON

Constat après essais : le **moodboard** moyenne les références en un rendu « AI slop ». Le **profil de personnalisation** (nourri par les likes) tire vers des styles réels — Cowboy Bebop, Akira, cel anime 90s — et donne des images bien plus crédibles.

Nouvelle config :
- **Moodboard : OFF.** Profil de personnalisation : ON (c'est lui le moteur de style).
- Le texte ancre l'époque stylistique réelle. **Bloc de style v3.1** :
```
1990s retro anime film still, hand-drawn cel animation look, muted colors, subtle film grain
```
- Les scènes M1–M5 restent valables telles quelles : remplace juste le bloc v3 par le bloc v3.1 en fin de prompt.
- Si une image sort parfaite : elle devient l'ancre `--sref` en complément du profil.

### Correction v3.2 — LA COULEUR (contrainte produit)

Le noir seinen était trop sombre. Contrainte technique en plus du goût : les foils de la carte
(`color-dodge`) n'accrochent que sur des valeurs moyennes/claires, et le foil est teinté par la
palette extraite de l'artwork — **une image sombre = un holo mort**. La DA doit fournir de la
couleur et de la lumière.

La cel anime 90s EST colorée (Akira : rouges/bleus saturés ; Bebop : oranges/teals). On garde le
squelette rétro anime, on pousse la couleur :

- **Chaque carte reçoit un duo de couleurs complémentaires** (teal/orange, rouge/cyan, violet/ambre,
  vert/magenta) — c'est le duo qui fait le « wow » ET nourrit le foil.
- **Fond lumineux obligatoire** : ciel, enseigne, brasier, neige éclairée, colonne de transfert —
  jamais de noir plein cadre.
- Le noir reste dans la silhouette du sujet (le suit) : le contraste sujet sombre / fond lumineux
  remplace le dark global.

**Bloc de style v3.2** :
```
1990s retro anime film still, hand-drawn cel animation look, rich vivid colors, complementary color lighting, luminous background, subtle film grain
```

### Re-tests couleur (3 prompts)

**V1 — Viktor, golden hour (teal/orange)**
```
young russian traveler in a sleek black biotech suit standing on a rooftop edge at golden hour, hands in pockets, insolent grin, glowing orange sunset sky over a teal-shadowed 2049 tokyo skyline, faint orange glow from his calf conduits, 1990s retro anime film still, hand-drawn cel animation look, rich vivid colors, complementary color lighting, luminous background, subtle film grain --no text, watermark
```

**V2 — KAIROS, néon rouge sous la pluie (rouge/cyan)**
```
masked kairos operative standing under a bright red neon sign in a rainy alley at night, red light flooding the wet street, cool cyan reflections in the puddles, red conduits glowing through his black coat, 1990s retro anime film still, hand-drawn cel animation look, rich vivid colors, complementary color lighting, luminous background, subtle film grain --no text, watermark
```

**V3 — éclaireuse 1888, gaz et crépuscule (ambre/bleu)**
```
female scout in a sleek dark biotech suit in a 19th century parisian construction site at dusk, warm amber gaslights glowing through blue evening fog, scaffolding silhouettes against a luminous violet sky, blue light lines on her suit, 1990s retro anime film still, hand-drawn cel animation look, rich vivid colors, complementary color lighting, luminous background, subtle film grain --no eiffel tower, text, watermark
```

Dépôt : `drop/_tests/` → `v1.png` … `v3.png`.

### v3.3 — L'ancre JoJo (vintage + ultra coloré)

Référence décisive : **JoJo's Bizarre Adventure** — vintage assumé ET couleurs pop sans peur
(ciels roses, verts acides, violets francs), lignes épaisses propres, et des poses **théâtrales
mais statiques** (la flamboyance immobile : stable pour MJ, parfaite pour les foils).
Ça réconcilie le swag du moodboard avec la contrainte couleur des foils.

Amendement à la règle des poses : théâtral OK, tant que c'est STATIQUE (posture tenue, pas de vol plané).

**Bloc de style v3.3** :
```
1990s retro anime style, jojo's bizarre adventure color energy, bold pop-art palette with unconventional color combinations, clean thick linework, flamboyant static pose, subtle film grain
```

### Tests JoJo (3 prompts)

**J1 — Viktor, pose flamboyante, ciel rose/orange**
```
young russian traveler in a sleek black biotech suit striking a flamboyant pose on a rooftop edge, chin raised, insolent grin, vivid pink and orange sunset sky over a violet city skyline, orange glow from his calf conduits, 1990s retro anime style, jojo's bizarre adventure color energy, bold pop-art palette with unconventional color combinations, clean thick linework, flamboyant static pose, subtle film grain --no text, watermark
```

**J2 — KAIROS, menace posée, rouge/vert acide**
```
masked kairos operative standing with theatrical confidence in a rainy alley, one hand adjusting his collar, bright red neon sign against acid green mist, red conduits glowing through his black coat, 1990s retro anime style, jojo's bizarre adventure color energy, bold pop-art palette with unconventional color combinations, clean thick linework, flamboyant static pose, subtle film grain --no text, watermark
```

**J3 — éclaireuse 1888, ambre/violet**
```
female scout in a sleek dark biotech suit posing dramatically on wooden scaffolding in a 19th century parisian construction site, amber gaslights glowing through violet dusk fog, luminous sky behind the ironwork, blue light lines on her suit, 1990s retro anime style, jojo's bizarre adventure color energy, bold pop-art palette with unconventional color combinations, clean thick linework, flamboyant static pose, subtle film grain --no eiffel tower, text, watermark
```

Dépôt : `drop/_tests/` → `j1.png` … `j3.png`. Comparer J1-J3 (JoJo) vs V1-V3 (Bebop/Akira) : le duel final des deux formules.

---

## v4 — ABANDON DU RÉTRO : splash art anime/manga/jeu vidéo moderne

Constat : tout vocabulaire « retro/vintage/90s/film grain » ramène un rendu peinture-brush. On vise
le **splash art moderne de jeu anime** (key visuals type Arknights / Genshin / jaquettes d'anime
actuelles) : cel net, ligne crisp, couleurs vives, lumière cinématique, ZÉRO grain.

**Acquis conservés** des rounds précédents :
- une scène = une phrase, zéro accumulation de VFX (v2.1) ;
- pose flamboyante mais STATIQUE (v3.3) ;
- duo de couleurs complémentaires par carte + fond lumineux — contrainte foils (v3.2) ;
- hiérarchie sujet net > décor atmosphérique (principe 4) ;
- profil de personnalisation ON, moodboard OFF.

**Bloc de style v4** :
```
anime video game splash art, official key visual style, clean cel shading, crisp line art, vibrant saturated colors, cinematic lighting
```

### Tests v4 (mêmes 3 scènes, pour comparaison propre)

**K1 — Viktor**
```
young russian traveler in a sleek black biotech suit striking a confident pose on a rooftop edge, chin raised, insolent grin, vivid orange sunset sky over a teal city skyline, orange glow from his calf conduits, anime video game splash art, official key visual style, clean cel shading, crisp line art, vibrant saturated colors, cinematic lighting --no text, watermark, painterly, brush strokes
```

**K2 — KAIROS**
```
masked kairos operative standing with theatrical confidence in a rainy alley at night, one hand adjusting his collar, bright red neon sign with cool cyan reflections in the puddles, red conduits glowing through his black coat, anime video game splash art, official key visual style, clean cel shading, crisp line art, vibrant saturated colors, cinematic lighting --no text, watermark, painterly, brush strokes
```

**K3 — éclaireuse 1888**
```
female scout in a sleek dark biotech suit posing on wooden scaffolding in a 19th century parisian construction site at dusk, warm amber gaslights through blue evening fog, luminous violet sky behind the ironwork, blue light lines on her suit, anime video game splash art, official key visual style, clean cel shading, crisp line art, vibrant saturated colors, cinematic lighting --no eiffel tower, text, watermark, painterly, brush strokes
```

Dépôt : `drop/_tests/` → `k1.png` … `k3.png`. Noter le `--no painterly, brush strokes` : on verrouille la sortie du rendu peinture.

---

## ROUND 1 (rejeté — archive)

*Contexte : présent = Terre, 2049. Les Travelers visitent des époques différentes → chaque époque doit être identifiable par son décor ET sa palette. On garde le grain rétro (Evangelion / GITS / Blade Runner), on abandonne le monochrome strict : palette riche par époque, contrôlée, jamais arc-en-ciel.*

## Protocole

1. Génère les 10 prompts ci-dessous (format portrait et style de base : tes réglages MJ).
2. **T1/T2/T3 = même sujet, trois gradings** → choisis le niveau de couleur qui fait « wow » sans casser le rétro.
3. **T4→T9 = six époques** → vérifie qu'on reconnaît l'époque en une seconde, sans lire le nom.
4. Dépose les gagnantes dans `drop/_tests/` sous les noms `t01.png` … `t10.png` → je monte une planche comparative dans le site.
5. L'image la plus juste devient l'**ancre `--sref`** de toute la refonte : les 60 prompts porteront son URL pour verrouiller le style.

## Paramètres à tester

- **T1 uniquement, en A/B** : `--stylize 100` vs `--stylize 400` (au-delà MJ impose son goût), et `--style raw` vs défaut si ta personnalisation est active.
- Pour comparer deux gradings sur la même compo : ajoute `--seed 2049` aux deux.
- Quand une ancre est choisie : `--sref <url> --sw 200` sur tout le set (monte à 400 si le style dérive encore).

---

## T1 — Contrôle · grading « rétro-cinéma » (teal & sodium)

```
female operative in a sleek black biotech suit with modular plates, thin cyan water conduits along forearms, standing in a vast RIKKEN hangar in 2049 Tokyo, cold teal industrial light with warm sodium rim lighting, wet concrete reflections, retro 90s sci-fi anime atmosphere, film grain, rich cinematic color grading, subject centered upper half --no rainbow colors, iron man style, text, watermark
```

## T2 — Contrôle · grading « cel anime 90s » (couleur pleine, désat légère)

```
female operative in a sleek black biotech suit with modular plates, thin cyan water conduits along forearms, standing in a vast RIKKEN hangar in 2049 Tokyo, 1990s cel anime look, rich but slightly desaturated colors, deep shadows, warm practical lights against cool ambient, vintage film grain, subject centered upper half --no rainbow colors, iron man style, text, watermark --seed 2049
```

## T3 — Contrôle · grading « poster deux tons + accent »

```
female operative in a sleek black biotech suit with modular plates, thin cyan water conduits along forearms, standing in a vast RIKKEN hangar in 2049 Tokyo, bold two-tone poster lighting, deep navy shadows and warm highlight wash, one saturated cyan accent, retro sci-fi movie poster energy, subject centered upper half --no rainbow colors, iron man style, text, watermark --seed 2049
```

## T4 — Époque : 2049, Neo-Tokyo extérieur (le présent doit aussi être identifiable)

```
traveler in a sleek black biotech suit on a rain-soaked elevated walkway in 2049 Tokyo at night, dense skyline with soft holographic signage and distant mag-lev lines, umbrella crowd below, cold blue city glow with warm neon reflections in puddles, retro-futuristic 90s anime vibe, film grain, subject centered upper half --no cyberpunk pink purple overload, text, watermark
```

## T5 — Époque : Paris 1888, le Chantier (Z-01)

```
female scout in a sleek dark biotech suit moving through a 19th century parisian construction site at dusk, wooden scaffolding, steam and stone dust, warm gaslight ambers against cold blue evening fog, haussmannian facades half-built, sepia-leaning vintage palette with her suit's blue light lines as the only modern element, film grain, subject centered upper half --no eiffel tower recognizable, text, watermark
```

## T6 — Époque : tranchées 1917, hiver (Z-03)

```
traveler in a dark biotech suit crouching in a snowy 1917 trench at dawn, frost on sandbags and barbed wire, muted mustard and grey-green wartime palette, pale winter light, his suit's faint blue glow contrasting with the era, quiet tension, film grain, subject centered upper half --no modern buildings, text, watermark
```

## T7 — Époque : Japon Sengoku, duel sur le pont (Z-02)

```
lone ronin standing on a wooden bridge in feudal japan at dusk, paper lanterns and vermilion lacquer accents, mist over the river, muted ink-wash landscape with controlled warm reds, wandering samurai silhouette, film grain, vintage jidaigeki atmosphere, subject centered upper half --no neon, modern elements, text, watermark
```

## T8 — Époque : baleinier dans le détroit, ~1850 (Z-05)

```
massive whaling ship trapped between teal icebergs in an arctic strait, 1850s rigging and frost-covered sails, tiny crew figures with warm oil lamps against the vast cold, deep teal and bone-white palette with amber lamp accents, dramatic scale, film grain, subject in upper half --no modern ships, text, watermark
```

## T9 — Époque : la Centrale sous Odaiba, 2049 (décor signature RIKKEN)

```
colossal underground transfer core beneath Tokyo in 2049, cathedral-scale machinery around a column of blue-white light, tiny engineers on gantries, cold blue core glow with warm amber control-room lights, retro-futuristic industrial design, film grain, dramatic vertical composition --no text, watermark
```

## T10 — Faction : opération KAIROS, ruelle 2049 (le rouge signature)

```
kairos operative in a matte black tactical suit with glitching red conduits, waiting in a narrow 2049 tokyo back-alley under a flickering red sign, rain, steam from vents, deep shadows with controlled red and cool grey palette, dangerous calm, retro anime noir, film grain, subject centered upper half --no rainbow colors, text, watermark
```

---

## Grille de lecture (remplir après génération)

| Test | Époque reconnaissable ? | Wow couleur | Style cohérent avec le set | Verdict |
|---|---|---|---|---|
| T1 | — | | | |
| T2 | — | | | |
| T3 | — | | | |
| T4 | ☐ | | | |
| T5 | ☐ | | | |
| T6 | ☐ | | | |
| T7 | ☐ | | | |
| T8 | ☐ | | | |
| T9 | ☐ | | | |
| T10 | ☐ | | | |
