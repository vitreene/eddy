# Plan — Fix max update depth on custom-event position change

## Signal

- Repro corrigee utilisateur: scene 3, item 95, en selectionnant une nouvelle position sur un custom-event.
- Symptome: `Maximum update depth exceeded` (boucle de mises a jour React).

## Hypothese

- Boucle de feedback `seek + sequenceTouched + progress updates`:
  - seek actif,
  - edition active (`sequenceTouched=true`),
  - updates de progression qui redemandent des flushs sequence inutilement,
  - rebuilds chaines cote app layout/player.

## Etapes

- [x] Isoler le point de feedback dans `applyActivePayload`.
- [x] Restreindre le flush sequence-action aux payloads qui portent un trigger telco significatif (`action/cue/event/itemId`) et ignorer `progress` seul.
- [x] Ajouter un test de non-regression sur le token de flush.
- [x] Verifier typecheck + smokes.

## Review

- Fix applique dans `app/provider/scene-logic.ts`.
- Test ajoute dans `tests/custom-events-smoke.ts`.
