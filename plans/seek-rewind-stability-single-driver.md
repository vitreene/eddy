# Seek/Rewind Stability - Single Driver

## Scope

- Remove duplicated transport execution paths (`telco.*` direct + `transport.*` sync path).
- Ensure `seek` applies static changes exactly once.
- Align reset behavior with Anime.js-owned reverts where possible.

## Tasks

- [x] Make `createTelcoController` state-driven only for play/pause/seek/rewind (no direct `telco.*` calls there).
- [x] Keep `syncFromActive` as the unique execution path to player telco methods.
- [x] Add static-update suppression during `seekToTime()` timeline seek to avoid double static application.
- [x] Revert runtime transitions/setters in reset path; remove redundant transient inline style blanket cleanup.
- [x] Run targeted smokes + typecheck.

## Review

- `app/player/index.tsx`
  - controller actions no longer call `telco.seek/revert/play/pause` directly; they only dispatch transport events.
  - `syncFromActive` remains the single driver calling telco methods.
- `app/player/player.ts`
  - `seekToTime` now wraps `timeLine.seek()` with static-update suppression to prevent duplicate static application after `seekChanges`.
  - reset path now reverts runtime setters and runtime transitions via Anime.js (`setter.revert()` / `transition.revert()`).
  - removed manual transient blanket cleanup (`clearTransientMoveInlineStyles`).
- `app/player/deps/on-update.ts`
  - honors `isStaticUpdateSuppressed()` to skip static update pass during controlled seek.
  - when a tick jump skips intermediate static windows, falls back to `seekChanges(currentTime)` once to replay missed structural changes (`move`/class), avoiding playback vs seek drift.
- `app/player/deps/static-changes.ts`
  - timeline positions are now tracked even for style-only actions, so outro boundaries remain visible in static windows.
  - className is no longer redundantly re-emitted when unchanged across style-only boundaries.
- Verification commands:
  - `npx tsx tests/editor-sync-seek-dedupe-smoke.ts` OK
  - `npx tsx tests/on-update-keyframe-window-smoke.ts` OK
  - `npx tsx tests/keyframe-coherence-smoke.ts` OK
  - `npx tsx tests/builder-capsule-smoke.ts` OK
  - `npx tsx tests/item-edit-smoke.ts` OK
  - `npx tsx tests/seek-playback-state-diff-scene3.ts` OK (diffs=0 at 0/1/2/3/4s)
  - `npx tsx tests/static-changes-preserve-transform-smoke.ts` OK
  - `npm run typecheck` OK
