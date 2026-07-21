# EXPELLED — Socle technique

Expelled devient le projet mère.  
Travelers est abandonné comme univers, mais son ancien site contient une base technique utile :
le display de carte interactif.

Référence externe principale :  
**Pokemon Cards Holo effect v2** — simeydotme  
https://codepen.io/simeydotme/pen/abYWJdX

---

## 1. Ce qu'on garde

### Display de carte

- carte full-art ;
- tilt 3D au pointeur ;
- inertie ou interpolation douce ;
- variables CSS pilotées par la position du curseur ;
- glare dynamique ;
- couches de foil ;
- grain, paillettes, reflets et masques ;
- raretés traitées comme matériaux ;
- versions alternatives toujours premium/foil ;
- composant réutilisable sur mur, page détail, labo et forge.

### Pipeline utile

- import d'illustrations depuis un dossier `drop/` ;
- génération de données carte ;
- preview locale ;
- page détail par carte ;
- mur de cartes par faction ;
- laboratoire visuel pour tester cadre, foil et états.

---

## 2. Ce qu'on jette

Tout le langage Travelers doit disparaître :

- Traveler ;
- CELL ;
- Synchro ;
- Énergie ;
- Rikken ;
- Kairos ;
- Époques ;
- Zones Aveugles ;
- esthétique HUD rétro-tech ;
- carbone industriel ;
- ambre système ;
- fiction de centrale, agents, temporalité ou biotech.

Ces éléments peuvent exister dans l'historique, mais ils ne doivent pas guider Expelled.

---

## 3. Nouveau vocabulaire technique

| Ancien concept | Nouveau concept |
|---|---|
| Énergie | Volonté |
| Santé / structure | Intégrité |
| Traveler | Être |
| Protocole | Verbe |
| Synchro | Prononcer |
| Faction tech | Peuple conceptuel |
| Set Zones Aveugles | Set Nés du silence |

---

## 4. Composants à reconstruire

### `CardFrame`

Structure visible de la carte :

- coût en Volonté ;
- nom ;
- peuple ;
- type ;
- texte ;
- flavor ;
- ATQ ;
- Intégrité ;
- rareté ;
- numéro de set.

### `CardArt`

Gestion de l'image :

- full-art ;
- position de l'image ;
- scrim ;
- halo ;
- densité visuelle selon rareté.

### `CardFoil`

Effets visuels :

- glare ;
- holo ;
- prism ;
- grain ;
- paillettes ;
- masque circulaire lié à KOR ;
- état premium pour les arts alternatifs.

### `CardInteraction`

Interaction :

- mesure du pointeur ;
- rotation X/Y ;
- distance au centre ;
- variables CSS ;
- reset au leave ;
- compatibilité tactile.

### `CardPronounceState`

État visuel propre à Expelled :

- halo intact ;
- halo terni ;
- halo fêlé ;
- halo brisé ;
- animation ou overlay de `Prononcer`.

---

## 5. Schéma de données cible

Champs minimum d'une carte Expelled :

```ts
type ExpelledCard = {
  id: string;
  name: string;
  people: 'vasar' | 'exar' | 'eshar' | 'morar' | 'velar';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'prism';
  kind: 'being' | 'verb';
  cost: number;
  attack?: number;
  integrity?: number;
  text: string;
  pronounce?: {
    cost: number;
    text: string;
  };
  flavor?: string;
  art: string;
  artPosition?: string;
  alts?: string[];
};
```

---

## 6. Direction visuelle du display

Le display doit porter le langage Expelled :

- cercle de KOR comme motif structurel ;
- halo visible dans l'art ou le cadre ;
- glyphes discrets ;
- cadres plus éditoriaux que technologiques ;
- rareté par densité d'ornement ;
- foil centré sur le sacré, le brisé, l'or, le verre et la lumière ;
- typographie lisible, imprimée, presque liturgique.

---

## 7. Première étape d'implémentation

Créer une version minimale du site Expelled :

1. `charter.json` avec peuples, raretés, vocabulaire et contraintes ;
2. types TypeScript propres à Expelled ;
3. deux cartes test : une Vasar, une Exar ;
4. premier `CardFrame` sans effet complexe ;
5. ajout du tilt/glare ;
6. ajout des états de halo ;
7. mur de cartes ;
8. page détail.
