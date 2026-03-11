import assert from "node:assert/strict";

import { buildResetTransformStyle, TRANSFORM_RESET_STYLE } from "../app/parts/item-edit/item-edit.transform";

const resetA = buildResetTransformStyle();
const resetB = buildResetTransformStyle();

assert.deepEqual(resetA, TRANSFORM_RESET_STYLE, "reset transform payload should match canonical defaults");
assert.notEqual(resetA, resetB, "reset transform builder should return a new object");

const keys = Object.keys(resetA).sort();
assert.deepEqual(
	keys,
	["originX", "originY", "rotate", "scaleX", "scaleY", "x", "y"],
	"reset transform payload should only target transform keys"
);

console.log("item reset transform smoke: all checks passed");
