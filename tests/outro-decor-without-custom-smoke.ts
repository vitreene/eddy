import assert from "node:assert/strict";

import { INTRO, OUTRO } from "../app/config/constants";
import { resolveDecorAtEventAction } from "../app/parts/item-edit/item-edit.helpers";

const context: any = {
	id: 1,
	events: {
		10: {
			[INTRO]: { id: 1, action: INTRO, name: "cue-intro", itemId: 10, decorId: null },
			[OUTRO]: { id: 2, action: OUTRO, name: "cue-outro", itemId: 10, decorId: 301 }
		}
	},
	decors: {
		300: {
			id: 300,
			className: "base-class",
			area: "cell-r1-c1",
			style: { backgroundColor: "#ff0000", fontSize: "4.1cqw" }
		},
		301: {
			id: 301,
			className: "outro-class",
			area: "cell-r1-c2",
			style: { backgroundColor: "#017AFC" }
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
				{ name: "cue-outro", text: "", start: 6, end: 6 }
			]
		}
	}
};

const itemDecor = context.decors[300];
const resolvedOutro = resolveDecorAtEventAction(context, 10, OUTRO, itemDecor) as any;

assert.equal(resolvedOutro.className, "outro-class", "outro className should override base even without custom events");
assert.equal(resolvedOutro.area, "cell-r1-c2", "outro area should override base even without custom events");
assert.equal(
	resolvedOutro.style.backgroundColor,
	"#017AFC",
	"outro background color should override base even without custom events"
);
assert.equal(
	resolvedOutro.style.fontSize,
	"4.1cqw",
	"unmodified base style properties should still be preserved"
);

console.log("outro decor without custom smoke: all checks passed");
