# Plan d'action — Lock contrats cue/decor

## Objectif

Verrouiller les calculs de selection d'event (cue) et de decor resolu (etat visible) pour eviter les derives lors de futures modifications.

## Etapes

- [x] Ajouter des tests de contrat sur les ancres intro/custom/outro (explicite + implicite).
- [x] Ajouter des tests de contrat sur la resolution decor a l'action selectionnee.
- [x] Documenter les invariants critiques directement dans les fonctions centrales.
- [x] Executer les tests cibles.

## Resultats

- Tests de verrouillage ajoutes:
  - `tests/selection-contract-lock-smoke.ts` (ancres intro/custom/outro + decor resolu)
  - `tests/item-edit-decor-resolution-smoke.ts` (regles decor par action)
  - `tests/event-selection-auto-fallback-smoke.ts` (fallback explicite/implicite)
- Invariants documentes dans:
  - `app/provider/event-selection-cue.ts`
  - `app/parts/item-edit/item-edit.helpers.ts`
- Correctif de coherence outro explicite: ancre = `cue.end - duration` (et non `cue.end`).
- Verification executee: `tests/selection-contract-lock-smoke.ts`, `tests/item-edit-decor-resolution-smoke.ts`, `tests/event-selection-auto-fallback-smoke.ts`, `tests/event-selection-scene1-smoke.ts`, `tests/item-edit-live-smoke.ts`.
