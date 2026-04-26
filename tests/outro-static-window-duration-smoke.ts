import assert from "node:assert/strict";

import { getScene } from "../app/api/db";
import { buildScene } from "../app/player/builder";
import { setStaticChanges } from "../app/player/deps/static-changes";

const scene = await getScene(10 as any);
const built = buildScene(scene as any);

const playerLike: any = {
	persos: new Map((built.persos || []).map((perso: any) => [perso.initial.id, perso])),
	eventtimes: built.events,
	persoChanges: new Map()
};

setStaticChanges.call(playerLike);

const changes = playerLike.persoChanges.get("capsule__33") as Record<number, any> | undefined;
assert.ok(changes, "capsule__33 changes should exist");

const keys = Object.keys(changes || {})
	.map((value) => Number(value))
	.filter((value) => Number.isFinite(value))
	.sort((a, b) => a - b);

assert.equal(keys.includes(500), true, "outro tween static window should start at implicit intro baseline");
assert.equal(keys.includes(5000), true, "style-only outro keyframe should be kept as timeline marker");

const moveChange = changes?.[500];
assert.equal(moveChange?.next, 5000, "move interpolation window should end at outro keyframe");

console.log("outro static window duration smoke: all checks passed");
