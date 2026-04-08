# Item 99 Outro Rotate Persistence Fix

## Scope

- Ensure transform properties defined on transition-event decor (notably outro) are effectively applied and persist at event arrival.

## Tasks

- [x] Reproduce builder output gap where outro decor transform is not projected into action style.
- [x] Merge decor style interpolation into transition action style for transition events with decor.
- [x] Keep move-auto behavior safe by excluding x/y/width/height from interpolation when auto move is active.
- [x] Add smoke coverage for outro rotate persistence.
- [x] Run targeted smoke tests + typecheck.

## Review

- `app/player/builder/entities.ts`: transition-event branch now computes decor style interpolation and merges it into transition action style.
- Outro case now projects transform properties (example: `rotate: "90deg"`) as style patch with `duration: 0` at outro keyframe.
- `tests/builder-capsule-smoke.ts`: added `outro decor transform persists at outro keyframe`.
- Validation:
  - `npx tsx tests/builder-capsule-smoke.ts` OK
  - `npx tsx tests/keyframe-coherence-smoke.ts` OK
  - `npx tsx tests/custom-event-selection-cue-smoke.ts` OK
  - `npm run typecheck` OK
