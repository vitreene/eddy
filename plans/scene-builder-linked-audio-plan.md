# Plan — Include scene-linked sound in builder payload

## Objective

When a scene has a linked sound through `sceneContents`, builder output sent to the Player should also include that sound as a renderable perso.

## Steps

- [x] 1. Locate builder entrypoint and add a scene-level sound renderable derivation from active `sceneContent`.
- [x] 2. Ensure no duplicate is added when the linked content is missing/invalid/not `sound`.
- [x] 3. Add/adjust smoke test coverage for this builder behavior.
- [x] 4. Run targeted verification tests.

## Definition of done

- `buildScene` includes a `P.SOUND` perso for the scene-linked sound content.
- Existing builder behavior stays unchanged for scenes without linked sound.
- Relevant tests pass.

## Review

- Added `createSceneSoundRenderable` in `app/player/builder/renderables.ts` and inserted it into the renderables list before capsule/item traversal.
- Scene-linked content is now resolved from active `sceneContent`; builder adds a `P.SOUND` perso only when the linked content exists and `type === "sound"`.
- Added dedicated smoke coverage in `tests/scene-linked-sound-builder-smoke.ts`, including positive (`sound`) and negative (`non-sound`) assertions.
- Verification run: `npx tsx tests/scene-linked-sound-builder-smoke.ts && npx tsx tests/builder-slot-style-smoke.ts` (pass).
