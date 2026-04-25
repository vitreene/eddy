import { useCallback, useEffect, useMemo } from "react";

import {
	ItemTransformEditorTransform
} from "@/components/position-editor/visual-transform-grid";
import { ItemTransformEditorPositionGridNative } from "@/components/position-editor/visual-transform-grid-grid-native";
import { CAPSULE_TYPES, resolveCapsuleType } from "@/config/capsule-types";
import { getValuesFromGridName } from "@/lib/utils";
import { buildNodeId } from "@/scene-runtime/node-id";
import { getAssuredVisibleCue } from "@/provider/active-cue";
import { createTransformController } from "./item-edit.transform-controller";

import type { ElementTransform } from "@/components/position-editor/lib.types";
import type { DragCommitMeta, DragMode } from "@/components/position-editor/transform-editor.service";
import type {
	PositionDragCommitMeta,
	PositionDragMode
} from "@/components/position-editor/position-editor.service";
import { SceneLogicContext } from "@/provider/scene-logic";
import type { Decor, ItemComp } from "@/api/db";
import type { EditableStyle } from "@/components/style-editor/types";

type EditTransformProps = {
	value?: Partial<ElementTransform>;
	editorSyncKey?: string;
	decor?: Decor;
	editDecor?: Decor;
	onStyleChange: (payload: EditableStyle) => void;
	onDecorUpdate: (payload: { id: number; area?: string | null; className?: string | null }) => void;
	onTreeMove: (payload: { sourceId: number; targetCapsuleId: number; insertionIndex: number }) => void;
	item?: ItemComp;
	parentCapsuleType?: string | null;
	activeNode: HTMLElement | null;
};

export function EditTransform({
	value,
	editorSyncKey,
	decor,
	editDecor,
	onStyleChange,
	onDecorUpdate,
	onTreeMove,
	item,
	parentCapsuleType,
	activeNode
}: EditTransformProps) {
	const parentCapsule = SceneLogicContext.useSelector((state) => {
		if (!item) return undefined;
		return state.context.capsules[item.capsuleId];
	});
	const activeCue = SceneLogicContext.useSelector((state) => state.context.active.cue ?? null);
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

	const overlayContainer: HTMLElement | null = null;

	const isTransformEditorActive = Boolean(activeNode) && isVisibleAtActiveCue;
	const effectiveEditorMode: "transform" | "position" =
		resolveCapsuleType(parentCapsuleType) === CAPSULE_TYPES.POSITION ? "position" : "transform";
	const syncToken = `${item?.id ?? ""}:${activeCue ?? ""}:${sequenceFlushToken}:${editorSyncKey ?? ""}`;

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

		switch (capsuleType) {
			case CAPSULE_TYPES.LISTE: {
				const orientation: "horizontal" | "vertical" = parentCapsule.grid?.includes("horizontal")
					? "horizontal"
					: "vertical";
				return {
					kind: "list" as const,
					orientation,
					cells: Math.max(1, parentCapsule.itemIds.length)
				};
			}

			case CAPSULE_TYPES.CARROUSEL:
				return {
					kind: "grid" as const,
					cols: 1,
					rows: 1
				};

			default: {
				const grid = getValuesFromGridName(parentCapsule.grid || "");
				return {
					kind: "grid" as const,
					cols: Math.max(1, grid.w),
					rows: Math.max(1, grid.h)
				};
			}
		}
	}, [parentCapsule]);

	const transformController = useMemo(
		() =>
			createTransformController({
				decor,
				editDecor,
				parentCapsuleType,
				item,
				activeNode,
				onStyleChange,
				onDecorUpdate,
				onTreeMove
			}),
		[decor, editDecor, parentCapsuleType, item, activeNode, onStyleChange, onDecorUpdate, onTreeMove]
	);

	useEffect(() => {
		transformController.onTransformModeChange(effectiveEditorMode);
	}, [effectiveEditorMode, transformController]);

	const onPositionCommit = useCallback(
		(mode: PositionDragMode["kind"], meta: PositionDragCommitMeta) => {
			transformController.onPositionCommit(mode, meta);
		},
		[transformController]
	);

	const onTransformCommit = useCallback(
		(transform: ElementTransform, mode: DragMode["kind"], meta: DragCommitMeta) => {
			if (mode === "resize-grid-se") return;
			transformController.onTransformCommit(transform, mode, meta);
		},
		[transformController]
	);

	return (
		<>
			<div className="mb-2 flex justify-end">
				<button
					type="button"
					onClick={transformController.onResetTransform}
					disabled={!isTransformEditorActive || effectiveEditorMode === "position"}
					className="inline-flex h-7 items-center rounded border border-stone-300 px-2 text-xs hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Reset transform
				</button>
			</div>
			{effectiveEditorMode === "position" ? (
				<ItemTransformEditorPositionGridNative
					key={`position-grid-native-${syncToken}:${activeNode?.id ?? "none"}`}
					element={activeNode}
					active={isTransformEditorActive}
					onCommit={onPositionCommit}
					snapParentId={snapParentId}
					snapGrid={snapGrid}
					syncToken={syncToken}
					overlayContainer={overlayContainer}
				/>
			) : (
				<ItemTransformEditorTransform
					element={activeNode}
					active={isTransformEditorActive}
					value={value}
					onCommit={onTransformCommit}
					snapParentId={snapParentId}
					snapGrid={snapGrid}
					syncToken={syncToken}
					overlayContainer={overlayContainer}
				/>
			)}
		</>
	);
}
