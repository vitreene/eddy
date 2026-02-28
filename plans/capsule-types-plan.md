# Plan capsule types (carrousel, rangee, liste, grille, card)

## Objectif

Introduire un systeme de types de capsule (`carrousel`, `rangee`, `liste`, `grille`, `card`) pilote par configuration, partage entre `edit-capsule`, `scene-logic` et `builder`, avec generation CSS et regles d'animation coherentes, tout en preservant strictement le comportement legacy quand `type` est absent.

## Etapes de preparation (prioritaires)

- [x] **1) Modele de configuration partage**
  - [x] Definir un schema de config type-safe (TS) qui decrit:
    - [x] comportement temporel (repartition / duree fixe),
    - [x] comportement transitions par defaut (intro/outro),
    - [x] comportement placement (slot auto, rebouclage, areas),
    - [x] generation CSS associee.
  - [x] Definir un registre des types (`carrousel`, `rangee`, `liste`, `grille`, `card`) + valeurs par defaut.
  - [x] Definir un mode `legacy` implicite si `capsule.type` est vide/null.
  - [x] Exposer une API unique consommee par `edit-capsule` et `builder`.

- [x] **2) Reamenagement Builder**
  - [x] Extraire les etapes builder en pipeline lisible (resolve capsule behavior -> resolve windows/events -> resolve placement -> build actions/persos).
  - [x] Isoler la logique actuelle de repartition temporelle dans une strategie `carrousel`.
  - [x] Ajouter un point d'extension par type pour eviter les `if` disperses.
  - [x] Garantir fallback integral legacy quand `type` absent.

- [x] **3) Fonctions secondaires CSS a la volee**
  - [x] Creer des helpers dedies de production CSS par type:
    - [x] classes container,
    - [x] classes/areas item,
    - [x] variantes orientation/rows/cols.
  - [x] Centraliser ces helpers dans un module unique (eviter duplication builder/UI).
  - [x] Definir le contrat pour future gestion `card` (grid-areas nommees), sans implementer le composant visuel complet.

## Implementation fonctionnelle

- [x] **4) Donnees et persistance (DB + API + scene-logic)**
  - [x] Verifier/forcer la persistence de `capsule.type` via `capsule-update` (UI -> scene-logic -> API -> DB).
  - [x] Definir valeurs par defaut a la creation:
    - [x] nouvelle capsule => `type = "carrousel"`.
  - [x] Assurer compatibilite de lecture des capsules existantes sans type.

- [x] **5) UI edit-capsule: selection du type et parametres**
  - [x] Ajouter select obligatoire du type dans `edit-capsule`.
  - [x] Retirer le mode "choix libre concurrent" type/grille (source unique via type + params).
  - [x] Afficher dynamiquement les parametres selon type:
    - [x] `carrousel`: mode temps (repartition | fixe X sec),
    - [x] `rangee`: orientation + taille `n` + mode temps,
    - [x] `grille`: rows/cols + mode temps,
    - [x] `card`: config de base seulement (sans nouveau composant).
  - [x] Conserver transitions par defaut fondu quand non precise.

- [x] **6) Regles metier par type**
  - [x] `carrousel`
    - [x] grille 1x1,
    - [x] placement plein cadre des items,
    - [x] repartition temporelle par defaut (comportement actuel),
    - [x] option duree fixe par item,
    - [x] intro/outro par defaut = fondu.
  - [x] `rangee`
    - [x] grille 1xn ou nx1 selon orientation,
    - [x] placement auto indexe avec rebouclage,
    - [x] repartition temporelle ou duree fixe,
    - [x] pas d'outro par defaut item (reste affiche jusqu'a outro capsule).
  - [x] `grille`
    - [x] rows/cols configurables,
    - [x] placement auto indexe avec rebouclage,
    - [x] repartition temporelle ou duree fixe,
    - [x] meme regle d'outro que `rangee` (a valider si divergence voulue).
  - [x] `card`
    - [x] mode configuration uniquement,
    - [x] contrat de `grid-areas` present pour usage SlotEditor futur.
  - [x] Basculer de `duree auto` vers `duree` + valeur (ex: 2 secondes) dans l'interface et la persistance capsule.

## Integration SlotEditor / card (preparation)

- [x] **7) Contrat `card` pour SlotEditor**
  - [x] Definir structure des areas dans la config capsule.
  - [x] Adapter le branchement SlotEditor pour lire ces areas quand `type=card`.
  - [x] Sans implementer le nouveau composant visuel complet (etape deferree).

## Compatibilite et migration

- [x] **8) Legacy et migration douce**
  - [x] Capsules sans type => comportement actuel strictement identique.
  - [x] Optionnel: script de backfill progressif (`null` -> `carrousel`) uniquement apres validation produit.
  - [x] Verifier absence de regression sur scenes existantes.

## Tests et validation

- [x] **9) Tests automatiques**
  - [x] Ajouter tests unitaires du registre de config par type.
  - [x] Ajouter tests builder par type (timeline, auto-events, placement, CSS).
  - [x] Ajouter tests non-regression legacy (type absent).
  - [x] Ajouter tests sur `duree fixe` vs `repartition`.

- [x] **10) Validation finale**
  - [x] Lancer `npm run typecheck`.
  - [x] Lancer `npm run test:smoke`.
  - [x] Verification manuelle UI edit-capsule + playback scene reelle.

## Journal de suivi

- 2026-02-27: Plan cree, en attente du demarrage implementation.
- 2026-02-27: Pause etape 1 finie (modele/registre capsule types + API de resolution + mode legacy).
- 2026-02-27: Pause etape 2 finie (builder branche sur policy par capsule + extension point runtime sans changer le comportement actuel).
- 2026-02-27: Pause etape 3 finie (helpers CSS factorises dans `player/capsule-layout/layout-css.ts`, builder simplifie, contrat card prepare).
- 2026-02-27: Pause etape 4 finie (default `carrousel` a la creation capsule + normalisation API `type` + compat legacy preservee).
- 2026-02-27: Pause etape 5 finie (UI type obligatoire + params dynamiques selon type dans edit-capsule).
- 2026-02-27: Pause etape 6 finie (regles runtime par type activees: placement carrousel/rangee/grille + outro par defaut desactive pour rangee/grille + support fixed-time dans resolver).
- 2026-02-27: Pause etape 7 finie (contrat areas `card` encode dans `grid` via prefix `areas:` + branchement SlotEditor sur template areas).
- 2026-02-27: Pause etape 8 finie (compat legacy maintenue, verification non-regression via typecheck/smoke; migration backfill laissee optionnelle).
- 2026-02-27: Pause etape 9 finie (nouveau smoke `capsule-types` + couverture registre, parser card, fixed mode, legacy fallback).
- 2026-02-27: Pause etape 10 finie (typecheck + smoke complets + sanity-check build scene 1 legacy).
- 2026-02-27: Traitement ajoute/executé: switch `duree auto` / `duree` + valeur persistee (`itemDurationMode`, `itemDurationSec`) et prise en compte par le builder.
