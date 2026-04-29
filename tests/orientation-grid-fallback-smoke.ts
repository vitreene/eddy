import assert from "node:assert/strict";

import {
	resolveSceneGridForOrientation,
	resolveSceneGridPairWithFallback,
	swapSceneGridRowsAndCols
} from "../app/lib/orientation-grid";

assert.equal(
	swapSceneGridRowsAndCols("root-scene ed-grid-w16-h9"),
	"root-scene ed-grid-w9-h16",
	"swap should invert w/h while preserving other tokens"
);

assert.equal(
	resolveSceneGridForOrientation({
		baseGrid: "root-scene ed-grid-w16-h9",
		orientationGrid: {},
		orientation: "portrait"
	}),
	"root-scene ed-grid-w9-h16",
	"portrait should auto-derive from base landscape when uncustomized"
);

assert.equal(
	resolveSceneGridForOrientation({
		baseGrid: "root-scene ed-grid-w16-h9",
		orientationGrid: { portrait: "ed-grid-w9-h16" },
		orientation: "landscape"
	}),
	"ed-grid-w16-h9",
	"landscape should auto-derive from explicit portrait when missing"
);

const pair = resolveSceneGridPairWithFallback({
	baseGrid: "root-scene ed-grid-w16-h9",
	orientationGrid: { portrait: "ed-grid-w9-h16" }
});
assert.deepEqual(
	pair,
	{ portrait: "ed-grid-w9-h16", landscape: "ed-grid-w16-h9" },
	"pair resolver should provide complete portrait/landscape grids"
);

const explicitPair = resolveSceneGridPairWithFallback({
	baseGrid: "root-scene ed-grid-w4-h4",
	orientationGrid: {
		portrait: "ed-grid-w9-h16",
		landscape: "ed-grid-w16-h9"
	}
});
assert.deepEqual(
	explicitPair,
	{ portrait: "ed-grid-w9-h16", landscape: "ed-grid-w16-h9" },
	"explicit portrait/landscape pair should be preserved without auto inversion"
);

console.log("orientation grid fallback smoke: all checks passed");
