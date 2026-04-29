# Scene10 capsule32 selection frame alignment fix

## Checklist

- [x] Revert XY-based frame placement so overlay positioning remains CSS-grid-driven only.
- [x] Make overlay root inherit parent capsule CSS class while keeping measured grid metrics as deterministic fallback.
- [x] Make frame inherit only position-related class tokens from selected element (`cell-*`, `liste-*`, `ed-zone-*`, etc.).
- [x] Keep mouse-coordinate conversion limited to drag measurement/preview logic, not idle frame projection.
- [x] Run typecheck and a focused overlay smoke test.

## Review

- Removed the `left/top/width/height` fallback that projected frame geometry in viewport coordinates.
- The overlay grid host now carries the parent capsule class (`parent.className`) and keeps modern CSS grid properties (`grid-template-*`, `gap`) for deterministic layout in 2023 baseline browsers.
- The frame now carries extracted position class tokens from the selected element; when no token is available, it falls back to parsed grid placement (`gridRow/gridColumn`) only.
- Verification: `npm run typecheck` and `npx tsx tests/transform-overlay-alignment-smoke.ts` pass.
