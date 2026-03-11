import assert from "node:assert/strict";

import { setStaticChanges } from "../app/player/deps/static-changes";
import { P } from "../app/player/types";

const fakePlayer: any = {
	persos: new Map(),
	eventtimes: new Map([[500, [{ name: "intro" }, { name: "custom-slot" }]]]),
	persoChanges: new Map()
};

fakePlayer.persos.set("item__53", {
	type: P.IMG,
	initial: { id: "item__53", className: "base" },
	actions: {
		intro: { move: "capsule__3", className: { add: "cell-r1-c2" }, style: {} },
		"custom-slot": { move: { mode: "auto" }, className: { add: "cell-r2-c2" }, style: {} }
	}
});

setStaticChanges.call(fakePlayer);

const changes = fakePlayer.persoChanges.get("item__53");
assert.ok(changes, "item__53 changes should exist");
assert.equal(typeof changes[500]?.change?.move, "string", "reparent move must win at same timestamp");

console.log("static changes move priority smoke: all checks passed");
