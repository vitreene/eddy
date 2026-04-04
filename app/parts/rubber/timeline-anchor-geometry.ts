import type { CustomEventPosition } from "@/config/custom-events";

export type TimelineCuePoint = {
	cueName: string;
	position: CustomEventPosition;
};

export type TimelineAnchorGeometry = TimelineCuePoint & {
	x: number;
	y: number;
	cueWidth: number;
};

export function resolveTimelinePointer(
	container: HTMLUListElement | null,
	clientX: number,
	clientY: number
): { x: number; y: number } | null {
	if (!container) return null;
	const rect = container.getBoundingClientRect();
	if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
		return null;
	}
	return {
		x: clientX - rect.left,
		y: clientY - rect.top
	};
}

export function buildTimelineAnchors(
	container: HTMLUListElement | null,
	snapPoints: Array<TimelineCuePoint>,
	options?: {
		handleRadiusPx?: number;
	}
): Array<TimelineAnchorGeometry> {
	const handleRadiusPx = options?.handleRadiusPx ?? 0;
	if (!container || !snapPoints.length) return [];
	const containerRect = container.getBoundingClientRect();
	if (!containerRect.width || !containerRect.height) return [];

	const cueNodes = Array.from(container.querySelectorAll<HTMLElement>("[data-rubber-cue]"));
	const rectByCueName = new Map<string, DOMRect>();
	for (const cueNode of cueNodes) {
		const cueName = cueNode.dataset.rubberCue;
		if (!cueName) continue;
		rectByCueName.set(cueName, cueNode.getBoundingClientRect());
	}

	const anchors: Array<TimelineAnchorGeometry> = [];
	for (const point of snapPoints) {
		const cueRect = rectByCueName.get(point.cueName);
		if (!cueRect) continue;
		const rawX =
			point.position === "start"
				? cueRect.left - containerRect.left
				: point.position === "end"
					? cueRect.right - containerRect.left
					: cueRect.left - containerRect.left + cueRect.width / 2;
		const rawY = cueRect.top - containerRect.top + cueRect.height / 2;
		const x = clamp(rawX, handleRadiusPx, containerRect.width - handleRadiusPx);
		const y = clamp(rawY, handleRadiusPx, containerRect.height - handleRadiusPx);
		anchors.push({
			cueName: point.cueName,
			position: point.position,
			x,
			y,
			cueWidth: Math.max(1, cueRect.width)
		});
	}

	return anchors;
}

export function resolveNearestTimelineAnchor(
	anchors: Array<TimelineAnchorGeometry>,
	x: number,
	y: number,
	options?: {
		middleSnapPenaltyRatio?: number;
		gapPreference?: "intro" | "outro" | null;
		rowYTolerancePx?: number;
	}
): TimelineAnchorGeometry | null {
	const middleSnapPenaltyRatio = options?.middleSnapPenaltyRatio ?? 0.1;
	const gapPreference = options?.gapPreference ?? null;
	const rowYTolerancePx = options?.rowYTolerancePx ?? 8;

	if (gapPreference) {
		const gapPreferred = resolveGapPreferredAnchor(anchors, x, y, gapPreference, rowYTolerancePx);
		if (gapPreferred) return gapPreferred;
	}

	let nearest: TimelineAnchorGeometry | null = null;
	let nearestScore = Number.POSITIVE_INFINITY;

	for (const anchor of anchors) {
		const distance = Math.hypot(anchor.x - x, anchor.y - y);
		const middlePenalty = anchor.position === "middle" ? anchor.cueWidth * middleSnapPenaltyRatio : 0;
		const score = distance + middlePenalty;
		if (score < nearestScore) {
			nearest = anchor;
			nearestScore = score;
		}
	}

	return nearest;
}

function resolveGapPreferredAnchor(
	anchors: Array<TimelineAnchorGeometry>,
	x: number,
	y: number,
	gapPreference: "intro" | "outro",
	rowYTolerancePx: number
): TimelineAnchorGeometry | null {
	const rowAnchors = anchors.filter((anchor) => Math.abs(anchor.y - y) <= rowYTolerancePx);
	if (!rowAnchors.length) return null;

	const startAnchors = rowAnchors
		.filter((anchor) => anchor.position === "start")
		.toSorted((a, b) => a.x - b.x);
	const endAnchors = rowAnchors.filter((anchor) => anchor.position === "end").toSorted((a, b) => a.x - b.x);
	if (!startAnchors.length || !endAnchors.length) return null;

	for (const endAnchor of endAnchors) {
		const nextStartAnchor = startAnchors.find((candidate) => candidate.x > endAnchor.x);
		if (!nextStartAnchor) continue;
		if (x < endAnchor.x || x > nextStartAnchor.x) continue;
		if (gapPreference === "intro") return nextStartAnchor;
		return endAnchor;
	}

	return null;
}

function clamp(value: number, min: number, max: number): number {
	if (value < min) return min;
	if (value > max) return max;
	return value;
}
