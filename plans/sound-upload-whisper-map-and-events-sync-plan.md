# Plan — Sound upload cues mapping and events sync

## Objective

- Ensure the upload transcription flow explicitly maps Whisper chunks with `mapWhisperChunksToCues`.
- Keep sound-linked `scene_content.events` synchronized with the mapped cues.
- Refresh the existing sound content cues in DB and validate duration coherence.

## Steps

- [x] 1. Refactor transcription helpers so upload cue output path explicitly passes through `mapWhisperChunksToCues`.
- [x] 2. Update DB upsert logic to persist `scene_content.events` from mapped cues when present.
- [x] 3. Update linked-audio settings path so selecting an audio with cues synchronizes `scene_content.events`.
- [x] 4. Re-run Whisper on `1_7b_e.mp3`, update DB `content.timestamp` and linked `scene_content.events`.
- [x] 5. Verify with typecheck + duration comparison (audio vs sequence max).

## Review

- `app/whisper/transcribe-to-cues.ts` now explicitly maps upload transcription output through `mapWhisperChunksToCues` in `transcribeAudioFileToCues`.
- Added `transcribeAudioBufferToWhisperChunks(...)` and reused it in both file/buffer cue APIs.
- `app/api/db.ts` updates:
  - `upsertSceneContentCues(...)` now persists `scene_content.events` with mapped cues when cues exist.
  - `upsertSceneAudioSettings(...)` now syncs `scene_content.events` to linked content timestamps when available (update + create paths).
- Re-ran Whisper on `public/assets/1_7b_e.mp3`, saved JSON in `tmp/whisper-reanalysis-content-3.json`, and refreshed DB:
  - `content.id=3.timestamp` updated from fresh cues (names preserved by index for compatibility).
  - all linked `scene_content` rows with `content_id=3` updated (`events` synchronized to cues).
- Validation:
  - `npm run typecheck`
  - `npx tsx tests/content-api-smoke.ts`
  - `npx tsx tests/event-media-action-smoke.ts`
  - `npx tsx tests/scene-linked-sound-builder-smoke.ts`
  - `npx tsx tests/video-default-fit-smoke.ts`
  - `npx tsx tests/builder-slot-style-smoke.ts`
  - Scene 1 sequence max now `16800ms` (previously `20920ms`) for `scene-sound__7`.
