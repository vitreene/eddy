# Item 39 Action Key Normalization Fix

## Scope

- Remove custom-event action-key collisions without linking events to item ids.
- Keep suffix generation on-demand: only when a custom event uses `middle` or `end`.
- Keep behavior unchanged for intro/outro naming.

## Tasks

- [x] Normalize custom-event action labels from `(name, position)` before building runtime action keys.
- [x] Ensure normalization is idempotent when names are already suffixed.
- [x] Run focused smoke tests covering builder timing and custom-event mapping.
- [x] Record review outputs.

## Review

- `npx tsx tests/builder-capsule-smoke.ts`: OK.
- `npx tsx tests/keyframe-coherence-smoke.ts`: OK.
- `npx tsx tests/custom-event-selection-cue-smoke.ts`: OK.
- `npm run typecheck`: OK.
- Scene 1 runtime check after fix:
  - `3-007-prsente-custom-1__tween` -> `[960]`
  - `3-007-prsente-middle-custom-1__tween` -> `[900]`
  - No cross-trigger collision between start and middle keys.
