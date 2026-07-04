# SET 01 — ZONES AVEUGLES

*Spécification du set fondateur. 60 cartes. Objectif : un duel RIKKEN vs KAIROS complet et équilibré (base du futur mode solo). Complète docs/RULES.md (règles de jeu) et docs/DESIGN.md (charte visuelle).*

**Statut : 10/60 cartes forgées** (le cast initial, intégré au set).

---

## 1. Composition

### Par faction × rareté

| | Standard | Rare | Épique | Légendaire | Prismatique | **Total** |
|---|---|---|---|---|---|---|
| **RIKKEN** | 8 | 6 | 4 | 3 | 1 | **22** |
| **KAIROS** | 9 | 6 | 4 | 2 | 1 | **22** |
| **Les Époques** | 9 | 4 | 2 | 1 | 0 | **16** |
| **Total** | **26** | **16** | **10** | **6** | **2** | **60** |

### Par type

| | Unités | Protocoles |
|---|---|---|
| RIKKEN | 17 | 5 |
| KAIROS | 17 | 5 |
| Les Époques | 13 | 3 |

### Courbe de coûts (cible par faction, unités)

Chaque faction doit pouvoir construire un deck de 30 avec une courbe saine :

| Coût | 1 | 2 | 3 | 4 | 5 | 6 | 7+ |
|---|---|---|---|---|---|---|---|
| Unités par faction (min) | 2 | 3 | 3 | 3 | 2 | 2 | 1 |

---

## 2. Le barème — coût des effets en points de budget

Budget total d'une carte : `statBudgetPerCost × cost` (charter.json), consommé par les stats (1 pt = 1 ATQ ou 1 INT) ET les effets selon ce barème :

| Effet | Coût en points |
|---|---|
| Piocher 1 carte | 2 |
| Infliger X dégâts (ciblé) | X |
| Infliger X dégâts (toutes unités ennemies) | 2,5 × X |
| Restaurer X Intégrité | 0,5 × X |
| +X/+Y sur une unité (permanent) | 0,75 × (X+Y) |
| +X ATQ ce tour seulement | 0,5 × X |
| Garde | 1 |
| Célérité | 1 |
| Insaisissable | 1,5 |
| Dernier souffle (effet) | 0,75 × valeur de l'effet |
| Désactiver une Synchro ennemie | 3 |
| Regarder la main adverse | 1 |
| Renvoyer une unité en main | coût de l'unité × 0,5 (estimer 2) |
| Prendre le contrôle (permanent) | coût max ciblé × 2 |

**Règles du barème :**
- **Effet de Synchro** : sa valeur ne doit pas dépasser **2 × coût de Synchro** (l'effet est différé et payé, donc décoté). Il ne consomme PAS le budget de base de la carte.
- **Prime Époques** : +1 point de budget (pas de CELL, pas de Synchro — compensation actée dans RULES.md).
- **Prime Légendaire/Prismatique** : +2 points de tolérance (les cartes signature peuvent dépasser légèrement — c'est le « wow » contrôlé).
- **Conditions** : un effet conditionnel (« si vous contrôlez un autre Traveler ») vaut ~75% de son prix.
- Arrondis à discrétion, mais **jamais plus de 2 points d'écart** hors primes.

---

## 3. Identités de faction — qui a le droit de faire quoi

La discipline des couleurs. Un effet hors identité = carte refusée, même équilibrée.

### RIKKEN — le collectif amplifié
- ✅ Soin, pioche, buffs d'équipe, Garde, protection, synergies « si vous contrôlez d'autres Travelers », récompenses de Synchro
- ❌ Vol, contrôle d'unités ennemies, sabotage de Synchro, sacrifice de ses propres unités
- Saveur : rigueur, escouades, la Centrale, protocoles officiels

### KAIROS — le moment opportun
- ✅ Sabotage/désactivation de Synchro, contrôle et vol, dégâts ciblés, information (voir la main), sacrifices calculés, effets « si l'ennemi est synchronisé »
- ❌ Soin (hors soi-même), pioche massive, buffs d'équipe larges
- Saveur : infiltration, CELL volés, la fin justifie tout

### Les Époques — la masse silencieuse
- ✅ Stats brutes (prime +1), Garde, Célérité, Dernier souffle simples, effets liés au passé/à la zone aveugle
- ❌ Synchro (JAMAIS — pas de CELL), pioche, manipulation de Synchro, effets complexes
- Saveur : les oubliés de l'Histoire. **Règle de lore : aucune figure historique célèbre** — les zones aveugles sont les moments NON documentés. Des anonymes, des archétypes, jamais de noms connus.

---

## 4. Complexité par rareté

| Rareté | Règle de design | Exemple |
|---|---|---|
| **Standard** | Vanilla, 1 mot-clé, ou 1 effet d'une ligne. Lisible en 2 secondes. | Garde. / À l'arrivée : piochez une carte. |
| **Rare** | 1 effet OU 1 Synchro simple (jamais les deux sauf trivial) | Mariam, Aiko |
| **Épique** | Synchro signature + éventuel mot-clé — la carte a un « moment » | Viktor (Célérité + Nitro) |
| **Légendaire** | Personnage nommé du manga. Effet build-around qui oriente un deck. | Hayashi, Sōma |
| **Prismatique** | Personnage central. Mécanique unique dans le set. | Hugo (copie de Synchro), Kuroda (désactivation) |

**Nommage des CELL** : chaque Traveler rare+ porte un CELL nommé. Réservoir bible disponible : Pyros, Aqua, Tempest, Codex, Magnus. KAIROS utilise des **CELL volés** (« CELL volé · Tempest ») — marqueur de faction. Les standards peuvent porter « CELL d'entraînement » ou un CELL générique de série.

---

## 5. Checklist avant d'accepter une carte

1. Budget respecté (barème §2, écart ≤ 2 pts hors primes) ?
2. Effet dans l'identité de sa faction (§3) ?
3. Complexité conforme à sa rareté (§4) ?
4. Mots-clés uniquement dans le vocabulaire RULES.md §5 ?
5. Exprimable en termes tech/CELL/temporel (pas de magie) ?
6. Texte ≤ 160 caractères, français sobre ?
7. Artwork conforme à la checklist DESIGN.md §7 ?

---

## 6. Les 60 emplacements

✅ = forgée · ⬜ = artwork à générer. Les noms/effets des ⬜ sont des **briefs** — ils se finalisent à la forge, l'artwork peut les faire évoluer.

### RIKKEN (22)

| # | St | Rareté | Type | Coût | Rôle | Concept & brief visuel |
|---|---|---|---|---|---|---|
| R01 | ⬜ | Std | Unité | 1 | early drop | Recrue du cycle — jeune candidat en combinaison pré-CELL noire, salle d'entraînement |
| R02 | ⬜ | Std | Unité | 2 | soigneur early | Technicien de la Centrale — ingénieur en uniforme, conduits d'énergie, accent bleu |
| R03 | ⬜ | Std | Unité | 2 | synchro cheap | Opérationnelle CELL Aqua — suit sombre, conduits bleu-cyan aux avant-bras |
| R04 | ⬜ | Std | Unité | 3 | tempo | Éclaireur temporel (Célérité) — Traveler en mouvement, flou de vitesse contenu |
| R05 | ⬜ | Std | Unité | 3 | mur early | Garde de plateforme (Garde) — sentinelle massive devant une plateforme d'arrivée |
| R06 | ⬜ | Std | Unité | 4 | pioche | Analyste du DRFT — bureau high-tech, écrans de données temporelles |
| R07 | ⬜ | Std | Proto | 2 | soin | Rappel à la Centrale — silhouette dématérialisée en lignes bleues |
| R08 | ⬜ | Std | Proto | 3 | pioche | Briefing de mission — table holographique, dossiers d'époques |
| R09 | ✅ | Rare | Unité | 3 | soigneuse | **Mariam Diallo** — CELL Caduceus |
| R10 | ✅ | Rare | Unité | 2 | valeur/info | **Aiko Sakuraba** — CELL Stratos |
| R11 | ⬜ | Rare | Unité | 4 | porteur Pyros | Porteur CELL Pyros — Synchro : dégâts. Suit sombre, lueurs de combustion contenues |
| R12 | ⬜ | Rare | Unité | 5 | mur milieu | Sénior d'escorte (Garde) — vétéran, plaques épaisses, posture de protection |
| R13 | ✅ | Rare | Proto | 2 | flexibilité | **Transfert d'urgence** |
| R14 | ⬜ | Rare | Proto | 3 | protection | Bouclier de plateforme — dôme d'énergie bleu au-dessus d'une escouade |
| R15 | ⬜ | Épique | Unité | 4 | synergie synchro | Coordinatrice d'escouade — Synchro : synchronise gratuitement un allié ? Salle de contrôle |
| R16 | ✅ | Épique | Unité | 3 | tempo burst | **Viktor Volkov** — CELL Phaeton |
| R17 | ⬜ | Épique | Unité | 6 | finisher collectif | Porteur CELL Magnus — Synchro : buff d'équipe magnétique. Champ de force, débris en lévitation |
| R18 | ⬜ | Épique | Proto | 4 | swing | Allocation d'énergie massive — la Centrale sous Odaiba en pleine surcharge |
| R19 | ⬜ | Lég | Unité | 5 | moteur de pioche | Yuriko Watanabe (jury vétérane) — build-around discipline/protocoles |
| R20 | ✅ | Lég | Unité | 6 | tank AoE | **Genjiro Hayashi** — Proto-CELL |
| R21 | ⬜ | Lég | Unité | 7 | top curve | Liang Chen — CELL Brutus, concentration de masse, finisher physique |
| R22 | ✅ | Prism | Unité | 4 | signature | **Hugo Tachibana** — CELL-T |

### KAIROS (22)

| # | St | Rareté | Type | Coût | Rôle | Concept & brief visuel |
|---|---|---|---|---|---|---|
| K01 | ✅ | Std | Unité | 2 | info early | **Agent infiltré** |
| K02 | ⬜ | Std | Unité | 1 | early agressif | Taupe du recrutement — candidat au regard double, badge RIKKEN, accent rouge |
| K03 | ⬜ | Std | Unité | 2 | trade | Exécutant de nuit — silhouette en suit volé, couloirs de la Centrale |
| K04 | ⬜ | Std | Unité | 3 | punisher | Guetteur du moment (bonus si ennemi synchronisé) — observateur en surplomb |
| K05 | ⬜ | Std | Unité | 3 | agressif | Porteur de CELL volé — suit dépareillé, conduits rouges mal calibrés |
| K06 | ⬜ | Std | Unité | 4 | dégâts ciblés | Nettoyeuse — À l'arrivée : 2 dégâts. Professionnelle froide, arme tech |
| K07 | ⬜ | Std | Unité | 5 | milieu | Cadre corrompu — bureau de verre, Tokyo nocturne, cravate impeccable |
| K08 | ⬜ | Std | Proto | 1 | cantrip info | Chantage — main tendue au-dessus de documents, ombre portée |
| K09 | ⬜ | Std | Proto | 3 | removal | Sabotage de plateforme — plateforme d'arrivée en court-circuit, étincelles rouges |
| K10 | ⬜ | Rare | Unité | 2 | anti-synchro | Brouilleuse — Synchro : désactive un CELL. Émetteurs parasites |
| K11 | ⬜ | Rare | Unité | 3 | tempo | Duelliste au CELL volé · Tempest — arcs électriques contenus, accent rouge |
| K12 | ⬜ | Rare | Unité | 4 | valeur | Recruteur double — À l'arrivée : regarde la main, gagne un bonus si Traveler vu |
| K13 | ⬜ | Rare | Unité | 5 | menace | Colosse de l'aile grise — brute en suit renforcé, couloirs sombres |
| K14 | ⬜ | Rare | Proto | 2 | anti-synchro | Brouillage — onde rouge qui traverse un suit en train de s'activer |
| K15 | ⬜ | Rare | Proto | 4 | removal lourd | Extraction forcée — une silhouette arrachée à la trame temporelle |
| K16 | ⬜ | Épique | Unité | 4 | voleur | Pilleuse d'époques — vole un Dernier souffle ? Zone aveugle profanée |
| K17 | ⬜ | Épique | Unité | 5 | contrôle | Interrogateur du DRFT — Synchro : prend le contrôle 1 tour. Salle blanche, chaise vide |
| K18 | ⬜ | Épique | Unité | 6 | finisher | Porteur CELL volé · Codex — IA embarquée, essaim de drones |
| K19 | ⬜ | Épique | Proto | 5 | swing | Le moment opportun — horloge fracturée, lumière rouge par la fissure |
| K20 | ✅ | Lég | Unité | 7 | vol de masse | **Akira Sōma** — Directeur du DRFT |
| K21 | ⬜ | Lég | Unité | 6 | build-around sacrifice | La Comptable — sacrifie pour puissance ; théâtre d'ombres financier |
| K22 | ✅ | Prism | Unité | 5 | signature | **Renji Kuroda** — CELL Kuroda |

### LES ÉPOQUES (16)

| # | St | Rareté | Type | Coût | Rôle | Concept & brief visuel |
|---|---|---|---|---|---|---|
| E01 | ⬜ | Std | Unité | 1 | early universel | Gamin des ruelles (1889) — Paris chantier de la Tour, regard vif, sépia |
| E02 | ⬜ | Std | Unité | 2 | vanilla+ | Lavandière du fleuve — geste suspendu, brume de rivière, bronze |
| E03 | ✅ | Std | Unité | 3 | beater | **Rōnin de la zone aveugle** |
| E04 | ⬜ | Std | Unité | 3 | mur | Maçon de cathédrale (Garde) — échafaudages médiévaux dans la brume |
| E05 | ⬜ | Std | Unité | 4 | beater | Légionnaire sans stèle — armure romaine usée, colonne perdue dans le brouillard |
| E06 | ⬜ | Std | Unité | 5 | gros vanilla | Baleinier du pack — harpon, glace, vapeur de souffle, monochrome froid |
| E07 | ⬜ | Std | Unité | 6 | très gros | Ours des steppes — bête massive préhistorique, neige, accent bronze |
| E08 | ⬜ | Std | Proto | 2 | trick | Poussière des siècles — main qui s'efface dans un rai de lumière |
| E09 | ⬜ | Std | Proto | 3 | protection | Témoin manquant — chaise vide dans une scène de foule floue |
| E10 | ⬜ | Rare | Unité | 2 | early premium | Messagère aux pieds nus — course dans un souk antique, Célérité |
| E11 | ⬜ | Rare | Unité | 4 | valeur | Griot sans archive — Dernier souffle : effet. Feu de camp, visages captivés |
| E12 | ⬜ | Rare | Unité | 6 | mur lourd | Gardienne du col (Garde) — passe de montagne, lance, tempête |
| E13 | ⬜ | Rare | Proto | 3 | trick signature | Zone aveugle — paysage dont le centre est « non-écrit », vide texturé |
| E14 | ⬜ | Épique | Unité | 5 | menace | Duelliste du pont sans nom — duel au sabre sur un pont effacé des cartes |
| E15 | ⬜ | Épique | Unité | 7 | finisher neutre | Cuirassé du détroit oublié — navire de guerre 1900s dans le brouillard |
| E16 | ⬜ | Lég | Unité | 8 | colosse ultime | L'Archiviste oublié — celui qui a vu toutes les zones aveugles ; bibliothèque impossible |

---

## 7. Production — l'ordre de bataille

1. **Vague 1 — les Standards (16 ⬜)** : R01-R08, K02-K09, E01-E02, E04-E09. Le squelette des decks, les plus simples à générer et équilibrer.
2. **Vague 2 — les Rares (11 ⬜)** : la texture des decks.
3. **Vague 3 — Épiques + Légendaires (10 ⬜)** : les moments signature, artworks les plus soignés.
4. **Équilibrage** : 5 duels simulés sur table (proxy papier ou théorie), ajustements, puis gel du set.

**Workflow par vague** : tu génères les artworks (briefs ci-dessus + prompt de base DESIGN.md §6, accent = couleur de faction) → `drop/` → `npm run forge` → Claude écrit noms/effets/lore selon §2-§4 → curation ensemble.

---

## 8. Gel du set

Une carte forgée + validée = figée. Après la fin de la Vague 3 et l'équilibrage, le set est **gelé** : plus aucun changement de texte/stats (les corrections passent par errata documenté). Le gel déclenche la Phase 2 (gacha — les boosters tirent dans ce set).
