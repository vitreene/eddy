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

## Generated `ed-static-*` classes

The builder generates deterministic classes named `ed-static-<hash>` for style keys that are treated as static (non-animatable in timeline actions).

### Why this exists

- keep runtime animation payload focused on animatable keys (`x`, `y`, `scale`, etc.)
- avoid repeating long inline static declarations on every node
- ensure stable class reuse when multiple decors share the same static style subset

### How the class name is computed

1. `extractStaticStyleEntries(style)` keeps only managed static keys from `NON_ANIMATABLE_MANAGED_STYLE_KEYS`.
2. Entries are sorted by key for deterministic ordering.
3. A signature string is built: `"key:value;key:value;..."`.
4. `hashString(signature)` computes an integer rolling hash (`hash = hash * 31 + charCode`).
5. The hash is converted to base36 and prefixed: `ed-static-${base36Hash}`.

Example:

- class: `ed-static-josgry`
- meaning: `josgry` is a base36 hash suffix, not a semantic token.

### Where it is used

- class generation: `styles.ts:getStaticStyleClassName`
- class attachment: `styles.ts:buildDynamicClassName`
- css emission: `styles.ts:buildStaticStyleClassDefinitions`

### Important behavior

- same static style signature -> same `ed-static-*` class
- different static style signature -> different class
- hash collisions are theoretically possible but unlikely in current usage

## Design rule

Keep `buildScene` declarative and move business detail to focused modules.
If logic is shared between capsules and items, prefer adding it in `entities.ts` (or `lib.ts` if generic).
