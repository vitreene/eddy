# Plan d'action — Custom event: nearest seek cue

## Objectif

Quand on cree un custom-event, l'ancrage doit se faire sur le time-event le plus proche du seek courant, sans sortir de la fenetre intro->outro de l'item.

## Etapes

- [x] Revoir la selection de cue point pour exclure les points hors bornes intro/outro.
- [x] Conserver un fallback robuste si aucune cible in-bounds n'existe.
- [x] Ajouter une non-regression smoke sur le cas seek proche intro.
- [x] Executer les tests cibles.

## Review

- [x] Le custom cree ne se fixe plus sur un cue avant intro.
- [x] Le comportement reste "nearest" autour du seek.

## Resultats

- Le seed custom-event est maintenant resolu directement autour du seek (`resolveNearestCuePointFromSeek(...)`), avec priorite in-bounds intro/outro.
- Si aucun cue point n'est disponible, fallback persistant: `delay = 0` (garantit un payload custom persistable).
- Le mapping `resolveClosestCuePointFromDelay(...)` reste borne intro/outro pour coherence des conversions delay<->cue.
- Non-regressions ajoutees dans `tests/custom-events-smoke.ts`:
  - nearest in-bounds autour du seek
  - custom create sceneLogic ancre sur le seek
  - custom create sans cues reste persistable (`shouldPersistEventPayload === true`)
- Verification executee: `npx tsx tests/custom-events-smoke.ts`, `npx tsx tests/content-api-smoke.ts`, `npx tsx tests/event-selection-scene1-smoke.ts`, `npx tsx tests/intro-keyframe-runtime-offset-smoke.ts`.
