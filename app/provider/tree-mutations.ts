import { fromPromise } from "xstate";

import type { ItemComp } from "@/api/db";
import type { SceneTreeContext, TreeCreateEvent, TreeDeleteEvent, TreeMutationResponse } from "./types";

export const treeMutation = fromPromise(async ({ input }) => {
	const { context, event } = input as {
		context: SceneTreeContext;
		event:
			| { type: "tree-create-text"; payload: TreeCreateEvent }
			| { type: "tree-create-capsule"; payload: TreeCreateEvent }
			| { type: "tree-create-from-content"; payload: TreeCreateEvent }
			| { type: "tree-delete-item"; payload: TreeDeleteEvent }
			| { type: "tree-delete-capsule"; payload: TreeDeleteEvent };
	};

	if (event.type === "tree-delete-item") {
		const res = await fetch("/api/tree", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "delete-item", itemId: event.payload.itemId })
		});
		if (!res.ok) throw new Error("Failed to delete item");
		return (await res.json()) as TreeMutationResponse;
	}

	if (event.type === "tree-delete-capsule") {
		const res = await fetch("/api/tree", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "delete-capsule",
				itemId: event.payload.itemId,
				capsuleId: event.payload.capsuleId
			})
		});
		if (!res.ok) throw new Error("Failed to delete capsule");
		return (await res.json()) as TreeMutationResponse;
	}

	const placement = resolveTreePlacement(context, event.payload);
	if (!placement.destinationCapsuleId) throw new Error("No destination capsule found for tree mutation");

	if (event.type === "tree-create-text") {
		const res = await fetch("/api/tree", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "create-text",
				capsuleId: placement.destinationCapsuleId,
				afterItemId: placement.afterItemId,
				name: event.payload.name || "",
				inner: event.payload.inner || ""
			})
		});
		if (!res.ok) throw new Error("Failed to create text item");
		return (await res.json()) as TreeMutationResponse;
	}

	if (event.type === "tree-create-capsule") {
		const res = await fetch("/api/tree", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "create-capsule",
				sceneId: context.id,
				destinationCapsuleId: placement.destinationCapsuleId,
				afterItemId: placement.afterItemId,
				capsuleName: event.payload.capsuleName || event.payload.name || "Capsule"
			})
		});
		if (!res.ok) throw new Error("Failed to create capsule item");
		return (await res.json()) as TreeMutationResponse;
	}

	if (!event.payload.contentId) throw new Error("contentId is required for create-from-content");

	const res = await fetch("/api/tree", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			action: "create-from-content",
			contentId: event.payload.contentId,
			capsuleId: placement.destinationCapsuleId,
			afterItemId: placement.afterItemId
		})
	});
	if (!res.ok) throw new Error("Failed to create item from content");
	return (await res.json()) as TreeMutationResponse;
});

function resolveTreePlacement(
	context: SceneTreeContext,
	payload: TreeCreateEvent
): { destinationCapsuleId?: number; afterItemId?: number } {
	if (payload.destinationCapsuleId) {
		return {
			destinationCapsuleId: payload.destinationCapsuleId,
			afterItemId: payload.afterItemId
		};
	}

	if (payload.afterItemId && context.items[payload.afterItemId]) {
		return {
			destinationCapsuleId: context.items[payload.afterItemId].capsuleId,
			afterItemId: payload.afterItemId
		};
	}

	if (context.active.itemId && context.items[context.active.itemId]) {
		const selectedItem = context.items[context.active.itemId];
		return {
			destinationCapsuleId: selectedItem.capsuleId,
			afterItemId: selectedItem.id
		};
	}

	if (context.main) {
		return { destinationCapsuleId: context.main };
	}

	return {};
}

export function applyTreeMutation(context: SceneTreeContext, output: TreeMutationResponse): SceneTreeContext {
	if (output.action === "delete-capsule") {
		const deleted = output.deletedCapsule;
		if (!deleted) return context;

		const items = { ...context.items };
		for (const id of deleted.itemIds) delete items[id];

		const contents = { ...context.contents };
		for (const id of deleted.contentIds) delete contents[id];

		const decors = { ...context.decors };
		for (const id of deleted.decorIds) delete decors[id];

		const capsules = { ...context.capsules };
		for (const id of deleted.capsuleIds) delete capsules[id];

		const events = { ...context.events };
		for (const itemId of deleted.eventItemIds) delete events[itemId];

		for (const capsuleId of Object.keys(capsules).map(Number)) {
			capsules[capsuleId] = {
				...capsules[capsuleId],
				itemIds: buildCapsuleItemIds(items, capsuleId)
			};
		}

		const activeItemDeleted = context.active.itemId ? deleted.itemIds.includes(context.active.itemId) : false;

		return {
			...context,
			items,
			contents,
			decors,
			capsules,
			events,
			active: {
				...context.active,
				...(activeItemDeleted && { itemId: null, contentId: null })
			}
		};
	}

	if (output.action === "delete-item") {
		if (!output.deleted) return context;
		const deleted = output.deleted;
		const items = { ...context.items };
		delete items[deleted.id];

		const events = { ...context.events };
		delete events[deleted.id];

		const decors = { ...context.decors };
		const deletedDecorId = context.items[deleted.id]?.decorId;
		if (deletedDecorId) delete decors[deletedDecorId];

		const capsules = normalizeCapsuleItemIds(context.capsules, items);

		const isDeletedActive = context.active.itemId === deleted.id;
		return {
			...context,
			items,
			events,
			decors,
			capsules,
			active: {
				...context.active,
				...(isDeletedActive && { itemId: null, contentId: null })
			}
		};
	}

	if (!output.created?.item || !output.created?.content) return context;

	const createdItem = output.created.item;
	const createdContent = output.created.content;
	const createdDecor = output.created.decor;
	const createdCapsule = output.created.capsule;

	const items: Record<number, ItemComp> = {
		...context.items,
		[createdItem.id]: {
			...(createdItem as ItemComp),
			eventIds: []
		}
	};

	const contents = {
		...context.contents,
		[createdContent.id]: createdContent
	};

	const events = {
		...context.events,
		[createdItem.id]: {}
	};

	const decors = {
		...context.decors,
		...(createdDecor && { [createdDecor.id]: createdDecor })
	};

	const capsules = { ...context.capsules };
	if (createdCapsule) {
		capsules[createdCapsule.id] = {
			...createdCapsule,
			itemIds: []
		};
	}

	const normalizedCapsules = normalizeCapsuleItemIds(capsules, items);

	return {
		...context,
		items,
		contents,
		events,
		decors,
		capsules: normalizedCapsules,
		active: {
			...context.active,
			itemId: createdItem.id,
			contentId: createdItem.contentId
		}
	};
}

function buildCapsuleItemIds(items: Record<number, ItemComp>, capsuleId: number): number[] {
	return Object.values(items)
		.filter((item) => item.capsuleId === capsuleId)
		.sort((a, b) => a.order - b.order)
		.map((item) => item.id);
}

function normalizeCapsuleItemIds(
	capsules: SceneTreeContext["capsules"],
	items: Record<number, ItemComp>
): SceneTreeContext["capsules"] {
	const normalized = { ...capsules };
	for (const capsuleId of Object.keys(normalized).map(Number)) {
		normalized[capsuleId] = {
			...normalized[capsuleId],
			itemIds: buildCapsuleItemIds(items, capsuleId)
		};
	}
	return normalized;
}
