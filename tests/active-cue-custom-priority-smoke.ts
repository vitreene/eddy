import assert from "node:assert/strict";

import { computeActiveCue } from "../app/provider/active-cue";

const scene: any = {
	id: 1,
	main: 1,
	sceneContents: {
		1: {
			id: 1,
			sceneId: 1,
			contentId: 1,
			events: [
				{ id: 1, name: "cue-intro", text: "", start: 0.5, end: 0.5 },
				{ id: 2, name: "cue-a", text: "", start: 2.24, end: 2.24 },
				{ id: 3, name: "cue-b", text: "", start: 4, end: 4 }
			]
		}
	},
	capsules: {
		1: { id: 1, itemIds: [10], type: null, grid: "ed-grid-w1-h1" }
	},
	items: {
		10: { id: 10, capsuleId: 1, contentId: 1, decorId: 1, order: 1000, visible: true }
	},
	contents: {
		1: { id: 1, type: "img", capsuleId: null }
	},
	events: {
		10: {
			"custom-1": { id: 11, itemId: 10, action: "custom-1", name: "cue-a", position: "start" },
			"custom-2": { id: 12, itemId: 10, action: "custom-2", name: "cue-b", position: "start" }
		}
	}
};

const cue = computeActiveCue(scene, 10);
assert.equal(cue, 2.24);

console.log("active cue custom priority smoke: all checks passed");
