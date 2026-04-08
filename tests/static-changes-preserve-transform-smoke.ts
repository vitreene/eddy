import assert from "node:assert/strict";

import { setStaticChanges } from "../app/player/deps/static-changes";

const player: any = {
	persos: new Map([
		[
			"item__1",
			{
				type: "IMG",
				initial: { id: "item__1", className: "base" },
				actions: {
					"out-outro": {
						style: {
							opacity: { to: 0, duration: 500 },
							rotate: { to: "90deg", duration: 0 }
						},
						move: { mode: "auto" }
					}
				}
			}
		]
	]),
	eventtimes: new Map([[1000, [{ name: "out-outro", start: 1000 }]]]),
	persoChanges: new Map()
};

setStaticChanges.call(player);

const changes = player.persoChanges.get("item__1");
assert.ok(changes, "perso changes should exist");
assert.equal(
	changes[1000].preserveTransform,
	true,
	"transform style events should preserve transform cleanup"
);

console.log("static changes preserve transform smoke: all checks passed");
