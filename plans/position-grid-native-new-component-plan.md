# Plan — New position grid-native component (separate file, no React effects)

## Objective

Create a brand new position editor overlay component in a dedicated file, keep the existing component intact but unused for position mode, and remove React `useEffect`/`useMemo` orchestration from the new position path by relying on local XState runtime only.

## Checklist

- [x] Add new file for position overlay component (`grid-native`) using local XState machine.
- [x] Ensure new component has no `useEffect` / `useMemo` and uses grid row/col placement (no XY frame conversion).
- [x] Keep current component available (legacy) and switch parent to new component for position mode.
- [x] Restore interactive drag behavior for move + resize handles in the new component.
- [x] Run typecheck + relevant smoke tests.
- [x] Document review and outcomes.

## Review

- New dedicated component added: `app/components/position-editor/visual-transform-grid-grid-native.tsx`.
- The new component uses local XState runtime only (`useMachine(positionEditorMachine)`) and contains no `useEffect` / `useMemo`.
- Position frame rendering is grid-native: duplicate parent grid metrics and place frame by `grid-row/grid-column` + spans, with no XY/matrix projection for position mode.
- Legacy component kept in place and explicitly disabled in `app/components/position-editor/visual-transform-grid.tsx` (`DISABLE_LEGACY_POSITION_COMPONENT = true`).
- Parent wiring switched for position mode to new component in `app/parts/item-edit/edit-transform.tsx`, with remount key on `syncToken` + node id to feed fresh machine input without React effects.
- Before/after logs added on active path:
  - UI pointer phase (`before` / `after send`) in `app/components/position-editor/visual-transform-grid-grid-native.tsx`.
  - Machine callback phase (`before-callback` / `after-callback`) in `app/components/position-editor/position-editor.machine.ts`.
  - Drag start completion log (`machine.drag.start.after`) with `started` flag.
- Logs analysis showed drag/commit path was valid; missing interactivity was visual: grid-native overlay placement was read only from DOM class/computed style (updated mostly on commit).
- Fix applied: machine now carries `preview.placement` separately, service emits live placement during drag (resize + cell-snap), and grid-native overlay prioritizes `previewPlacement` over DOM placement.
- Commit persistence fix: preview inline `grid-row/grid-column` is now cleared to class-driven placement on successful commit (instead of restoring previous inline values), preventing post-drag rollback to old geometry.
- Position semantics update: cell-snap anchor switched to top-left (diamond handle now top-left + probe uses ghost top-left), and commit uses top-left cell directly (no center-span recentering).
- End-of-drag persistence update: on successful commit, inline preview is finalized to the committed placement (`finalizePreviewPlacement`) so visual state does not bounce back before class patch settles.
- Verification:
  - `npm run typecheck` ✅
  - `npx tsx tests/transform-editor-smoke.ts` ✅
  - `npx tsx tests/transform-overlay-alignment-smoke.ts` ✅
  - `npx tsx tests/auto-placement-lock-smoke.ts` ✅
