# Plan — Auto duration from linked sound cues

## Objective

When a scene is initially created with default duration, then later linked to a sound, automatic item durations must follow the effective scene cue span (timestamp/cues), not remain stuck on default fallback events.

## Steps

- [x] 1. Update cue-window resolution to use `sceneContent` cues source priority (`cues`/`timestamp`/`events`) instead of `events` only.
- [x] 2. Keep fallback behavior for scenes with no cues at all.
- [x] 3. Verify type-safety and runtime path consistency.

## Definition of done

- Automatic intro/outro window derivation uses linked audio cues when available.
- Scene bounds for auto duration no longer stick to stale default fallback events.
- Typecheck passes.

## Review

- Changed `resolveCueWindows` to initialize `resolvedSceneContentEvents` from `getSceneContentCues(sceneContent)`.
- This aligns cue-window resolution with the same source priority used elsewhere in runtime (`cues` then `timestamp` then `events`).
- Existing fallback remains unchanged for scenes with no cues: synthetic scene cue still defaults to `SCENE_DEFAULT_DURATION_SEC`.
- Verification: `npm run typecheck` passes.
