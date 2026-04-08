# Rubber Cue Regression Fix Plan

## Scope

- Restore `active-cue` capsule repartition behavior for partial editor snapshots.
- Fix builder custom-event interpolation regression (`custom-1` action key missing).
- Re-run focused smoke tests tied to cue-window and builder timing behavior.

## Tasks

- [x] Reproduce both regressions with focused smoke tests.
- [x] Fix `active-cue` derived window computation to remain robust when capsule `itemIds` chains are incomplete.
- [x] Fix builder custom-event interpolation duration override behavior.
- [x] Re-run `active-cue` and `builder-capsule` smoke tests.
- [x] Add review notes with concrete command results.

## Review

- `npx tsx tests/active-cue-smoke.ts` (before): FAIL (`2.5 !== 7.5` on capsule repartition + middle override case).
- `npx tsx tests/builder-capsule-smoke.ts` (before): blocked around custom-duration case; focused repro showed custom tween duration stayed `2500ms` instead of explicit `1500ms`.
- `npx tsx tests/active-cue-smoke.ts` (after): OK.
- `npx tsx tests/builder-capsule-smoke.ts` (after): OK.
- `npm run typecheck`: OK.
- `npx tsx tests/keyframe-coherence-smoke.ts`: OK.
- `npx tsx tests/custom-event-selection-cue-smoke.ts`: OK.
- `npx tsx tests/custom-events-smoke.ts`: OK (with expected local Node smoke warning for relative `/api/content/...` fetch).
