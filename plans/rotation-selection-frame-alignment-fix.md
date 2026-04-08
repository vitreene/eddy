# Rotation Selection Frame Alignment Fix

## Scope

- Fix selection frame offset when a rotation is applied on an edited item.
- Ensure frame projection uses the same geometric reference as rendered DOM.

## Tasks

- [x] Replace frame projection source from reconstructed parent/item matrix to element viewport matrix when available.
- [x] Keep backward compatibility for existing tests using synthetic parent-only input.
- [x] Add/adjust smoke coverage for rotated alignment with element-derived matrix.
- [x] Run focused transform/editor smokes and typecheck.

## Review

- `app/components/position-editor/transform-editor.machine.ts`
  - `buildFrame` now accepts optional `element` and prioritizes `getViewportMatrix(element)` when provided.
  - Keeps fallback path (`offsetParent + matrixFromElementTransform`) for compatibility.
  - Uses element local width/height when element path is used.
- `app/components/position-editor/visual-transform-grid.tsx`
  - runtime now calls `buildFrame(..., state.context.input.element)` so frame projection follows rendered DOM matrix.
- `tests/transform-overlay-alignment-smoke.ts`
  - added assertion for element-derived frame path (without offsetParent).
- Verification:
  - `npx tsx tests/transform-overlay-alignment-smoke.ts`: OK.
  - `npx tsx tests/transform-editor-smoke.ts`: OK.
  - `npx tsx tests/event-selection-scene1-smoke.ts`: OK.
  - `npm run typecheck`: OK.
  - `tests/item-edit-live-smoke.ts` still fails on pre-existing `classTokens.has("old")` assertion (unchanged by this patch).
