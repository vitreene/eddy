import { useEffect, useMemo } from "react";
import {
	type FeatureImplementation,
	dragAndDropFeature,
	hotkeysCoreFeature,
	isOrderedDragTarget,
	selectionFeature,
	syncDataLoaderFeature
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import {
	ChevronRight,
	File,
	FileText,
	Folder,
	GripVertical,
	Image,
	Music,
	Shapes,
	Video
} from "lucide-react";

import { getItemFromCapsule, SceneLogicContext } from "@/provider/scene-logic";
import { cn } from "@/lib/utils";

import type { Content } from "@/api/db";
import { buildSceneTreeModel, type SceneTreeNodeData } from "./tree-data";

const clickBehaviorNoExpand: FeatureImplementation = {
	itemInstance: {
		getProps: ({ tree, item, prev }) => ({
			...prev?.(),
			onClick: (e: MouseEvent) => {
				if (e.shiftKey) {
					item.selectUpTo(e.ctrlKey || e.metaKey);
				} else if (e.ctrlKey || e.metaKey) {
					item.toggleSelect();
				} else {
					tree.setSelectedItems([item.getItemMeta().itemId]);
				}

				item.setFocused();
			}
		})
	}
};

export function SceneTreeView() {
	const main = SceneLogicContext.useSelector((state) => state.context.main);
	const capsules = SceneLogicContext.useSelector((state) => {
		if (!state.context.capsules) return null;
		return Object.fromEntries(
			Object.values(state.context.capsules).map((capsule) => {
				const item = getItemFromCapsule(capsule.id, state.context);
				return [capsule.id, { ...capsule, itemId: item?.id }];
			})
		);
	});
	const items = SceneLogicContext.useSelector((state) => state.context.items);
	const contents: { [key: number]: Content } = SceneLogicContext.useSelector((state) =>
		Object.fromEntries(
			Object.values(state.context.items || {}).map((item) => [
				[item.contentId],
				state.context.contents[item.contentId]
			])
		)
	);

	const { send } = SceneLogicContext.useActorRef();
	const hasTreeData = Boolean(main && capsules && Object.keys(capsules).length);

	const model = useMemo(() => {
		if (!main || !capsules || !Object.keys(capsules).length) {
			return {
				rootItemId: "scene-root",
				nodesById: {
					"scene-root": {
						id: "scene-root",
						label: "Scene",
						kind: "root" as const,
						isFolder: true
					}
				},
				childrenById: { "scene-root": [] },
				expandedItems: ["scene-root"]
			};
		}

		return buildSceneTreeModel({
			main,
			capsules,
			items,
			contents
		});
	}, [main, capsules, items, contents]);

	const tree = useTree<SceneTreeNodeData>({
		rootItemId: model.rootItemId,
		getItemName: (item) => item.getItemData().label,
		isItemFolder: (item) => item.getItemData().isFolder,
		dataLoader: {
			getItem: (id) => model.nodesById[id],
			getChildren: (id) => model.childrenById[id] ?? []
		},
		indent: 14,
		initialState: { expandedItems: model.expandedItems },
		canReorder: true,
		seperateDragHandle: true,
		canDrag: (dragged) => dragged.every((item) => !!item.getItemData().itemId),
		canDrop: (_, target) => {
			const targetData = target.item.getItemData();
			if (targetData.kind === "root") return false;
			if (targetData.kind === "capsule") return Boolean(targetData.capsuleId);
			return Boolean(targetData.itemId);
		},
		onPrimaryAction: (item) => {
			const itemId = item.getItemData().itemId;
			if (!itemId) return;
			const payload = { itemId };
			send({ type: "commit", payload });
			send({ type: "active-set", payload });
		},
		onDrop: (draggedItems, target) => {
			const sourceId = draggedItems[0]?.getItemData().itemId;
			const targetData = target.item.getItemData();
			const targetId = targetData.itemId;
			const targetCapsuleId =
				targetData.kind === "capsule"
					? targetData.capsuleId
					: targetData.kind === "item"
						? targetData.capsuleId
						: undefined;
			const insertionIndex = isOrderedDragTarget(target) ? target.insertionIndex : undefined;

			if (!sourceId || (!targetId && !targetCapsuleId) || sourceId === targetId) return;

			send({
				type: "tree-move-item",
				payload: {
					sourceId: Number(sourceId),
					...(targetId && { targetId: Number(targetId) }),
					...(targetCapsuleId && { targetCapsuleId: Number(targetCapsuleId) }),
					...(typeof insertionIndex === "number" && { insertionIndex })
				}
			});
		},
		features: [
			syncDataLoaderFeature,
			selectionFeature,
			dragAndDropFeature,
			hotkeysCoreFeature,
			clickBehaviorNoExpand
		]
	});

	const treeModelFingerprint = useMemo(() => {
		const nodeIds = Object.entries(model.nodesById)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([id, node]) => `${id}:${node.label}:${node.kind}:${node.itemId ?? ""}:${node.contentType ?? ""}`)
			.join("|");
		const children = Object.entries(model.childrenById)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([id, childIds]) => `${id}:${childIds.join(",")}`)
			.join("|");
		return `${model.rootItemId}#${nodeIds}#${children}`;
	}, [model]);

	useEffect(() => {
		if (!hasTreeData) return;
		tree.rebuildTree();
	}, [hasTreeData, tree, treeModelFingerprint]);

	if (!hasTreeData) return null;

	return (
		<div {...tree.getContainerProps()} className="min-h-64 rounded border p-1">
			{tree.getItems().map((item) => {
				const data = item.getItemData();
				const Icon = getNodeIcon(data);
				const isFolder = item.isFolder();
				const isExpanded = item.isExpanded();
				const canDrag = Boolean(data.itemId);
				console.log(item.getProps());

				return (
					<div
						key={item.getId()}
						{...item.getProps()}
						className={cn(
							"flex h-7 items-center gap-1 rounded px-1 text-xs",
							item.isSelected() && "bg-accent",
							item.isDragTarget() && "bg-primary/10",
							item.isFocused() && "outline-primary/40 outline-1"
						)}
						style={{ paddingLeft: `${item.getItemMeta().level * 14 + 4}px` }}
					>
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								if (!isFolder) return;
								if (isExpanded) item.collapse();
								else item.expand();
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									e.stopPropagation();
								}
							}}
							className={cn(
								"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded",
								!isFolder && "invisible"
							)}
							aria-label={isExpanded ? "Replier" : "Deplier"}
						>
							<ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
						</button>

						{canDrag ? (
							<span
								{...item.getDragHandleProps()}
								onClick={(e) => e.stopPropagation()}
								className="text-muted-foreground inline-flex shrink-0 cursor-grab p-1"
							>
								<GripVertical className="h-3.5 w-3.5" />
							</span>
						) : (
							<span className="inline-flex h-5 w-5 shrink-0" />
						)}

						<Icon className="h-3.5 w-3.5 shrink-0" />
						<span
							className="hover:bg-primary/5 cursor-pointer truncate select-none"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								item.primaryAction();
							}}
						>
							{item.getItemName()}
						</span>
					</div>
				);
			})}
			<div style={tree.getDragLineStyle()} className="bg-primary pointer-events-none h-0.5" />
		</div>
	);
}

function getNodeIcon(data: SceneTreeNodeData) {
	if (data.kind === "capsule") return Folder;
	if (data.contentType === "img") return Image;
	if (data.contentType === "sound") return Music;
	if (data.contentType === "video") return Video;
	if (data.contentType === "text") return FileText;
	if (data.contentType === "lottie" || data.contentType === "rive" || data.contentType === "three3D")
		return Shapes;
	return File;
}
