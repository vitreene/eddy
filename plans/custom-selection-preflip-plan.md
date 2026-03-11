# Plan d'action — Selection custom pre-FLIP

## Objectif

Quand un custom-event est selectionne, seeker juste avant le keyframe pour afficher l'etat pre-FLIP (et non la premiere frame de transition FLIP).

## Etapes

- [x] Centraliser une regle `pre-flip` pour les ancres custom dans la resolution de cue de selection.
- [x] Garder intro/outro inchanges.
- [x] Ajouter une non-regression smoke dediee.
- [x] Executer les tests cibles.

## Resultats

- Regle `pre-flip` centralisee dans `app/provider/event-selection-cue.ts`.
- Les ancres de selection custom sont decalees de `1ms` avant keyframe (`CUSTOM_SELECTION_PRE_FLIP_SEC = 0.001`).
- Intro/outro restent keyframe-based (pas de decalage pre-flip).
- Non-regression ajoutee: `tests/custom-event-preflip-selection-smoke.ts`.
- Verification executee: `npx tsx tests/custom-event-preflip-selection-smoke.ts`, `npx tsx tests/custom-event-selection-cue-smoke.ts`, `npx tsx tests/event-selection-scene1-smoke.ts`, `npx tsx tests/item-edit-live-smoke.ts`.
