import assert from "node:assert/strict";
import { createActor } from "xstate";

import { editorSyncMachine } from "../app/parts/item-edit/editor-sync.machine";

let seekCount = 0;
let projectCount = 0;

const actor = createActor(editorSyncMachine, {
	input: {
		onSeek: () => {
			seekCount += 1;
		},
		onProject: () => {
			projectCount += 1;
		}
	}
});

actor.start();

actor.send({
	type: "sync.update",
	payload: {
		visualKey: "99|custom-2|163||ed-zone-04|{}",
		visualState: {
			itemId: 99,
			eventAction: "custom-2",
			cueSec: 1.8,
			decorId: 163,
			area: null,
			className: "ed-zone-04",
			style: {},
			transform: {},
			previousClassName: null,
			previousArea: null,
			previousStyle: null
		},
		selectionAction: "custom-2",
		selectionCueSec: 1.8,
		selectionKey: "custom-2:1.8000",
		activeItemId: 99,
		activeEvent: "custom-2",
		activeCueSec: 1.8,
		activeAction: null
	}
});

assert.equal(seekCount, 0, "aligned selection should not dispatch redundant seek");
assert.equal(projectCount, 1, "first update should still project visual state");

actor.send({
	type: "sync.update",
	payload: {
		visualKey: "99|custom-2|163||ed-zone-04|{}",
		visualState: {
			itemId: 99,
			eventAction: "custom-2",
			cueSec: 1.8,
			decorId: 163,
			area: null,
			className: "ed-zone-04",
			style: {},
			transform: {},
			previousClassName: null,
			previousArea: null,
			previousStyle: null
		},
		selectionAction: "custom-2",
		selectionCueSec: 2.0,
		selectionKey: "custom-2:2.0000",
		activeItemId: 99,
		activeEvent: "custom-2",
		activeCueSec: 1.8,
		activeAction: null
	}
});

assert.equal(seekCount, 1, "selection key change should dispatch one seek");

actor.stop();

console.log("editor sync seek dedupe smoke: all checks passed");
