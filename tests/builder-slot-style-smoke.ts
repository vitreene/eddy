import assert from "node:assert/strict";

import { buildScene } from "../app/player/builder";

const scene: any = {
	id: 1,
	title: "slot-style",
	main: 1,
	theme: { generated: "", custom: "" },
	events: {
		10: {
			intro: { id: 1, action: "intro", name: "cue-intro", itemId: 10, ref: "fade", decorId: null },
			"custom-1": {
				id: 2,
				action: "custom-1",
				name: "cue-step",
				position: "start",
				itemId: 10,
				decorId: 101,
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
				{ name: "cue-step", text: "step", start: 2, end: 2 }
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
			style: {},
			itemTargetId: null,
			basedUpon: null
		},
		101: {
			id: 101,
			name: null,
			className: null,
			area: "cell-r2-c2",
			style: {},
			itemTargetId: null,
			basedUpon: null
		}
	}
};

const built = buildScene(scene);
const styles = built.styles ?? "";
const item = built.persos.find((p: any) => p?.initial?.id === "item__10");

assert.ok(item, "item__10 should be present in built scene");
assert.equal(styles.includes(".cell-r2-c2{"), true, "slot class .cell-r2-c2 must be generated in styles");

const customAction = item.actions["cue-step-custom-1"] as any;
const initialClassName = String(item.initial?.className || "");
const actionAddsClass = customAction?.className?.add === "cell-r2-c2";
const initialHasClass = initialClassName.split(" ").includes("cell-r2-c2");

assert.equal(
	actionAddsClass || initialHasClass,
	true,
	"slot class should be applied either in initial className or custom action className"
);

console.log("builder slot style smoke: all checks passed");
