# Plan — Offload ensureSelectedEventDecorId to scene-logic

## Objective

Move the `ensureSelectedEventDecorId` orchestration out of `item-edit` and into `scene-logic`, while preserving behavior:

- event decor creation when missing,
- deduplication for concurrent requests,
- style/className/area patch application,
- touched/persist flow.

## Steps

- [x] Add annex module for decor ensure/dedup logic.
- [x] Add new scene-logic events for decor patch request/apply.
- [x] Move async ensure+create orchestration into scene-logic action.
- [x] Update `item-edit` to send intent events only (no local ensure function).
- [x] Preserve autosave persistence by raising `persist-touched` on created/patch-applied paths.
- [x] Verify with `npm run typecheck`.

## Review

- Added `app/provider/scene-logic.decor.ts` with `ensureEventDecorId()` and in-flight dedup map.
- Added events in `scene-logic`: `decor-patch-requested`, `decor-patch-apply`.
- Added action `ensureDecorPatchTarget` in `scene-logic` to resolve/create decor id then apply patch.
- Removed `ensureSelectedEventDecorId` from `app/parts/item-edit/index.tsx`.
- `item-edit` now emits `decor-patch-requested` for style/decor updates.
- `typecheck` passes.
