import assert from "node:assert/strict";

import type { SceneComp } from "../app/api/db";
import { buildScene } from "../app/player/builder";

function createVideoScene(): SceneComp {
	return {
		id: 1,
		title: "video-default-fit",
		main: 1,
		events: {},
		sceneContents: {
			1: {
				id: 1,
				contentId: 100,
				sceneId: 1,
				order: 1,
				events: [{ name: "intro", text: "", start: 0, end: 5 }]
			}
		},
		capsules: {
			1: { id: 1, name: "main", type: "carrousel" as any, grid: "ed-grid-w1-h1", itemIds: [10] } as any
		},
		items: {
			10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 10, visible: true, eventIds: [] } as any
		},
		contents: {
			100: {
				id: 100,
				name: "video-1",
				type: "video",
				path: "media/video.mp4",
				inner: null,
				lang: null,
				timestamp: "[]",
				capsuleId: null
			} as any
		},
		decors: {
			10: { id: 10, name: null, className: "", area: "", style: {}, itemTargetId: null, basedUpon: null } as any
		}
	};
}

const built = buildScene(createVideoScene());
const videoPerso = built.persos.find((perso: any) => perso?.initial?.id === "item__10") as any;

assert.ok(videoPerso, "video item should be built");
assert.equal(videoPerso.type, "VIDEO");
assert.equal(String(videoPerso.initial.className || "").includes("ed-video"), true);
assert.equal(typeof videoPerso.initial.style.display, "undefined");
assert.equal(typeof videoPerso.initial.style.width, "undefined");
assert.equal(typeof videoPerso.initial.style.height, "undefined");
assert.equal(videoPerso.initial.style.objectFit, "contain");

console.log("video default fit smoke: all checks passed");
