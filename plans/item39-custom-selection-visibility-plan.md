# Plan d'action — Item 39 custom "vu" selection

## Objectif

Corriger la selection du premier custom-event ("vu") pour activer correctement le cadre de selection et afficher l'etat attendu, meme si son cue brut tombe avant la fenetre de visibilite de l'item.

## Etapes

- [x] Verifier les donnees runtime de `scene 1 / item 39` (events + decors + cues).
- [x] Identifier la cause (cue custom resolu avant la fenetre visible, seek sur un instant non visible).
- [x] Ajuster la resolution du cue de selection custom pour respecter la fenetre de visibilite.
- [x] Ajouter une non-regression smoke dediee.
- [x] Executer les tests cibles.

## Resultats

- Cause racine: pour un custom-event situe temporellement avant `window.startSec`, `active-set` demandait un seek sur un instant ou l'item n'etait pas encore visible.
- Correctif: `computeCueForSelectedCustomEvent(...)` clamp maintenant le cue sur `getNodeVisibilityWindow(...).startSec`.
- Impact: la selection d'un custom-event precoce active le cadre et permet de visualiser/editer un etat coherent.
- Non-regression: `tests/custom-event-selection-cue-smoke.ts`.
- Verification executee: `npx tsx tests/custom-event-selection-cue-smoke.ts`, `npx tsx tests/keyframe-coherence-smoke.ts`, `npx tsx tests/custom-event-auto-smoke.ts`.
