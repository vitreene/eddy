## Objectif

Supprimer le choix manuel `position` / `transform` dans `edit-item` et appliquer une selection automatique selon le contexte:

- parent capsule de type `position` ("scene") => outil `Position`
- sinon => outil `Transform`

## Plan d'action

- [x] Retirer les radios `position`/`transform` de `EditTransform`.
- [x] Calculer le mode effectif a partir du type de capsule parent (source de verite unique).
- [x] Brancher le rendu conditionnel des deux editeurs sur ce mode contextuel uniquement.
- [x] Supprimer les callbacks/etats lies au mode manuel devenus inutiles.
- [x] Verifier qu'en capsule `position` on conserve le pipeline `onPositionCommit`, et ailleurs `onTransformCommit`.
- [x] Verifier typecheck.

## Verification cible

- `npm run typecheck`
- verification manuelle:
  - item dans capsule `position`: outil Position visible (sans radio),
  - item dans capsule non-position: outil Transform visible (sans radio),
  - aucun conflit entre les deux circuits.

## Review

- Radios `Transform/Position` retirees de `app/parts/item-edit/edit-transform.tsx`.
- Le mode est desormais derive du contexte uniquement:
  - `resolveCapsuleType(parentCapsuleType) === CAPSULE_TYPES.POSITION` => `position`
  - sinon => `transform`
- Le rendu conditionnel des composants reste separe:
  - `ItemTransformEditorPosition` pour capsule `position`
  - `ItemTransformEditorTransform` sinon.
- Le bouton `Reset transform` reste disponible seulement en mode `transform`.
- Verification executee: `npm run typecheck` OK.
