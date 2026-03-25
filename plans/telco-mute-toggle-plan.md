# Plan — Telco mute toggle button

## Objective

Add a mute/unmute button to the right side of Telco controls, and implement Telco-side logic that scans media nodes under `container-scene` (`video`/`audio`) to add or remove the mute attribute.

## Steps

- [x] 1. Extend Telco API in `Player` with mute state and methods (`toggleMute`, `setMuted`, `muted`).
- [x] 2. Implement Telco mute script to inspect media nodes inside `container-scene` and add/remove the `muted` attribute.
- [x] 3. Wire mute control in `PlayerRunner`/`TelcoPanel` with sound on/off icon button placed to the right of Telco commands.
- [x] 4. Run verification (`typecheck` + targeted smoke tests).

## Definition of done

- Telco exposes mute control methods and current mute state.
- Mute toggling updates `video`/`audio` nodes inside `container-scene` by adding/removing `muted`.
- Telco UI shows a right-side mute button with muted/unmuted icon and toggles correctly.
- Checks pass.

## Review

- Added Telco mute API in `app/player/player.ts`: `toggleMute`, `setMuted`, `muted`.
- Implemented Telco-side mute script that scans `container-scene` media nodes (`video, audio`) and adds/removes the `muted` attribute (plus `media.muted` runtime flag).
- Added a mute/unmute button in `app/player/index.tsx` (`VolumeX` / `Volume2`) positioned at the right side of Telco controls.
- Persisted mute UI state across player re-initialization by reapplying `telco.setMuted(...)` on telco ready.
- Verification run:
  - `npm run typecheck`
  - `npx tsx tests/scene-linked-sound-builder-smoke.ts && npx tsx tests/builder-slot-style-smoke.ts`
