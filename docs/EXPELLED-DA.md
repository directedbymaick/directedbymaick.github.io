# EXPELLED — Direction artistique (fondation)

*Pivot acté : l'univers Travelers est abandonné. Nouveau nom : **Expelled**. Histoire à écrire (atelier à venir). Ce doc capture l'analyse des références et la formule MJ validée par les tests.*

## Les 5 références fondatrices

1. **La femme aux corbeaux** (Prywinko) — divinité funèbre, disque d'or, ailes noires, noir/rouge/or, fond abstrait ornemental.
2. **ZERO ZERO Vol.2** (Kelvin Law) — cover éditoriale Y2K, démone streetwear, halftone orange, la carte comme objet édité.
3. **Le splash aux lanternes rouges** — esprit masqué, rouge saturé, pétales, monde spectral.
4. **L'ange sur la branche** — graphique minimal, fond bleu plat, cercle, espace négatif, mélancolie.
5. **La sainte alanguie** — hétérochromie, marquages noirs organiques, robe blanche, rosace, dualité sur la peau.

## Les 7 invariants graphiques

1. **Le cercle derrière la tête** (halo, disque, halftone, rosace, lune) — motif signature, 5/5 images.
2. **Sacré × profane** : halos + cornes, ailes + streetwear, blanc + marquages noirs. Chaque personnage porte sa chute.
3. **Character-first** : poses calmes et souveraines, zéro combat, l'attitude est l'action.
4. **Une couleur-âme par personnage** (pas d'ambiance globale) : noir/or, orange crème, cramoisi, bleu plat, blanc ivoire.
5. **L'ornement remplace le décor** : chaînes, pétales, plumes, typographie — fonds abstraits ou plats, jamais d'environnements narratifs.
6. Rendu **graphique propre** (voir style verrouillé) avec accents symboliques nets.
7. **La carte comme édition** : typographie, labels techniques, numérotation — pochette de disque plus que cadre de TCG.

## STYLE VERROUILLÉ (test X2, validé)

**Le rendu unique du set = le pôle graphique** : illustration nette, fonds plats bicolores,
cercle pâle, espace négatif généreux. Le pôle « peinture dense » (X1, magnifique mais
« ça ressemble à du Riot ») est réservé aux **arts alternatifs premium** (toujours foil).

### Formule MJ

- `--sref [zero-zero] [ange-branche] --sw 200` — SET-B uniquement, jamais les 5 refs ensemble.
- **Personnalisation OFF** (le profil rétro-anime Travelers pollue).
- Prompt : sujet + symboles en ~30 mots + `clean graphic illustration, flat [couleur] background, generous negative space` + `--no text, watermark`.
- Portrait dans les réglages (pas de --ar).

### Hiérarchie de rareté = DENSITÉ, pas rendu

- Commune : fond plat nu, halo simple.
- Rare : + un cercle/objet symbolique.
- Épique : + ornements (chaînes, pétales, fragments).
- Légendaire/Prism : composition dense, halo complexe (brisé, double, éclipse) — même rendu graphique.

### Codes émergents assumés

- **Streetwear par défaut** (sneakers, bombers, chaînes) — les déchus portent leur exil comme un style.
  Contrôlable carte par carte (figures anciennes = drapés/robes).
- Mixité des genres naturelle dans le sref.

## Journal des tests

- **X1** (ange déchu, sref SET-A peinture, sw 200) : ✅ magnifique mais « du Riot » → réservé aux alts premium.
- **X2** (même sujet, sref SET-B graphique, sw 200) : ✅ VALIDÉ comme style du set. Streetwear émergent.
- **G1-G4** (en cours) : couverture des archétypes en style verrouillé — démone pop, esprit masqué,
  sainte corrompue, densité légendaire.

## À faire après validation G1-G4

1. Atelier histoire (qui expulse qui, factions, mécanique signature).
2. Renommage TCG → Expelled (charter.json, site, docs).
3. Refonte du cadre de carte (motif halo, esprit « édition »), du dos, du booster.
4. Nouveaux 60 slots + prompts. Purge des cartes Travelers.
