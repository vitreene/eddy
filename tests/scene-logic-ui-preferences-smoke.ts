import assert from "node:assert/strict";

import {
	normalizeSceneLogicUiPreferences,
	pickSceneLogicUiPreferences
} from "../app/provider/scene-logic.ui-preferences";
import type { ActiveState } from "../app/provider/types";

const normalizedFromEmpty = normalizeSceneLogicUiPreferences(null);
assert.deepEqual(
	normalizedFromEmpty,
	{ telcoMuted: false, itemEditTab: "presets" },
	"empty payload should fallback to defaults"
);

const normalizedFromInvalid = normalizeSceneLogicUiPreferences({
	telcoMuted: true,
	itemEditTab: "unknown"
});
assert.deepEqual(
	normalizedFromInvalid,
	{ telcoMuted: true, itemEditTab: "presets" },
	"invalid tab should fallback while keeping valid mute value"
);

const picked = pickSceneLogicUiPreferences({
	main: null,
	itemId: null,
	node: null,
	contentId: null,
	cue: null,
	progress: null,
	action: null,
	event: null,
	sequenceTouched: false,
	sequenceFlushToken: 0,
	sequenceFlushReason: null,
	telcoMuted: true,
	itemEditTab: "advanced",
	eventTouched: false,
	decorTouched: false,
	themeTouched: false,
	capsuleTouched: false
} as ActiveState);
assert.deepEqual(
	picked,
	{ telcoMuted: true, itemEditTab: "advanced" },
	"pick should extract persisted UI preferences from active state"
);

console.log("scene logic ui preferences smoke: all checks passed");
