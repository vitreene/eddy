# Plan — Scene 10 / Item 104 selection frame regression analysis

## Scope

- Reproduce the code path for scene 10 / item 104 (content type `capsule` in parent capsule type `position`).
- Trace selection-frame update flow after position/size edits.
- Identify regression origin in recent commits.

## Checklist

- [x] Inspect item 104 model shape (item/decor/capsule) in local DB.
- [x] Trace position editor runtime update triggers (`preview.update`, `props.sync`, commit flow).
- [x] Trace item-edit commit path (`onPositionCommit` -> `onDecorUpdate` -> `decor-patch-requested`).
- [x] Compare with recent history (`git blame` / commit diffs) to isolate regression trigger.
- [x] Document probable root cause with concrete file references.

## Review

- Item 104 is rendered in a parent capsule of type `position` and uses class-based placement (`cell-span-*`).
- The selection frame in `position` mode is recomputed only on:
  - drag preview updates (`preview.update`), and
  - runtime input changes (`props.sync`) in `usePositionRuntime`.
- Since refactor `401d8926`, `usePositionRuntime` no longer resyncs on every parent rerender and now depends on a narrowed dependency set (`runtimeInput`).
- Since `f9bc0af6`, `onDecorUpdate` normalizes className payloads (`normalizeZonePlacementClassName`) and can short-circuit as no-op before emitting `decor-patch-requested`.
- When a live DOM placement change is applied but persistence patch is filtered/no-op, editor sync key may not change; then `props.sync` is not re-fired and the frame can remain stale.

## Probable Root Cause

- Regression is caused by the combination of:
  1. stricter resync triggering in `usePositionRuntime` (`app/components/position-editor/visual-transform-grid.tsx`), and
  2. no-op filtering/normalization in `onDecorUpdate` (`app/parts/item-edit/index.tsx`) that may suppress a state update after a live class patch.
- Net effect: selected node moves/resizes in DOM, but frame machine does not always receive a post-commit resync signal.
