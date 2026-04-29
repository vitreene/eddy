import {
	DEFAULT_EDITOR_PREVIEW_ORIENTATION,
	ORIENTATION_LANDSCAPE,
	ORIENTATION_PORTRAIT,
	type OrientationMode
} from "@/config/orientation";

type OrientationGridRecord = {
	portrait?: string | null;
	landscape?: string | null;
};

const GRID_CLASS_RE = /\bed-grid-w\d+-h\d+\b/;

function trimGrid(value: unknown): string | null {
	if (typeof value != "string") return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export function extractEditorGridClassName(value: unknown): string | null {
	const source = trimGrid(value);
	if (!source) return null;
	const match = GRID_CLASS_RE.exec(source);
	return match?.[0] || null;
}

export function normalizeOrientationGridRecord(value: unknown): OrientationGridRecord {
	if (!value || typeof value != "object") return {};
	const record = value as Record<string, unknown>;
	return {
		portrait: trimGrid(record.portrait),
		landscape: trimGrid(record.landscape)
	};
}

function oppositeOrientation(orientation: OrientationMode): OrientationMode {
	return orientation === ORIENTATION_PORTRAIT ? ORIENTATION_LANDSCAPE : ORIENTATION_PORTRAIT;
}

export function swapSceneGridRowsAndCols(grid: string | null | undefined): string | null {
	const source = trimGrid(grid);
	if (!source) return null;
	const tokens = source
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	if (!tokens.length) return null;

	let changed = false;
	const next = tokens.map((token) => {
		const match = /^ed-grid-w(\d+)-h(\d+)$/.exec(token);
		if (!match) return token;
		const w = Number(match[1]);
		const h = Number(match[2]);
		if (!Number.isFinite(w) || !Number.isFinite(h)) return token;
		changed = true;
		return `ed-grid-w${Math.max(1, h)}-h${Math.max(1, w)}`;
	});

	if (!changed) return null;
	return next.join(" ");
}

export function resolveSceneGridForOrientation(args: {
	baseGrid: string | null | undefined;
	orientationGrid: unknown;
	orientation: OrientationMode;
	defaultOrientation?: OrientationMode;
}): string | null {
	const defaultOrientation = args.defaultOrientation || DEFAULT_EDITOR_PREVIEW_ORIENTATION;
	const baseGrid = trimGrid(args.baseGrid);
	const variants = normalizeOrientationGridRecord(args.orientationGrid);
	const explicit = trimGrid(variants[args.orientation]);
	if (explicit) return explicit;

	const opposite = trimGrid(variants[oppositeOrientation(args.orientation)]);
	if (opposite) {
		const derived = swapSceneGridRowsAndCols(opposite);
		if (derived) return derived;
	}

	if (!baseGrid) return null;
	if (args.orientation === defaultOrientation) return baseGrid;
	return swapSceneGridRowsAndCols(baseGrid) || baseGrid;
}

export function resolveSceneGridPairWithFallback(args: {
	baseGrid: string | null | undefined;
	orientationGrid: unknown;
	defaultOrientation?: OrientationMode;
}): { portrait: string; landscape: string } | null {
	const portrait = resolveSceneGridForOrientation({
		baseGrid: args.baseGrid,
		orientationGrid: args.orientationGrid,
		orientation: ORIENTATION_PORTRAIT,
		defaultOrientation: args.defaultOrientation
	});
	const landscape = resolveSceneGridForOrientation({
		baseGrid: args.baseGrid,
		orientationGrid: args.orientationGrid,
		orientation: ORIENTATION_LANDSCAPE,
		defaultOrientation: args.defaultOrientation
	});
	if (!portrait || !landscape) return null;
	return { portrait, landscape };
}
