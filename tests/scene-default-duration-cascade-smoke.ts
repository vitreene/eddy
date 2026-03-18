import assert from "node:assert/strict";

import type { SceneComp } from "@/api/db";
import { applyCapsuleDefaultItemEvents } from "@/player/builder/derivation";
import { getActiveSceneContent } from "@/scene-runtime/scene-content";
import { INTRO, OUTRO } from "@/config/constants";

const fixture = buildSceneWithoutAudioFixture();
const derived = applyCapsuleDefaultItemEvents(fixture);
const sceneContent = getActiveSceneContent(derived);

assert.ok(sceneContent, "scene sans son doit avoir un sceneContent runtime derive");

const cueByName = new Map((sceneContent?.cues || []).map((cue) => [cue.name, cue]));
const expectedWindows: Array<{ itemId: number; start: number; end: number }> = [
	{ itemId: 201, start: 0, end: 1.25 },
	{ itemId: 202, start: 1.25, end: 2.5 },
	{ itemId: 203, start: 2.5, end: 3.75 },
	{ itemId: 204, start: 3.75, end: 5 }
];

for (const window of expectedWindows) {
	const introName = derived.events[window.itemId]?.[INTRO]?.name;
	const outroName = derived.events[window.itemId]?.[OUTRO]?.name;
	assert.ok(introName, `item ${window.itemId}: intro auto doit etre present`);
	assert.ok(outroName, `item ${window.itemId}: outro auto doit etre present`);

	const introCue = cueByName.get(introName || "");
	const outroCue = cueByName.get(outroName || "");
	assert.ok(introCue, `item ${window.itemId}: cue intro doit exister`);
	assert.ok(outroCue, `item ${window.itemId}: cue outro doit exister`);

	assert.equal(Number(introCue!.start.toFixed(3)), window.start, `item ${window.itemId}: start incorrect`);
	assert.equal(Number(outroCue!.end.toFixed(3)), window.end, `item ${window.itemId}: end incorrect`);
}

console.log("scene default duration cascade smoke: all checks passed");

function buildSceneWithoutAudioFixture(): SceneComp {
	return {
		id: 9,
		title: "Scene 9",
		main: 1,
		events: {},
		sceneContents: {},
		capsules: {
			1: {
				id: 1,
				name: "__MAIN__",
				type: null,
				grid: "root-scene ed-grid-w160-h90",
				itemDurationMode: "auto",
				itemDurationSec: null,
				itemIds: [20]
			},
			2: {
				id: 2,
				name: "capsule-2",
				type: null,
				grid: "ed-grid-w2-h2",
				itemDurationMode: "auto",
				itemDurationSec: null,
				itemIds: [201, 202, 203, 204]
			}
		},
		items: {
			20: {
				id: 20,
				order: 1,
				visible: true,
				contentId: 100,
				capsuleId: 1,
				decorId: null,
				eventIds: []
			},
			201: {
				id: 201,
				order: 1,
				visible: true,
				contentId: 301,
				capsuleId: 2,
				decorId: null,
				eventIds: []
			},
			202: {
				id: 202,
				order: 2,
				visible: true,
				contentId: 302,
				capsuleId: 2,
				decorId: null,
				eventIds: []
			},
			203: {
				id: 203,
				order: 3,
				visible: true,
				contentId: 303,
				capsuleId: 2,
				decorId: null,
				eventIds: []
			},
			204: {
				id: 204,
				order: 4,
				visible: true,
				contentId: 304,
				capsuleId: 2,
				decorId: null,
				eventIds: []
			}
		},
		contents: {
			100: {
				id: 100,
				name: "capsule-content",
				type: "capsule",
				path: null,
				inner: null,
				lang: null,
				capsuleId: 2,
				timestamp: "[]"
			},
			301: {
				id: 301,
				name: "img-1",
				type: "img",
				path: "/img/1.png",
				inner: null,
				lang: null,
				capsuleId: null,
				timestamp: "[]"
			},
			302: {
				id: 302,
				name: "img-2",
				type: "img",
				path: "/img/2.png",
				inner: null,
				lang: null,
				capsuleId: null,
				timestamp: "[]"
			},
			303: {
				id: 303,
				name: "img-3",
				type: "img",
				path: "/img/3.png",
				inner: null,
				lang: null,
				capsuleId: null,
				timestamp: "[]"
			},
			304: {
				id: 304,
				name: "img-4",
				type: "img",
				path: "/img/4.png",
				inner: null,
				lang: null,
				capsuleId: null,
				timestamp: "[]"
			}
		},
		decors: {}
	};
}
