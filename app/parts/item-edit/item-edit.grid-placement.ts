export type GridPlacement = {
	row: number;
	col: number;
	rowSpan: number;
	colSpan: number;
};

const GRID_SPAN_TOKEN_RE = /^cell-span-r(\d+)-c(\d+)-rs(\d+)-cs(\d+)$/;
const ORIENTED_PLACEMENT_TOKEN_RE = /^ed-posv1-/i;
const AUTO_LAYOUT_AREA_TOKEN_RE = /^cell_layout_auto(?:_[a-z0-9_-]+)?-r\d+-c\d+$/i;
const EXPLICIT_AREA_TOKEN_RE = /^cell-r\d+-c\d+$/i;
const LIST_AREA_TOKEN_RE = /^liste-r\d+$/i;

export function parseGridPlacementFromClassName(className: string | null | undefined): GridPlacement | null {
	if (!className) return null;
	const tokens = className
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	for (const token of tokens) {
		const match = GRID_SPAN_TOKEN_RE.exec(token);
		if (!match) continue;
		const row = Number(match[1]);
		const col = Number(match[2]);
		const rowSpan = Number(match[3]);
		const colSpan = Number(match[4]);
		if (!row || !col || !rowSpan || !colSpan) continue;
		return { row, col, rowSpan, colSpan };
	}
	if (tokens.includes("cell-span-fill")) {
		return null;
	}
	return null;
}

export function buildGridSpanClassName(placement: GridPlacement): string {
	return `cell-span-r${placement.row}-c${placement.col}-rs${placement.rowSpan}-cs${placement.colSpan}`;
}

export function mergeGridPlacementClassName(existing: string | null | undefined, nextToken: string): string {
	const tokens = new Set(
		(existing || "")
			.split(/\s+/)
			.map((token) => token.trim())
			.filter(Boolean)
	);
	for (const token of [...tokens]) {
		if (
			token === "cell-span-fill" ||
			GRID_SPAN_TOKEN_RE.test(token) ||
			AUTO_LAYOUT_AREA_TOKEN_RE.test(token) ||
			EXPLICIT_AREA_TOKEN_RE.test(token) ||
			LIST_AREA_TOKEN_RE.test(token) ||
			ORIENTED_PLACEMENT_TOKEN_RE.test(token)
		)
			tokens.delete(token);
	}
	tokens.add(nextToken);
	return [...tokens].join(" ");
}

export function readGridPlacementFromComputedStyle(node: HTMLElement | null): GridPlacement | null {
	if (!node) return null;
	const cs = getComputedStyle(node);
	const rowStart = parseGridLineStart(cs.gridRowStart);
	const colStart = parseGridLineStart(cs.gridColumnStart);
	const rowSpan = parseGridSpan(cs.gridRowEnd);
	const colSpan = parseGridSpan(cs.gridColumnEnd);
	if (!rowStart || !colStart) return null;
	return {
		row: rowStart,
		col: colStart,
		rowSpan: rowSpan || 1,
		colSpan: colSpan || 1
	};
}

function parseGridLineStart(value: string): number | null {
	const match = String(value || "")
		.trim()
		.match(/^(\d+)/);
	if (!match) return null;
	const n = Number(match[1]);
	return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function parseGridSpan(value: string): number | null {
	const spanMatch = String(value || "")
		.trim()
		.match(/^span\s+(\d+)$/i);
	if (!spanMatch) return null;
	const n = Number(spanMatch[1]);
	return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
