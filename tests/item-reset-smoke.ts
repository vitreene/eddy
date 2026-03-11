import assert from "node:assert/strict";

import { INTRO, OUTRO } from "../app/config/constants";
import { DEFAULT_TRANSITION_BY_ACTION } from "../app/config/transitions";
import {
	buildDefaultTransitionEventPatch,
	getCustomEventActions
} from "../app/parts/item-edit/item-edit.reset";

const events = {
	intro: { action: "intro", name: "cue-intro", ref: "zoom", duration: 0.7, delay: 1 } as any,
	outro: { action: "outro", name: "cue-outro", ref: "swipe-left", duration: 1.2, position: "end" } as any,
	"custom-1": { action: "custom-1", name: "cue-1", ref: null } as any,
	"custom-2": { action: "custom-2", name: "cue-2", ref: null } as any
};

const customActions = getCustomEventActions(events);
assert.deepEqual(customActions, ["custom-1", "custom-2"], "reset should target all custom actions");

const introPatch = buildDefaultTransitionEventPatch(INTRO, events.intro as any);
assert.equal(introPatch.action, INTRO, "intro patch should keep intro action");
assert.equal(introPatch.ref, DEFAULT_TRANSITION_BY_ACTION.intro, "intro patch should reset transition ref");
assert.equal(introPatch.duration, null, "intro patch should clear duration");
assert.equal(introPatch.delay, null, "intro patch should clear delay");
assert.equal(introPatch.position, null, "intro patch should clear position");
assert.equal(introPatch.name, "cue-intro", "intro patch should preserve cue name");

const outroPatch = buildDefaultTransitionEventPatch(OUTRO, events.outro as any);
assert.equal(outroPatch.action, OUTRO, "outro patch should keep outro action");
assert.equal(outroPatch.ref, DEFAULT_TRANSITION_BY_ACTION.outro, "outro patch should reset transition ref");
assert.equal(outroPatch.duration, null, "outro patch should clear duration");
assert.equal(outroPatch.delay, null, "outro patch should clear delay");
assert.equal(outroPatch.position, null, "outro patch should clear position");
assert.equal(outroPatch.name, "cue-outro", "outro patch should preserve cue name");

console.log("item reset smoke: all checks passed");
