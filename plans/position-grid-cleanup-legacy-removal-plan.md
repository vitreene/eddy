# Plan — Position cleanup and legacy removal

## Objective

Clean the position editor implementation by removing the old legacy position component path and stripping debug instrumentation now that the grid-native path is the only active implementation.

## Checklist

- [x] Remove legacy position component code from `visual-transform-grid.tsx`.
- [x] Keep `visual-transform-grid.tsx` focused on transform editor only.
- [x] Remove temporary debug logs/instrumentation from position machine/service and transform controller.
- [x] Keep new grid-native position component as the sole active position path.
- [x] Verify with typecheck and targeted smoke tests.

## Review

- `app/components/position-editor/visual-transform-grid.tsx` was rebuilt as a transform-only module; old position exports and legacy branches were removed.
- `app/components/position-editor/visual-transform-grid-grid-native.tsx` remains the single active position editor component.
- Debug logging was removed from:
  - `app/components/position-editor/position-editor.machine.ts`
  - `app/components/position-editor/position-editor.service.ts`
  - `app/parts/item-edit/item-edit.transform-controller.ts`
  - `app/components/position-editor/visual-transform-grid-grid-native.tsx`
- Verification:
  - `npm run typecheck` ✅
  - `npx tsx tests/transform-editor-smoke.ts` ✅
  - `npx tsx tests/auto-placement-lock-smoke.ts` ✅
