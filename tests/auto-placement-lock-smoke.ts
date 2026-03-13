import assert from "node:assert/strict";

import { CAPSULE_TYPES } from "../app/config/capsule-types";
import { buildAutoLayoutPlacementLockPatch } from "../app/parts/item-edit/item-edit.auto-placement";

const gridPatch = buildAutoLayoutPlacementLockPatch({
	capsuleType: CAPSULE_TYPES.GRILLE,
	targetDecor: { id: 1, area: null, className: "", style: {} } as any,
	snapshot: {
		className: "cell_layout_auto_grille-r2-c3",
		gridRowStart: "2",
		gridColumnStart: "3"
	}
});

assert.deepEqual(gridPatch, { area: "cell-r2-c3" }, "grid auto placement should lock to explicit area");

const listPatch = buildAutoLayoutPlacementLockPatch({
	capsuleType: CAPSULE_TYPES.LISTE,
	targetDecor: { id: 1, area: null, className: "badge", style: {} } as any,
	snapshot: {
		className: "foo liste-r4",
		gridRowStart: "auto",
		gridColumnStart: "auto"
	}
});

assert.equal(
	listPatch?.className,
	"badge liste-r4",
	"list auto placement should lock current virtual row token"
);

const noPatchWhenAreaAlreadySet = buildAutoLayoutPlacementLockPatch({
	capsuleType: CAPSULE_TYPES.GRILLE,
	targetDecor: { id: 1, area: "cell-r1-c1", className: "", style: {} } as any,
	snapshot: {
		className: "cell_layout_auto_grille-r2-c3",
		gridRowStart: "2",
		gridColumnStart: "3"
	}
});

assert.equal(noPatchWhenAreaAlreadySet, null, "explicit manual area should not be overridden");

console.log("auto placement lock smoke: all checks passed");
