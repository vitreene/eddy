import { ORIENTATION_LANDSCAPE, ORIENTATION_PORTRAIT, type OrientationMode } from "@/config/orientation";

export type GridPlacementRect = {
	row: number;
	col: number;
	rowSpan: number;
	colSpan: number;
};

export type OrientationPlacementVariants = {
	portrait: GridPlacementRect;
	landscape: GridPlacementRect;
};

const ORIENTED_PLACEMENT_TOKEN_RE =
	/^ed-posv1-p\(r(\d+)-c(\d+)-rs(\d+)-cs(\d+)\)-l\(r(\d+)-c(\d+)-rs(\d+)-cs(\d+)\)$/;

export function parseOrientedPlacementToken(token: string): OrientationPlacementVariants | null {
	const match = ORIENTED_PLACEMENT_TOKEN_RE.exec(String(token || "").trim());
	if (!match) return null;
	const portrait = {
		row: Math.max(1, Number(match[1]) || 1),
		col: Math.max(1, Number(match[2]) || 1),
		rowSpan: Math.max(1, Number(match[3]) || 1),
		colSpan: Math.max(1, Number(match[4]) || 1)
	};
	const landscape = {
		row: Math.max(1, Number(match[5]) || 1),
		col: Math.max(1, Number(match[6]) || 1),
		rowSpan: Math.max(1, Number(match[7]) || 1),
		colSpan: Math.max(1, Number(match[8]) || 1)
	};
	return { portrait, landscape };
}

export function buildOrientedPlacementToken(variants: OrientationPlacementVariants): string {
	const p = variants.portrait;
	const l = variants.landscape;
	return `ed-posv1-p(r${p.row}-c${p.col}-rs${p.rowSpan}-cs${p.colSpan})-l(r${l.row}-c${l.col}-rs${l.rowSpan}-cs${l.colSpan})`;
}

export function parseOrientedPlacementFromClassName(className: string | null | undefined): {
	token: string;
	variants: OrientationPlacementVariants;
} | null {
	for (const token of String(className || "")
		.split(/\s+/)
		.map((value) => value.trim())
		.filter(Boolean)) {
		const variants = parseOrientedPlacementToken(token);
		if (!variants) continue;
		return { token, variants };
	}
	return null;
}

export function getPlacementForOrientation(
	variants: OrientationPlacementVariants,
	orientation: OrientationMode
): GridPlacementRect {
	return orientation === ORIENTATION_PORTRAIT ? variants.portrait : variants.landscape;
}

export function orientationPlacementTokenToCssDefinition(token: string): string | null {
	const variants = parseOrientedPlacementToken(token);
	if (!variants) return null;
	const p = variants.portrait;
	const l = variants.landscape;
	return [
		`.${token}{grid-row:${l.row} / span ${l.rowSpan};grid-column:${l.col} / span ${l.colSpan};}`,
		`.root-scene.ed-preview-orientation--portrait .${token}{grid-row:${p.row} / span ${p.rowSpan};grid-column:${p.col} / span ${p.colSpan};}`,
		`.root-scene.ed-preview-orientation--landscape .${token}{grid-row:${l.row} / span ${l.rowSpan};grid-column:${l.col} / span ${l.colSpan};}`,
		`@container scene (aspect-ratio <= 1/1){.${token}{grid-row:${p.row} / span ${p.rowSpan};grid-column:${p.col} / span ${p.colSpan};}}`,
		`@container scene (aspect-ratio > 1/1){.${token}{grid-row:${l.row} / span ${l.rowSpan};grid-column:${l.col} / span ${l.colSpan};}}`
	].join("");
}

export function toGridPlacementRectFromSpanToken(token: string): GridPlacementRect | null {
	const match = /^cell-span-r(\d+)-c(\d+)-rs(\d+)-cs(\d+)$/.exec(token.trim());
	if (!match) return null;
	return {
		row: Math.max(1, Number(match[1]) || 1),
		col: Math.max(1, Number(match[2]) || 1),
		rowSpan: Math.max(1, Number(match[3]) || 1),
		colSpan: Math.max(1, Number(match[4]) || 1)
	};
}

export function stripPlacementTokensForOrientationClassName(className: string | null | undefined): string {
	const tokens = String(className || "")
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	const kept = tokens.filter((token) => {
		if (token === "cell-span-fill") return false;
		if (/^cell-span-r\d+-c\d+-rs\d+-cs\d+$/i.test(token)) return false;
		if (/^cell-r\d+-c\d+$/i.test(token)) return false;
		if (/^cell_layout_auto(?:_[a-z0-9_-]+)?-r\d+-c\d+$/i.test(token)) return false;
		if (/^liste-r\d+$/i.test(token)) return false;
		if (ORIENTED_PLACEMENT_TOKEN_RE.test(token)) return false;
		return true;
	});
	return kept.join(" ").trim();
}

export function updateOrCreateOrientedPlacementToken(args: {
	className: string | null | undefined;
	activeOrientation: OrientationMode;
	defaultOrientation: OrientationMode;
	nextPlacement: GridPlacementRect;
	seedPlacement: GridPlacementRect;
}): string {
	const existing = parseOrientedPlacementFromClassName(args.className);
	const baseClassName = stripPlacementTokensForOrientationClassName(args.className);

	if (existing) {
		const nextVariants: OrientationPlacementVariants = {
			portrait: { ...existing.variants.portrait },
			landscape: { ...existing.variants.landscape }
		};
		if (args.activeOrientation === ORIENTATION_PORTRAIT) nextVariants.portrait = args.nextPlacement;
		else nextVariants.landscape = args.nextPlacement;
		const token = buildOrientedPlacementToken(nextVariants);
		return [baseClassName, token].filter(Boolean).join(" ").trim();
	}

	if (args.activeOrientation === args.defaultOrientation) {
		const token = `cell-span-r${args.nextPlacement.row}-c${args.nextPlacement.col}-rs${args.nextPlacement.rowSpan}-cs${args.nextPlacement.colSpan}`;
		return [baseClassName, token].filter(Boolean).join(" ").trim();
	}

	const variants: OrientationPlacementVariants = {
		portrait: args.defaultOrientation === ORIENTATION_PORTRAIT ? args.seedPlacement : args.nextPlacement,
		landscape: args.defaultOrientation === ORIENTATION_LANDSCAPE ? args.seedPlacement : args.nextPlacement
	};
	const token = buildOrientedPlacementToken(variants);
	return [baseClassName, token].filter(Boolean).join(" ").trim();
}

export function collapseToSimplePlacementClassName(args: {
	className: string | null | undefined;
	defaultOrientation: OrientationMode;
}): string | null {
	const existing = parseOrientedPlacementFromClassName(args.className);
	if (!existing) return args.className ?? null;
	const baseClassName = stripPlacementTokensForOrientationClassName(args.className);
	const resolved = getPlacementForOrientation(existing.variants, args.defaultOrientation);
	const simpleToken = `cell-span-r${resolved.row}-c${resolved.col}-rs${resolved.rowSpan}-cs${resolved.colSpan}`;
	return [baseClassName, simpleToken].filter(Boolean).join(" ").trim() || null;
}
