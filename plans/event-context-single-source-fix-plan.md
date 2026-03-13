# Plan d'action — Source unique decor par event

## Objectif

Supprimer les circuits concurrents pour l'edition d'events (notamment outro) et imposer une source unique: le decor de l'event actif.

## Etapes

- [x] Aligner la persistance decor sur l'event actif (intro/outro/custom), pas seulement custom.
- [x] Aligner le builder pour consommer `event.decorId` aussi sur intro/outro.
- [x] Stabiliser l'arbitrage seek editeur vs rewind (eviter le re-seek parasite).
- [x] Verifier build + smokes ciblant custom/outro.

## Review

- Resultat:
- Verification executee:

- Resultat:
  - Circuit unifie: edition en contexte event cible le decor de l'event actif (intro/outro/custom), sans fallback implicite vers decor item pendant la persistance.
  - Builder aligne: intro/outro peuvent appliquer les deltas de decor (classe/placement/move auto), comme les custom-events.
  - Rewind stabilise: le reseek automatique editeur ne reprend plus la main quand un seek vers 0 est en cours.
  - Creation decor event reste paresseuse: aucun decor cree a la simple selection; creation uniquement a la premiere modification.
  - Regle auto-event appliquee: en contexte premier event (intro, ou premier custom si intro absent), la cible d'edition/persistance reste le decor item; pas de creation decor event dedie.
- Verification executee:
  - `npm run build` (OK)
  - `npx tsx tests/custom-event-auto-smoke.ts` (OK)
  - `npx tsx tests/custom-event-selection-cue-smoke.ts` (OK)
