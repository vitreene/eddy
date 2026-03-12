## Objectif

Deplacer la gestion des actions de transformation depuis `item-edit/index.tsx` vers `edit-transform.tsx` pour clarifier les responsabilites:

- conserver dans le composant principal seulement le strict necessaire pour l'update persistant,
- encapsuler la logique UI/interaction de transform dans une couche de gestion locale a `EditTransform`.

## Plan d'action

- [x] Introduire une interface de callbacks minimale entre `ItemEdit` et `EditTransform` (update style/decor/tree), sans logique metier de gesture dans `ItemEdit`.
- [x] Deplacer `onTransformCommit`, `onResetTransform`, `onTransformModeChange` dans `app/parts/item-edit/edit-transform.tsx`.
- [x] Extraire les helpers necessaires dans un module dedie (ex: `item-edit.transform-controller.ts`) pour eviter un composant trop long.
- [x] Garder dans `item-edit/index.tsx` uniquement:
  - resolution du `targetDecor`/contexte actif,
  - methode(s) d'update persistante(s) minimales,
  - branchement du composant `EditTransform`.
- [x] Verifier le comportement identique des modes `transform` et `position` (move, snap cellule, resize span, reset).
- [x] Valider via `npm run typecheck`.

## Verification cible

- `npm run typecheck`
- smoke rapide manuel:
  - mode par defaut `position`,
  - mode `transform` actif sur demande,
  - pas de regressions sur commit decor/style.

## Review

- `onTransformCommit`, `onResetTransform`, `onTransformModeChange` ont ete retires de `app/parts/item-edit/index.tsx`.
- Nouvelle couche de gestion dediee: `app/parts/item-edit/item-edit.transform-controller.ts`.
- `EditTransform` orchestre maintenant la logique de mode et de commit via ce controller.
- `ItemEdit` conserve les updates persistants minimaux (`onStyleChange`, `onDecorUpdate`, `onTreeMove`) et le wiring.
- Verification executee: `npm run typecheck` OK.
