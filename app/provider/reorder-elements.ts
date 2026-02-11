import type { SceneComp, ItemComp } from "@/api/db";
import { type ActiveState, type TreeMoveEvent } from "./types";
import { fromPromise } from "xstate";

export const capsuleReorder = fromPromise(async ({ input }) => {
	const { context, event } = input as {
		context: SceneComp & { active: ActiveState };
		event: { type: "tree-move-item"; payload: TreeMoveEvent };
	};
	if (event.type == "tree-move-item") {
		const element = context.items[event.payload.sourceId];
		const elements = Object.values(context.items).filter((el) => el.capsuleId == element.capsuleId);
		const canReorder = new Set(elements.map((el) => el.order)).size != elements.length;
		if (canReorder) {
			return fetch(`/api/capsule/${element.capsuleId}/reorder`).then((response) => response.json());
		} else {
			return Promise.resolve("no-reorder");
		}
	}
});
export function reorderElements(context: Omit<SceneComp, "main">, payload: TreeMoveEvent) {
	const { sourceId, targetId, targetCapsuleId, insertionIndex } = payload;

	const item = context.items[sourceId];
	if (!item) return { capsules: context.capsules, items: context.items, moved: null };

	const target = targetId ? context.items[targetId] : undefined;
	const destinationCapsuleId = targetCapsuleId ?? target?.capsuleId;
	if (!destinationCapsuleId) return { capsules: context.capsules, items: context.items, moved: null };

	const capsule = context.capsules[destinationCapsuleId];
	const sourceCapsule = context.capsules[item.capsuleId];
	if (!capsule || !sourceCapsule) return { capsules: context.capsules, items: context.items, moved: null };

	// Récupérer les éléments de la capsule cible triés par order
	const sortedItems = capsule.itemIds
		.filter((id) => id !== sourceId)
		.map((id) => context.items[id])
		.sort((a, b) => a.order - b.order);

	// Determiner la nouvelle valeur order
	let newOrder: number;

	if (typeof insertionIndex === "number") {
		const clampedIndex = Math.max(0, Math.min(insertionIndex, sortedItems.length));
		const previous = sortedItems[clampedIndex - 1];
		const next = sortedItems[clampedIndex];

		if (previous && next) {
			newOrder = calculateNewOrder(previous.order, next.order);
		} else if (previous) {
			newOrder = calculateNewOrder(previous.order);
		} else if (next) {
			newOrder = next.order - STEP;
		} else {
			newOrder = STEP;
		}
	} else {
		// Fallback legacy: placer apres target si present, sinon en fin.
		const targetIndex = targetId ? sortedItems.findIndex((el) => el.id === targetId) : -1;
		if (targetIndex === -1) {
			const lastItem = sortedItems[sortedItems.length - 1];
			newOrder = lastItem ? calculateNewOrder(lastItem.order) : STEP;
		} else {
			const nextItem = sortedItems[targetIndex + 1];
			const targetOrder = sortedItems[targetIndex].order;
			newOrder = calculateNewOrder(targetOrder, nextItem?.order);
		}
	}

	// Mettre à jour uniquement l'élément déplacé
	item.order = newOrder;
	item.capsuleId = destinationCapsuleId;

	// Mettre à jour les références des capsules si changement
	if (item.capsuleId !== sourceCapsule.id) {
		sourceCapsule.itemIds = sourceCapsule.itemIds.filter((id) => id !== sourceId);
		capsule.itemIds.push(sourceId);
	}

	return {
		capsules: {
			...context.capsules,
			[sourceCapsule.id]: sourceCapsule,
			[capsule.id]: capsule
		},
		items: {
			...context.items,
			[sourceId]: item
		},
		moved: item
	};
}
export function updateOrder(item: ItemComp) {
	const formData = new FormData();
	formData.set("order", String(item.order));
	formData.set("capsuleId", String(item.capsuleId));

	fetch(`/api/item/${item.id}`, {
		method: "PUT",
		body: formData
	});
}
/* 
function findElementWithSmallestOrder<T extends { order: number }>(item: T[]): T | undefined {
	if (item.length == 0) return { order: 0 } as T;
	return item.reduce((min, current) => (current.order < min?.order ? current : min));
}
 */
export const STEP = 1000;
export const calculateNewOrder = (
	targetOrder: number,
	nextItemOrder?: number,
	step: number = STEP
): number => {
	if (nextItemOrder === undefined) {
		// Pas de suivant : order = target.order + step
		return targetOrder + step;
	}
	// Avec suivant : order = floor(target.order + (next.order - target.order) / 2)
	return Math.floor(targetOrder + (nextItemOrder - targetOrder) / 2);
};
