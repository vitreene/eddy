import assert from "node:assert/strict";

import { OUTRO } from "../app/config/constants";
import { DEFAULT_TRANSITION_BY_ACTION } from "../app/config/transitions";
import { resolveEffectiveEventForAction } from "../app/provider/scene-logic.helpers";
import { buildMaterializedTransitionEventPatch } from "../app/parts/item-edit/item-edit.reset";

const scene: any = {
	id: 1,
	title: "implicit-outro-materialization",
	main: 1,
	events: {
		10: {
			intro: { id: 1, action: "intro", name: null, itemId: 10, ref: "fade", decorId: null }
		}
	},
	sceneContents: {
		1: {
			id: 1,
			contentId: 100,
			sceneId: 1,
			order: 1,
			events: [{ name: "word-1", text: "word", start: 0, end: 10 }]
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
		200: { id: 200, name: null, className: null, area: null, style: {}, itemTargetId: null, basedUpon: null }
	}
};

const resolvedOutro = resolveEffectiveEventForAction(scene, 10, OUTRO);
assert.ok(resolvedOutro, "implicit outro should resolve as an effective event");
assert.equal(typeof resolvedOutro?.name, "string", "implicit outro should resolve a cue name");
assert.equal(Boolean(resolvedOutro?.name), true, "implicit outro cue name should be non-empty");

const payload = buildMaterializedTransitionEventPatch({
	action: OUTRO,
	itemId: 10,
	explicitEvent: undefined,
	resolvedEvent: resolvedOutro
});

assert.equal(payload.action, OUTRO, "materialized payload keeps outro action");
assert.equal(payload.itemId, 10, "materialized payload keeps item id");
assert.equal(payload.name, resolvedOutro?.name, "materialized payload keeps resolved implicit cue");
assert.equal(payload.ref, DEFAULT_TRANSITION_BY_ACTION[OUTRO], "materialized payload sets default outro transition");
assert.equal(Object.prototype.hasOwnProperty.call(payload, "id"), false, "materialized payload must not carry synthetic id");

console.log("implicit outro materialization smoke: all checks passed");
