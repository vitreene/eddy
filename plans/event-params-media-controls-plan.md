# Plan — Event media controls in EventParams

## Objective

Add an independent `MediaEventParams` component in event params that appears when the selected item is a media content (`sound`, `video`, `lottie`, etc.), with:

- `media.action` select (`play` / `pause`)
- `media.offset` number (offset from media start, in seconds)

The value must be persisted in `event.ref` (JSON payload), then consumed by builder to produce action `media` data for player runtime.

## Steps

- [x] 1. Add `MediaEventParams` component under `app/parts/event-edit`.
- [x] 2. Wire conditional rendering in `app/parts/event-edit/index.tsx` based on selected item content type.
- [x] 3. Update event update flow to write/read media params through `event.ref` JSON.
- [x] 4. Update builder timed-action generation to emit `action.media` from `event.ref` for media items.
- [x] 5. Add targeted smoke coverage and run typecheck/tests.

## Definition of done

- Media controls are visible only for media items.
- Editing action/offset updates selected event payload persisted in `event.ref`.
- Builder output includes `media` actions consumed by player.
- Verification passes.

## Review

- Added independent component `app/parts/event-edit/media-event-params.tsx` with `media.action` (`play`/`pause`) and `media.offset` (seconds).
- Integrated conditional rendering in `app/parts/event-edit/index.tsx` for media content types (`sound`, `video`, `lottie`, `audio`).
- Added `app/config/event-media.ts` to encode/decode media params in `event.ref` while preserving existing event ref semantics.
- Integrated conditional rendering and update wiring in `app/parts/event-edit/index.tsx` so media changes are persisted by updating `ref`.
- Updated `app/provider/scene-logic.ts` custom-event ref updates to preserve embedded media params.
- Updated `app/api/db.ts` (`addEventToContent`) to normalize transition/sustain refs while preserving media in `event.ref`.
- Updated persistence gating in `app/api/content.ts` to detect media from `event.ref`.
- Updated builder in `app/player/builder/entities.ts` so media items project `action.media` from `event.ref` (offset converted seconds -> milliseconds).
- Added coverage:
  - `tests/event-media-action-smoke.ts`
  - `tests/content-api-smoke.ts` (custom-media persist contract)
- Verification run:
  - `npm run typecheck`
  - `npx tsx tests/event-media-action-smoke.ts`
  - `npx tsx tests/content-api-smoke.ts`
  - `npx tsx tests/video-default-fit-smoke.ts`
  - `npx tsx tests/scene-linked-sound-builder-smoke.ts`
  - `npx tsx tests/builder-slot-style-smoke.ts`
