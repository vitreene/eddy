import assert from "node:assert/strict";

import {
	orientationPlacementTokenToCssDefinition,
	parseOrientedPlacementFromClassName,
	updateOrCreateOrientedPlacementToken
} from "../app/lib/oriented-placement";

const className = updateOrCreateOrientedPlacementToken({
	className: "ed-item",
	activeOrientation: "portrait",
	defaultOrientation: "landscape",
	nextPlacement: { row: 2, col: 3, rowSpan: 1, colSpan: 2 },
	seedPlacement: { row: 1, col: 1, rowSpan: 1, colSpan: 1 }
});

const parsed = parseOrientedPlacementFromClassName(className);
assert.ok(parsed, "oriented placement token should be created on opposite-orientation first commit");
assert.deepEqual(
	parsed?.variants.landscape,
	{ row: 1, col: 1, rowSpan: 1, colSpan: 1 },
	"landscape variant should seed from existing placement"
);
assert.deepEqual(
	parsed?.variants.portrait,
	{ row: 2, col: 3, rowSpan: 1, colSpan: 2 },
	"portrait variant should store committed opposite-orientation placement"
);

const css = orientationPlacementTokenToCssDefinition(parsed!.token) || "";
assert.equal(
	css.includes("@container scene (aspect-ratio <= 1/1)"),
	true,
	"token CSS should include portrait container rule"
);
assert.equal(
	css.includes("@container scene (aspect-ratio > 1/1)"),
	true,
	"token CSS should include landscape container rule"
);
assert.equal(
	css.includes(".ed-preview-orientation--portrait"),
	true,
	"token CSS should include editor portrait preview override"
);

console.log("oriented placement smoke: all checks passed");
