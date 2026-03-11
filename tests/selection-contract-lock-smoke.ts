import assert from "node:assert/strict";

import { INTRO, OUTRO } from "../app/config/constants";
import { computeCueForSelectedCustomEvent } from "../app/provider/scene-logic.helpers";
import { resolveDecorAtEventAction } from "../app/parts/item-edit/item-edit.helpers";

const fixture: any = {
	id: 1,
	title: "selection-contract-lock",
	main: 1,
	events: {
		55: {
			[INTRO]: { id: 1, action: INTRO, name: "cue-intro", itemId: 55, ref: "fade", decorId: null },
			"custom-1": { id: 2, action: "custom-1", name: "cue-a", position: "middle", itemId: 55, decorId: 86 },
			"custom-2": { id: 3, action: "custom-2", name: "cue-b", position: "middle", itemId: 55, decorId: 87 },
			[OUTRO]: { id: 4, action: OUTRO, name: "cue-outro", itemId: 55, ref: "fade", decorId: null }
		}
	},
	sceneContents: {
		1: {
			id: 1,
			sceneId: 1,
			contentId: 100,
			order: 1,
			events: [
				{ name: "cue-intro", text: "", start: 1, end: 1 },
				{ name: "cue-a", text: "", start: 3.4, end: 3.56 },
				{ name: "cue-b", text: "", start: 5.44, end: 6.16 },
				{ name: "cue-outro", text: "", start: 6.16, end: 6.16 }
			]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w2-h2", itemIds: [55] }
	},
	items: {
		55: {
			id: 55,
			order: 1000,
			contentId: 100,
			capsuleId: 1,
			decorId: 84,
			visible: true,
			eventIds: [1, 2, 3, 4]
		}
	},
	contents: {
		100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
	},
	decors: {
		84: { id: 84, area: "cell-r2-c1", className: null, style: {} },
		86: { id: 86, area: "cell-r2-c2", className: null, style: {} },
		87: { id: 87, area: "cell-r1-c1", className: null, style: {} }
	},
	active: { itemId: 55, event: INTRO, cue: 0 } as any
};

const introCue = computeCueForSelectedCustomEvent(fixture, 55, INTRO);
const custom2Cue = computeCueForSelectedCustomEvent(fixture, 55, "custom-2");
const outroCue = computeCueForSelectedCustomEvent(fixture, 55, OUTRO);

assert.equal(introCue, 1.5, "intro should anchor at intro start + default duration");
assert.equal(custom2Cue, 5.799, "custom should anchor pre-FLIP (1ms before keyframe)");
assert.equal(outroCue, 5.66, "outro should anchor at outro start (end - default duration)");

const introDecor = resolveDecorAtEventAction(fixture, 55, INTRO, fixture.decors[84] as any) as any;
const custom2Decor = resolveDecorAtEventAction(fixture, 55, "custom-2", fixture.decors[84] as any) as any;
const outroDecor = resolveDecorAtEventAction(fixture, 55, OUTRO, fixture.decors[84] as any) as any;

assert.equal(introDecor.area, "cell-r2-c1", "intro should resolve base area");
assert.equal(custom2Decor.area, "cell-r1-c1", "custom-2 should resolve current custom area");
assert.equal(outroDecor.area, "cell-r1-c1", "outro should resolve last custom area before transition");

console.log("selection contract lock smoke: all checks passed");
