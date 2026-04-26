import assert from "node:assert/strict";

import { buildScene } from "../app/player/builder";
import { OUTRO } from "../app/config/constants";

const snapshot: any = {
	id: 1,
	title: "outro-only-initial-style-regression",
	main: 1,
	theme: { generated: "", custom: "" },
	events: {
		10: {
			[OUTRO]: {
				id: 1,
				action: OUTRO,
				name: "cue-outro",
				itemId: 10,
				ref: "fade",
				decorId: 301,
				position: "end"
			}
		}
	},
	sceneContents: {
		1: {
			id: 1,
			contentId: 100,
			sceneId: 1,
			order: 1,
			events: [{ name: "cue-outro", text: "out", start: 5, end: 5 }]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [10] }
	},
	items: {
		10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 300, visible: true, eventIds: [1] }
	},
	contents: {
		100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
	},
	decors: {
		300: { id: 300, name: null, className: "base-class", area: "cell-r1-c1", style: { backgroundColor: "#ff0000" } },
		301: {
			id: 301,
			name: null,
			className: "outro-class",
			area: "cell-r1-c2",
			style: { backgroundColor: "#0000ff" }
		}
	}
};

const built = buildScene(snapshot);
const item = built.persos.find((entry: any) => entry?.initial?.id === "item__10");
assert.ok(item, "item__10 should be present in builder output");

assert.equal(item.initial.style?.backgroundColor, "#ff0000", "initial style should stay on base decor");
const initialClassName = typeof item.initial.className === "string" ? item.initial.className : "";
assert.equal(initialClassName.includes("base-class"), true, "initial class should stay on base decor");

const tween = item.actions["cue-outro-outro__tween"] as any;
assert.ok(tween, "outro-only should still produce transition tween");
assert.equal(tween.style.backgroundColor?.from, "#ff0000");
assert.equal(tween.style.backgroundColor?.to, "#0000ff");

console.log("outro only initial style regression smoke: all checks passed");
