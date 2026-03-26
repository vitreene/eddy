# Plan — Trace media seek state

## Objective

Add runtime logs in Player to inspect the exact media state injected and applied during seek (example: `4200ms`), including `mediaStatus`, folded changes, computed target time, and playback status.

## Steps

- [x] 1. Add helper snapshot/trace methods for media status rows.
- [x] 2. Add logs around `seek`, `seekChanges`, `applyMediaChanges`, and `seekMedias`.
- [x] 3. Keep behavior unchanged (logs only).
- [x] 4. Run typecheck.

## Review

- Added trace helpers in `app/player/player.ts`:
  - `traceMediaSeek(stage, payload)`
  - `getMediaStatusRow(id)`
  - `getAllMediaStatusRows()`
- Added logs at seek lifecycle stages:
  - `seek:start`
  - `seek:after-seekChanges`
  - `seek:end`
  - `seekChanges:folded`
  - `applyMediaChanges:video`
  - `seekMedias:apply`
- Behavior kept unchanged: only diagnostics were added.
- Verification run: `npm run typecheck`.
