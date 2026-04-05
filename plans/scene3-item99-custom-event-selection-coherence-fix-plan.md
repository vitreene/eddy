# Plan — Scene 3 / Item 99 custom-event selection coherence

> Superseded by `plans/scene3-item99-selection-coherence-root-cause-plan.md`.

## Objective

Eliminate the immediate readjustment after selecting custom-event `electricite` on scene 3 item 99, so the player render stays coherent with the selected event.

## Checklist

- [x] Confirm the selection/seek event chain and identify where redundant reseek happens.
- [x] Implement a guard to prevent duplicate `selection.event.seek.requested` dispatches when selection is already in a matching seek state.
- [x] Verify behavior with targeted smoke checks and ensure no regression in custom-event selection flows.
- [x] Document results and final validation notes.

## Review

- Implemented a guard in `app/parts/item-edit/index.tsx` to stop re-dispatching `selection.event.seek.requested` when the same item/event is already in active `seek` state.
- This removes redundant reseek cycles coming from editor-sync updates, which can cause immediate post-selection readjustments.
- Verification:
  - `npx tsx tests/custom-events-smoke.ts`
  - `npx tsx tests/selection-contract-lock-smoke.ts`
  - `npx tsx tests/item-edit-smoke.ts`
- All three smoke suites passed. Expected Node-context warning logs (`Failed to parse URL from /api/content/...`) remain unchanged and are unrelated to this fix.
