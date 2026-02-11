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
	FilePlus,
	FileText,
	Folder,
	FolderPlus,
	GripVertical,
	Image,
	Music,
	Shapes,
	Trash2,
	Video
} from "lucide-react";

import { getItemFromCapsule, SceneLogicContext } from "@/provider/scene-logic";
import { Button } from "@/components/ui/button";
import { readChutierDragPayload } from "@/lib/drag-content";
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
	const activeItemId = SceneLogicContext.useSelector((state) => state.context.active.itemId);
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
			getItem: (id) =>
				model.nodesById[id] ?? {
					id,
					label: id,
					kind: "item",
					isFolder: false
				},
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
		canDropForeignDragObject: (dataTransfer, target) => {
			const payload = readChutierDragPayload(dataTransfer);
			if (!payload?.contentId) return false;
			const targetData = target.item.getItemData();
			if (targetData.kind === "root") return false;
			if (targetData.kind === "capsule") return Boolean(targetData.capsuleId);
			return Boolean(targetData.itemId);
		},
		onDropForeignDragObject: (dataTransfer, target) => {
			const payload = readChutierDragPayload(dataTransfer);
			if (!payload?.contentId) return;

			const targetData = target.item.getItemData();
			const targetCapsuleId =
				targetData.kind === "capsule"
					? targetData.capsuleId
					: targetData.kind === "item"
						? targetData.capsuleId
						: undefined;

			if (!targetCapsuleId) return;

			send({
				type: "tree-create-from-content",
				payload: {
					contentId: Number(payload.contentId),
					destinationCapsuleId: Number(targetCapsuleId),
					...(targetData.kind === "item" && targetData.itemId && { afterItemId: Number(targetData.itemId) })
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

		const selectedItemIds = tree.getState().selectedItems || [];
		const hasMissingSelected = selectedItemIds.some((id) => !model.nodesById[id]);
		if (hasMissingSelected) {
			tree.setSelectedItems(selectedItemIds.filter((id) => !!model.nodesById[id]));
		}

		tree.rebuildTree();

		const firstLevelCapsuleIds = (model.childrenById[model.rootItemId] || []).filter(
			(id) => model.nodesById[id]?.kind === "capsule"
		);

		for (const capsuleId of firstLevelCapsuleIds) {
			tree.getItemInstance(capsuleId).expand();
		}

		if (activeItemId) {
			const activeNodeId = findNodeIdByItemId(model, activeItemId);
			if (activeNodeId) {
				tree.setSelectedItems([activeNodeId]);
				tree.getItemInstance(activeNodeId).setFocused();

				const parentByChild = Object.entries(model.childrenById).reduce(
					(acc, [parentId, childIds]) => {
						for (const childId of childIds) acc[childId] = parentId;
						return acc;
					},
					{} as Record<string, string>
				);

				let parentId = parentByChild[activeNodeId];
				while (parentId) {
					if (model.nodesById[parentId]?.isFolder) {
						tree.getItemInstance(parentId).expand();
					}
					parentId = parentByChild[parentId];
				}
			}
		}
	}, [activeItemId, hasTreeData, tree, treeModelFingerprint]);

	const selectedNode = tree
		.getItems()
		.find((item) => item.isSelected())
		?.getItemData();
	const actionDisabled = !hasTreeData;

	const getCreatePayload = () => {
		if (!selectedNode) {
			return {
				destinationCapsuleId: main || undefined
			};
		}
		if (selectedNode.kind === "capsule") {
			return {
				destinationCapsuleId: selectedNode.capsuleId
			};
		}
		if (selectedNode.kind === "item") {
			return {
				destinationCapsuleId: selectedNode.capsuleId,
				afterItemId: selectedNode.itemId
			};
		}
		return {
			destinationCapsuleId: main || undefined
		};
	};

	if (!hasTreeData) return null;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-end gap-2 rounded border p-1">
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={actionDisabled}
					onClick={() => {
						send({
							type: "tree-create-capsule",
							payload: {
								...getCreatePayload(),
								capsuleName: "Capsule"
							}
						});
					}}
				>
					<FolderPlus />
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={actionDisabled}
					onClick={() => {
						send({
							type: "tree-create-text",
							payload: {
								...getCreatePayload(),
								name: "",
								inner: ""
							}
						});
					}}
				>
					<FilePlus />
				</Button>
			</div>

			<div {...tree.getContainerProps()} className="min-h-64 rounded border p-1">
				{tree.getItems().map((item) => {
					const data = item.getItemData();
					const Icon = getNodeIcon(data);
					const isFolder = item.isFolder();
					const isExpanded = item.isExpanded();
					const canDrag = Boolean(data.itemId);
					const canDelete =
						item.isSelected() && (data.kind === "item" || data.kind === "capsule") && Boolean(data.itemId);

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

							<span
								className="hover:bg-primary/5 flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded px-1 select-none"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									tree.setSelectedItems([item.getId()]);
									item.setFocused();
									item.primaryAction();
								}}
							>
								<Icon className="h-3.5 w-3.5 shrink-0" />
								<span className="min-w-0 flex-1 truncate">{item.getItemName()}</span>
							</span>

							{canDelete ? (
								<Button
									type="button"
									size="icon-sm"
									variant="ghost"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										if (data.kind === "capsule" && data.capsuleId) {
											send({
												type: "tree-delete-capsule",
												payload: { itemId: Number(data.itemId), capsuleId: Number(data.capsuleId) }
											});
										} else {
											send({ type: "tree-delete-item", payload: { itemId: Number(data.itemId) } });
										}
									}}
									aria-label={data.kind === "capsule" ? "Supprimer la capsule" : "Supprimer l'element"}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							) : null}
						</div>
					);
				})}
				<div style={tree.getDragLineStyle()} className="bg-primary pointer-events-none h-0.5" />
			</div>
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

function findNodeIdByItemId(
	model: { nodesById: Record<string, SceneTreeNodeData> },
	itemId: number
): string | undefined {
	return Object.values(model.nodesById).find((node) => node.itemId === itemId)?.id;
}
