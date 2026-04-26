import { applyStyleDefaults } from "@/config/item-style-defaults";

import { applyLiveStyleOnNode } from "./live-node-style";
import {
	applyAreaClassPatch,
	applyClassNameAction,
	buildClassNameDiff,
	ensureLiveAreaClassDefinition
} from "./live-node-classes";

import type { Decor } from "@/api/db";
import type { EditableStyle } from "@/components/style-editor/types";
import type { ElementTransform } from "@/components/position-editor/lib.types";

const STRUCTURAL_CLASS_RE = /^(?:ed-caps|ed-item|ed-grid-[a-z0-9_-]+)$/i;

export type EditableVisualState = {
	itemId: number;
	eventAction: string | null;
	cueSec: number | null;
	decorId: number | null;
	area: string | null;
	className: string | null;
	style: EditableStyle;
	transform: Partial<ElementTransform>;
	previousClassName: string | null;
	previousArea: string | null;
	previousStyle: EditableStyle | null;
};

export function buildEditableVisualState(input: {
	itemId: number;
	eventAction: string | null;
	cueSec: number | null;
	decor: Decor | undefined;
}): EditableVisualState {
	const style = ((input.decor?.style as EditableStyle) ?? {}) as EditableStyle;
	return {
		itemId: input.itemId,
		eventAction: input.eventAction,
		cueSec: input.cueSec,
		decorId: input.decor?.id ?? null,
		area: input.decor?.area ?? null,
		className: input.decor?.className ?? null,
		style,
		transform: getTransformValueFromStyle(style),
		previousClassName: null,
		previousArea: null,
		previousStyle: null
	};
}

export function projectEditableVisualStateToNode(
	node: HTMLElement | null,
	state: EditableVisualState | null
) {
	if (!node || !state) return;

	const currentClassName = node.className || "";
	const targetClassName = mergeProjectedStructuralClasses(currentClassName, state.className);
	const classNameDiff = buildClassNameDiff(currentClassName, targetClassName);
	if (classNameDiff) {
		applyClassNameAction(node, classNameDiff);
	}

	ensureLiveAreaClassDefinition(node, state.area);
	applyAreaClassPatch(node, null, state.area);
	applyLiveStyleOnNode(node, state.style);
}

export function mergeProjectedStructuralClasses(
	currentClassName: string | null | undefined,
	nextClassName: string | null | undefined
): string | null {
	const currentTokens = String(currentClassName || "")
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	const nextTokens = new Set(
		String(nextClassName || "")
			.split(/\s+/)
			.map((token) => token.trim())
			.filter(Boolean)
	);

	for (const token of currentTokens) {
		if (STRUCTURAL_CLASS_RE.test(token)) {
			nextTokens.add(token);
		}
	}

	const merged = Array.from(nextTokens).join(" ").trim();
	return merged || null;
}

function toFiniteNumber(value: unknown): number | null {
	if (typeof value == "number" && Number.isFinite(value)) return value;
	if (typeof value == "string") {
		const parsed = Number.parseFloat(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function getTransformValueFromStyle(style: EditableStyle | null | undefined): Partial<ElementTransform> {
	const source = applyStyleDefaults(style) as Record<string, unknown>;
	const x = toFiniteNumber(source.x);
	const y = toFiniteNumber(source.y);
	const width = toFiniteNumber(source.width);
	const height = toFiniteNumber(source.height);
	const rotate = toFiniteNumber(source.rotate);
	const originX = toFiniteNumber(source.originX) ?? 0.5;
	const originY = toFiniteNumber(source.originY) ?? 0.5;
	const scaleX = toFiniteNumber(source.scaleX);
	const scaleY = toFiniteNumber(source.scaleY);

	return {
		...(x != null ? { x } : {}),
		...(y != null ? { y } : {}),
		...(width != null ? { width } : {}),
		...(height != null ? { height } : {}),
		...(rotate != null ? { rotate } : {}),
		...(originX != null ? { originX } : {}),
		...(originY != null ? { originY } : {}),
		...(scaleX != null ? { scaleX } : {}),
		...(scaleY != null ? { scaleY } : {})
	};
}
