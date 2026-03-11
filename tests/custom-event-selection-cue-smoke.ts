import assert from "node:assert/strict";

import { computeCueForSelectedCustomEvent } from "../app/provider/scene-logic.helpers";
import { getNodeVisibilityWindow } from "../app/provider/active-cue";
import { INTRO, OUTRO } from "../app/config/constants";

const scene: any = {
	id: 1,
	title: "custom-event-selection-cue",
	main: 1,
	events: {
		39: {
			[INTRO]: { id: 1, action: INTRO, name: "cue-intro", itemId: 39, ref: "fade", decorId: null },
			[OUTRO]: { id: 2, action: OUTRO, name: "cue-outro", itemId: 39, ref: "fade", decorId: null },
			"custom-1": {
				id: 3,
				action: "custom-1",
				name: "cue-vu",
				position: "end",
				itemId: 39,
				decorId: 80,
				ref: '{"auto":false,"clearTransforms":false}'
			} as any,
			"custom-2": {
				id: 4,
				action: "custom-2",
				name: "cue-next",
				position: "start",
				itemId: 39,
				decorId: 81,
				ref: '{"auto":false,"clearTransforms":false}'
			} as any
		}
	},
	sceneContents: {
		1: {
			id: 1,
			contentId: 100,
			sceneId: 1,
			order: 1,
			events: [
				{ name: "cue-intro", text: "intro", start: 0.5, end: 0.5 },
				{ name: "cue-vu", text: "vu", start: 0.66, end: 0.92 },
				{ name: "cue-next", text: "next", start: 1.78, end: 1.78 },
				{ name: "cue-outro", text: "outro", start: 3, end: 3.22 }
			]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [39] } as any
	},
	items: {
		39: {
			id: 39,
			order: 1000,
			contentId: 100,
			capsuleId: 1,
			decorId: 41,
			visible: true,
			eventIds: [1, 2, 3, 4]
		}
	},
	contents: {
		100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
	},
	decors: {
		41: { id: 41, className: null, area: "cell-r1-c2", style: {}, itemTargetId: null, basedUpon: null },
		80: { id: 80, className: null, area: null, style: { x: 120, y: 199 }, itemTargetId: null, basedUpon: null },
		81: { id: 81, className: null, area: null, style: { x: 320, y: 199 }, itemTargetId: null, basedUpon: null }
	},
	active: { itemId: 39, event: "custom-1", cue: null } as any
};

const rawCue = 0.92;
const window = getNodeVisibilityWindow(scene, 39);
const selectedCue = computeCueForSelectedCustomEvent(scene, 39, "custom-1");
const introCue = computeCueForSelectedCustomEvent(scene, 39, INTRO);

assert.equal(typeof selectedCue, "number", "selected custom cue should be resolved");
assert.equal(rawCue < window.startSec, true, "fixture should place raw cue before item visible window");
assert.equal(selectedCue, window.startSec, "selection cue should be clamped to visibility window start");
assert.equal(introCue, window.startSec, "intro selection should respect visible window start");

console.log("custom event selection cue smoke: all checks passed");
