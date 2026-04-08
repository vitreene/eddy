# Item99 Outro Style + Rewind Reset Fix

## Scope

- Isolate where outro transform style is dropped during runtime updates.
- Ensure rewind/seek/replay restore node state from `initial` without stale inline leftovers.

## Tasks

- [x] Mark static changes that carry persistent transform style so transition cleanup does not wipe them.
- [x] Apply this marker in runtime transition cleanup.
- [x] Reset DOM nodes from `initial` on seek/replay/revert.
- [x] Add focused smokes for preserve-transform marker and rewind reset.
- [x] Run targeted test suite + typecheck.
- [x] Force dedicated event decor creation for non-intro event edits when selected event has no decor.

## Review

- Removal point isolated:
  - `app/player/deps/on-update.ts` used to clear move inline styles (`transform`/`transform-origin`) at FLIP completion for every move transition.
  - This could wipe transform state on transitions carrying persistent transform styles (eg. outro `rotate`).
- Fixes applied:
  - `app/player/deps/static-changes.ts`: each change now carries `preserveTransform` when action style contains transform-related keys.
  - `app/player/deps/on-update.ts`: FLIP cleanup clears move transform residue (`transform`/`transform-origin`) but re-applies persistent transform components (`rotate/scale/origin`) when `preserveTransform` is set.
  - `app/player/deps/utils.ts`: active-window contract switched to half-open intervals `[curr, next)` so at exact keyframe time the next state is active.
  - `app/player/deps/on-update.ts`: change switch gate uses `< curr` (not `<= curr`) to avoid reprocessing the same change at its own boundary during seek.
  - `app/player/deps/on-update.ts`: boundary switch condition remains aligned with shared selector contract (`<= curr`) to preserve current seek/play parity behavior.
  - `app/player/player.ts`: `seek/replay/revert` now restore nodes from `initial` (via shared helper) before applying timeline state.
  - `app/player/deps/initial-state.ts`: shared reset helper to reapply initial parent/class/content/src/style seed.
  - `app/parts/item-edit/index.tsx`: style edits on selected non-intro events now force dedicated event decor creation when the event still has `decorId = null` (prevents writing intent into shared base/effective state).
- Tests added:
  - `tests/static-changes-preserve-transform-smoke.ts`
  - `tests/initial-state-reset-smoke.ts`
- Validation:
  - `npx tsx tests/builder-capsule-smoke.ts` OK
  - `npx tsx tests/keyframe-coherence-smoke.ts` OK
  - `npx tsx tests/custom-event-selection-cue-smoke.ts` OK
  - `npx tsx tests/on-update-keyframe-window-smoke.ts` OK
  - `npx tsx tests/static-changes-preserve-transform-smoke.ts` OK
  - `npx tsx tests/initial-state-reset-smoke.ts` OK
  - `npm run typecheck` OK
