# Plan — visual-transform-grid React-thin + position persistence fix

## Objective

Make `visual-transform-grid.tsx` a thin React DOM renderer (no React runtime orchestration beyond hook-to-XState wiring), and fix the regression where position edits do not persist visually after commit.

## Checklist

- [x] Isolate the precise regression mechanism with code-path + history evidence.
- [x] Refactor runtime wiring so XState/machine + services own orchestration; keep React layer limited to render + pointer forwarding.
- [x] Fix position post-commit resync so frame follows committed DOM placement reliably.
- [x] Verify with targeted checks (typecheck + relevant smoke tests).
- [x] Document root cause, changes, and verification in Review.

## Review

- Root cause confirmed: in position mode, frame resync depended on render/effect timing (`props.sync`) while commit-side DOM relocation may settle after asynchronous sequence flush; this could leave the overlay frame stale after drop.
- `position-editor.machine.ts` now owns post-commit resync by scheduling multi-frame `frame.resync` events after `drag.end`, rebuilding frame from DOM until layout stabilizes.
- `transform-editor.machine.ts` now owns tiny-dimension retry internally (`sync.retry` + bounded retry counter), removing React-side retry orchestration.
- Both machines now own DOM service lifecycle (`service` optional input, machine-managed default, machine `exit` disposal), reducing runtime orchestration in React.
- `visual-transform-grid.tsx` is now a thinner render adapter: no React memo/ref singletons for runtime control, explicit `props.sync` forwarding only.
- Verification passed:
  - `npm run typecheck`
  - `npx tsx tests/transform-editor-smoke.ts`
  - `npx tsx tests/transform-overlay-alignment-smoke.ts`
  - `npx tsx tests/auto-placement-lock-smoke.ts`
