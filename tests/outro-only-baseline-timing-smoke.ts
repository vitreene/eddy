import assert from "node:assert/strict";

import { buildScene } from "../app/player/builder";
import { mapEvents } from "../app/player/builder/events";
import { OUTRO } from "../app/config/constants";

const snapshot: any = {
	id: 1,
	title: "outro-only-baseline-timing",
	main: 1,
	theme: { generated: "", custom: "" },
	events: {
		10: {
			[OUTRO]: {
				id: 1,
				action: OUTRO,
				name: "cue-outro",
				position: "end",
				itemId: 10,
				ref: "fade",
				decorId: 301
			}
		}
	},
	sceneContents: {
		1: {
			id: 1,
			contentId: 100,
			sceneId: 1,
			order: 1,
			events: [{ name: "cue-outro", text: "", start: 5, end: 5 }]
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
		300: { id: 300, name: null, className: "base", area: null, style: { backgroundColor: "#ff0000" } },
		301: { id: 301, name: null, className: "target", area: null, style: { backgroundColor: "#0000ff" } }
	}
};

const built = buildScene(snapshot);
const item = built.persos.find((entry: any) => entry?.initial?.id === "item__10");
assert.ok(item, "item__10 should be present");

const outroTween = item.actions["cue-outro-outro__tween"] as any;
assert.ok(outroTween, "outro-only item should produce tween action");
assert.equal(
	Number(outroTween.style?.backgroundColor?.duration),
	4500,
	"outro-only tween duration should use implicit intro baseline (500ms)"
);

const timeline = mapEvents(snapshot);
assert.equal(
	(timeline.get(500) || []).some((entry: any) => entry.name === "cue-outro-outro__tween"),
	true,
	"outro-only tween should start at implicit intro keyframe (500ms), not 0"
);

console.log("outro only baseline timing smoke: all checks passed");
