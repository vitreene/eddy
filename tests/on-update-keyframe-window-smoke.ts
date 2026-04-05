import assert from "node:assert/strict";

import { DEFAULT_DURATION } from "../app/config/constants";
import { resolveChangeProgress, resolveTransitionEnd } from "../app/player/deps/on-update";

const boundedChange = {
	prev: 500,
	curr: 2000,
	next: 2600,
	change: {}
} as any;

assert.equal(
	resolveTransitionEnd(boundedChange),
	2000 + DEFAULT_DURATION,
	"transition end should be clamped to default FLIP duration"
);
assert.equal(resolveChangeProgress(2000, boundedChange), 0, "progress should start at 0 on curr");
assert.equal(
	resolveChangeProgress(2250, boundedChange),
	0.5,
	"progress should be normalized in curr->default-duration window"
);
assert.equal(resolveChangeProgress(2600, boundedChange), 1, "progress should remain clamped at 1 after end");

const fallbackChange = {
	prev: null,
	curr: 3000,
	next: null,
	change: {}
} as any;

assert.equal(
	resolveTransitionEnd(fallbackChange),
	3000 + DEFAULT_DURATION,
	"transition end should fallback to DEFAULT_DURATION when next is absent"
);

console.log("on-update keyframe window smoke: all checks passed");
