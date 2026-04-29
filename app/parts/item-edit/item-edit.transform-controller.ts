import { CAPSULE_TYPES, resolveCapsuleType } from "@/config/capsule-types";
import { POSITION_FULL_SPAN_CLASS } from "@/config/capsule-presets";
import {
	DEFAULT_EDITOR_PREVIEW_ORIENTATION,
	type OrientationMode
} from "@/config/orientation";
import {
	collapseToSimplePlacementClassName,
	toGridPlacementRectFromSpanToken,
	updateOrCreateOrientedPlacementToken,
	type GridPlacementRect
} from "@/lib/oriented-placement";

import {
	applyAreaClassPatch,
	applyClassTokenPatch,
	clearPlacementAreaTokens,
	ensureLiveAreaClassDefinition,
	ensureLivePlacementClassDefinitions
} from "./live-node-classes";
import { buildResetTransformStyle } from "./item-edit.transform";
import {
	buildAutoLayoutPlacementLockPatch,
	readAutoLayoutPlacementSnapshot
} from "./item-edit.auto-placement";
import {
	buildGridSpanClassName,
	mergeGridPlacementClassName,
	parseGridPlacementFromClassName,
	readGridPlacementFromComputedStyle
} from "./item-edit.grid-placement";

import type { Decor, ItemComp } from "@/api/db";
import type { EditableStyle } from "@/components/style-editor/types";
import type { ElementTransform } from "@/components/position-editor/lib.types";

export type TransformEditorMode = "transform" | "position";

export type TransformCommitMeta = {
	translateX: number;
	translateY: number;
	cell?: { row: number; col: number };
	reorderIndex?: number;
};

export type PositionCommitMeta = {
	cell?: { row: number; col: number };
	reorderIndex?: number;
	gridPlacement?: { row: number; col: number; rowSpan: number; colSpan: number };
};

type Input = {
	decor?: Decor;
	editDecor?: Decor;
	parentCapsuleType?: string | null;
	previewOrientation: OrientationMode;
	item?: ItemComp;
	activeNode: HTMLElement | null;
	onStyleChange: (payload: EditableStyle) => void;
	onDecorUpdate: (payload: { id: number; area?: string | null; className?: string | null }) => void;
	onTreeMove: (payload: { sourceId: number; targetCapsuleId: number; insertionIndex: number }) => void;
};

export function createTransformController(input: Input) {
	const { decor, editDecor, parentCapsuleType, item, activeNode, onStyleChange, onDecorUpdate, onTreeMove } =
		input;

	const onResetTransform = () => {
		onStyleChange(buildResetTransformStyle());
	};

	const onTransformModeChange = (mode: TransformEditorMode) => {
		if (mode !== "position") return;
		enforcePositionInlineLock(activeNode);
		const targetDecor = editDecor || decor;
		if (!targetDecor) return;

		const style = ((targetDecor.style as EditableStyle) ?? {}) as Record<string, unknown>;
		const clearPayload: EditableStyle = {};
		for (const key of ["width", "height", "x", "y", "rotate", "originX", "originY", "scaleX", "scaleY"]) {
			if (typeof style[key] !== "undefined") (clearPayload as Record<string, unknown>)[key] = null;
		}
		if (Object.keys(clearPayload).length) onStyleChange(clearPayload);

		const parsedSpan = parseGridPlacementFromClassName(targetDecor.className ?? null);
		const hasFullSpanToken = String(targetDecor.className || "")
			.split(/\s+/)
			.includes(POSITION_FULL_SPAN_CLASS);
		const spanClass = parsedSpan
			? buildGridSpanClassName(parsedSpan)
			: hasFullSpanToken
				? targetDecor.className
				: buildSpanClassFromArea(targetDecor.area);
		const shouldApplySpanClass = Boolean(spanClass) && spanClass !== targetDecor.className;
		if (targetDecor.area || shouldApplySpanClass) {
			clearPlacementAreaTokens(activeNode);
			if (targetDecor.area) applyAreaClassPatch(activeNode, targetDecor.area, null);
			if (shouldApplySpanClass && spanClass) {
				ensureLivePlacementClassDefinitions(activeNode, spanClass);
				applyClassTokenPatch(activeNode, targetDecor.className ?? null, spanClass);
			}
			onDecorUpdate({
				id: targetDecor.id,
				area: null,
				className: shouldApplySpanClass ? spanClass : (targetDecor.className ?? null)
			});
		}
	};

	const onReturnToSimplePlacement = () => {
		const targetDecor = editDecor || decor;
		if (!targetDecor) return;
		const nextClassName = collapseToSimplePlacementClassName({
			className: targetDecor.className ?? null,
			defaultOrientation: DEFAULT_EDITOR_PREVIEW_ORIENTATION
		});
		if ((targetDecor.className ?? null) === (nextClassName ?? null)) return;
		clearPlacementAreaTokens(activeNode);
		ensureLivePlacementClassDefinitions(activeNode, nextClassName ?? null);
		applyClassTokenPatch(activeNode, targetDecor.className ?? null, nextClassName ?? null);
		onDecorUpdate({ id: targetDecor.id, className: nextClassName ?? null });
	};

	const onTransformCommit = (
		transform: ElementTransform,
		mode: "move" | "rotate" | "resize-se" | "cell-snap" | "origin",
		meta: TransformCommitMeta
	) => {
		const targetDecor = editDecor || decor;
		if (!targetDecor) return;

		const capsuleType = resolveCapsuleType(parentCapsuleType);
		const placementSnapshot = readAutoLayoutPlacementSnapshot(activeNode);
		if (placementSnapshot) {
			const lockPatch = buildAutoLayoutPlacementLockPatch({
				capsuleType: parentCapsuleType,
				targetDecor,
				snapshot: placementSnapshot
			});
			if (lockPatch) onDecorUpdate({ id: targetDecor.id, ...lockPatch });
		}

		if (mode === "cell-snap") {
			if (capsuleType === CAPSULE_TYPES.LISTE && item) {
				if (targetDecor.area) {
					applyClassTokenPatch(activeNode, targetDecor.area ?? null, null);
					onDecorUpdate({ id: targetDecor.id, area: null });
				}
				if (typeof meta.reorderIndex === "number") {
					onTreeMove({ sourceId: item.id, targetCapsuleId: item.capsuleId, insertionIndex: meta.reorderIndex });
				}
				return;
			}
			if (meta.cell) {
				const nextArea = `cell-r${meta.cell.row}-c${meta.cell.col}`;
				ensureLiveAreaClassDefinition(activeNode, nextArea);
				applyAreaClassPatch(activeNode, targetDecor.area ?? null, nextArea);
				onDecorUpdate({ id: targetDecor.id, area: nextArea });
			}
			return;
		}

		const effectiveCurrentStyle = ((decor?.style as EditableStyle) ?? {}) as Record<string, unknown>;
		const candidate = {
			x: meta.translateX,
			y: meta.translateY,
			rotate: transform.rotate,
			originX: transform.originX,
			originY: transform.originY,
			scaleX: transform.scaleX,
			scaleY: transform.scaleY
		} as EditableStyle;
		const payload: EditableStyle = {};
		for (const [key, value] of Object.entries(candidate)) {
			if (Object.is(effectiveCurrentStyle[key], value)) continue;
			(payload as Record<string, unknown>)[key] = value;
		}
		if (!Object.keys(payload).length) return;
		onStyleChange(payload);
	};

	const onPositionCommit = (mode: "cell-snap" | "resize-grid-se", meta: PositionCommitMeta) => {
		const targetDecor = editDecor || decor;
		if (!targetDecor) return;

		enforcePositionInlineLock(activeNode);
		const style = ((targetDecor.style as EditableStyle) ?? {}) as Record<string, unknown>;
		const clearPayload: EditableStyle = {};
		for (const key of ["width", "height", "x", "y", "rotate", "originX", "originY", "scaleX", "scaleY"]) {
			if (typeof style[key] !== "undefined") (clearPayload as Record<string, unknown>)[key] = null;
		}
		if (Object.keys(clearPayload).length) onStyleChange(clearPayload);

		if (mode === "resize-grid-se" && meta.gridPlacement) {
			const nextSpanToken = buildGridSpanClassName(meta.gridPlacement);
			const nextClassName = resolvePlacementClassNameForOrientation({
				existingClassName: targetDecor.className ?? null,
				nextSpanToken,
				activeNode,
				activeOrientation: input.previewOrientation,
				defaultOrientation: DEFAULT_EDITOR_PREVIEW_ORIENTATION
			});
			clearPlacementAreaTokens(activeNode);
			ensureLivePlacementClassDefinitions(activeNode, nextClassName);
			applyClassTokenPatch(activeNode, targetDecor.className ?? null, nextClassName);
			applyAreaClassPatch(activeNode, targetDecor.area ?? null, null);
			onDecorUpdate({ id: targetDecor.id, area: null, className: nextClassName });
			return;
		}

		if (mode === "cell-snap") {
			if (resolveCapsuleType(parentCapsuleType) === CAPSULE_TYPES.LISTE && item) {
				if (typeof meta.reorderIndex === "number") {
					onTreeMove({ sourceId: item.id, targetCapsuleId: item.capsuleId, insertionIndex: meta.reorderIndex });
				}
				return;
			}
			if (!meta.cell) return;
			const hasLegacyFillToken = String(targetDecor.className || "")
				.split(/\s+/)
				.includes("cell-span-fill");
			const baseline = parseGridPlacementFromClassName(targetDecor.className ?? null) ??
				(!hasLegacyFillToken ? readGridPlacementFromComputedStyle(activeNode) : null) ?? {
					row: meta.cell.row,
					col: meta.cell.col,
					rowSpan: 1,
					colSpan: 1
				};
			const resolvedRowSpan = baseline.rowSpan;
			const resolvedColSpan = baseline.colSpan;
			const nextSpanToken = buildGridSpanClassName({
				row: Math.max(1, meta.cell.row),
				col: Math.max(1, meta.cell.col),
				rowSpan: resolvedRowSpan,
				colSpan: resolvedColSpan
			});
			const nextClassName = resolvePlacementClassNameForOrientation({
				existingClassName: targetDecor.className ?? null,
				nextSpanToken,
				activeNode,
				activeOrientation: input.previewOrientation,
				defaultOrientation: DEFAULT_EDITOR_PREVIEW_ORIENTATION
			});
			clearPlacementAreaTokens(activeNode);
			ensureLivePlacementClassDefinitions(activeNode, nextClassName);
			applyClassTokenPatch(activeNode, targetDecor.className ?? null, nextClassName);
			applyAreaClassPatch(activeNode, targetDecor.area ?? null, null);
			onDecorUpdate({ id: targetDecor.id, area: null, className: nextClassName });
		}
	};

	return {
		onTransformCommit,
		onPositionCommit,
		onResetTransform,
		onTransformModeChange,
		onReturnToSimplePlacement
	};
}

function enforcePositionInlineLock(node: HTMLElement | null) {
	if (!node) return;
	node.style.removeProperty("width");
	node.style.removeProperty("height");
	node.style.removeProperty("transform");
	node.style.removeProperty("transform-origin");
}

function buildSpanClassFromArea(area: string | null | undefined): string | null {
	if (!area) return null;
	const match = /^cell-r(\d+)-c(\d+)$/.exec(area.trim());
	if (!match) return null;
	const row = Math.max(1, Number(match[1]) || 1);
	const col = Math.max(1, Number(match[2]) || 1);
	return buildGridSpanClassName({ row, col, rowSpan: 1, colSpan: 1 });
}

function resolvePlacementClassNameForOrientation(args: {
	existingClassName: string | null;
	nextSpanToken: string;
	activeNode: HTMLElement | null;
	activeOrientation: OrientationMode;
	defaultOrientation: OrientationMode;
}): string {
	const nextRect = toGridPlacementRectFromSpanToken(args.nextSpanToken);
	if (!nextRect) return mergeGridPlacementClassName(args.existingClassName ?? null, args.nextSpanToken);
	const seedRect =
		parseGridPlacementFromClassName(args.existingClassName ?? null) ??
		readGridPlacementFromComputedStyle(args.activeNode) ??
		nextRect;
	const seed: GridPlacementRect = {
		row: seedRect.row,
		col: seedRect.col,
		rowSpan: seedRect.rowSpan,
		colSpan: seedRect.colSpan
	};

	return updateOrCreateOrientedPlacementToken({
		className: args.existingClassName,
		activeOrientation: args.activeOrientation,
		defaultOrientation: args.defaultOrientation,
		nextPlacement: nextRect,
		seedPlacement: seed
	});
}
