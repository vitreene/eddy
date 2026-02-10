import { EMPTY, SEP } from "@/lib/constants";
import type { CapsuleComp, Content, ItemComp } from "@/api/db";

type CapsulesById = Record<number, CapsuleComp & { itemId?: number }>;
type ItemsById = Record<number, ItemComp>;
type ContentsById = Record<number, Content>;

export type SceneTreeNodeData = {
	id: string;
	label: string;
	kind: "root" | "capsule" | "item";
	isFolder: boolean;
	itemId?: number;
	capsuleId?: number;
	contentType?: string;
};

type BuildTreeArgs = {
	main: number;
	capsules: CapsulesById;
	items: ItemsById;
	contents: ContentsById;
};

export function buildSceneTreeModel({ main, capsules, items, contents }: BuildTreeArgs): {
	rootItemId: string;
	nodesById: Record<string, SceneTreeNodeData>;
	childrenById: Record<string, string[]>;
	expandedItems: string[];
} {
	const rootItemId = "scene-root";
	const nodesById: Record<string, SceneTreeNodeData> = {
		[rootItemId]: {
			id: rootItemId,
			label: "Scene",
			kind: "root",
			isFolder: true
		}
	};
	const childrenById: Record<string, string[]> = { [rootItemId]: [] };

	const mainCapsule = capsules[main];
	if (!mainCapsule) {
		return { rootItemId, nodesById, childrenById, expandedItems: [] };
	}

	childrenById[rootItemId] = registerCapsuleChildren(
		mainCapsule,
		capsules,
		items,
		contents,
		nodesById,
		childrenById
	);

	const expandedItems = Object.values(nodesById)
		.filter((node) => node.isFolder)
		.map((node) => node.id);

	return { rootItemId, nodesById, childrenById, expandedItems };
}

function registerCapsuleChildren(
	capsule: CapsuleComp & { itemId?: number },
	capsules: CapsulesById,
	items: ItemsById,
	contents: ContentsById,
	nodesById: Record<string, SceneTreeNodeData>,
	childrenById: Record<string, string[]>
): string[] {
	const capsuleItems = capsule.itemIds
		.map((itemId) => items[itemId])
		.filter((item): item is ItemComp => Boolean(item))
		.sort((a, b) => (a.order > b.order ? 1 : -1));

	const childIds: string[] = [];
	for (const item of capsuleItems) {
		const content = contents[item.contentId];
		if (!content) continue;
		const childCapsuleId = content?.capsuleId;

		if (childCapsuleId) {
			const childCapsule = capsules[childCapsuleId];
			if (!childCapsule) continue;

			const childId = `capsule${SEP}${childCapsule.id}`;
			nodesById[childId] = {
				id: childId,
				label: childCapsule.name || EMPTY,
				kind: "capsule",
				isFolder: true,
				itemId: childCapsule.itemId,
				capsuleId: childCapsule.id
			};
			childrenById[childId] = registerCapsuleChildren(
				childCapsule,
				capsules,
				items,
				contents,
				nodesById,
				childrenById
			);
			childIds.push(childId);
			continue;
		}

		const nodeId = `element${SEP}${item.id}`;
		nodesById[nodeId] = {
			id: nodeId,
			label: itemLabel(content),
			kind: "item",
			isFolder: false,
			itemId: item.id,
			capsuleId: item.capsuleId,
			contentType: content?.type
		};
		childrenById[nodeId] = [];
		childIds.push(nodeId);
	}

	return childIds;
}

function itemLabel(content?: Content): string {
	if (!content) return EMPTY;
	if (content.type === "text") return content.inner || EMPTY;
	return content.name || EMPTY;
}
