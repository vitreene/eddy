import { useEffect, useMemo, useState } from "react";

import {
	ItemTransformEditorPosition,
	ItemTransformEditorTransform
} from "@/components/position-editor/visual-transform-grid";
import { CAPSULE_TYPES, resolveCapsuleType } from "@/config/capsule-types";
import { getValuesFromGridName } from "@/lib/utils";
import { SCENE_ID } from "@/scene-runtime/constants";
import { buildNodeId } from "@/scene-runtime/node-id";
import { getAssuredVisibleCue } from "@/provider/active-cue";
import { createTransformController } from "./item-edit.transform-controller";

import type { ElementTransform } from "@/components/position-editor/lib.types";
import { SceneLogicContext } from "@/provider/scene-logic";
import type { Decor, ItemComp } from "@/api/db";
import type { EditableStyle } from "@/components/style-editor/types";

type EditTransformProps = {
	value?: Partial<ElementTransform>;
	editorSyncKey?: string;
	decor?: Decor;
	editDecor?: Decor;
	activeCustomEventAction: string | null;
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
	activeCustomEventAction,
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
	const [editorMode, setEditorMode] = useState<"transform" | "position">("position");

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

	const supportsPositionMode = snapGrid?.kind === "grid";
	const effectiveEditorMode = supportsPositionMode ? editorMode : "transform";

	const transformController = useMemo(
		() =>
			createTransformController({
				decor,
				editDecor,
				activeCustomEventAction,
				parentCapsuleType,
				item,
				activeNode,
				onStyleChange,
				onDecorUpdate,
				onTreeMove
			}),
		[
			decor,
			editDecor,
			activeCustomEventAction,
			parentCapsuleType,
			item,
			activeNode,
			onStyleChange,
			onDecorUpdate,
			onTreeMove
		]
	);

	useEffect(() => {
		transformController.onTransformModeChange(effectiveEditorMode);
	}, [effectiveEditorMode, transformController]);

	return (
		<>
			<div className="mb-2 flex justify-end">
				<div className="mr-auto flex items-center gap-4 text-xs">
					<label className="inline-flex items-center gap-1">
						<input
							type="radio"
							name="item-editor-mode"
							value="transform"
							checked={editorMode === "transform"}
							onChange={() => setEditorMode("transform")}
						/>
						Transform
					</label>
					<label className="inline-flex items-center gap-1">
						<input
							type="radio"
							name="item-editor-mode"
							value="position"
							checked={editorMode === "position"}
							disabled={!supportsPositionMode}
							onChange={() => setEditorMode("position")}
						/>
						Position
					</label>
				</div>
				<button
					type="button"
					onClick={transformController.onResetTransform}
					disabled={!isTransformEditorActive || editorMode === "position"}
					className="inline-flex h-7 items-center rounded border border-stone-300 px-2 text-xs hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Reset transform
				</button>
			</div>
			{effectiveEditorMode === "position" ? (
				<ItemTransformEditorPosition
					element={activeNode}
					active={isTransformEditorActive}
					onCommit={(mode, meta) => transformController.onPositionCommit(mode, meta)}
					snapParentId={snapParentId}
					snapGrid={snapGrid}
					syncToken={`${activeAction ?? ""}:${activeCue ?? ""}:${sequenceFlushToken}:${editorSyncKey ?? ""}`}
					overlayContainer={overlayContainer}
				/>
			) : (
				<ItemTransformEditorTransform
					element={activeNode}
					active={isTransformEditorActive}
					value={value}
					onCommit={(transform, mode, meta) => {
						if (mode === "resize-grid-se") return;
						transformController.onTransformCommit(transform, mode, meta);
					}}
					snapParentId={snapParentId}
					snapGrid={snapGrid}
					syncToken={`${activeAction ?? ""}:${activeCue ?? ""}:${sequenceFlushToken}:${editorSyncKey ?? ""}`}
					overlayContainer={overlayContainer}
				/>
			)}
		</>
	);
}
