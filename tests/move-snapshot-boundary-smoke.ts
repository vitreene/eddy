import assert from "node:assert/strict";

import { shouldApplySnapshotForNextChange } from "../app/player/deps/on-update";

const moveAutoNext: any = {
	change: { move: { mode: "auto" } }
};

const moveBooleanNext: any = {
	change: { move: true }
};

const styleOnlyNext: any = {
	change: { className: "cell-span-r1-c2", media: { action: "pause" } }
};

assert.equal(
	shouldApplySnapshotForNextChange(moveAutoNext),
	true,
	"snapshot should be applied when next change is move:auto"
);
assert.equal(
	shouldApplySnapshotForNextChange(moveBooleanNext),
	true,
	"snapshot should be applied when next change is move:true"
);
assert.equal(
	shouldApplySnapshotForNextChange(styleOnlyNext),
	false,
	"snapshot should not be applied when next change has no move transition"
);

console.log("move snapshot boundary smoke: all checks passed");
