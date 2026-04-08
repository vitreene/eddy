import assert from "node:assert/strict";

import { DEFAULT_DURATION } from "../app/config/constants";
import { resolveChangeProgress, resolveTransitionEnd } from "../app/player/deps/on-update";
import { isChangeActiveAtTime, setNextChange } from "../app/player/deps/utils";

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

const chainedChanges = {
	0: { prev: null, curr: 0, next: 1000, change: {} },
	1000: { prev: 0, curr: 1000, next: 2000, change: {} },
	2000: { prev: 1000, curr: 2000, next: null, change: {} }
} as any;

assert.equal(
	isChangeActiveAtTime(1000, chainedChanges[0]),
	false,
	"left change should stop being active on right boundary"
);
assert.equal(
	isChangeActiveAtTime(1000, chainedChanges[1000]),
	true,
	"right change should become active at boundary"
);
assert.equal(
	setNextChange(1000, chainedChanges[0], chainedChanges),
	chainedChanges[1000],
	"selector should advance to next change on boundary"
);
assert.equal(
	setNextChange(1999.999, chainedChanges[1000], chainedChanges),
	chainedChanges[1000],
	"selector should keep current change inside interval"
);
assert.equal(
	setNextChange(2000, chainedChanges[1000], chainedChanges),
	chainedChanges[2000],
	"selector should advance at next boundary"
);

console.log("on-update keyframe window smoke: all checks passed");
