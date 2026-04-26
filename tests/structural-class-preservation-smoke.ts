import assert from "node:assert/strict";

import { mergeProjectedStructuralClasses } from "../app/parts/item-edit/editable-visual-state";

const current = "ed-caps ed-grid-w1-h1 cell-span-r1-c1";

const mergedWithNull = mergeProjectedStructuralClasses(current, null) || "";
assert.equal(
	mergedWithNull.includes("ed-grid-w1-h1"),
	true,
	"projected class merge should preserve capsule grid class"
);
assert.equal(
	mergedWithNull.includes("ed-caps"),
	true,
	"projected class merge should preserve capsule marker class"
);

const mergedWithReplacement =
	mergeProjectedStructuralClasses(current, "cell-span-r2-c2 another-class") || "";
assert.equal(
	mergedWithReplacement.includes("ed-grid-w1-h1"),
	true,
	"grid class should survive replacement patches"
);
assert.equal(
	mergedWithReplacement.includes("another-class"),
	true,
	"non-structural incoming classes should still apply"
);

console.log("structural class preservation smoke: all checks passed");
