# Plan d'enquete — generation de classes CSS

## Objectif

Cartographier les fonctions qui generent des classes dans le projet, avec:

- nombre de fonctions,
- localisation,
- parametres,
- resultat attendu,
- exemples concrets de sortie.

## Etapes

- [x] Scanner le code pour toutes les fonctions de generation/normalisation de classes (`class`, `className`, prefixes, hash/static style, grid, areas, animation refs).
- [x] Identifier les usages principaux (builder runtime, editeurs, utilitaires de config).
- [x] Extraire la signature (parametres) et le format de sortie de chaque fonction.
- [x] Construire une synthese dedupee (fonctions uniques) avec exemples d'entree/sortie.
- [x] Proposer un point de centralisation prioritaire pour la suite (sans coder).

## Review

- Resultat:
  - 52 fonctions recensees (generation, normalisation, composition, diff/apply de classes), dedupees par implementation.
  - Repartition: config-prefix (2), grid/layout (14), static-hash/dynamic assembly (9), merge-diff-apply (16), helpers placement editor (6), builder renderables (3), helpers visuels event/timeline (2).
  - Noyau de centralisation prioritaire identifie: `app/player/builder/styles.ts` + `app/lib/utils.ts` + `app/parts/item-edit/live-node-classes.ts` + `app/config/class-prefix.ts`.
  - Points de duplication cles: `buildClassNameDiff` (builder + item-edit) et `parseGridPlacementFromClassTokens` (2 services position-editor).
- Verification executee:
  - Audit statique multi-fichiers avec cartographie des call sites.
  - Verification dedupe alias/re-export (aucun alias/re-export detecte pour ces fonctions).
