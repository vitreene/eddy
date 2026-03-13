import { CAPSULE_TYPES, resolveCapsuleType } from "@/config/capsule-types";

import type { Decor } from "@/api/db";

type AutoLayoutPlacementSnapshot = {
	className: string;
	gridRowStart: string;
	gridColumnStart: string;
};

type PlacementPatch = {
	area?: string | null;
	className?: string | null;
};

/**
 * Build the persistence patch required to lock auto placement after a transform.
 * - For grid/rangee-like layouts: persist explicit `area` from computed grid row/col.
 * - For liste layouts: persist current virtual `liste-rN` token in `className`.
 */
export function buildAutoLayoutPlacementLockPatch(params: {
	capsuleType: string | null | undefined;
	targetDecor: Decor;
	snapshot: AutoLayoutPlacementSnapshot;
}): PlacementPatch | null {
	const { capsuleType, targetDecor, snapshot } = params;
	const resolvedType = resolveCapsuleType(capsuleType);

	if (resolvedType === CAPSULE_TYPES.CARROUSEL) return null;

	if (resolvedType === CAPSULE_TYPES.LISTE) {
		const listToken = readListPlacementToken(snapshot.className);
		if (!listToken) return null;
		const mergedClassName = mergeClassToken(targetDecor.className ?? null, listToken);
		if (mergedClassName === (targetDecor.className ?? null)) return null;
		return { className: mergedClassName };
	}

	if (typeof targetDecor.area == "string" && targetDecor.area.trim().length) return null;
	const area = readAreaFromSnapshot(snapshot);
	if (!area) return null;
	if (area === targetDecor.area) return null;
	return { area };
}

/**
 * Capture live node placement signals used to lock auto placement.
 */
export function readAutoLayoutPlacementSnapshot(
	node: HTMLElement | null
): AutoLayoutPlacementSnapshot | null {
	if (!node) return null;
	const cs = getComputedStyle(node);
	return {
		className: node.className || "",
		gridRowStart: cs.gridRowStart || "",
		gridColumnStart: cs.gridColumnStart || ""
	};
}

function readAreaFromSnapshot(snapshot: AutoLayoutPlacementSnapshot): string | null {
	const explicitToken = readExplicitAreaToken(snapshot.className);
	if (explicitToken) return explicitToken;

	const row = parsePositiveGridIndex(snapshot.gridRowStart);
	const col = parsePositiveGridIndex(snapshot.gridColumnStart);
	if (!row || !col) return null;
	return `cell-r${row}-c${col}`;
}

function readExplicitAreaToken(className: string): string | null {
	const tokens = className.split(/\s+/).filter(Boolean);
	for (const token of tokens) {
		if (/^cell-r\d+-c\d+$/.test(token)) return token;
	}
	return null;
}

function readListPlacementToken(className: string): string | null {
	const tokens = className.split(/\s+/).filter(Boolean);
	for (const token of tokens) {
		if (/^liste-r\d+$/.test(token)) return token;
	}
	return null;
}

function parsePositiveGridIndex(value: string): number | null {
	const match = String(value || "")
		.trim()
		.match(/^(\d+)/);
	if (!match) return null;
	const n = Number(match[1]);
	if (!Number.isFinite(n) || n < 1) return null;
	return Math.round(n);
}

function mergeClassToken(existing: string | null, token: string): string {
	const set = new Set((existing || "").split(/\s+/).filter(Boolean));
	set.add(token);
	return [...set].join(" ");
}
