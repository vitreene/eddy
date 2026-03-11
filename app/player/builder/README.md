# Builder Architecture

This folder builds the runtime player scene from a `SceneComp` snapshot.

## Pipeline

`index.ts` orchestrates the build in ordered stages:

1. Apply runtime visibility rules
2. Derive missing intro/outro timing events
3. Build event timeline map
4. Generate CSS (theme + grid areas + static style classes)
5. Build renderable entities (capsules/items)

## Files

- `index.ts`
  - Entry point (`buildScene`)
- `derivation.ts`
  - Cue/event derivation (`applyCapsuleDefaultItemEvents`)
- `events.ts`
  - Event ordering, timing and transition preset resolution
- `styles.ts`
  - Style/class generation and interpolation helpers
- `renderables.ts`
  - Ordered traversal and renderable assembly
- `entities.ts`
  - Capsule/item payload construction
  - Shared timed action builder (`buildTimedActions`)
- `lib.ts`
  - Shared local types/helpers (`ActionStyle`, `buildEventActionName`)

## Design rule

Keep `buildScene` declarative and move business detail to focused modules.
If logic is shared between capsules and items, prefer adding it in `entities.ts` (or `lib.ts` if generic).
