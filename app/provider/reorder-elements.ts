import type { SceneComp, ItemComp } from "@/api/db";
import { type ActiveState, type TreeMoveEvent } from "./scene-logic";
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
export function reorderElements(context: Omit<SceneComp, "main">, payload: TreeMoveEvent) {
	const { sourceId, targetId, sourceType, targetType } = payload;

	if (targetType === "element") {
		if (sourceType === "element") {
			const element = context.items[sourceId];
			const target = context.items[targetId];

			const capsule = context.capsules[target.capsuleId];
			const sourceCapsule = context.capsules[element.capsuleId];

			// Récupérer les éléments de la capsule cible triés par order
			const capsuleElementIds = capsule.itemIds.filter((id) => id !== sourceId);
			const sortedElements = capsuleElementIds.map((id) => context.items[id]).sort((a, b) => a.order - b.order);

			// Trouver la position du target
			const targetIndex = sortedElements.findIndex((el) => el.id === targetId);

			// Déterminer la nouvelle valeur order
			let newOrder: number;
			if (targetIndex === -1) {
				// Target non trouvé, placer à la fin
				const lastElement = sortedElements[sortedElements.length - 1];
				newOrder = calculateNewOrder(lastElement?.order ?? STEP);
			} else {
				// Placer après target
				const nextElement = sortedElements[targetIndex + 1];
				const targetOrder = sortedElements[targetIndex].order;
				newOrder = calculateNewOrder(targetOrder, nextElement?.order);
			}

			// Mettre à jour uniquement l'élément déplacé
			element.order = newOrder;
			element.capsuleId = target.capsuleId;

			// Mettre à jour les références des capsules si changement
			if (element.capsuleId !== sourceCapsule.id) {
				sourceCapsule.itemIds = sourceCapsule.itemIds.filter((id) => id !== sourceId);
				capsule.itemIds.push(sourceId);
			}

			return {
				capsules: {
					...context.capsules,
					[sourceCapsule.id]: sourceCapsule,
					[capsule.id]: capsule
				},
				elements: {
					...context.items,
					[sourceId]: element
				},
				moved: element
			};
		}
	}

	if (targetType === "capsule") {
		const element = context.items[sourceId];
		const capsule = context.capsules[targetId];
		const sourceCapsule = context.capsules[element.capsuleId];

		const nextElement = findElementWithSmallestOrder(
			Object.values(context.items).filter((el) => el.capsuleId == targetId)
		);
		const newOrder = calculateNewOrder(0, nextElement?.order);
		// Placer en premier dans la capsule
		element.order = newOrder;
		element.capsuleId = capsule.id;

		sourceCapsule.itemIds = sourceCapsule.itemIds.filter((id) => id !== sourceId);
		capsule.itemIds.push(sourceId);

		return {
			capsules: {
				...context.capsules,
				[sourceCapsule.id]: sourceCapsule,
				[targetId]: capsule
			},
			elements: {
				...context.items,
				[sourceId]: element
			},
			moved: element
		};
	}

	return {
		capsules: context.capsules,
		elements: context.items
	};
}
export function updateOrder(element: ItemComp) {
	const formData = new FormData();
	formData.set("order", String(element.order));
	formData.set("capsuleId", String(element.capsuleId));

	fetch(`api/element/${element.id}`, {
		method: "PUT",
		body: formData
	});
}

function findElementWithSmallestOrder<T extends { order: number }>(elements: T[]): T | undefined {
	if (elements.length == 0) return { order: 0 } as T;
	return elements.reduce((min, current) => (current.order < min?.order ? current : min));
}

export const STEP = 1000;
export const calculateNewOrder = (
	targetOrder: number,
	nextElementOrder?: number,
	step: number = STEP
): number => {
	if (nextElementOrder === undefined) {
		// Pas de suivant : order = target.order + step
		return targetOrder + step;
	}
	// Avec suivant : order = floor(target.order + (next.order - target.order) / 2)
	return Math.floor(targetOrder + (nextElementOrder - targetOrder) / 2);
};
