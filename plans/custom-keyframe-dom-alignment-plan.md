# Plan d'action — Alignement keyframe custom vs DOM

## Objectif

Garantir qu'au keyframe d'un custom-event, l'etat affiche dans item-edit correspond immediatement a l'etat DOM rendu.

## Etapes

- [x] Diagnostiquer l'ecart entre etat edite (decor.area) et etat DOM live.
- [x] Corriger l'application live des classes area pour supprimer les classes auto conflictuelles.
- [x] Ajouter une non-regression smoke sur la suppression des classes auto en patch area explicite.
- [x] Executer les tests cibles.

## Resultats

- Cause racine: au patch area live, la classe explicite `cell-rX-cY` et la classe auto-layout `cell_layout_auto_*` coexistaient; selon l'ordre CSS, l'auto pouvait rester dominante -> decalage percu.
- Correctif: `applyAreaClassPatch(...)` retire explicitement les tokens auto/list/area existants avant d'appliquer la nouvelle area explicite.
- Integration: `app/parts/item-edit/index.tsx` utilise maintenant `applyAreaClassPatch(...)` sur tous les changements de `area` live (edition + cell-snap).
- Non-regression: `tests/item-edit-live-smoke.ts` verifie la suppression des classes auto.
- Verification executee: `npx tsx tests/item-edit-live-smoke.ts`, `npx tsx tests/auto-placement-lock-smoke.ts`, `npx tsx tests/event-selection-scene1-smoke.ts`.
