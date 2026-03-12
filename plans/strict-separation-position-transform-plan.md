## Objectif

Assurer une separation stricte: le composant/circuit `position` ne construit jamais de donnees `transform`/`width`/`height` (ni en payload ni en types d'entree/sortie). Ces donnees restent exclusives au circuit `transform`.

## Plan d'action

- [x] Introduire des interfaces de commit distinctes:
  - `transform`: commit avec `ElementTransform` + meta transform,
  - `position`: commit sans `ElementTransform`, meta position uniquement (`cell`/`gridPlacement`/`reorderIndex`).
- [x] Refactor `visual-transform-grid.tsx` pour que `ItemTransformEditorPosition` n'utilise plus aucune valeur/placeholder `ElementTransform` (suppression du `{ } as ElementTransform`).
- [x] Refactor `EditTransform` pour brancher deux callbacks distincts (`onTransformCommit` / `onPositionCommit`) vers le controller.
- [x] Refactor `item-edit.transform-controller.ts` en deux circuits explicites:
  - logique transform,
  - logique position (sans construction de candidate transform).
- [x] Verifier `position-editor.machine.ts` et `position-editor.service.ts` pour enlever tout champ meta inutilement herite du transform (ex. `translateX/Y`).
- [x] Nettoyer les types partages pour eviter les unions ambiguës qui reintroduisent des champs transform en mode position.
- [x] Verifier `npm run typecheck` + smokes editeur.

## Verification cible

- `npm run typecheck`
- `npx tsx tests/transform-editor-smoke.ts`
- `npx tsx tests/transform-overlay-alignment-smoke.ts`
- Controle manuel: en mode `position`, aucun payload/style/inline transform-size n'est construit par ce circuit.

## Review

- Circuit `position` sans `ElementTransform` en entree/sortie:
  - `ItemTransformEditorPosition` recoit `onCommit(mode, meta)` dans `app/components/position-editor/visual-transform-grid.tsx`.
  - `PositionDragCommitMeta` ne contient plus `translateX/Y` dans `app/components/position-editor/position-editor.service.ts`.
- Circuit `transform` conserve `ElementTransform` + meta dediee.
- `EditTransform` branche maintenant:
  - `onPositionCommit` pour le variant position,
  - `onTransformCommit` pour le variant transform.
- `item-edit.transform-controller.ts` scinde la logique en deux fonctions distinctes (`onTransformCommit` / `onPositionCommit`), sans construction de candidate transform dans la branche position.
- Verification executee:
  - `npm run typecheck` OK,
  - `npx tsx tests/transform-editor-smoke.ts` OK,
  - `npx tsx tests/transform-overlay-alignment-smoke.ts` OK.
