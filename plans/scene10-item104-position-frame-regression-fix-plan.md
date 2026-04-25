# Plan — Scene 10 / item 104 position frame regression fix

## Objective

Restore the pre-regression frame resync behavior for the position editor after position/size commits.

## Steps

- [x] Confirm the exact regression point in history for `usePositionRuntime` sync behavior.
- [x] Revert the position runtime sync trigger to pre-refactor behavior (resync on parent rerenders, not only narrowed memo deps).
- [x] Verify no type/runtime regressions with targeted smoke tests.
- [x] Document result and root cause in this plan.

## Review

- Regression source: commit `401d8926` changed `usePositionRuntime` to a narrowed memoized `runtimeInput`, so `props.sync` no longer re-fired on generic rerenders.
- Before that refactor, position runtime was synced with `{ service, ...props }` and effect deps `[send, service, props]`, which effectively resynced on parent rerenders and kept frame aligned after commit-time layout propagation.
- Applied fix in `app/components/position-editor/visual-transform-grid.tsx`: restored pre-regression sync semantics for `usePositionRuntime`.
- Verification:
  - `npm run typecheck` passed.
  - `npx tsx tests/transform-overlay-alignment-smoke.ts` passed.
