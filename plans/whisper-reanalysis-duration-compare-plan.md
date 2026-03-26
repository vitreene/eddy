# Plan — Whisper reanalysis duration coherence

## Objective

Re-run Whisper analysis for the linked sound, save the new JSON result, and compare it to the JSON stored in DB while ignoring cue names and focusing on duration coherence.

## Steps

- [x] 1. Identify the exact audio file and DB content row used in the scene.
- [x] 2. Run a fresh Whisper transcription on that file with the current model/settings.
- [x] 3. Save the generated JSON to a file in the repository.
- [x] 4. Compare DB vs fresh cues on timing metrics (`start`, `end`, total duration), ignoring names.
- [x] 5. Report differences with concrete numeric deltas.

## Review

- Audio cible identifie: `public/assets/1_7b_e.mp3` (DB `content.id=3`).
- Reanalyse Whisper executee avec `onnx-community/whisper-small_timestamped` (`task=transcribe`, `language=fr`, word timestamps).
- JSON sauve: `tmp/whisper-reanalysis-content-3.json`.
- Comparaison DB vs reanalyse (noms ignores):
  - `freshCount=54`, `dbCount=54`
  - `freshMaxEndSec=17.3`, `dbMaxEndSec=21.42`, `delta=+4.12s` en DB
  - derive limitee sur l'ensemble des cues sauf la fin (`alignedEndMaeSec=0.127s`, `alignedEndMaxAbsSec=4.12s`)
  - anomalie localisee sur le dernier cue DB: `start=17.1`, `end=21.42`.
