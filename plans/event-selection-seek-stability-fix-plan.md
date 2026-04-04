# Plan — Stabilite seek sur selection event

## Contexte

La selection d'un event declenche un seek, mais plusieurs recalculs peuvent invalider l'effet final (seek non aligne au bon cue).

## Hypothese retenue

- Lors d'un flush/rebuild, `PlayerRunner` renvoie `selection.item.requested` sur le meme item.
- La machine recalculait alors `cue` via `computeActiveCue` meme sans changement d'item, ecrasant le cue d'event precedemment selectionne.

## Etapes

- [x] Diagnostiquer le flux selection event -> seek -> rebuild/flush.
- [x] Corriger la machine pour preserver `cue` sur reselection du meme item sans payload explicite (`cue/event/action`).
- [x] Ajouter un test de non-regression ciblant la preservation du cue.
- [x] Verifier typecheck + smokes.

## Review

- Fix applique dans `scene-logic.ts`: preservation du `cue` sur `selection.item.requested` idempotent.
- Test ajoute dans `tests/custom-events-smoke.ts`.
