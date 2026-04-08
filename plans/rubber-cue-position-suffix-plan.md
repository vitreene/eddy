# Rubber Cue Position Suffix Plan

## Scope

- Encode cue position into `event.name` for Rubber-emitted events.
- Rule: `start` keeps raw cue name, `middle`/`end` append suffix (`-middle`, `-end`).
- Waveform flow does not need to emit suffixes; it must tolerate/ignore suffixes when reading event names.
- No legacy compatibility fallback behavior beyond the new format.

## Tasks

- [x] Define and validate naming contract with user (including all events + waveform note).
- [x] Add shared helper(s) for cue-name encoding/decoding with position.
- [x] Rename `makeIntroOutroEventPayload` to a clearer, explicit name.
- [x] Update Rubber emission paths to encode `event.name` with cue position.
- [x] Update lookup/timing paths to decode suffixed names before cue resolution.
- [x] Ensure waveform paths ignore suffixes when reading event names.
- [x] Run targeted smoke tests for builder/selection/decor timing behavior.
- [x] Update lessons with user correction pattern.

## Review

- `npm run typecheck`: OK.
- `npx tsx tests/keyframe-coherence-smoke.ts`: OK.
- `npx tsx tests/custom-event-selection-cue-smoke.ts`: OK.
- `npx tsx tests/item-edit-decor-resolution-smoke.ts`: OK.
- `npx tsx tests/custom-events-smoke.ts`: OK.
- `npx tsx tests/custom-event-preflip-selection-smoke.ts`: OK (with expected local fetch URL warning in node smoke context).
- `npx tsx tests/builder-capsule-smoke.ts`: fails on existing assertion in case `custom event duration overrides interpolation duration` (missing key ending with `-custom-1`; only tween key `__tween` is present in built actions).
