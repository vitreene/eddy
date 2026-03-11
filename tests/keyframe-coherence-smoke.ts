import assert from "node:assert/strict";

import { buildScene } from "../app/player/builder";

const scene: any = {
	id: 1,
	title: "keyframe-coherence",
	main: 1,
	theme: { generated: "", custom: "" },
	events: {
		10: {
			intro: { id: 1, action: "intro", name: "cue-intro", itemId: 10, ref: "fade", decorId: null },
			"custom-1": {
				id: 2,
				action: "custom-1",
				name: "cue-a",
				position: "start",
				itemId: 10,
				decorId: 101,
				ref: null
			},
			"custom-2": {
				id: 3,
				action: "custom-2",
				name: "cue-b",
				position: "start",
				itemId: 10,
				decorId: 102,
				ref: null
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
				{ name: "cue-a", text: "A", start: 2, end: 2 },
				{ name: "cue-b", text: "B", start: 4, end: 4 }
			]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [10] }
	},
	items: {
		10: { id: 10, order: 1000, visible: true, contentId: 100, capsuleId: 1, decorId: 100, eventIds: [1, 2, 3] }
	},
	contents: {
		100: { id: 100, name: "logo", type: "img", path: "/logo.png", inner: null, lang: null, capsuleId: null }
	},
	decors: {
		100: {
			id: 100,
			name: null,
			className: "base",
			area: "cell-r1-c1",
			style: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
			itemTargetId: null,
			basedUpon: null
		},
		101: {
			id: 101,
			name: null,
			className: "step-a",
			area: "cell-r1-c2",
			style: { x: 120, y: 20, scaleX: 1.2, scaleY: 1.2 },
			itemTargetId: null,
			basedUpon: null
		},
		102: {
			id: 102,
			name: null,
			className: "step-b",
			area: "cell-r2-c2",
			style: { x: 220, y: 60, scaleX: 0.9, scaleY: 0.9 },
			itemTargetId: null,
			basedUpon: null
		}
	}
};

const built = buildScene(scene);
const item = built.persos.find((p: any) => p?.initial?.id === "item__10") as any;
assert.ok(item, "item__10 should be present");

const key1 = item.actions["cue-a-custom-1"] as any;
const tween1 = item.actions["cue-a-custom-1__tween"] as any;
const key2 = item.actions["cue-b-custom-2"] as any;
const tween2 = item.actions["cue-b-custom-2__tween"] as any;

assert.ok(tween1?.style, "custom-1 tween action should carry style interpolation");
assert.equal(typeof tween1.className, "undefined", "custom-1 tween must not carry className change");
assert.equal(typeof tween1.move, "undefined", "custom-1 tween must not carry move change");

assert.ok(key1, "custom-1 keyframe action should exist");
assert.equal(typeof key1.style, "undefined", "custom-1 keyframe must not carry style interpolation");
assert.equal(typeof key1.className, "object", "custom-1 keyframe should carry className diff");
assert.equal(typeof key1.move, "object", "custom-1 keyframe should carry move:auto");

assert.ok(tween2?.style, "custom-2 tween action should carry style interpolation");
assert.equal(typeof tween2.className, "undefined", "custom-2 tween must not carry className change");
assert.equal(typeof tween2.move, "undefined", "custom-2 tween must not carry move change");

assert.ok(key2, "custom-2 keyframe action should exist");
assert.equal(typeof key2.style, "undefined", "custom-2 keyframe must not carry style interpolation");
assert.equal(typeof key2.className, "object", "custom-2 keyframe should carry className diff");
assert.equal(typeof key2.move, "object", "custom-2 keyframe should carry move:auto");

const at500Raw = built.events.get(500);
const at2000Raw = built.events.get(2000);
const at4000Raw = built.events.get(4000);
const at500 = Array.isArray(at500Raw) ? at500Raw : at500Raw ? [at500Raw] : [];
const at2000 = Array.isArray(at2000Raw) ? at2000Raw : at2000Raw ? [at2000Raw] : [];
const at4000 = Array.isArray(at4000Raw) ? at4000Raw : at4000Raw ? [at4000Raw] : [];

assert.equal(
	at500.some((entry: any) => entry.name === "cue-a-custom-1__tween"),
	true,
	"custom-1 tween marker should start at previous keyframe"
);
assert.equal(
	at500.some((entry: any) => entry.name === "cue-a-custom-1"),
	false,
	"custom-1 keyframe marker must not fire at previous keyframe"
);

assert.equal(
	at2000.some((entry: any) => entry.name === "cue-a-custom-1"),
	true,
	"custom-1 keyframe marker should fire at cue-a"
);
assert.equal(
	at2000.some((entry: any) => entry.name === "cue-b-custom-2__tween"),
	true,
	"custom-2 tween marker should start at cue-a"
);

assert.equal(
	at4000.some((entry: any) => entry.name === "cue-b-custom-2"),
	true,
	"custom-2 keyframe marker should fire at cue-b"
);

console.log("keyframe coherence smoke: all checks passed");
