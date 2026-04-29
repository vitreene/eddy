# Position frame / element coordination drift fix

## Checklist

- [x] Analyze why frame move/resize values diverge from the edited element in position mode.
- [x] Remove false-positive default placement parsing (`row=1,col=1`) when no placement class token is present.
- [x] Add stylesheet-based class placement resolution for scoped/generated placement classes (including `ed-zone-*`).
- [x] Keep CSS-grid-driven placement and avoid viewport XY projection for idle frame logic.
- [x] Validate with typecheck + focused overlay smoke tests.

## Review

- Root cause: placement token parser returned a default placement even when no placement token matched, which anchored drag/resize math to incorrect grid origins and caused significant drift.
- Added robust placement resolution in `position-editor.service.ts`: computed style -> class token parse -> stylesheet class rule parse -> safe fallback.
- Overlay now always re-derives placement from the live element after drag preview ends (`previewPlacement ?? readPositionGridPlacement(element)`), fixing end-of-resize frame misalignment while the element is correctly sized.
- Overlay placement parser in `visual-transform-grid-grid-native.tsx` now mirrors the robust service strategy (computed style + class tokens + stylesheet rule lookup), preventing silent `1/1` fallback drift.
- Verification: `npm run typecheck`, `npx tsx tests/transform-overlay-alignment-smoke.ts`, and `npx tsx tests/transform-editor-smoke.ts` all pass.
