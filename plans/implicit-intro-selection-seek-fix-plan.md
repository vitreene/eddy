# Plan - intro selection seek/cue alignment

## Objectif

Corriger la selection `intro` quand l'event est implicite (ou explicite sans cue):

- le seek doit se repositionner immediatement,
- le cue de selection doit correspondre a l'ancre intro effective (pas un fallback stale),
- l'element doit etre visible au moment de la selection.

## Plan

- [x] Reproduire en smoke la selection `intro` implicite qui ne force pas `action: seek`.
- [x] Corriger `active-set` pour forcer le seek aussi pour les events implicites.
- [x] Aligner le calcul de cue de selection intro/outro avec un event effectif resolu (meme si event explicite sans `name`).
- [x] Mettre a jour/ajouter les smokes de contrat affectes.
- [x] Verifier avec `npm run typecheck`.

## Review

- Cause racine: `active-set` ne passait en `action: seek` que si l'event etait explicite dans `context.events[itemId]`; les selections intro implicites restaient sur l'action precedente (`play`) et le seek ne bougeait pas.
- Cause secondaire: pour intro/outro, un event avec `name` auto-fallback non present dans les cues etait considere "valide"; l'ancre devenait `null` puis retombait sur `window.startSec`.
- Correction: le seek est force selon `deriveEventKind(nextEvent)` meme sans event explicite, et la resolution de cue intro/outro valide desormais que le `name` pointe vers un cue reel (sinon fallback vers le cue le plus proche).
- Verification executee: `tests/implicit-intro-selection-seek-smoke.ts`, `tests/event-selection-auto-fallback-smoke.ts`, `tests/selection-contract-lock-smoke.ts`, `tests/event-selection-scene1-smoke.ts`, `tests/custom-event-preflip-selection-smoke.ts`, `tests/intro-keyframe-runtime-offset-smoke.ts`, `npm run typecheck` (OK).
