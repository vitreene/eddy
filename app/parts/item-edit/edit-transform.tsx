import { useMemo } from "react";

import { ItemTransformEditor } from "@/components/position-editor/visual-transform-grid";
import { CAPSULE_TYPES, resolveCapsuleType } from "@/config/capsule-types";
import { getValuesFromGridName } from "@/lib/utils";
import { SCENE_ID } from "@/scene-runtime/constants";
import { buildNodeId } from "@/scene-runtime/node-id";
import { getAssuredVisibleCue } from "@/provider/active-cue";

import type { ElementTransform } from "@/components/position-editor/lib.types";
import { SceneLogicContext } from "@/provider/scene-logic";

type EditTransformProps = {
	value?: Partial<ElementTransform>;
	editorSyncKey?: string;
	onResetTransform: () => void;
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

export function EditTransform({ value, editorSyncKey, onResetTransform, onCommit }: EditTransformProps) {
	const activeNode = SceneLogicContext.useSelector((state) => state.context.active.node as HTMLElement | null);
	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);
	const parentCapsule = SceneLogicContext.useSelector((state) =>
		item ? state.context.capsules[item.capsuleId] : undefined
	);
	const activeCue = SceneLogicContext.useSelector((state) => state.context.active.cue ?? null);
	const activeAction = SceneLogicContext.useSelector((state) => state.context.active.action ?? null);
	const isVisibleAtActiveCue = SceneLogicContext.useSelector((state) => {
		const itemId = state.context.active.itemId;
		if (!itemId) return false;
		const cue = state.context.active.cue;
		if (typeof cue != "number" || !Number.isFinite(cue)) return true;
		const { window } = getAssuredVisibleCue(state.context, itemId);
		return cue >= window.startSec && cue <= window.endSec;
	});
	const sequenceFlushToken = SceneLogicContext.useSelector(
		(state) => Number(state.context.active.sequenceFlushToken) || 0
	);

	const overlayContainer = useMemo(() => {
		if (!activeNode) return null;
		return activeNode.ownerDocument.getElementById(SCENE_ID);
	}, [activeNode]);

	const isTransformEditorActive = Boolean(activeNode) && isVisibleAtActiveCue;

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
		<>
			<div className="mb-2 flex justify-end">
				<button
					type="button"
					onClick={onResetTransform}
					disabled={!isTransformEditorActive}
					className="inline-flex h-7 items-center rounded border border-stone-300 px-2 text-xs hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Reset transform
				</button>
			</div>
			<ItemTransformEditor
				element={activeNode}
				active={isTransformEditorActive}
				value={value}
				onCommit={onCommit}
				snapParentId={snapParentId}
				snapGrid={snapGrid}
				syncToken={`${activeAction ?? ""}:${activeCue ?? ""}:${sequenceFlushToken}:${editorSyncKey ?? ""}`}
				overlayContainer={overlayContainer}
			/>
		</>
	);
}
