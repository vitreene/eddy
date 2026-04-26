import assert from "node:assert/strict";

import { resolveSeekMsForActive } from "../app/player/seek-policy";

assert.equal(
	resolveSeekMsForActive({ action: "seek", cue: 0.5, event: "intro" }),
	499,
	"intro seek should rewind 1ms before boundary"
);

assert.equal(
	resolveSeekMsForActive({ action: "seek", cue: 0.5, event: "outro" }),
	500,
	"outro seek should stay on exact cue"
);

assert.equal(
	resolveSeekMsForActive({ action: "play", cue: 0.5, event: "intro" }),
	500,
	"non-seek actions should not shift cue"
);

console.log("player intro seek preboundary smoke: all checks passed");
