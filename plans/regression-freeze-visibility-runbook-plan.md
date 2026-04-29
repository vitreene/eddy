# Plan — Freeze regressions + runbook

## Objective

Freeze approved selection visibility/reset fixes and document a practical runbook to diagnose and recover quickly if regressions return.

## Checklist

- [x] Add a dedicated npm command to run the regression lock suite quickly.
- [x] Write a single runbook listing corrected points, lock tests, and where to inspect code/logs.
- [x] Run the lock suite and typecheck to validate freeze integrity.

## Review

- [x] Regressions on selection visibility and reset decor resurrection are covered by explicit tests.
- [x] Team can follow one document to reproduce and diagnose in minutes.

## Result

- Added `npm run test:regression-lock` for fast freeze verification.
- Added `plans/regression-freeze-visibility-runbook.md` as the single reference for corrected points + recovery flow.
- Executed lock suite and typecheck successfully.
