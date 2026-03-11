import assert from "node:assert/strict";

import { INTRO, OUTRO } from "../app/config/constants";
import { resolveDecorAtEventAction } from "../app/parts/item-edit/item-edit.helpers";

const context: any = {
	id: 1,
	events: {
		55: {
			[INTRO]: { id: 1, action: INTRO, name: null, itemId: 55, decorId: null },
			"custom-1": { id: 2, action: "custom-1", name: "a", position: "middle", itemId: 55, decorId: 86 },
			"custom-2": { id: 3, action: "custom-2", name: "b", position: "middle", itemId: 55, decorId: 87 },
			[OUTRO]: { id: 4, action: OUTRO, name: null, itemId: 55, decorId: null }
		}
	},
	decors: {
		84: { id: 84, area: "cell-r2-c1", className: null, style: {} },
		86: { id: 86, area: "cell-r2-c2", className: null, style: {} },
		87: { id: 87, area: "cell-r1-c1", className: null, style: {} }
	},
	sceneContents: {
		1: {
			id: 1,
			sceneId: 1,
			contentId: 100,
			order: 1,
			events: [
				{ name: "a", text: "", start: 3.4, end: 3.56 },
				{ name: "b", text: "", start: 5.44, end: 6.16 }
			]
		}
	}
};

const itemDecor: any = context.decors[84];

const introDecor = resolveDecorAtEventAction(context, 55, INTRO, itemDecor) as any;
assert.equal(introDecor.area, "cell-r2-c1", "intro should resolve base decor area");

const custom2Decor = resolveDecorAtEventAction(context, 55, "custom-2", itemDecor) as any;
assert.equal(custom2Decor.area, "cell-r1-c1", "custom-2 should resolve current custom area");

const outroDecor = resolveDecorAtEventAction(context, 55, OUTRO, itemDecor) as any;
assert.equal(outroDecor.area, "cell-r1-c1", "outro should resolve last custom area before outro transition");

console.log("item edit decor resolution smoke: all checks passed");
