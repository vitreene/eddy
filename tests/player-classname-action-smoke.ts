import assert from "node:assert/strict";

import { Player } from "../app/player/player";

const fakeNode = {
	className: "bg-picture ed-item ed-zone-big-one",
	textContent: "",
	setAttribute: () => {}
} as any;

const player = Object.create(Player.prototype) as Player & { $elements: Map<string, any> };
player.$elements = new Map([["item__99", fakeNode]]);

player._applyChanges("item__99", {
	className: { add: "ed-zone-bas", remove: "ed-zone-big-one" } as any
});

const classTokens = new Set(String(fakeNode.className).split(/\s+/).filter(Boolean));

assert.ok(classTokens.has("bg-picture"), "class action should preserve structural bg-picture token");
assert.ok(classTokens.has("ed-item"), "class action should preserve structural ed-item token");
assert.ok(classTokens.has("ed-zone-bas"), "class action should add target placement class");
assert.ok(!classTokens.has("ed-zone-big-one"), "class action should remove previous placement class");

console.log("player className action smoke: all checks passed");
