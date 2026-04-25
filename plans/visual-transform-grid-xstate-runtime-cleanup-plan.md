# Plan — visual-transform-grid xstate runtime cleanup

## Objective

Align `visual-transform-grid` with project rule: keep runtime state orchestration in XState and keep React layer as a thin DOM render adapter.

## Steps

- [x] Remove memoized prop-packaging (`runtimeInput`) in `useTransformRuntime`.
- [x] Remove memoized frame derivation in `useTransformRuntime`; derive directly from XState context.
- [x] Replace hook-time service memoization with singleton refs (`useSingleton`) for DOM services.
- [x] Keep prop sync explicit via `props.sync` dispatch and delegate state updates to machines only.
- [x] Verify by typecheck + transform smokes.

## Review

- `useTransformRuntime` now mirrors the explicit sync model already used elsewhere: input is passed directly and `props.sync` is emitted with current props, without per-prop memo dependency arrays.
- `usePositionRuntime` now uses the same singleton-service pattern, removing hook memoization for service lifecycle.
- React no longer carries memoized runtime state packaging in this file; runtime state remains in `transformEditorMachine` / `positionEditorMachine`.
- Verification:
  - `npm run typecheck` passed.
  - `npx tsx tests/transform-overlay-alignment-smoke.ts` passed.
  - `npx tsx tests/transform-editor-smoke.ts` passed.
  - `npx tsx tests/auto-placement-lock-smoke.ts` passed.
  - `npx tsx tests/scene1-item55-move-smoke.ts` failed on fixture expectation (`item__55` missing in current local data), unrelated to this file change.
