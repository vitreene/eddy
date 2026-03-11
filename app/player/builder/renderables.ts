import type { ItemComp, SceneComp } from "@/api/db";
import type { ID } from "../types";
import { createCapsuleRenderable, createItemRenderable } from "./entities";

/**
 * Build renderables in deterministic display order across capsule tree.
 */
export function createRenderablesInDisplayOrder(
	snapshot: SceneComp,
	additionalClassnames: Record<ID, string>
) {
	const result: Array<any> = [];
	const mainCapsule = snapshot.capsules?.[snapshot.main];
	if (mainCapsule) {
		const mainPerso = createCapsuleRenderable(mainCapsule, snapshot, additionalClassnames);
		if (mainPerso) result.push(mainPerso);
	}

	const renderOrderItems = getItemsInDisplayOrder(snapshot, snapshot.main);

	for (const item of renderOrderItems) {
		const content = snapshot.contents[item.contentId];
		if (!content) continue;

		if (content.type == "capsule" && content.capsuleId) {
			const capsule = snapshot.capsules[content.capsuleId];
			if (!capsule) continue;
			const capsulePerso = createCapsuleRenderable(capsule, snapshot, additionalClassnames);
			if (capsulePerso) result.push(capsulePerso);
			continue;
		}

		const itemPerso = createItemRenderable(item, snapshot, additionalClassnames);
		if (itemPerso) result.push(itemPerso);
	}

	return result;
}

/**
 * Traverse item tree depth-first using per-capsule order field.
 */
function getItemsInDisplayOrder(snapshot: SceneComp, capsuleId: number): ItemComp[] {
	const capsule = snapshot.capsules?.[capsuleId];
	if (!capsule) return [];

	const siblings = (capsule.itemIds || [])
		.map((itemId) => snapshot.items[itemId])
		.filter((item): item is ItemComp => Boolean(item))
		.toSorted((a, b) => (a.order > b.order ? 1 : -1));

	const result: ItemComp[] = [];
	for (const item of siblings) {
		result.push(item);
		const content = snapshot.contents[item.contentId];
		if (content?.type == "capsule" && content.capsuleId) {
			result.push(...getItemsInDisplayOrder(snapshot, content.capsuleId));
		}
	}

	return result;
}
