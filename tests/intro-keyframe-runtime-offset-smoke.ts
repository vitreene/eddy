import assert from "node:assert/strict";

import { getScene } from "../app/api/db";
import { DEFAULT_DURATION, INTRO } from "../app/config/constants";
import { mapEvents } from "../app/player/builder/events";

function listAt(map: Map<number, any>, timeMs: number): Array<{ name: string }> {
	const entry = map.get(timeMs);
	if (!entry) return [];
	return Array.isArray(entry) ? entry : [entry];
}

const scene: any = await getScene(1);
const timeline = mapEvents(scene);

const introEvent53 = scene.events?.[53]?.[INTRO];
assert.ok(introEvent53?.name, "item 53 should have intro event with cue name");

const sceneContent: any =
	Object.values(scene.sceneContents || {}).find((sc: any) => sc.sceneId == scene.id) ||
	Object.values(scene.sceneContents || {})[0];
const cues = sceneContent?.events || [];
const introCue53 = cues.find((cue: any) => cue.name === introEvent53.name);
assert.ok(introCue53, "item 53 intro cue should exist in scene cues");

const introRuntimeStart53 = Math.round(Number(introCue53.start) * 1000);
const introKeyframe53 = introRuntimeStart53 + DEFAULT_DURATION;

assert.equal(
	listAt(timeline, introRuntimeStart53).some((entry) => entry.name.includes("-intro")),
	true,
	"intro transition action should be scheduled at runtime start"
);

assert.equal(
	listAt(timeline, introRuntimeStart53).some(
		(entry) => entry.name.includes("custom") && entry.name.includes("__tween")
	),
	false,
	"custom tween should not start at intro runtime start"
);

assert.equal(
	listAt(timeline, introKeyframe53).some(
		(entry) => entry.name.includes("custom") && entry.name.includes("__tween")
	),
	true,
	"first custom tween should start at intro keyframe end"
);

console.log("intro keyframe runtime offset smoke: all checks passed");
