# EXPELLED — Assets et références

Ce document distingue les références d'inspiration des assets réellement utilisables en production.

---

## 1. État actuel

Le dossier `raw inspiration/` contient 19 images de référence.  
Elles servent à cadrer le style, les palettes et les kits de peuple, mais elles ne sont pas des
illustrations finales.

Les dossiers `drop/` et `tests/` sont encore vides.

---

## 2. Problèmes à corriger

### Noms de fichiers

Les fichiers actuels portent des noms techniques (`image-...`). Ils doivent être renommés avec
une intention lisible.

Exemples :

- `ref-editorial-zero-zero.webp`
- `ref-sacred-black-gold-crows.webp`
- `ref-exil-blue-flat-angel.webp`
- `ref-menace-red-lanterns.webp`

### Classement

Les références doivent être séparées par usage :

- style de base ;
- arts alternatifs premium ;
- inspiration UI/cadre ;
- références écartées.

### Ratios

Beaucoup de références sont au format paysage. Elles sont utiles pour le style, mais moins pour
un full-art vertical de carte. Les arts finaux doivent viser un ratio proche de la carte.

### Texte et signatures

Certaines références contiennent du texte, des logos ou des signatures. Elles peuvent inspirer
l'esprit éditorial, mais les arts finaux doivent rester sans texte ni watermark.

---

## 3. Structure cible

```text
assets/
  references/
    base-style/
    premium-alts/
    card-frame-ui/
    rejected/
  production/
    art/
    frame/
    glyphs/
    foil/
    icons/
```

---

## 4. Assets à produire

Priorité haute :

- glyphes des dix Concepts ;
- halo intact ;
- halo terni ;
- halo fêlé ;
- halo brisé ;
- icône Volonté ;
- icône Intégrité ;
- icône Prononcer ;
- dos de carte Expelled ;
- première version du cadre.

Priorité moyenne :

- texture foil liée au cercle de KOR ;
- fragments de halo ;
- sceau du Vasis ;
- marque EX ;
- template booster du set 01.

---

## 5. Convention de nommage

Références :

```text
ref-[usage]-[peuple-ou-theme]-[description].[ext]
```

Assets de production :

```text
[type]-[concept]-[etat-ou-variante].[ext]
```

Exemples :

- `glyph-kor-circle.svg`
- `glyph-ex-outside.svg`
- `halo-kor-intact.svg`
- `halo-kor-broken.svg`
- `icon-ner-will.svg`
- `frame-set01-silence-base.svg`

---

## 6. Prochaine action

Créer la structure `assets/`, classer les 19 références, puis produire les premiers glyphes :

1. `KOR` ;
2. `EX` ;
3. `NER` ;
4. halo intact ;
5. halo brisé.
