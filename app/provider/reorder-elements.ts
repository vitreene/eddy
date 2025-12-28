import type { SceneComp, ItemComp } from "@/api/db";
import { type ActiveState, type TreeMoveEvent, type TreeMoveEvent2 } from "./scene-logic";
import { fromPromise } from "xstate";

export const capsuleReorder = fromPromise(async ({ input }) => {
	console.log("reorder-capsule");
	const { context, event } = input as {
		context: SceneComp & { active: ActiveState };
		event: { type: "tree-move-item"; payload: TreeMoveEvent };
	};
	if (event.type == "tree-move-item") {
		const element = context.items[event.payload.sourceId];
		const elements = Object.values(context.items).filter((el) => el.capsuleId == element.capsuleId);
		const canReorder = new Set(elements.map((el) => el.order)).size != elements.length;
		if (canReorder) {
			console.warn("⚠️ Réajustement nécessaire : les ordres sont identiques après déplacement");
			return fetch(`api/capsule/${element.capsuleId}/reorder`).then((response) => response.json());
		} else {
			console.log("reject====>", canReorder);
			return Promise.resolve("no-reorder");
		}
	}
});
export function reorderElements(context: Omit<SceneComp, "main">, payload: TreeMoveEvent2) {
	const { sourceId, targetId } = payload;

	const item = context.items[sourceId];
	const target = context.items[targetId];

	const capsule = context.capsules[target.capsuleId];
	const sourceCapsule = context.capsules[item.capsuleId];

	// Récupérer les éléments de la capsule cible triés par order
	const sortedItems = capsule.itemIds
		.filter((id) => id !== sourceId)
		.map((id) => context.items[id])
		.sort((a, b) => a.order - b.order);

	// Trouver la position du target
	const targetIndex = sortedItems.findIndex((el) => el.id === targetId);

	// Déterminer la nouvelle valeur order
	let newOrder: number;
	if (targetIndex === -1) {
		// Target non trouvé, placer à la fin
		const lastItem = sortedItems[sortedItems.length - 1];
		newOrder = calculateNewOrder(lastItem?.order ?? STEP);
	} else {
		// Placer après target
		const nextItem = sortedItems[targetIndex + 1];
		const targetOrder = sortedItems[targetIndex].order;
		newOrder = calculateNewOrder(targetOrder, nextItem?.order);
	}

	// Mettre à jour uniquement l'élément déplacé
	item.order = newOrder;
	item.capsuleId = target.capsuleId;

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
/* 
export function reorderElements(context: Omit<SceneComp, "main">, payload: TreeMoveEvent) {
	const { sourceId, targetId, sourceType, targetType } = payload;

	if (targetType === "element") {
		if (sourceType === "element") {
			const item = context.items[sourceId];
			const target = context.items[targetId];

			const capsule = context.capsules[target.capsuleId];
			const sourceCapsule = context.capsules[item.capsuleId];

			// Récupérer les éléments de la capsule cible triés par order
			const capsuleItemsIds = capsule.itemIds.filter((id) => id !== sourceId);
			const sortedItems = capsuleItemsIds.map((id) => context.items[id]).sort((a, b) => a.order - b.order);

			// Trouver la position du target
			const targetIndex = sortedItems.findIndex((el) => el.id === targetId);

			// Déterminer la nouvelle valeur order
			let newOrder: number;
			if (targetIndex === -1) {
				// Target non trouvé, placer à la fin
				const lastItem = sortedItems[sortedItems.length - 1];
				newOrder = calculateNewOrder(lastItem?.order ?? STEP);
			} else {
				// Placer après target
				const nextItem = sortedItems[targetIndex + 1];
				const targetOrder = sortedItems[targetIndex].order;
				newOrder = calculateNewOrder(targetOrder, nextItem?.order);
			}

			// Mettre à jour uniquement l'élément déplacé
			item.order = newOrder;
			item.capsuleId = target.capsuleId;

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
	}

	if (targetType === "capsule") {
		const item = context.items[sourceId];
		const capsule = context.capsules[targetId];
		const sourceCapsule = context.capsules[item.capsuleId];

		const nextItem = findElementWithSmallestOrder(
			Object.values(context.items).filter((el) => el.capsuleId == targetId)
		);
		const newOrder = calculateNewOrder(0, nextItem?.order);
		// Placer en premier dans la capsule
		item.order = newOrder;
		item.capsuleId = capsule.id;

		sourceCapsule.itemIds = sourceCapsule.itemIds.filter((id) => id !== sourceId);
		capsule.itemIds.push(sourceId);

		return {
			capsules: {
				...context.capsules,
				[sourceCapsule.id]: sourceCapsule,
				[targetId]: capsule
			},
			items: {
				...context.items,
				[sourceId]: item
			},
			moved: item
		};
	}

	return {
		capsules: context.capsules,
		items: context.items
	};
} */
export function updateOrder(item: ItemComp) {
	const formData = new FormData();
	formData.set("order", String(item.order));
	formData.set("capsuleId", String(item.capsuleId));

	fetch(`api/item/${item.id}`, {
		method: "PUT",
		body: formData
	});
}

function findElementWithSmallestOrder<T extends { order: number }>(item: T[]): T | undefined {
	if (item.length == 0) return { order: 0 } as T;
	return item.reduce((min, current) => (current.order < min?.order ? current : min));
}

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
