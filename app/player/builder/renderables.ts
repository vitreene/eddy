import type { ItemComp, SceneComp } from "@/api/db";
import { EDITOR_VIDEO_CLASS } from "@/config/class-prefix";
import { getMediaUrl } from "@/lib/media-url";
import { getActiveSceneContent } from "@/scene-runtime/scene-content";
import { SCENE_ID } from "@/scene-runtime/constants";
import type { ID } from "../types";
import { P } from "../types";
import { createCapsuleRenderable, createItemRenderable } from "./entities";

type ItemWithPosition = { item: ItemComp; positionIndex: number };

/**
 * Build renderables in deterministic display order across capsule tree.
 */
export function createRenderablesInDisplayOrder(
	snapshot: SceneComp,
	additionalClassnames: Record<ID, string>
) {
	const result: Array<any> = [];
	const sceneSound = createSceneSoundRenderable(snapshot);
	if (sceneSound) result.push(sceneSound);

	const mainCapsule = snapshot.capsules?.[snapshot.main];
	if (mainCapsule) {
		const mainPerso = createCapsuleRenderable(mainCapsule, snapshot, additionalClassnames);
		if (mainPerso) result.push(mainPerso);
	}

	const renderOrderItems = getItemsInDisplayOrder(snapshot, snapshot.main);

	for (const { item, positionIndex } of renderOrderItems) {
		const content = snapshot.contents[item.contentId];
		if (!content) continue;

		if (content.type == "capsule" && content.capsuleId) {
			const capsule = snapshot.capsules[content.capsuleId];
			if (!capsule) continue;
			const capsulePerso = createCapsuleRenderable(capsule, snapshot, additionalClassnames, positionIndex);
			if (capsulePerso) result.push(capsulePerso);
			continue;
		}

		const itemPerso = createItemRenderable(item, snapshot, additionalClassnames, positionIndex);
		if (itemPerso) result.push(itemPerso);
	}

	return result;
}

function createSceneSoundRenderable(snapshot: SceneComp): any | null {
	const sceneContent = getActiveSceneContent(snapshot);
	if (!sceneContent) return null;

	const content = snapshot.contents?.[sceneContent.contentId];
	if (!content || content.type !== "sound") return null;

	const id = `scene-sound__${sceneContent.id}`;
	const src = getMediaUrl(content.path ?? "");

	return {
		type: P.VIDEO,
		initial: {
			id,
			tag: "video",
			className: EDITOR_VIDEO_CLASS,
			move: SCENE_ID,
			src,
			media: {
				action: "play",
				changeAt: 0,
				offset: 0
			},
			attr: {
				hidden: "hidden"
			}
		},
		actions: {
			[id]: true
		}
	};
}

/**
 * Traverse item tree depth-first using per-capsule order field.
 */
function getItemsInDisplayOrder(snapshot: SceneComp, capsuleId: number): ItemWithPosition[] {
	const capsule = snapshot.capsules?.[capsuleId];
	if (!capsule) return [];

	const siblings = (capsule.itemIds || [])
		.map((itemId) => snapshot.items[itemId])
		.filter((item): item is ItemComp => Boolean(item))
		.toSorted((a, b) => (a.order > b.order ? 1 : -1));

	const result: ItemWithPosition[] = [];
	for (let i = 0; i < siblings.length; i++) {
		const item = siblings[i];
		result.push({ item, positionIndex: i });
		const content = snapshot.contents[item.contentId];
		if (content?.type == "capsule" && content.capsuleId) {
			result.push(...getItemsInDisplayOrder(snapshot, content.capsuleId));
		}
	}

	return result;
}
