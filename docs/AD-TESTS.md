# Tests de direction artistique v2 — avant refonte des 60 prompts

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
