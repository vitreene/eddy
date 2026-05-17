# Scene Whisper Reanalysis Plan

- [x] Detect when a selected scene sound has waveform data but no Whisper `words`.
- [x] Re-fetch the stored audio asset from XState, run Whisper, and persist the transcript back into the scene/content records.
- [x] Keep the local scene state in sync through XState events so the analysis does not loop.
- [x] Add a small regression test for timestamp merge/detection helpers.

## Review

- Verified with `npm run typecheck`.
- Verified with `npx tsx tests/content-timestamp-smoke.ts`.
- Corrected to avoid React hooks in `SceneEdit`; the retry now lives in `scene-logic`.
