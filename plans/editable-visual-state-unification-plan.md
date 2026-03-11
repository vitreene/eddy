# Plan d'action — EditableVisualState unification

## Objectif

Unifier edit, cadre de selection et projection DOM autour d'un etat derive unique, avec l'edit comme source de verite.

## Etapes

- [x] Introduire une interface `EditableVisualState` et son constructeur.
- [x] Introduire un projecteur DOM unique `projectEditableVisualStateToNode(...)`.
- [x] Brancher `EditItem` et `EditTransform` sur cet etat unique (transform + sync key).
- [x] Retirer la resync mutation-DOM comme circuit principal du cadre.
- [x] Ajouter une non-regression smoke dediee et executer les tests cibles.

## Resultats

- Nouveau module: `app/parts/item-edit/editable-visual-state.ts`.
- `EditItem` construit un etat unique et projette cet etat sur le DOM en mode custom selection.
- `EditTransform` utilise `editorSyncKey` derive du meme etat pour resynchroniser le cadre depuis le modele.
- Le circuit `MutationObserver -> dom.resync` n'est plus utilise comme mecanisme nominal.
- Non-regression ajoutee: `tests/editable-visual-state-smoke.ts`.
- Verification executee: `tests/editable-visual-state-smoke.ts`, `tests/item-edit-live-smoke.ts`, `tests/transform-editor-smoke.ts`, `tests/custom-event-preflip-selection-smoke.ts`, `tests/event-selection-scene1-smoke.ts`, `tests/custom-events-smoke.ts`.
