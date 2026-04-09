# Legacy Player Rewire Plan

## Objective

- Branch the app onto a legacy/simple player path without deleting the current player.
- Reintroduce behavior incrementally from the modern player, not by stacking patches.

## Baselines Compared

### A) Very old legacy baseline (`f846a68`)

- `app/player/player.ts`: no runtime state maps, no `seekChanges`, no `clearTransientMoveInlineStyles`, no reset orchestration.
- `app/player/deps/on-update.ts`: `onUpdateTimeLine` local maps + simple transition handling.
- `seek`: only `pause -> timeline.seek -> media sync`.

### B) Branch-start baseline (`origin/new-schema`)

- `app/player/player.ts`: already has runtime maps (`persoPositions/transitions/setters`), `seekChanges`, transient style clear, move FLIP cache (`lastEndCoords`).
- `app/player/deps/on-update.ts`: static-change driven runtime transitions.

## Current Delta (vs `origin/new-schema`)

- `app/player/player.ts`
  - Added: captured initial parents + restore from initial in `seek/replay/revert`.
  - Added: seek boundary changes (`isChangeActiveAtTime`) usage in `seekChanges`.
  - Added: broader transient style cleanup keys.
- `app/player/deps/on-update.ts`
  - Added: `isChangeActiveAtTime`-based change selection.
  - Added: first-tick forced apply (`isInitialTick`).
  - Added: transform-preserving FLIP cleanup path.
  - Boundary changed: `< curr` instead of `<= curr` in switch gate.
- `app/player/deps/utils.ts`
  - Added `isChangeActiveAtTime` helper.
  - `setNextChange` now depends on this shared contract.
- `app/player/index.tsx`
  - Rewind now calls `telco.revert()` and clears selected event.

## Why Rewind != Fresh Load Can Happen

- Init pipeline and rewind pipeline are still not guaranteed to be structurally identical.
- Any extra path in rewind (`restoreInitialNodeStates`, `seekChanges`, static onUpdate pass) can diverge from init order.

## Rewire Strategy (No Deletion)

1. **Create legacy player entrypoint**
   - Add `app/player/player.legacy.ts` from `f846a68` logic (adapted to current typing only).
   - Add `app/player/deps/on-update.legacy.ts` from `f846a68`.

Status: done.

2. **Add runtime switch in app wiring**
   - In `app/player/index.tsx`, instantiate `PlayerLegacy` behind a temporary flag (default legacy-on for validation).
   - Keep current `Player` untouched as modern path.

Status: done (`USE_LEGACY_PLAYER = true`).

3. **Keep APIs identical**
   - `telco` contract must stay identical (`seek/pause/play/replay/revert/...`).
   - No UI/provider changes beyond constructor target.

4. **Run parity checks**
   - Existing smokes + dedicated scenario: `play -> pause -> seek -> rewind -> play`.
   - Keep `tests/seek-playback-state-diff-scene3.ts` as external diagnostic only.

Status: partial (typecheck + core smokes passed; interactive scenario pending user validation).

5. **Reintroduce modern features one-by-one**
   - Only after baseline is stable.
   - Add one feature, re-test scenario, then continue.

## Feature Reintroduction Order

1. Shared boundary selector (`isChangeActiveAtTime`).
2. Preserve transform on FLIP cleanup.
3. Initial-parent restoration behavior.
4. Any additional seek/reset optimization.

## Acceptance Criteria

- Rewind returns to exact fresh-load visual state.
- `play/pause/seek` and direct event seek produce consistent sequence state.
- No trace/debug helper remains inside `Player` classes.
