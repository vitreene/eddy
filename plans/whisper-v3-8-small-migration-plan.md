# Plan d'action — Migration Whisper v3.8.1 + whisper-small

## Objectif

Migrer le pipeline Whisper utilise par l'application vers `@huggingface/transformers@3.8.1`, avec le modele `onnx-community/whisper-small`, tout en garantissant:

- timestamps mot-a-mot (`return_timestamps: "word"`),
- prise en charge FR/EN (au minimum),
- absence d'impact sur les composants demo React existants (hors perimetre).

## Perimetre

- Inclus
  - `app/whisper/worker.js` (migration API v3 et streaming)
  - `app/whisper/transcribe-to-cues.ts` (defaults/options/model)
  - `package.json` + lockfile (dependance transformers)
- Exclu
  - `app/whisper/components/*`
  - `app/whisper/hooks/*`
  - redesign UI / refactor TypeScript global hors Whisper runtime

## Plan detaille

- [x] 1. Basculer la dependance `@xenova/transformers` vers `@huggingface/transformers@3.8.1`.
- [x] 2. Refactorer le worker vers les primitives v3 (`pipeline`, `env`, `WhisperTextStreamer`, `dtype`).
- [x] 3. Supprimer les callbacks v2 (`callback_function`, `chunk_callback`, `quantized`) et adapter le flux de messages worker.
- [x] 4. Forcer la transcription mot-a-mot avec `return_timestamps: "word"` et conserver `task: "transcribe"`.
- [x] 5. Definir `onnx-community/whisper-small` comme modele par defaut et conserver FR/EN via `language` (ou autodetection).
- [x] 6. Verifier rapidement l'integration (installation deps + checks cibles) et documenter le resultat.

## Definition de fini

- Runtime Whisper compile avec `@huggingface/transformers@3.8.1`.
- Le worker ne depend plus des APIs v2 retirees.
- Le modele par defaut est `onnx-community/whisper-small`.
- Les sorties exploitent des timestamps mot-a-mot pour la generation de cues.

## Review (a completer apres implementation)

- Resultat:
  - Migration worker terminee vers `@huggingface/transformers@3.8.1` avec `WhisperTextStreamer` et suppression des callbacks v2.
  - Modele par defaut passe a `onnx-community/whisper-small`.
  - Parametrage transcription aligne pour sorties mot-a-mot (`return_timestamps: "word"`) et langues via `language` (FR/EN explicites ou autodetection).
- Verifications executees:
  - `npm install` (OK, lockfile mis a jour).
  - `npm ls @huggingface/transformers` (OK: `3.8.1`).
  - `npm ls @xenova/transformers` (OK: absent).
  - `npm run typecheck` (KO sur erreurs preexistantes hors perimetre Whisper runtime actif, notamment `app/whisper/components/*` et des tests smoke non relies a cette migration).
