# Plan — Video fill defaults without wrapper

## Objective

Apply a default video contract without wrappers:

- all videos get class `ed-video`
- `ed-video` enforces `width: 100%`, `height: 100%`, `display: block`
- item-edit exposes image-like fit controls for video (`cover` / `contain`), with `contain` as default

## Steps

- [x] 1. Add shared video class constant and CSS rule for `ed-video`.
- [x] 2. Ensure builder assigns `ed-video` to all video renderables (items + scene-linked sound video).
- [x] 3. Map video visual style to `object-fit`/`object-position` and default to `contain` when unset.
- [x] 4. Expose fit controls for `video` in StyleEditor and set default style to `contain` for video content.
- [x] 5. Add smoke checks and run targeted verification.

## Definition of done

- Video nodes render full capsule by default without wrappers.
- Video fit can be toggled in item-edit like image/sprite controls.
- Default fit for video is `contain`.
- Targeted checks pass.

## Review

- Added `EDITOR_VIDEO_CLASS` in `app/config/class-prefix.ts` and `.ed-video` CSS rule in `app/player/player.css`.
- Updated builder video projection in `app/player/builder/entities.ts` to append `ed-video` and apply `toVideoStyle(...)` defaults (`display:block`, `width/height:100%`, default fit contain).
- Added `toVideoStyle(...)` in `app/player/builder/styles.ts` (maps background fit/position to object fit/position).
- Updated scene-linked sound renderable in `app/player/builder/renderables.ts` to include `ed-video` class.
- Updated style defaults in `app/config/item-style-defaults.ts` so `video` starts with `backgroundSize: "contain"`.
- Exposed image-like fit controls to videos in `app/components/style-editor/index.tsx`.
- Added/updated smoke checks:
  - `tests/video-default-fit-smoke.ts`
  - `tests/scene-linked-sound-builder-smoke.ts`
- Verification run:
  - `npm run typecheck`
  - `npx tsx tests/video-default-fit-smoke.ts && npx tsx tests/scene-linked-sound-builder-smoke.ts && npx tsx tests/builder-slot-style-smoke.ts`

### Follow-up correction (no duplicated defaults)

- Removed duplicated default sizing/display from inline video style mapping in `app/player/builder/styles.ts`.
- `ed-video` class is now the single source for `width/height/display` defaults; inline style keeps only mapped media fit/position and explicit decor overrides.
- Updated `tests/video-default-fit-smoke.ts` to assert absence of duplicated inline defaults.
