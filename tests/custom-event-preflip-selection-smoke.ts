import assert from "node:assert/strict";

import { INTRO, OUTRO } from "../app/config/constants";
import { computeCueForSelectedCustomEvent } from "../app/provider/scene-logic.helpers";

const scene: any = {
	id: 1,
	title: "custom-preflip-selection",
	main: 1,
	events: {
		10: {
			[INTRO]: { id: 1, action: INTRO, name: "cue-intro", itemId: 10, ref: "fade", decorId: null },
			[OUTRO]: { id: 2, action: OUTRO, name: "cue-outro", itemId: 10, ref: "fade", decorId: null },
			"custom-1": {
				id: 3,
				action: "custom-1",
				name: "cue-step",
				position: "middle",
				itemId: 10,
				decorId: 101,
				ref: null
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
				{ name: "cue-intro", text: "", start: 0.5, end: 0.5 },
				{ name: "cue-step", text: "", start: 2, end: 2 },
				{ name: "cue-outro", text: "", start: 4, end: 4 }
			]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [10] } as any
	},
	items: {
		10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 100, visible: true, eventIds: [1, 2, 3] }
	},
	contents: {
		100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
	},
	decors: {
		100: { id: 100, className: null, area: null, style: {}, itemTargetId: null, basedUpon: null },
		101: { id: 101, className: null, area: null, style: { x: 200 }, itemTargetId: null, basedUpon: null }
	},
	active: { itemId: 10, event: "custom-1", cue: null } as any
};

const customCue = computeCueForSelectedCustomEvent(scene, 10, "custom-1");
assert.equal(customCue, 1.999, "custom selection should seek just before keyframe");

console.log("custom event preflip selection smoke: all checks passed");
