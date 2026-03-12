import { applyTransformPreserve, readTransformPreserve } from "@/components/position-editor/lib";

import type { EditableStyle } from "@/components/style-editor/types";

const LIVE_TRANSFORM_KEYS = ["x", "y", "width", "height", "rotate", "originX", "originY", "scaleX", "scaleY"];
const LIVE_TRANSFORM_KEY_SET = new Set(LIVE_TRANSFORM_KEYS);

function toNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number.parseFloat(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function hasOwn(obj: object, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeInlineStyle(style: EditableStyle | undefined): Record<string, string | number | null> {
	if (!style || typeof style !== "object") return {};
	const source = style as Record<string, unknown>;
	const normalized: Record<string, string | number | null> = {};

	for (const [key, value] of Object.entries(source)) {
		if (LIVE_TRANSFORM_KEY_SET.has(key)) continue;
		if (typeof value === "undefined") continue;
		if (value === null) {
			normalized[key] = null;
			continue;
		}
		if (typeof value !== "string" && typeof value !== "number") continue;
		normalized[key] = value;
	}

	return normalized;
}

export function applyLiveStyleOnNode(
	node: HTMLElement | null,
	style: EditableStyle | undefined,
	options?: { currentStyle?: EditableStyle }
) {
	if (!node || !style) return;

	const hasTransformPatch = LIVE_TRANSFORM_KEYS.some(
		(key) =>
			hasOwn(style, key) &&
			style[key as keyof EditableStyle] !== null &&
			style[key as keyof EditableStyle] !== undefined
	);
	if (hasTransformPatch) {
		const current = readTransformPreserve(node);
		const currentStyle = (options?.currentStyle || {}) as Record<string, unknown>;
		const persistedX = toNumber(currentStyle.x) ?? 0;
		const persistedY = toNumber(currentStyle.y) ?? 0;
		const baseX = current.x - persistedX;
		const baseY = current.y - persistedY;
		const maybeWidth = toNumber(style.width);
		const maybeHeight = toNumber(style.height);
		const maybeX = toNumber(style.x);
		const maybeY = toNumber(style.y);
		const maybeRotate = toNumber(style.rotate);
		const maybeOriginX = toNumber(style.originX);
		const maybeOriginY = toNumber(style.originY);
		const maybeScaleX = toNumber(style.scaleX);
		const maybeScaleY = toNumber(style.scaleY);

		applyTransformPreserve(
			node,
			{
				...current,
				x: hasOwn(style, "x") ? baseX + (maybeX ?? persistedX) : current.x,
				y: hasOwn(style, "y") ? baseY + (maybeY ?? persistedY) : current.y,
				width: hasOwn(style, "width") ? (maybeWidth ?? current.width) : current.width,
				height: hasOwn(style, "height") ? (maybeHeight ?? current.height) : current.height,
				rotate: hasOwn(style, "rotate") ? (maybeRotate ?? current.rotate) : current.rotate,
				originX: hasOwn(style, "originX") ? (maybeOriginX ?? current.originX) : current.originX,
				originY: hasOwn(style, "originY") ? (maybeOriginY ?? current.originY) : current.originY,
				scaleX: hasOwn(style, "scaleX") ? (maybeScaleX ?? current.scaleX) : current.scaleX,
				scaleY: hasOwn(style, "scaleY") ? (maybeScaleY ?? current.scaleY) : current.scaleY
			},
			{ x: baseX, y: baseY }
		);
	}

	const inline = normalizeInlineStyle(style);
	for (const [key, value] of Object.entries(inline)) {
		if (key === "backgroundImage") {
			if (value === null) node.style.removeProperty("background-image");
			else node.style.setProperty("background-image", String(value));
			continue;
		}
		if (key === "backgroundSize") {
			if (value === null) {
				node.style.backgroundSize = "";
				node.style.objectFit = "";
			} else {
				const nextValue = String(value);
				node.style.backgroundSize = nextValue;
				if (nextValue === "cover" || nextValue === "contain") {
					node.style.objectFit = nextValue;
				}
			}
			continue;
		}
		if (key === "backgroundPosition") {
			if (value === null) {
				node.style.backgroundPosition = "";
				node.style.objectPosition = "";
			} else {
				const nextValue = String(value);
				node.style.backgroundPosition = nextValue;
				node.style.objectPosition = nextValue;
			}
			continue;
		}
		if (value === null) {
			(node.style as any)[key] = "";
			continue;
		}
		(node.style as any)[key] = typeof value === "number" ? String(value) : value;
	}
}
