import { requestSequenceFlush } from "./scene-reload-policy";
import { withGeneratedItemNodeIds } from "./scene-logic.helpers";

import type { SceneComp } from "@/api/db";
import type { ActiveState } from "./types";

export function initializeSceneContext(
	scene: SceneComp,
	previousActive: ActiveState
): SceneComp & { active: ActiveState } {
	const nextScene = withGeneratedItemNodeIds(scene);
	const resetActive: ActiveState = {
		...previousActive,
		main: nextScene.main,
		itemId: null,
		node: null,
		contentId: null,
		cue: null,
		progress: null,
		action: null,
		event: null,
		eventTouched: false,
		decorTouched: false,
		themeTouched: false,
		capsuleTouched: false,
		sequenceTouched: true,
		sequenceFlushReason: null
	};

	return {
		...nextScene,
		active: requestSequenceFlush(resetActive, "scene-switch")
	};
}
