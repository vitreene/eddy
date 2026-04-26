import assert from "node:assert/strict";

import { buildScene } from "../app/player/builder";
import { OUTRO } from "../app/config/constants";
import { setStaticChanges } from "../app/player/deps/static-changes";

const snapshot: any = {
	id: 1,
	title: "outro-same-position-move-merge",
	main: 1,
	theme: { generated: "", custom: "" },
	events: {
		10: {
			[OUTRO]: {
				id: 1,
				action: OUTRO,
				name: "cue-outro",
				itemId: 10,
				position: "end",
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
		1: { id: 1, name: "main", type: "position", grid: "ed-grid-w2-h1", itemIds: [10] }
	},
	items: {
		10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 300, visible: true, eventIds: [1] }
	},
	contents: {
		100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
	},
	decors: {
		300: {
			id: 300,
			name: null,
			className: "ed-caps ed-grid-w1-h1 cell-span-r1-c1-rs1-cs1",
			area: "cell-r1-c1",
			style: { backgroundColor: "#ff0000" },
			itemTargetId: null,
			basedUpon: null
		},
		301: {
			id: 301,
			name: null,
			className: "ed-caps ed-grid-w1-h1 cell-span-r1-c2-rs1-cs1",
			area: "cell-r1-c2",
			style: { backgroundColor: "#0000ff" },
			itemTargetId: null,
			basedUpon: null
		}
	}
};

const built = buildScene(snapshot);
const playerLike: any = {
	persos: new Map((built.persos || []).map((perso: any) => [perso.initial.id, perso])),
	eventtimes: built.events,
	persoChanges: new Map()
};

setStaticChanges.call(playerLike);

const changes = playerLike.persoChanges.get("item__10") as Record<number, any> | undefined;
assert.ok(changes, "perso changes should exist for item__10");

const change0 = changes?.[0]?.change || {};
assert.equal(typeof change0.move, "string", "initial change at 0 should keep parent move attach");
assert.equal(change0.move, "capsule__1", "initial change should keep parent capsule move");

const change500 = changes?.[500]?.change || {};
assert.equal(typeof change500.move, "object", "outro tween should carry move:auto from implicit intro baseline");
assert.deepEqual(change500.move, { mode: "auto" }, "change at 500 should keep auto move payload");
assert.equal(
	String(change500.className || "").includes("cell-span-r1-c2-rs1-cs1"),
	true,
	"change at 500 should target outro slot"
);
assert.equal(
	String(change500.className || "").includes("ed-grid-w1-h1"),
	true,
	"merged className should preserve non-slot base classes"
);
assert.equal(
	String(change500.className || "").includes("ed-caps"),
	true,
	"merged className should preserve capsule marker class"
);

console.log("outro same-position move merge smoke: all checks passed");
