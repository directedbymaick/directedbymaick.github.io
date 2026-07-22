# EXPELLED — Prompts Midjourney

Midjourney ne connaît pas le lore d'Expelled.  
Les prompts doivent donc traduire chaque concept en signes visuels concrets : halo, chaînes,
marques noires, ailes, palette, posture, matière et densité d'ornement.

---

## 1. Structure de base

```text
[archetype visual], [pose], [clothing], [halo state], [symbols],
[palette], clean graphic illustration, flat [color] background,
generous negative space, full-art trading card composition
--sref [refs] --sw 200 --no text, logo, watermark
```

Le nom canonique de la carte reste dans nos fichiers internes.  
Le prompt doit parler à l'image, pas au lore.

---

## 2. Traduction lore vers Midjourney

| Lore | Prompt MJ |
|---|---|
| Vasar | sacred guardian, ivory robe, gold chains, intact halo, solemn pose |
| Exar | fallen war-priest, bone crown, cracked halo, red palette, defiant calm |
| Eshar | masked ghost, moon circle, white moths, translucent veil, fading face |
| Morar | fallen angel in streetwear, tarnished halo, black wings, soft melancholy |
| Velar | radiant rebel angel, glass wings, hard daylight, gold jewelry, confident smile |
| KOR | perfect circle, pale disk, sacred halo, rosace |
| EX | cracked circle, inverted halo, black marks, rupture, outside shadow |
| Prononcer | halo breaking, gold fragments, light escaping, final gesture |
| Sentence | heavy golden chains, engraved links, judicial ritual |
| Volonté | inner light, bright core, controlled glow, burning gaze |

---

## 3. Rareté par prompt

La rareté doit être visible dans l'image avant même le cadre.

### Commune

Objectif : une idée claire, peu d'ornement.

```text
single character, simple pose, one clear halo, minimal symbols,
flat background, clean graphic illustration, generous negative space
```

### Rare

Objectif : un symbole secondaire identifiable.

```text
single character, clear halo, one ritual object, subtle gold ornament,
flat background, clean graphic illustration, generous negative space
```

### Épique

Objectif : plusieurs signes, mais une lecture encore nette.

```text
single character, complex halo, floating fragments, gold chains,
ritual markings, clean graphic illustration, flat background,
controlled ornament density
```

### Légendaire

Objectif : figure mythologique, composition plus solennelle.

```text
iconic central figure, ceremonial symmetry, large complex halo,
floating gold fragments, layered ritual ornaments, dramatic stillness,
clean graphic illustration, flat background, premium trading card art
```

### Prismatique

Objectif : carte ultime. Elle doit sembler impossible à produire en commune.

Mots clés utiles :

- `iconic symmetrical composition`
- `massive broken eclipse halo`
- `radiant prism light`
- `gold halo fragments`
- `ornate sacred geometry`
- `layered translucent circles`
- `mythic stillness`
- `premium collector card art`
- `high ornament density`
- `clean graphic illustration`

À éviter :

- `epic battle scene`
- `cinematic environment`
- `rainbow everywhere`
- `overdetailed background`
- `splash art`

---

## 4. Template prismatique

```text
iconic [archetype], symmetrical frontal pose, massive [halo state] eclipse halo behind head,
gold halo fragments floating around, ornate sacred geometry, [signature symbols],
[palette], radiant prism light accents, mythic stillness, high ornament density,
clean graphic illustration, flat [color] background, premium collector trading card art
--sref [refs] --sw 200 --no text, logo, watermark
```

---

## 5. Prompts test — carte base vs carte ultime

### Vasar commune

```text
calm sacred guardian, simple frontal pose, ivory ceremonial robe,
intact golden halo circle behind head, thin gold chains,
warm ivory palette, clean graphic illustration, flat ivory background,
generous negative space, full-art trading card composition
--sref [SACRED_REFS] --sw 200 --no text, logo, watermark
```

### Vasar prismatique

```text
iconic sacred judge, symmetrical frontal pose, ivory ceremonial robe with layered gold chains,
massive perfect eclipse halo behind head, ornate rosace geometry, floating gold halo fragments,
white and gold palette, radiant prism light accents, mythic stillness, high ornament density,
clean graphic illustration, flat ivory background, premium collector trading card art
--sref [SACRED_REFS] --sw 200 --no text, logo, watermark
```

### Exar commune

```text
fallen red war-priest, calm defiant pose, cracked halo behind head,
simple bone crown, black ritual marks on pale skin,
deep crimson and bone palette, clean graphic illustration,
flat crimson background, generous negative space, full-art trading card composition
--sref [MENACE_REFS] --sw 200 --no text, logo, watermark
```

### Exar prismatique

```text
iconic fallen king, symmetrical frontal pose, massive shattered inverted eclipse halo,
heavy golden chains across shoulders, bone crown with red fragments,
black ritual marks spreading across pale skin, floating gold and bone shards,
deep crimson black and bone palette, radiant prism light accents, mythic stillness,
high ornament density, clean graphic illustration, flat crimson background,
premium collector trading card art
--sref [MENACE_REFS] --sw 200 --no text, logo, watermark
```

### Eshar prismatique

```text
iconic masked ghost oracle, symmetrical floating pose, massive pale violet moon halo,
layered translucent circles, white moth swarm, fading face behind porcelain mask,
silver mist veil, violet lunar palette, radiant prism light accents, mythic stillness,
high ornament density, clean graphic illustration, flat muted violet background,
premium collector trading card art
--sref [SPECTRE_REFS] --sw 200 --no text, logo, watermark
```

### Morar prismatique

```text
iconic fallen street angel, symmetrical relaxed pose, oversized bomber jacket,
black wings folded like a cloak, massive tarnished halo cracked into gold fragments,
dead branches forming a circle, pastel blue and ivory palette, radiant prism light accents,
mythic stillness, high ornament density, clean graphic illustration, flat pastel blue background,
premium collector trading card art
--sref [EXIL_REFS] --sw 200 --no text, logo, watermark
```

### Velar prismatique

```text
iconic radiant rebel angel, symmetrical confident pose, glass wings spread wide,
massive broken sun halo bursting into gold fragments, white cropped jacket,
gold jewelry, hard daylight, golden white palette, radiant prism light accents,
mythic stillness, high ornament density, clean graphic illustration,
flat sunlit gold background, premium collector trading card art
--sref [SOLEIL_REFS] --sw 200 --no text, logo, watermark
```

---

## 6. Test recommandé

Pour vérifier que la rareté fonctionne, générer en paire :

1. même peuple ;
2. même archétype ;
3. même `--sref` ;
4. une version commune ;
5. une version prismatique.

Si la prismatique ressemble seulement à une commune plus détaillée, renforcer :

- symétrie ;
- halo massif ;
- fragments flottants ;
- géométrie sacrée ;
- lumière prismatique contrôlée ;
- densité d'ornement ;
- posture iconique.

---

## 7. Repeindre avec ChatGPT (montée en qualité)

ChatGPT sert de passe de repeinte : même composition, exécution meilleure.
Son défaut connu : une texture de micro-coups de pinceau uniforme plaquée sur
toute l'image — le « filtre huile » qui crie IA. Il est stochastique : sans
verrouiller la finition, c'est la loterie.

Trois règles, intégrées au prompt ci-dessous :

- ne JAMAIS demander de « brushwork » — le mot invite littéralement la touche ;
- qualifier la référence de style par sa finition (« smooth, blended, polished
  finish ») pour que « splash art » ne tire pas vers le mode peinture ;
- poser le négatif en langage naturel : ChatGPT n'a pas de `--no`, mais il
  suit bien une interdiction écrite en toutes lettres.

```text
Repaint this illustration at professional trading card game quality, in the style of Riot Games and Magic: The Gathering splash art — their smooth, blended, polished finish. Keep the exact same composition, pose, framing, color palette AND the same overall brightness — do not darken the image, do not increase the contrast. Only improve the execution: smooth blended shading, sharper detail on the face and hands, remove all AI artifacts and mushy areas. Render every surface cleanly: absolutely no visible brushstroke texture, no uniform paint dabs, no impasto, no oil-painting filter look — brush marks must be invisible in the final image. Fix any anatomy mistakes: wrong number of fingers, broken hands, twisted limbs, odd proportions — correct them naturally without changing the pose. No new elements, no text, no logo. Same aspect ratio.
```

Si la texture apparaît quand même : ne pas relancer à l'aveugle — répondre
« same image, re-render with smooth blended shading, remove the visible
brushstroke texture ». L'édition multi-tours garde la composition et ne
change que la finition. En dernier recours, une passe Magnific à faible
créativité lisse les micro-touches sans regénérer.
