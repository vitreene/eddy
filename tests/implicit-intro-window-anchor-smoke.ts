import assert from "node:assert/strict";

import { INTRO, OUTRO } from "../app/config/constants";
import { computeCueForSelectedCustomEvent } from "../app/provider/scene-logic.helpers";

const scene: any = {
	id: 1,
	title: "implicit-intro-window-anchor",
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
			events: [{ name: "late-cue", text: "", start: 5, end: 6 }]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [10] }
	},
	items: {
		10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 100, visible: true, eventIds: [] }
	},
	contents: {
		100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
	},
	decors: {
		100: { id: 100, className: null, area: null, style: {}, itemTargetId: null, basedUpon: null }
	},
	active: { itemId: 10, event: INTRO, cue: null } as any
};

const introCue = computeCueForSelectedCustomEvent(scene, 10, INTRO);
const outroCue = computeCueForSelectedCustomEvent(scene, 10, OUTRO);

assert.equal(introCue, 0.5, "implicit intro should anchor on effective window start, not nearest scene cue");
assert.equal(outroCue, 5.5, "implicit outro should anchor at window end - default duration");

console.log("implicit intro window anchor smoke: all checks passed");
