import assert from "node:assert/strict";

import type { SceneComp } from "../app/api/db";
import { buildScene } from "../app/player/builder";

function createBaseScene(): SceneComp {
	return {
		id: 1,
		title: "scene-linked-sound",
		main: 1,
		events: {},
		sceneContents: {
			10: {
				id: 10,
				contentId: 500,
				sceneId: 1,
				order: 1,
				events: [{ name: "intro", text: "", start: 0, end: 5 }]
			}
		},
		capsules: {
			1: {
				id: 1,
				name: "main",
				type: null,
				grid: "ed-grid-w1-h1",
				itemIds: []
			} as any
		},
		items: {},
		contents: {
			500: {
				id: 500,
				name: "scene-audio",
				type: "sound",
				path: "media/scene-audio.mp3",
				inner: null,
				lang: null,
				timestamp: "[]",
				capsuleId: null
			} as any
		},
		decors: {}
	};
}

const sceneWithSound = buildScene(createBaseScene());
const sceneSoundPerso = sceneWithSound.persos.find(
	(perso: any) => perso?.initial?.id === "scene-sound__10"
) as any;

assert.ok(sceneSoundPerso, "scene-linked sound should be included in persos");
assert.equal(sceneSoundPerso.type, "VIDEO");
assert.equal(sceneSoundPerso.initial.tag, "video");
assert.equal(sceneSoundPerso.initial.move, "container-scene");
assert.equal(typeof sceneSoundPerso.initial.src, "string");
assert.equal(sceneSoundPerso.initial.src.includes("scene-audio.mp3"), true);
assert.equal(sceneSoundPerso.initial.attr?.hidden, "hidden");
assert.deepEqual(sceneSoundPerso.actions.intro?.media, {
	action: "play",
	changeAt: 0,
	offset: 0
});

const sceneWithoutSound = createBaseScene();
sceneWithoutSound.contents[500].type = "img" as any;

const builtWithoutSound = buildScene(sceneWithoutSound);
const missingSceneSound = builtWithoutSound.persos.find(
	(perso: any) => perso?.initial?.id === "scene-sound__10"
);
assert.equal(Boolean(missingSceneSound), false, "non-sound scene content must not create scene sound perso");

console.log("scene linked sound builder smoke: all checks passed");
