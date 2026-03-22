# Plan — Capsule default sustain propagation

## Objective

Add capsule-level default sustain configuration so that all items in the capsule inherit a sustain effect by default (unless item-specific sustain is set). Keep runtime behavior consistent with existing builder logic and custom-event override rule.

## Steps

- [x] Refactor `SustainEventParams` to a reusable controlled component.
- [x] Add `defaultItemSustainTransition` in capsule profile types/parse/save pipeline.
- [x] Expose sustain default control in capsule editor, reusing `SustainEventParams`.
- [x] Propagate capsule default sustain in builder for timeline + item actions.
- [x] Verify with scene runtime check and typecheck.

## Notes

- Item explicit sustain event should override capsule default sustain.
- If item has custom events, sustain remains ignored for that item.

## Review

- `SustainEventParams` is now controlled/reusable and used in both event editor and capsule editor.
- Capsule profile now persists `defaultItemSustainTransition` end-to-end:
  - read/flatten in `app/api/db.ts`
  - update API in `app/api/capsule.ts`
  - mutation + commit serialization in `app/provider/tree-mutations.ts` and `app/provider/scene-logic.helpers.ts`
- Capsule editor exposes sustain default controls in `app/parts/item-edit/capsule-edit.tsx` using `SustainEventParams`.
- Capsule sustain now supports `Alterner` (`defaultItemSustainAlternate`) to flip initial/final direction on alternating items.
- Builder now injects capsule default sustain per item when no item-level sustain exists, in `app/player/builder/events.ts`.
- Runtime validation script confirms propagation on scene 8 nested capsule items.
- `npm run typecheck` passes.
