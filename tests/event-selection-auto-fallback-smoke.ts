import assert from "node:assert/strict";

import { INTRO, OUTRO } from "../app/config/constants";
import { computeCueForSelectedCustomEvent } from "../app/provider/scene-logic.helpers";

const scene: any = {
	id: 1,
	title: "event-selection-auto-fallback",
	main: 1,
	events: {
		10: {
			[INTRO]: { id: 1, action: INTRO, name: null, itemId: 10, ref: "fade", decorId: null },
			[OUTRO]: { id: 2, action: OUTRO, name: null, itemId: 10, ref: "fade", decorId: null }
		}
	},
	sceneContents: {
		1: {
			id: 1,
			contentId: 100,
			sceneId: 1,
			order: 1,
			events: [{ name: "cue-any", text: "", start: 0, end: 10 }]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [10] }
	},
	items: {
		10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 100, visible: true, eventIds: [1, 2] }
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

assert.equal(introCue, 0.5, "intro without cue name should resolve to effective intro anchor");
assert.equal(outroCue, 9.5, "outro without cue name should fallback to implicit outro start");

const sceneWithoutOutro: any = {
	...scene,
	events: {
		10: {
			[INTRO]: { id: 1, action: INTRO, name: null, itemId: 10, ref: "fade", decorId: null }
		}
	}
};

const missingOutroCue = computeCueForSelectedCustomEvent(sceneWithoutOutro, 10, OUTRO);
assert.equal(missingOutroCue, 9.5, "outro missing from events map should fallback to implicit outro start");

console.log("event selection auto fallback smoke: all checks passed");
