# Plan - FLIP transition trace (scene 3 item 99)

## Objective

Instrument selection/seek/FLIP runtime to isolate width/height jump artifacts and incorrect inter-transition FLIP baselines.

## Checklist

- [x] Add a shared trace utility with channel + scope filters and in-memory buffer.
- [x] Instrument selection active-state transitions (cue/event/action) in scene logic.
- [x] Instrument player FLIP pipeline (`seek`, `_moveChange`, `_createMoveTransition`) with old/new rect sources.
- [x] Instrument change-window transitions in `on-update` to detect snapshot carry-over.
- [x] Instrument editor projection path to capture inline style residues (`width/height/transform`).
- [x] Run targeted smoke tests to ensure no regressions.
- [x] Document how to enable traces and read diagnostics.

## Review

- Added shared trace utility: `app/lib/eddy-trace.ts`.
- Selection instrumentation added in `app/provider/scene-logic.ts` (`event-cue-resolved`, `seek-decision`, `active-apply`).
- FLIP runtime instrumentation added in `app/player/player.ts` (`seek`, `move-change-auto`, `transition-create`, `transition-skip-no-delta`).
- Change-window instrumentation added in `app/player/deps/on-update.ts` (`change-window-enter`, `snapshot-apply`, `snapshot-capture`).
- Editor projection instrumentation added in:
  - `app/parts/item-edit/editable-visual-state.ts` (`project-visual-state`)
  - `app/parts/item-edit/live-node-style.ts` (`live-style-apply`)
- Added runtime toggles to test `lastEndCoords` hypothesis without code edits:
  - `disableLastEndCoords`
  - `clearLastEndCoordsOnSeek`
- Follow-up fix after first trace dump:
  - `lastEndCoords` not used in failing path (`usedLastEndCoords=false`, `cachedLastEndCoords=0`).
  - Removed destructive class diff projection in `projectEditableVisualStateToNode` that could strip structural classes (`bg-picture`, `ed-item`).
  - Avoided redundant same-cue explicit reseek from editor-sync when active selection is already aligned.
  - Added smoke lock for reseek dedupe contract: `tests/editor-sync-seek-dedupe-smoke.ts`.
  - Corrected FLIP change-window semantics from `curr->next` to `prev->curr` in runtime (`on-update` + `setNextChange`) so keyframe transitions are evaluated in the intended segment.
  - Cleared transient move caches on each seek (snapshots + `lastEndCoords`) and reject stale `lastEndCoords` when DOM rect diverges.
  - Cleared transient inline geometry (`width/height/transform/transform-origin`) on seek to avoid carrying pre-seek FLIP residuals into the next keyframe computation.
  - During forward playback, skip `snapshot-apply` on window switch; keep it only for backward direction to avoid re-injecting stale start-of-window geometry.
  - Restored runtime change-window progression semantics to `curr->next` (playback contract), after validating that `prev->curr` caused early entry into future keyframes and broke intro slot state.
  - Clamped FLIP runtime progression to default transition duration (`curr + DEFAULT_DURATION`) instead of stretching to distant next keyframes.
  - Finalized and cleaned previous move transition inline styles on window switch to prevent width/height carry-over into the next FLIP measurement.
  - Finalized and cleaned move transition inline styles immediately when forward progress reaches end (`transition-complete-forward`), preventing stale inline geometry from persisting until the next keyframe boundary.
  - Added explicit runtime reset for playback state containers (`persoPositions`, `transitions`, `setters`, `previousTime`) on `seek`/`replay`/`revert` to prevent drift across repeated rewinds/replays.
  - Root cause for first intro->custom jump: player applied `className` action as full replacement, dropping structural tokens (`bg-picture`, `ed-item`). Fixed `_applyChanges` to treat object class payload as patch over current class list.
  - Added lock smoke: `tests/player-classname-action-smoke.ts`.
  - Restored seek-time interpolation: `seekChanges` now rebuilds baseline state at window start and recreates active move transitions with progress at the target seek time (instead of flattening to fully applied keyframe state).

### Trace activation

In browser devtools:

```js
window.__EDDY_TRACE__.start({
	channels: ["selection", "flip", "timeline"],
	itemIds: [99],
	console: true,
	disableLastEndCoords: false,
	clearLastEndCoordsOnSeek: true,
	maxEntries: 4000
});
window.__EDDY_TRACE__.clear();
```

Then inspect:

```js
window.__EDDY_TRACE__.dump();
```

To test the `lastEndCoords` suspicion:

```js
window.__EDDY_TRACE__.set({ disableLastEndCoords: true });
// optional
window.__EDDY_TRACE__.set({ clearLastEndCoordsOnSeek: true });
```

### Verification

- Passed:
  - `npx tsx tests/on-update-keyframe-window-smoke.ts`
  - `npx tsx tests/keyframe-coherence-smoke.ts`
  - `npx tsx tests/custom-events-smoke.ts`
  - `npx tsx tests/selection-contract-lock-smoke.ts`
  - `npx tsx tests/editor-sync-seek-dedupe-smoke.ts`
- Existing failure in current workspace (not introduced by this trace work):
  - `npx tsx tests/item-edit-live-smoke.ts` fails on `classTokens.has("old")` assertion.
