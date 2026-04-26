import assert from "node:assert/strict";

import { buildScene } from "../app/player/builder";
import { mapEvents } from "../app/player/builder/events";
import { INTRO, OUTRO } from "../app/config/constants";

const snapshot: any = {
	id: 1,
	title: "outro-normal-event-interpolation",
	main: 1,
	theme: { generated: "", custom: "" },
	events: {
		10: {
			[INTRO]: {
				id: 1,
				action: INTRO,
				name: "cue-intro",
				itemId: 10,
				ref: "fade",
				decorId: null
			},
			"custom-1": {
				id: 2,
				action: "custom-1",
				name: "cue-step",
				position: "start",
				itemId: 10,
				decorId: 301,
				ref: null
			},
			[OUTRO]: {
				id: 3,
				action: OUTRO,
				name: "cue-outro",
				position: "end",
				itemId: 10,
				ref: "fade",
				decorId: 302
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
				{ name: "cue-intro", text: "intro", start: 1, end: 1 },
				{ name: "cue-step", text: "step", start: 3, end: 3 },
				{ name: "cue-outro", text: "outro", start: 6, end: 6 }
			]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [10] }
	},
	items: {
		10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 300, visible: true, eventIds: [1, 2, 3] }
	},
	contents: {
		100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
	},
	decors: {
		300: { id: 300, name: null, className: null, area: null, style: { x: 20 }, itemTargetId: null, basedUpon: null },
		301: { id: 301, name: null, className: null, area: null, style: { x: 80 }, itemTargetId: null, basedUpon: null },
		302: {
			id: 302,
			name: null,
			className: null,
			area: null,
			style: { x: 140 },
			itemTargetId: null,
			basedUpon: null
		}
	}
};

const built = buildScene(snapshot);
const item = built.persos.find((entry: any) => entry?.initial?.id === "item__10");
assert.ok(item, "item__10 should be present in builder output");

const outroTween = item.actions["cue-outro-outro__tween"] as any;
assert.ok(outroTween, "outro should expose a tween action like a normal event");
assert.equal(outroTween.style.x?.from, 80, "outro tween should start from previous event decor value");
assert.equal(outroTween.style.x?.to, 140, "outro tween should end at outro decor value");

const timeline = mapEvents(snapshot);
const scheduledAt3000 = timeline.get(3000) || [];
assert.equal(
	scheduledAt3000.some((entry: any) => entry.name === "cue-outro-outro__tween"),
	true,
	"outro tween must be scheduled from previous event keyframe"
);

console.log("outro normal event interpolation smoke: all checks passed");
