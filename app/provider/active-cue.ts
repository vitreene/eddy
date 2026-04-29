import type { SceneComp, TextTime } from "@/api/db";
import { DEFAULT_DURATION, INTRO, OUTRO } from "@/config/constants";
import { deriveEventKind } from "@/config/custom-events";
import { buildCapsuleBehaviorById } from "@/scene-runtime/visibility/capsule-behavior";
import { resolveCueWindows } from "@/scene-runtime/visibility/resolve-cue-windows";
import { getCueTimeAtPosition } from "@/scene-runtime/visibility/custom-event-cue-mapping";
import { resolveCueEntryByEventName, resolveEventCuePoint } from "@/scene-runtime/visibility/event-cue-name";
import {
	getActiveSceneContent,
	getSceneContentCues,
	getSceneContentDurationSec
} from "@/scene-runtime/scene-content";

export type VisibilityWindow = {
	startSec: number;
	endSec: number;
};

export type AncestorCapsuleChainResult = {
	ancestorItemIds: number[];
	isComplete: boolean;
	breakReason?:
		| "item-not-found"
		| "capsule-not-found"
		| "missing-content-link"
		| "missing-parent-item"
		| "cycle-detected";
};

export type SafeCueResult = {
	cueSec: number | null;
	window: VisibilityWindow;
	fallbackUsed: boolean;
	ancestorChain: AncestorCapsuleChainResult;
};

const DEFAULT_DURATION_SEC = DEFAULT_DURATION / 1000;

export function findSceneCueByName(context: SceneComp, cueName: string | null | undefined): TextTime | null {
	const sceneContent = getActiveSceneContent(context);
	const cueByName = new Map(getSceneContentCues(sceneContent).map((cue) => [cue.name, cue]));
	const cue = resolveCueEntryByEventName(cueByName, cueName)?.cue || null;
	if (cue) return cue;

	return null;
}

export function getSceneDurationSec(context: SceneComp): number {
	const sceneContent = getActiveSceneContent(context);
	return getSceneContentDurationSec(sceneContent);
}

export function getNodeVisibilityWindow(context: SceneComp, itemId: number): VisibilityWindow {
	const itemEvents = context.events?.[itemId] ?? {};
	const introEvent = itemEvents[INTRO];
	const outroEvent = itemEvents[OUTRO];

	const introCue = findSceneCueByName(context, introEvent?.name);
	const outroCue = findSceneCueByName(context, outroEvent?.name);

	const introDurationSec =
		typeof introEvent?.duration == "number" && Number.isFinite(introEvent.duration) && introEvent.duration > 0
			? introEvent.duration
			: DEFAULT_DURATION_SEC;
	const explicitStartSec = introCue ? introCue.start + introDurationSec : null;
	const explicitEndSec = outroCue ? outroCue.end : null;
	const derivedWindows = deriveItemVisibilityWindows(context);
	const derivedWindow = derivedWindows.get(itemId) || null;

	if (explicitStartSec !== null || explicitEndSec !== null || derivedWindow) {
		return {
			startSec: explicitStartSec ?? derivedWindow?.startSec ?? 0,
			endSec: explicitEndSec ?? derivedWindow?.endSec ?? Number.POSITIVE_INFINITY
		};
	}

	const startSec = 0;
	const endSec = Number.POSITIVE_INFINITY;

	return { startSec, endSec };
}

export function normalizeVisibilityWindow(
	window: VisibilityWindow,
	sceneDurationSec: number
): VisibilityWindow {
	const safeSceneDurationSec = Number.isFinite(sceneDurationSec) ? Math.max(sceneDurationSec, 0) : 0;
	const startSec = clampSec(window.startSec, 0, safeSceneDurationSec);
	const rawEndSec = Number.isFinite(window.endSec) ? window.endSec : safeSceneDurationSec;
	const endSec = clampSec(rawEndSec, 0, safeSceneDurationSec);

	return { startSec, endSec };
}

export function getAncestorCapsuleItems(context: SceneComp, itemId: number): AncestorCapsuleChainResult {
	const selectedItem = context.items?.[itemId];
	if (!selectedItem) {
		return { ancestorItemIds: [], isComplete: false, breakReason: "item-not-found" };
	}

	let currentCapsuleId = selectedItem.capsuleId;
	const ancestorItemIds: number[] = [];
	const visitedCapsuleIds = new Set<number>();

	while (currentCapsuleId !== context.main) {
		if (!context.capsules?.[currentCapsuleId]) {
			return { ancestorItemIds, isComplete: false, breakReason: "capsule-not-found" };
		}

		if (visitedCapsuleIds.has(currentCapsuleId)) {
			return { ancestorItemIds, isComplete: false, breakReason: "cycle-detected" };
		}
		visitedCapsuleIds.add(currentCapsuleId);

		const capsuleContent = Object.values(context.contents || {}).find(
			(content) => content.type === "capsule" && content.capsuleId === currentCapsuleId
		);
		if (!capsuleContent) {
			return { ancestorItemIds, isComplete: false, breakReason: "missing-content-link" };
		}

		const parentItem = Object.values(context.items || {}).find((item) => item.contentId === capsuleContent.id);
		if (!parentItem) {
			return { ancestorItemIds, isComplete: false, breakReason: "missing-parent-item" };
		}

		ancestorItemIds.push(parentItem.id);
		currentCapsuleId = parentItem.capsuleId;
	}

	return { ancestorItemIds, isComplete: true };
}

export function intersectVisibilityWindows(windows: VisibilityWindow[]): VisibilityWindow {
	if (!windows.length) {
		return { startSec: 0, endSec: Number.POSITIVE_INFINITY };
	}

	let startSec = 0;
	let endSec = Number.POSITIVE_INFINITY;

	for (const window of windows) {
		if (window.startSec > startSec) startSec = window.startSec;
		if (window.endSec < endSec) endSec = window.endSec;
	}

	return { startSec, endSec };
}

export function getAssuredVisibleCue(context: SceneComp, itemId: number): SafeCueResult {
	const sceneDurationSec = getSceneDurationSec(context);
	const itemWindow = getNodeVisibilityWindow(context, itemId);
	const ancestorChain = getAncestorCapsuleItems(context, itemId);

	const windows = [
		itemWindow,
		...ancestorChain.ancestorItemIds.map((id) => getNodeVisibilityWindow(context, id))
	];
	const rawWindow = intersectVisibilityWindows(windows);
	const window = normalizeVisibilityWindow(rawWindow, sceneDurationSec);

	if (window.startSec < window.endSec) {
		return {
			cueSec: window.startSec,
			window,
			fallbackUsed: false,
			ancestorChain
		};
	}

	return {
		cueSec: null,
		window,
		fallbackUsed: true,
		ancestorChain
	};
}

// Contract: return the earliest time where the selected item is guaranteed visible,
// after intersecting its own window with all ancestor capsule host-item windows.
export function computeActiveCue(context: SceneComp, itemId: number): number | null {
	const assured = getAssuredVisibleCue(context, itemId);
	const itemEvents = context.events?.[itemId] ?? {};
	const hasExplicitIntro = Boolean(itemEvents[INTRO]?.name);
	const introEvent = itemEvents[INTRO] || null;
	const introCue = introEvent?.name ? findSceneCueByName(context, introEvent.name) : null;
	const introDurationSec =
		typeof introEvent?.duration == "number" && Number.isFinite(introEvent.duration) && introEvent.duration > 0
			? introEvent.duration
			: DEFAULT_DURATION_SEC;
	const resolvedIntroStartSec =
		hasExplicitIntro && !introCue ? resolveIntroStartSecFromCueWindows(context, itemId) : null;
	const introVisibleSec = introCue
		? introCue.start + introDurationSec
		: typeof resolvedIntroStartSec == "number" && Number.isFinite(resolvedIntroStartSec)
			? resolvedIntroStartSec + introDurationSec
			: hasExplicitIntro
				? assured.window.startSec + introDurationSec
				: null;

	if (typeof introVisibleSec == "number" && Number.isFinite(introVisibleSec)) {
		const resolvedCueSec = Math.max(assured.window.startSec, introVisibleSec);
		const boundedCueSec =
			Number.isFinite(assured.window.endSec) && resolvedCueSec > assured.window.endSec
				? assured.window.startSec
				: resolvedCueSec;
		console.debug("[selection-cue]", {
			itemId,
			reason: "intro-visible",
			hasExplicitIntro,
			introName: introEvent?.name ?? null,
			introCueStart: introCue?.start ?? null,
			resolvedIntroStartSec,
			introDurationSec,
			introVisibleSec,
			assuredCueSec: assured.cueSec,
			assuredWindowStart: assured.window.startSec,
			assuredWindowEnd: assured.window.endSec,
			firstCustomCue: null,
			resolvedCueSec: boundedCueSec
		});
		return boundedCueSec;
	}

	if (!hasExplicitIntro) {
		const firstCustomCue = getFirstCustomCueSec(context, itemId);
		if (typeof firstCustomCue == "number" && Number.isFinite(firstCustomCue)) {
			const resolvedCueSec = Math.max(assured.window.startSec, firstCustomCue);
			console.debug("[selection-cue]", {
				itemId,
				reason: "first-custom-fallback",
				hasExplicitIntro,
				introName: introEvent?.name ?? null,
				introCueStart: introCue?.start ?? null,
				resolvedIntroStartSec,
				introDurationSec,
				introVisibleSec,
				assuredCueSec: assured.cueSec,
				assuredWindowStart: assured.window.startSec,
				assuredWindowEnd: assured.window.endSec,
				firstCustomCue,
				resolvedCueSec
			});
			return resolvedCueSec;
		}
	}

	console.debug("[selection-cue]", {
		itemId,
		reason: "assured-window",
		hasExplicitIntro,
		introName: introEvent?.name ?? null,
		introCueStart: introCue?.start ?? null,
		resolvedIntroStartSec,
		introDurationSec,
		introVisibleSec,
		assuredCueSec: assured.cueSec,
		assuredWindowStart: assured.window.startSec,
		assuredWindowEnd: assured.window.endSec,
		firstCustomCue: null,
		resolvedCueSec: assured.cueSec
	});

	return assured.cueSec;
}

function resolveIntroStartSecFromCueWindows(context: SceneComp, itemId: number): number | null {
	const behaviorByCapsuleId = buildCapsuleBehaviorById(context);
	const resolved = resolveCueWindows(context, { generateMissingEvents: true, behaviorByCapsuleId });
	const window = resolved.cueWindowsByItemId.get(itemId) || null;
	if (!window) return null;
	const startSec = Number(window.start);
	if (!Number.isFinite(startSec)) return null;
	return startSec;
}

function clampSec(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return max;
	if (value < min) return min;
	if (value > max) return max;
	return value;
}

function deriveItemVisibilityWindows(context: SceneComp): Map<number, VisibilityWindow> {
	const behaviorByCapsuleId = buildCapsuleBehaviorById(context);
	const resolved = resolveCueWindows(context, { generateMissingEvents: true, behaviorByCapsuleId });
	const result = new Map<number, VisibilityWindow>();

	for (const [itemId, cueWindow] of resolved.cueWindowsByItemId.entries()) {
		result.set(itemId, {
			startSec: cueWindow.start + DEFAULT_DURATION_SEC,
			endSec: cueWindow.end
		});
	}

	return result;
}

function getFirstCustomCueSec(context: SceneComp, itemId: number): number | null {
	const eventMap = context.events?.[itemId] ?? {};
	let first: number | null = null;

	for (const event of Object.values(eventMap)) {
		if (!event || deriveEventKind(event.action) !== "custom") continue;
		const point = resolveEventCuePoint(event.name, event.position, "start");
		if (!point) continue;
		const cue = findSceneCueByName(context, point.cueName);
		if (!cue) continue;
		const cueSec = getCueTimeAtPosition(cue, point.position);
		if (!Number.isFinite(cueSec)) continue;
		if (first === null || cueSec < first) first = cueSec;
	}

	return first;
}
