import assert from "node:assert/strict";

import { getScene } from "../app/api/db";
import { INTRO, OUTRO } from "../app/config/constants";
import { getAssuredVisibleCue } from "../app/provider/active-cue";
import { computeCueForSelectedCustomEvent } from "../app/provider/scene-logic.helpers";

function getFirstCustomAction(events: Record<string, any> | null | undefined): string | null {
	if (!events) return null;
	for (const [action, event] of Object.entries(events)) {
		if (!event) continue;
		if (action === INTRO || action === OUTRO) continue;
		return action;
	}
	return null;
}

const scene: any = await getScene(1);

for (const itemId of [39, 53]) {
	const assured = getAssuredVisibleCue(scene, itemId);
	const introCue = computeCueForSelectedCustomEvent(scene, itemId, INTRO);
	assert.equal(typeof introCue, "number", `item ${itemId}: intro cue should resolve`);
	assert.equal(
		introCue! >= assured.window.startSec && introCue! <= assured.window.endSec,
		true,
		`item ${itemId}: intro cue should stay inside assured visibility window`
	);

	const customAction = getFirstCustomAction(scene.events?.[itemId]);
	assert.ok(customAction, `item ${itemId}: should have at least one custom event`);
	const customCue = computeCueForSelectedCustomEvent(scene, itemId, customAction!);
	assert.equal(typeof customCue, "number", `item ${itemId}: custom cue should resolve`);
	assert.equal(
		customCue! >= assured.window.startSec && customCue! <= assured.window.endSec,
		true,
		`item ${itemId}: custom cue should stay inside assured visibility window`
	);
}

console.log("event selection scene1 smoke: all checks passed");
