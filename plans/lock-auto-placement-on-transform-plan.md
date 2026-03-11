# Plan d'action — Lock auto placement on transform

## Objectif

Quand un transform est applique a un item en placement auto, fixer immediatement sa position virtuelle pour eviter les deplacements imprevisibles lors des insertions/suppressions d'items.

## Etapes

- [x] Introduire une logique dediee de lock placement (sans heuristiques dispersees).
- [x] L'appliquer au commit transform pour decor item/custom actif.
- [x] Ajouter une non-regression smoke sur les patches de lock (grille + liste).
- [x] Executer les tests cibles.

## Resultats

- Nouvelle logique centralisee: `app/parts/item-edit/item-edit.auto-placement.ts`.
- Au commit transform, si l'item est en auto-placement:
  - grille/rangee/grille-like: on fixe `decor.area` sur `cell-rX-cY` issu de la position virtuelle courante.
  - liste: on fixe le token `liste-rN` dans `decor.className`.
- Le lock est applique sur le decor actif (base ou custom event) et persiste via `item-update`.
- Non-regression ajoutee: `tests/auto-placement-lock-smoke.ts`.
- Verification executee: `npx tsx tests/auto-placement-lock-smoke.ts`, `npx tsx tests/item-edit-live-smoke.ts`, `npx tsx tests/custom-events-smoke.ts`, `npx tsx tests/event-selection-scene1-smoke.ts`.
