# Plan — Fix 500 on custom-event name collision

## Contexte

- Repro utilisateur: creer/placer un custom-event sur la position d'un autre event declenche `POST /api/content/:id` en 500.
- Cause DB: contrainte unique `@@unique([itemId, name])` sur `Event`.

## Cause racine

- Un custom-event pouvait persister avec `name` identique a un event existant du meme item (intro/outro/custom).
- Le payload passait en `eventTouched` puis persistence tombait en erreur SQL (name duplique).

## Fix

- [x] Ajouter une normalisation centrale `resolveCustomEventNameCollision` dans `scene-logic.helpers`.
- [x] Appliquer ce garde-fou dans `custom-event-create` et `custom-event-update`.
- [x] En cas de collision de `name`, auto-suffixer le nom (`<name>-2`, `<name>-3`, ...) pour conserver un event nomme et respecter la contrainte DB.
- [x] Ajouter test de non-regression dans `tests/custom-events-smoke.ts`.
- [x] Verifier typecheck + smokes.
- [x] Durcir la route `/api/content/:id` avec reponse JSON explicite en cas d'echec de persistence event.

## Review

- Plus de persistence custom-event avec `name` duplique sur un item.
- Le suffixage automatique preserve le positionnement nomme sans erreur 500.
- En cas d'anomalie restante, la route API remonte maintenant un message exploitable (au lieu d'un 500 silencieux).
