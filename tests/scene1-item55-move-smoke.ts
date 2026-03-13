import assert from "node:assert/strict";

import { getScene } from "../app/api/db";
import { buildScene } from "../app/player/builder";

const scene: any = await getScene(1);
const built: any = buildScene(scene);
const item = built.persos.find((perso: any) => perso?.initial?.id === "item__55");

assert.ok(item, "scene 1: item__55 renderable should exist");

const moveAction = item.actions?.["3-018-prvenir-custom-2"];
assert.ok(moveAction, "scene 1 item__55: custom-2 keyframe action should exist");
assert.deepEqual(moveAction.move, { mode: "auto" }, "scene 1 item__55: custom-2 should request auto move");
assert.equal(
	typeof moveAction.className?.remove == "string" &&
		moveAction.className.remove.includes("cell-span-r2-c2-rs1-cs1"),
	true,
	"scene 1 item__55: custom-2 should remove previous span class"
);

console.log("scene1 item55 move smoke: all checks passed");
