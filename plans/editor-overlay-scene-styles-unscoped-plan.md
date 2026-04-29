# Editor overlay scene styles unscoped plan

## Checklist

- [x] Confirm scene-generated classes are currently scoped only inside player CSS scope.
- [x] Expose scene-generated style rules unscoped so editor overlays can resolve parent/position classes.
- [x] Keep runtime player base CSS scoped to avoid accidental global leakage.
- [x] Run typecheck and relevant overlay smoke tests.

## Review

- `scene.styles` is now injected in a dedicated unscoped `<style>` tag so editor overlays can resolve the same capsule/position classes as the player.
- `playerCss` remains scoped (`@scope`) to keep runtime base classes isolated.
- Verification: `npm run typecheck` and `npx tsx tests/transform-overlay-alignment-smoke.ts` pass.
