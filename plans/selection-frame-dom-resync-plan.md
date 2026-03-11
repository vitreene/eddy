# Plan d'action — Selection frame DOM resync

## Objectif

Unifier la vue edit et le cadre de selection: le cadre doit suivre l'etat DOM effectivement affiche quand la selection custom applique un patch de position.

## Etapes

- [x] Identifier les deux circuits (`state edit` vs `mesure overlay`) et la zone de desynchronisation.
- [x] Ajouter une resynchronisation DOM explicite pour le transform editor sur mutations live (`class/style`).
- [x] Verifier la non-regression des tests transform/editor.

## Resultats

- Cause racine: le node DOM etait force sur l'etat edit (patch area), mais le cadre utilisait encore une mesure `t/basePosition` stale.
- Correctif: nouvel event machine `dom.resync` + action `resyncFromDom` dans `transform-editor.machine.ts`.
- Trigger: `MutationObserver` sur `class/style` dans `visual-transform-grid.tsx` pour re-mesurer immediatement le cadre.
- Verification executee: `npx tsx tests/transform-editor-smoke.ts`, `npx tsx tests/item-edit-live-smoke.ts`, `npx tsx tests/custom-event-preflip-selection-smoke.ts`.
