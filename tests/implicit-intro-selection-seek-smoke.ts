import assert from "node:assert/strict";
import { createActor } from "xstate";

import { INTRO } from "../app/config/constants";
import { sceneLogic } from "../app/provider/scene-logic";

const base: any = {
	id: 1,
	title: "implicit-intro-selection-seek",
	main: 1,
	events: {
		10: {
			[INTRO]: { id: 1, action: INTRO, name: null, itemId: 10, ref: "fade", decorId: null }
		}
	},
	sceneContents: {
		1: {
			id: 1,
			contentId: 100,
			sceneId: 1,
			order: 1,
			events: [{ name: "cue-any", text: "", start: 0, end: 10 }]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [10] }
	},
	items: {
		10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 200, visible: true, eventIds: [1] }
	},
	contents: {
		100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
	},
	decors: {
		200: { id: 200, name: null, className: "", area: "", style: {}, itemTargetId: null, basedUpon: null }
	},
	theme: { id: 1, generated: "", custom: "" }
};

const actor = createActor(sceneLogic, { input: base });
actor.start();
actor.send({ type: "init", payload: base });
actor.send({ type: "active-set", payload: { itemId: 10, contentId: 100 } });
actor.send({ type: "active-set", payload: { action: "play" } });
actor.send({ type: "active-set", payload: { event: INTRO } });

const active = actor.getSnapshot().context.active as any;
assert.equal(active.event, INTRO, "intro should be selected");
assert.equal(active.action, "seek", "selecting implicit intro should force a seek action");
assert.equal(active.cue, 0.5, "implicit intro selection should seek to intro anchor end");

actor.stop();

console.log("implicit intro selection seek smoke: all checks passed");
