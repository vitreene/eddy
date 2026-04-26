import assert from "node:assert/strict";

import { buildScene } from "../app/player/builder";
import { mapEvents } from "../app/player/builder/events";
import { INTRO, OUTRO } from "../app/config/constants";

const snapshot: any = {
	id: 1,
	title: "outro-slot-move-timing",
	main: 1,
	theme: { generated: "", custom: "" },
	events: {
		10: {
			[INTRO]: { id: 1, action: INTRO, name: "cue-intro", itemId: 10, ref: "fade", decorId: null },
			[OUTRO]: {
				id: 2,
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
			events: [
				{ name: "cue-intro", text: "", start: 1, end: 1 },
				{ name: "cue-outro", text: "", start: 6, end: 6 }
			]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: "position", grid: "ed-grid-w2-h1", itemIds: [10] }
	},
	items: {
		10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 300, visible: true, eventIds: [1, 2] }
	},
	contents: {
		100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
	},
	decors: {
		300: {
			id: 300,
			name: null,
			className: "cell-span-r1-c1-rs1-cs1",
			area: "cell-r1-c1",
			style: { backgroundColor: "#ff0000" },
			itemTargetId: null,
			basedUpon: null
		},
		301: {
			id: 301,
			name: null,
			className: "cell-span-r1-c2-rs1-cs1",
			area: "cell-r1-c2",
			style: { backgroundColor: "#0000ff" },
			itemTargetId: null,
			basedUpon: null
		}
	}
};

const built = buildScene(snapshot);
const item = built.persos.find((entry: any) => entry?.initial?.id === "item__10");
assert.ok(item, "item__10 should be present in builder output");

const outroTween = item.actions["cue-outro-outro__tween"] as any;
const outroAction = item.actions["cue-outro-outro"] as any;

assert.ok(outroTween, "outro tween action should exist");
assert.deepEqual(outroTween.move, { mode: "auto" }, "slot move should be attached to outro tween action");
assert.equal(Boolean(outroTween.className), true, "slot class diff should be attached to outro tween action");

assert.equal(typeof outroAction?.move, "undefined", "outro keyframe action should not carry move anymore");
assert.equal(
	typeof outroAction?.className,
	"undefined",
	"outro keyframe action should not carry className diff anymore"
);

const timeline = mapEvents(snapshot);
const introKeyframeMs = 1500;
assert.equal(
	(timeline.get(introKeyframeMs) || []).some((entry: any) => entry.name === "cue-outro-outro__tween"),
	true,
	"outro slot tween should be scheduled from intro keyframe"
);

console.log("outro slot move timing smoke: all checks passed");
