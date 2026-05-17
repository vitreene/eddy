# Scene Duration Persistence Plan

- [x] Add a persistent `totalDuration` column to `SceneContent` and migrate the local database.
- [x] Update scene/content write paths so linked audio selection stores the sound duration, and manual edits overwrite it durably.
- [x] Update scene read paths so the stored duration wins over derived fallback values.
- [x] Add a smoke test that reproduces the regression: select sound, edit duration, reload, and keep the edited value.

## Review

- Verified with `npx tsx tests/scene-duration-persistence-smoke.ts`.
- Verified with `npm run typecheck`.
