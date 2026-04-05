# Plan — Scene 3 / Item 99 coherence (root cause)

## Objective

Fix the player/selection mismatch for custom-event `electricite` without adding defensive guard layers.

## Checklist

- [x] Reconfirm the mismatch contract between selected custom-event visual projection and seek anchor time.
- [x] Replace the temporary reseek guard with a contract-level fix.
- [x] Align custom-event selection cue semantics with rendered state.
- [x] Update smoke tests that encode old custom pre-FLIP behavior.
- [x] Run targeted smoke tests for selection and item-edit flows.
- [x] Document review and validation results.

## Review

- Root cause fixed in `app/provider/event-selection-cue.ts`: custom-event selection now anchors on the event keyframe (no `-1ms` pre-FLIP offset).
- This aligns player rendering with selected custom-event state and removes the immediate fallback to previous visual state.
- Removed temporary reseek guard from `app/parts/item-edit/index.tsx` (no behavioral masking).
- Updated smoke coverage to match the new contract:
  - `tests/custom-event-preflip-selection-smoke.ts`
  - `tests/selection-contract-lock-smoke.ts`
- Verification executed:
  - `npx tsx tests/custom-event-preflip-selection-smoke.ts`
  - `npx tsx tests/selection-contract-lock-smoke.ts`
  - `npx tsx tests/custom-event-selection-cue-smoke.ts`
  - `npx tsx tests/custom-events-smoke.ts`
  - `npx tsx tests/item-edit-smoke.ts`
- All checks passed. Existing Node test-context fetch warnings (`Failed to parse URL from /api/content/...`) remain unchanged and unrelated.
