import assert from "node:assert/strict";

import { OUTRO } from "../app/config/constants";
import { resolveEffectiveEventForAction } from "../app/provider/scene-logic.helpers";

const scene: any = {
	id: 1,
	title: "implicit-outro-no-cues-effective-event",
	main: 1,
	events: {
		10: {
			intro: { id: 1, action: "intro", name: null, itemId: 10, ref: "fade", decorId: null }
		}
	},
	sceneContents: {},
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

const effectiveOutro = resolveEffectiveEventForAction(scene, 10, OUTRO);
assert.ok(effectiveOutro, "outro should resolve an effective event even without cues");
assert.equal(effectiveOutro?.action, OUTRO, "effective event should preserve outro action");
assert.equal(effectiveOutro?.name, null, "effective event fallback without cues keeps name null");

console.log("implicit outro no cues effective event smoke: all checks passed");
