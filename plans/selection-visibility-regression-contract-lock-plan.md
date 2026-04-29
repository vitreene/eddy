# Plan — Selection visibility regression contract lock

## Objective

Lock approved selection visibility behavior with explicit non-regression tests so cue computation cannot silently drift back to invisible selection times.

## Checklist

- [x] Add a smoke test that asserts `computeActiveCue` uses intro-visible timing when intro cue name is explicit but missing from scene cues.
- [x] Add a smoke test that asserts reset transition patches preserve cue names while clearing `decorId`/timing fields.
- [x] Run targeted smokes + typecheck.

## Review

- [x] Selection of an item with explicit intro cannot regress to hidden-at-seek behavior.
- [x] Reset keeps approved cue-anchor semantics and cannot accidentally null cue names.

## Result

- Added `tests/selection-visibility-contract-smoke.ts` to lock the approved visibility behavior at selection time (0.5s intro-visible floor).
- Re-validated `tests/item-reset-smoke.ts` to keep cue-name preservation contract active.
- Verified with `npm run typecheck`.
