# Plan — Position editor grid-native overlay (no XY conversion)

## Objective

Replace the current position overlay rendering model with a grid-native overlay that duplicates the parent grid and positions the selection frame using `grid-row` / `grid-column` semantics directly.

## Checklist

- [x] Keep current position overlay component available but disabled (legacy path preserved).
- [x] Implement a new position overlay renderer that duplicates parent grid geometry/style and positions frame via row/col + spans.
- [x] Reuse existing XState position machine/service for drag orchestration (`cell-snap`, `resize-grid-se`) while removing reliance on matrix frame rendering for position mode.
- [x] Wire `ItemTransformEditorPosition` to the new grid-native renderer.
- [x] Verify with typecheck + relevant smoke tests.
- [x] Document review notes and results.

## Review

- `ItemTransformEditorPosition` now uses a new grid-native portal (`GridOverlayPortal`) that duplicates the parent grid container (`grid-template-columns/rows`, `row-gap`, `column-gap`) and places the selection frame by `grid-row/grid-column` only.
- The legacy matrix/frame renderer is preserved in `ItemTransformEditorPositionLegacy` and explicitly disabled via `USE_LEGACY_POSITION_OVERLAY = false`.
- Drag orchestration remains in XState/service (`positionEditorMachine` + `position-editor.service`) and only the rendering model changed for position mode.
- Runtime sync for position mode is now parent-driven by `syncToken` + `element` changes (`props.sync`), avoiding full-props effect churn.
- Placement resolution uses grid semantics directly from computed style + class token fallback (`cell-r*`, `cell-span-r*-c*-rs*-cs*`), with no XY conversion for frame placement.
- Verification:
  - `npm run typecheck` ✅
  - `npx tsx tests/transform-overlay-alignment-smoke.ts` ✅
  - `npx tsx tests/auto-placement-lock-smoke.ts` ✅
  - `npx tsx tests/transform-editor-smoke.ts` ✅
