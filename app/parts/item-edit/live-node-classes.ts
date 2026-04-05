import { classNameToCssDefinition, gridPlacementClassNameToCssDefinition } from "@/lib/utils";
import { getPositionZoneClassAliases, type PositionZoneRuntime } from "@/lib/position-zones";

import type { ClassNameAction } from "@/player/types";

const LIVE_AREA_STYLE_ID = "eddy-live-area-definitions";
const LIVE_ZONE_STYLE_ID = "eddy-live-zone-definitions";
const AUTO_LAYOUT_AREA_TOKEN_RE = /^cell_layout_auto(?:_[a-z0-9_-]+)?-r\d+-c\d+$/i;
const EXPLICIT_AREA_TOKEN_RE = /^cell-r\d+-c\d+$/i;
const LIST_AREA_TOKEN_RE = /^liste-r\d+$/i;
const SPAN_LAYOUT_AREA_TOKEN_RE = /^cell-span-r\d+-c\d+-rs\d+-cs\d+$/i;

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
				/^cell-span-r\d+-c\d+-rs\d+-cs\d+$/.test(token)
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

export function syncLiveZoneClassDefinitions(
	anchorNode: HTMLElement | null,
	capsuleNodeId: string | null,
	zones: PositionZoneRuntime[]
) {
	if (!anchorNode || !capsuleNodeId) return;
	const doc = anchorNode.ownerDocument;
	const head = doc?.head;
	if (!head) return;

	let styleEl = doc.getElementById(LIVE_ZONE_STYLE_ID) as HTMLStyleElement | null;
	if (!styleEl) {
		styleEl = doc.createElement("style");
		styleEl.id = LIVE_ZONE_STYLE_ID;
		head.appendChild(styleEl);
	}

	const key = `capsule-${capsuleNodeId}`;
	const sectionStart = `/* ${key}:start */`;
	const sectionEnd = `/* ${key}:end */`;
	const escapedId =
		typeof CSS != "undefined" && typeof CSS.escape == "function"
			? CSS.escape(capsuleNodeId)
			: capsuleNodeId.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
	const uniqueZonesByClass = new Map<string, PositionZoneRuntime>();
	for (const zone of zones) {
		if (!zone.className) continue;
		if (uniqueZonesByClass.has(zone.className)) continue;
		uniqueZonesByClass.set(zone.className, zone);
	}

	const sectionBody = [...uniqueZonesByClass.values()]
		.flatMap((zone) =>
			getPositionZoneClassAliases(zone).map(
				(className) =>
					`#${escapedId} .${className}{grid-row:${zone.rect.row} / span ${zone.rect.spanRow};grid-column:${zone.rect.column} / span ${zone.rect.spanColumn};}`
			)
		)
		.join("\n");
	const nextSection = sectionBody ? `${sectionStart}\n${sectionBody}\n${sectionEnd}` : "";

	const current = styleEl.textContent || "";
	const startIndex = current.indexOf(sectionStart);
	const endIndex = current.indexOf(sectionEnd);
	if (startIndex >= 0 && endIndex > startIndex) {
		const before = current.slice(0, startIndex).trim();
		const after = current.slice(endIndex + sectionEnd.length).trim();
		styleEl.textContent = [before, nextSection, after].filter(Boolean).join("\n").trim();
		return;
	}

	if (!nextSection) return;
	styleEl.textContent = `${current}\n${nextSection}`.trim();
}
