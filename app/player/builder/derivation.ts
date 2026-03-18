import { resolveCueWindows } from "@/scene-runtime/visibility/resolve-cue-windows";
import { buildCapsuleBehaviorById } from "@/scene-runtime/visibility/capsule-behavior";

import type { SceneComp } from "@/api/db";

/**
 * Apply auto intro/outro cue derivation for items according to capsule behavior.
 */
export function applyCapsuleDefaultItemEvents(snapshot: SceneComp): SceneComp {
	if (!snapshot?.capsules || !snapshot?.items || !snapshot?.sceneContents) return snapshot;
	const sceneContent =
		Object.values(snapshot.sceneContents).find((sc) => sc.sceneId == snapshot.id) ||
		Object.values(snapshot.sceneContents)[0] ||
		null;

	const behaviorByCapsuleId = buildCapsuleBehaviorById(snapshot);
	const resolved = resolveCueWindows(snapshot, {
		generateMissingEvents: true,
		behaviorByCapsuleId
	});

	const clonedSceneContents: SceneComp["sceneContents"] = sceneContent
		? {
				...snapshot.sceneContents,
				[sceneContent.id]: {
					...sceneContent,
					cues: resolved.resolvedSceneContentEvents
				}
			}
		: {
				...snapshot.sceneContents,
				[-snapshot.id]: {
					id: -snapshot.id,
					contentId: -1,
					sceneId: snapshot.id,
					order: 0,
					events: resolved.resolvedSceneContentEvents,
					timestamp: [],
					cues: resolved.resolvedSceneContentEvents
				}
			};

	return {
		...snapshot,
		events: resolved.resolvedEvents,
		sceneContents: clonedSceneContents
	};
}
