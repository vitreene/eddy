# Plan d'analyse — CSSClassGenerator et impact BDD

## Objectif

Analyser comment la construction de `CSSClassGenerator` impacte (ou non) le stockage BDD, en comparant strictement avec l'etat actuel.

## Etapes

- [x] Cartographier le schema BDD actuel pour les donnees de classe/style/layout.
- [x] Identifier quelles donnees sont persistantes vs derivees au runtime.
- [x] Evaluer ce que `CSSClassGenerator` change dans la chaine de generation CSS.
- [x] Proposer le contrat de donnees a persister (minimal + variables metier supplementaires) sans stocker les classes generees.
- [x] Lister les deltas de migration (BDD/API) et les invariants conserves.

## Review

- Resultat:
  - Etat actuel: `decor.className` + `decor.area` + `decor.style(JSON)` portent les infos layout/style persistantes; les definitions CSS sont derivees au runtime (utils/builder) et certaines chaines CSS peuvent etre stockees dans `theme.generated`.
  - Le futur `CSSClassGenerator` peut rester derive-only pour les classes/definitions: on persiste les variables metier, pas les classes calculees.
  - Decision de conception retenue: les variables de position liees aux classes generees sont stockees dans `decor.style.itemPosition` (pas de nouveau champ BDD).
  - Delta code requis: etendre `MANAGED_ITEM_STYLE_KEYS`/normalisation pour conserver `itemPosition` lors des ecritures (`stripDefaultStyleValues` ne doit pas la supprimer).
  - Invariant cle: conserver `decor.className`/`decor.area` en lecture/retrocompat tant que migration progressive.
  - Point sensible: `stripDefaultStyleValues` filtre les cles hors `MANAGED_ITEM_STYLE_KEYS`; sans adaptation, `itemPosition` ne survivra pas au persist.
- Verification executee:
  - Lecture schema Prisma (`prisma/schema.prisma`).
  - Lecture persistance/flatten (`app/api/db.ts`, `app/api/decor.ts`, `app/api/capsule.ts`).
  - Lecture generation CSS runtime (`app/lib/utils.ts`, `app/player/builder/styles.ts`, `app/scene-runtime/capsule-layout/layout-css.ts`).
