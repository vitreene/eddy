import { classNameToCssDefinition, gridPlacementClassNameToCssDefinition } from "@/lib/utils";

const LIVE_AREA_STYLE_ID = "eddy-live-area-definitions";
const AUTO_LAYOUT_AREA_TOKEN_RE = /^cell_layout_auto(?:_[a-z0-9_-]+)?-r\d+-c\d+$/i;
const EXPLICIT_AREA_TOKEN_RE = /^cell-r\d+-c\d+$/i;
const LIST_AREA_TOKEN_RE = /^liste-r\d+$/i;

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
				LIST_AREA_TOKEN_RE.test(token)
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
	if (nextArea && EXPLICIT_AREA_TOKEN_RE.test(nextArea)) {
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
	if (!node || !areaClassName) return;
	if (!/^cell-r\d+-c\d+$/.test(areaClassName)) return;

	const doc = node.ownerDocument;
	const head = doc?.head;
	if (!head) return;

	let styleEl = doc.getElementById(LIVE_AREA_STYLE_ID) as HTMLStyleElement | null;
	if (!styleEl) {
		styleEl = doc.createElement("style");
		styleEl.id = LIVE_AREA_STYLE_ID;
		head.appendChild(styleEl);
	}

	const marker = `.${areaClassName}{`;
	if ((styleEl.textContent || "").includes(marker)) return;

	try {
		const definition = classNameToCssDefinition(areaClassName);
		styleEl.textContent = `${styleEl.textContent || ""}\n${definition}`.trim();
	} catch {
		// ignore invalid area tokens
	}
}

export function ensureLivePlacementClassDefinitions(node: HTMLElement | null, className: string | null) {
	if (!node || !className) return;
	const doc = node.ownerDocument;
	const head = doc?.head;
	if (!head) return;

	let styleEl = doc.getElementById(LIVE_AREA_STYLE_ID) as HTMLStyleElement | null;
	if (!styleEl) {
		styleEl = doc.createElement("style");
		styleEl.id = LIVE_AREA_STYLE_ID;
		head.appendChild(styleEl);
	}

	const tokens = className
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	for (const token of tokens) {
		const marker = `.${token}{`;
		if ((styleEl.textContent || "").includes(marker)) continue;
		const definition = gridPlacementClassNameToCssDefinition(token);
		if (!definition) continue;
		styleEl.textContent = `${styleEl.textContent || ""}\n${definition}`.trim();
	}
}
