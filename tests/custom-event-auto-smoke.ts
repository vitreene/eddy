import assert from "node:assert/strict";

import { buildScene } from "../app/player/builder";
import { parseCustomEventMoveOptions, serializeCustomEventMoveOptions } from "../app/config/custom-events";

const encoded = serializeCustomEventMoveOptions({ autoMove: true, clearTransforms: true });
const decoded = parseCustomEventMoveOptions(encoded);
assert.equal(decoded.autoMove, true);
assert.equal(decoded.clearTransforms, true);

const scene: any = {
	id: 1,
	title: "custom-auto",
	main: 1,
	theme: { generated: "", custom: "" },
	events: {
		10: {
			intro: { id: 1, action: "intro", name: "cue-intro", itemId: 10, ref: "fade", decorId: null },
			"custom-1": {
				id: 2,
				action: "custom-1",
				name: "cue-step-1",
				position: "start",
				itemId: 10,
				decorId: 101,
				ref: encoded
			},
			"custom-2": {
				id: 3,
				action: "custom-2",
				name: "cue-step-2",
				position: "start",
				itemId: 10,
				decorId: 102,
				ref: encoded
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
				{ name: "cue-intro", text: "intro", start: 0.5, end: 0.5 },
				{ name: "cue-step-1", text: "step1", start: 2, end: 2 },
				{ name: "cue-step-2", text: "step2", start: 4, end: 4 }
			]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [10] }
	},
	items: {
		10: { id: 10, order: 1000, visible: true, contentId: 100, capsuleId: 1, decorId: 100, eventIds: [1, 2] }
	},
	contents: {
		100: { id: 100, name: "logo", type: "img", path: "/logo.png", inner: null, lang: null, capsuleId: null }
	},
	decors: {
		100: {
			id: 100,
			name: null,
			className: null,
			area: "cell-r1-c1",
			style: { scaleX: 2, scaleY: 2 },
			itemTargetId: null,
			basedUpon: null
		},
		101: {
			id: 101,
			name: null,
			className: null,
			area: "cell-r2-c2",
			style: { scaleX: 2, scaleY: 2 },
			itemTargetId: null,
			basedUpon: null
		},
		102: {
			id: 102,
			name: null,
			className: null,
			area: "cell-r1-c1",
			style: { scaleX: 2, scaleY: 2 },
			itemTargetId: null,
			basedUpon: null
		}
	}
};

const built = buildScene(scene);
const item = built.persos.find((p: any) => p?.initial?.id === "item__10");
assert.ok(item, "item__10 should be present");

const keyframeAction = item.actions["cue-step-2-custom-2"] as any;
assert.ok(keyframeAction, "custom auto keyframe action should exist");
assert.deepEqual(keyframeAction.move, { mode: "auto", clearTransforms: true });

const tweenAction = item.actions["cue-step-2-custom-2__tween"] as any;
assert.ok(tweenAction, "custom auto tween action should exist");
assert.equal(
	typeof tweenAction.style.x,
	"undefined",
	"x interpolation must be removed from style when auto move is used"
);
assert.equal(tweenAction.style.scaleX?.to, 1, "clearTransforms should reset scaleX to 1");
assert.equal(tweenAction.style.scaleY?.to, 1, "clearTransforms should reset scaleY to 1");

console.log("custom event auto smoke: all checks passed");
