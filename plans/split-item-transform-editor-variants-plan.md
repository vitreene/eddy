## Objectif

Scinder `ItemTransformEditor` en deux composants distincts, un pour `transform` et un pour `position`, en eliminant au maximum les branches conditionnelles liees au variant dans les composants eux-memes.

## Plan d'action

- [x] Cartographier les responsabilites actuelles de `ItemTransformEditor` + machine/service et identifier ce qui est strictement commun vs specifique.
- [x] Introduire un shell commun leger (wiring machine/service + frame) reutilisable par les deux variants, sans logique UI conditionnelle.
- [x] Creer `ItemTransformEditorTransform` (handles UI/drag modes transform only).
- [x] Creer `ItemTransformEditorPosition` (handles UI/drag modes position only).
- [x] Adapter `EditTransform` pour choisir le composant variant, au lieu de passer `overlayVariant` dans un composant unique.
- [x] Supprimer les branches `overlayVariant === ...` dans l’overlay existant et repartir les callbacks/modes dans chaque composant.
- [x] Conserver les fonctions communes (frame math, service, machine hooks) dans des helpers/shared files.
- [x] Verifier la compatibilite fonctionnelle: move/rotate/origin/resize transform d’un cote, cell-snap + resize-grid-se + losange centre de l’autre.
- [x] Lancer `npm run typecheck` et corriger les regressions.

## Verification cible

- `npm run typecheck`
- smoke manuel:
  - mode `transform`: comportement identique (move/rotate/resize/origin)
  - mode `position`: comportement identique (cell-snap/resize-span)
  - pas de regressions de rendu du cadre de selection.

## Review

- Split effectif en deux composants publics: `ItemTransformEditorTransform` et `ItemTransformEditorPosition` dans `app/components/position-editor/visual-transform-grid.tsx`.
- Les parties communes (machine/service lifecycle + frame + portal) sont mutualisees via `useTransformEditorRuntime` et `OverlayPortal`.
- Le critere de variant n'est plus utilise dans l'overlay via branches `overlayVariant`; chaque composant a sa propre UI et ses propres drag modes.
- `EditTransform` choisit explicitement le composant variant (`position` vs `transform`) dans `app/parts/item-edit/edit-transform.tsx`.
- Le circuit `position` est maintenant autonome avec sa propre machine et son propre service:
  - `app/components/position-editor/position-editor.machine.ts`
  - `app/components/position-editor/position-editor.service.ts`
- Le circuit `transform` reste sur sa machine/service dedies (`transform-editor.machine.ts` / `transform-editor.service.ts`).
- Le composant `position` n'exploite plus les donnees de transform comme source de verite (pas de reconstruction style pour la grille), et produit des sorties centrees sur `cell`/`gridPlacement`.
- Verification executee: `npm run typecheck` OK.
