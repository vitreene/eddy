import assert from "node:assert/strict";

import { INTRO, OUTRO } from "../app/config/constants";
import { getActiveSceneContent, getSceneContentCues } from "../app/scene-runtime/scene-content";
import { resolveEffectiveItemEvents } from "../app/scene-runtime/visibility/effective-events";
import { buildEditablePointHandles } from "../app/parts/rubber/timeline-point-editor.model";

const scene: any = {
	id: 1,
	title: "effective-implicit-handles",
	main: 1,
	events: {
		10: {}
	},
	sceneContents: {
		1: {
			id: 1,
			contentId: 100,
			sceneId: 1,
			order: 1,
			events: [
				{ name: "cue-a", text: "", start: 0, end: 1 },
				{ name: "cue-b", text: "", start: 2, end: 3 },
				{ name: "cue-c", text: "", start: 4, end: 5 }
			]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [10] }
	},
	items: {
		10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 200, visible: true, eventIds: [] }
	},
	contents: {
		100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
	},
	decors: {
		200: { id: 200, name: null, className: "", area: "", style: {}, itemTargetId: null, basedUpon: null }
	}
};

const cues = getSceneContentCues(getActiveSceneContent(scene));
const effective = resolveEffectiveItemEvents(scene, 10);

assert.equal(Boolean(effective.eventMap[INTRO]), true, "implicit intro should resolve into effective event map");
assert.equal(Boolean(effective.eventMap[OUTRO]), true, "implicit outro should resolve into effective event map");

const handles = buildEditablePointHandles({ cues, events: effective.eventMap, activeEventAction: null });
const introHandle = handles.find((handle) => handle.action === INTRO);
const outroHandle = handles.find((handle) => handle.action === OUTRO);

assert.ok(introHandle, "timeline should expose intro handle from effective map");
assert.ok(outroHandle, "timeline should expose outro handle from effective map");
assert.equal(introHandle?.cueName, "cue-a", "implicit intro should anchor first cue by default");
assert.equal(outroHandle?.cueName, "cue-c", "implicit outro should anchor last cue by default");

console.log("effective implicit handles smoke: all checks passed");
