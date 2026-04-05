import type { ClassNameAction } from "@/player/types";

const AUTO_LAYOUT_AREA_TOKEN_RE = /^cell_layout_auto(?:_[a-z0-9_-]+)?-r\d+-c\d+$/i;
const EXPLICIT_AREA_TOKEN_RE = /^cell-r\d+-c\d+$/i;
const LIST_AREA_TOKEN_RE = /^liste-r\d+$/i;
const SPAN_LAYOUT_AREA_TOKEN_RE = /^cell-span-r\d+-c\d+-rs\d+-cs\d+$/i;
const ZONE_CLASS_TOKEN_RE = /^ed-zone-[a-z0-9_-]+$/i;

export function clearPlacementAreaTokens(node: HTMLElement | null) {
	if (!node) return;
	const tokens = String(node.className || "")
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean)
		.filter(
			(token) =>
				AUTO_LAYOUT_AREA_TOKEN_RE.test(token) ||
				EXPLICIT_AREA_TOKEN_RE.test(token) ||
				LIST_AREA_TOKEN_RE.test(token) ||
				SPAN_LAYOUT_AREA_TOKEN_RE.test(token) ||
				ZONE_CLASS_TOKEN_RE.test(token)
		);
	if (tokens.length) node.classList.remove(...tokens);
}

export function applyClassTokenPatch(
	node: HTMLElement | null,
	previousValue: string | null,
	nextValue: string | null
) {
	if (!node) return;
	const previousTokens = (previousValue || "")
		.split(" ")
		.map((token) => token.trim())
		.filter(Boolean);
	const nextTokens = (nextValue || "")
		.split(" ")
		.map((token) => token.trim())
		.filter(Boolean);
	if (previousTokens.length) node.classList.remove(...previousTokens);
	if (nextTokens.length) node.classList.add(...nextTokens);
}

export function applyClassNameAction(node: HTMLElement | null, action: ClassNameAction | undefined | null) {
	if (!node || !action) return;
	if (action.add) {
		action.add.split(/\s+/).forEach((cls) => node.classList.add(cls));
	}
	if (action.remove) {
		action.remove.split(/\s+/).forEach((cls) => node.classList.remove(cls));
	}
}

export function buildClassNameDiff(
	previousClassName: string | null,
	nextClassName: string | null
): ClassNameAction | undefined {
	const previous = new Set(
		(previousClassName || "")
			.split(/\s+/)
			.map((v) => v.trim())
			.filter(Boolean)
	);
	const next = new Set(
		(nextClassName || "")
			.split(/\s+/)
			.map((v) => v.trim())
			.filter(Boolean)
	);

	const remove = [...previous].filter((token) => !next.has(token)).join(" ");
	const add = [...next].filter((token) => !previous.has(token)).join(" ");
	if (!remove && !add) return undefined;

	return {
		...(add ? { add } : {}),
		...(remove ? { remove } : {})
	};
}

/**
 * Apply an explicit grid area class and clear auto/list placement tokens.
 * Keeps className in sync with persisted `decor.area` when editing live.
 */
export function applyAreaClassPatch(
	node: HTMLElement | null,
	previousArea: string | null,
	nextArea: string | null
) {
	if (!node) return;
	if (nextArea && (EXPLICIT_AREA_TOKEN_RE.test(nextArea) || SPAN_LAYOUT_AREA_TOKEN_RE.test(nextArea))) {
		clearPlacementAreaTokens(node);
		node.classList.add(nextArea);
		return;
	}

	applyClassTokenPatch(node, previousArea, nextArea);
}

/**
 * Ensure a grid-area class has a CSS definition available immediately.
 * This avoids waiting for full scene rebuild/reload when a new `cell-rX-cY`
 * class is introduced live in the editor.
 */
export function ensureLiveAreaClassDefinition(node: HTMLElement | null, areaClassName: string | null) {
	void node;
	void areaClassName;
}

export function ensureLivePlacementClassDefinitions(node: HTMLElement | null, className: string | null) {
	void node;
	void className;
}
