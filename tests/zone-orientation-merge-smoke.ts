import assert from "node:assert/strict";

import {
	mergeZonesFromOrientationEdit,
	projectZonesForOrientation,
	type PositionZoneStored
} from "../app/lib/position-zones";

const baseZones: PositionZoneStored[] = [
	{
		id: 1,
		name: "hero",
		className: "ed-zone-hero",
		rect: { row: 1, column: 1, spanRow: 2, spanColumn: 2 }
	}
];

const portraitEdited: PositionZoneStored[] = [
	{
		id: 1,
		name: "hero",
		className: "ed-zone-hero",
		rect: { row: 4, column: 5, spanRow: 1, spanColumn: 3 }
	}
];

const mergedPortrait = mergeZonesFromOrientationEdit({
	baseZones,
	editedZones: portraitEdited,
	orientation: "portrait",
	defaultOrientation: "landscape"
});

assert.deepEqual(
	mergedPortrait[0].variants?.landscape,
	{ row: 1, column: 1, spanRow: 2, spanColumn: 2 },
	"landscape variant should preserve original zone when first portrait variant is created"
);
assert.deepEqual(
	mergedPortrait[0].variants?.portrait,
	{ row: 4, column: 5, spanRow: 1, spanColumn: 3 },
	"portrait variant should store portrait edit"
);

const projectedPortrait = projectZonesForOrientation(mergedPortrait, "portrait");
assert.deepEqual(
	projectedPortrait[0].rect,
	{ row: 4, column: 5, spanRow: 1, spanColumn: 3 },
	"portrait projection should surface portrait variant rect"
);

const landscapeEdited: PositionZoneStored[] = [
	{
		id: 1,
		name: "hero",
		className: "ed-zone-hero",
		rect: { row: 2, column: 2, spanRow: 3, spanColumn: 4 }
	}
];

const mergedLandscape = mergeZonesFromOrientationEdit({
	baseZones: mergedPortrait,
	editedZones: landscapeEdited,
	orientation: "landscape",
	defaultOrientation: "landscape"
});

assert.deepEqual(
	mergedLandscape[0].variants?.landscape,
	{ row: 2, column: 2, spanRow: 3, spanColumn: 4 },
	"landscape variant should update independently"
);
assert.deepEqual(
	mergedLandscape[0].variants?.portrait,
	{ row: 4, column: 5, spanRow: 1, spanColumn: 3 },
	"portrait variant should remain untouched when editing landscape"
);

console.log("zone orientation merge smoke: all checks passed");
