# Plan — Standard SUSTAIN event

## Objective

Add a new standard event `SUSTAIN` (between intro/outro) that can apply a long-running effect over the item lifespan (`intro.end` -> `outro.start`).

## Functional scope

- Standard action key: `sustain`.
- Effect is optional by default (`null` / no effect).
- First effect implementation: `zoom`.
- Persist effect config in `event.ref` as JSON:
  - `{ "name": "zoom", "in": <number>, "out": <number> }`
- UI in EventParams (only for sustain):
  - effect selector (`none`, `zoom`),
  - slider for scale target in `[1, 1.5]`,
  - direction selector (`initial`, `final`) with default `final`.
- Runtime rule:
  - `final`: scale `1 -> value`
  - `initial`: scale `value -> 1`
- If item has any custom event, sustain effect is ignored.

## Technical scope

- [x] Add `SUSTAIN` constant and include it in standard event kinds.
- [x] Add effect config module (registry/model/parser/serializer/builders) for sustain effects.
- [x] Update Event UI to display and edit sustain parameters.
- [x] Update persistence normalization (`addEventToContent`) for sustain `ref` format.
- [x] Update player builder timing + action generation for sustain effect.
- [x] Ensure no sustain action applied when custom events exist.
- [x] Validate with typecheck.

## Notes on model configuration

The effect model will be function-based and extensible:

- `SUSTAIN_EFFECTS[name] = { parseRef, toRef, buildStyle }`
- each effect controls:
  - its own validated payload shape,
  - serialization format into `ref`,
  - runtime style interpolation builder.

For now, only `zoom` is registered.

## Review

- New constant + event kind wired:
  - `app/config/constants.ts`
  - `app/config/custom-events.ts`
- Configurable sustain effect model added:
  - `app/config/event-effects.ts`
- Event editor exposes sustain controls and persistence through `events-update`:
  - `app/parts/event-edit/index.tsx`
- DB event normalization now keeps `action: sustain` and normalizes `ref` through sustain parser:
  - `app/api/db.ts`
- Runtime sustain timing/effect integration in builder:
  - `app/player/builder/events.ts`
  - `app/player/builder/entities.ts`
- Sustain ignored when custom events are present (item-level rule) in builder action generation.
- Verification:
  - `npm run typecheck` passes.
