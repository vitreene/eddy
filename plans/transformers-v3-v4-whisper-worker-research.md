# Transformers v3.8.x vs v4-next Whisper Worker Research Plan

- [ ] Identify official sources (npm, docs, release notes, code) for both versions.
- [ ] Collect evidence for potential breaking changes in:
- [ ] `pipeline('automatic-speech-recognition')` options (`language`, `task`, `return_timestamps='word'`).
- [ ] Streaming partial results (`WhisperTextStreamer`, callback APIs).
- [ ] Model loading options (`dtype`, `device`, quantization).
- [ ] Env/config behavior and defaults.
- [ ] Model namespace expectations (`Xenova/*` vs `onnx-community/*`).
- [ ] ONNX Runtime/package changes that impact browser-worker builds.
- [ ] Compare findings and classify as confirmed break / unchanged / unknown.
- [ ] Produce final report with concrete links and uncertainty flags.

## Review

- Pending.
