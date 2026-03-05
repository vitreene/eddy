import { useMemo } from "react";

import { ItemTransformEditor } from "@/components/position-editor/visual-transform-grid";
import { CAPSULE_TYPES, resolveCapsuleType } from "@/config/capsule-types";
import { getValuesFromGridName } from "@/lib/utils";
import { SCENE_ID } from "@/player/constants";
import { buildNodeId } from "@/player/node-id";

import type { ElementTransform } from "@/components/position-editor/lib.types";
import { SceneLogicContext } from "@/provider/scene-logic";

type EditTransformProps = {
	onCommit: (
		transform: ElementTransform,
		mode: "move" | "rotate" | "resize-se" | "cell-snap" | "origin",
		meta: {
			translateX: number;
			translateY: number;
			cell?: { row: number; col: number };
			reorderIndex?: number;
		}
	) => void;
};

export function EditTransform({ onCommit }: EditTransformProps) {
	const activeNode = SceneLogicContext.useSelector((state) => state.context.active.node as HTMLElement | null);
	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);
	const parentCapsule = SceneLogicContext.useSelector((state) =>
		item ? state.context.capsules[item.capsuleId] : undefined
	);
	const activeCue = SceneLogicContext.useSelector((state) => state.context.active.cue ?? null);
	const activeAction = SceneLogicContext.useSelector((state) => state.context.active.action ?? null);
	const sequenceFlushToken = SceneLogicContext.useSelector(
		(state) => Number(state.context.active.sequenceFlushToken) || 0
	);

	const overlayContainer = useMemo(() => {
		if (!activeNode) return null;
		return activeNode.ownerDocument.getElementById(SCENE_ID);
	}, [activeNode]);

	const snapParentId = useMemo(() => {
		if (!item) return null;
		return buildNodeId("capsule", item.capsuleId);
	}, [item]);

	const snapGrid = useMemo<
		| { kind: "list"; orientation: "horizontal" | "vertical"; cells: number }
		| { kind: "grid"; cols: number; rows: number }
		| null
	>(() => {
		if (!parentCapsule) return null;
		const capsuleType = resolveCapsuleType(parentCapsule.type);

		if (capsuleType === CAPSULE_TYPES.LISTE) {
			const orientation: "horizontal" | "vertical" = parentCapsule.grid?.includes("horizontal")
				? "horizontal"
				: "vertical";
			return {
				kind: "list" as const,
				orientation,
				cells: Math.max(1, parentCapsule.itemIds.length)
			};
		}

		if (capsuleType === CAPSULE_TYPES.CARROUSEL) {
			return {
				kind: "grid" as const,
				cols: 1,
				rows: 1
			};
		}

		const grid = getValuesFromGridName(parentCapsule.grid || "");
		return {
			kind: "grid" as const,
			cols: Math.max(1, grid.w),
			rows: Math.max(1, grid.h)
		};
	}, [parentCapsule]);

	return (
		<ItemTransformEditor
			element={activeNode}
			active={Boolean(activeNode)}
			onCommit={onCommit}
			snapParentId={snapParentId}
			snapGrid={snapGrid}
			syncToken={`${activeAction ?? ""}:${activeCue ?? ""}:${sequenceFlushToken}`}
			overlayContainer={overlayContainer}
		/>
	);
}
