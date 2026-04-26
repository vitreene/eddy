import { DEFAULT_DURATION, INTRO, OUTRO, SUSTAIN } from "@/config/constants";
import { deriveEventKind, type CustomEventPosition } from "@/config/custom-events";
import { getCueTimeAtPosition } from "@/scene-runtime/visibility/custom-event-cue-mapping";
import { buildCapsuleBehaviorById } from "@/scene-runtime/visibility/capsule-behavior";
import { resolveCueWindows } from "@/scene-runtime/visibility/resolve-cue-windows";
import { getActiveSceneContent, getSceneContentCues } from "@/scene-runtime/scene-content";

import type { ContentEvent, SceneComp, TextTime } from "@/api/db";

import { findSceneCueByName, getAssuredVisibleCue } from "./active-cue";

const DEFAULT_DURATION_SEC = DEFAULT_DURATION / 1000;
const CUSTOM_SELECTION_PRE_FLIP_SEC = 0.001;

/**
 * Resolve the seek cue for event selection.
 * Contract:
 * - compute event anchor time (intro/outro/custom)
 * - clamp to assured visibility window (item + ancestors)
 * - never return a cue outside visible range
 */
export function resolveSelectedEventCueSec(
	context: SceneComp,
	itemId: number,
	action: string
): number | null {
	// Contract lock:
	// - INTRO selection anchors on visible start (or explicit intro anchor)
	// - CUSTOM selection anchors pre-FLIP
	// - OUTRO selection anchors on outro start (end - duration), including implicit outro
	// Keep tests in `event-selection-auto-fallback-smoke.ts` and
	// `custom-event-preflip-selection-smoke.ts` aligned with any changes here.
	const event = resolveSelectionEvent(context, itemId, action);
	const assured = getAssuredVisibleCue(context, itemId);

	if (!event) {
		if (!Number.isFinite(assured.window.startSec) || !Number.isFinite(assured.window.endSec)) return null;
		if (assured.window.startSec > assured.window.endSec) return null;
		if (action === OUTRO) {
			const outroImplicit = resolveImplicitOutroStartSec(assured.window.endSec, DEFAULT_DURATION_SEC);
			debugEventSelection(
				itemId,
				action,
				"implicit-outro-missing-event",
				assured.window.startSec,
				assured.window.endSec,
				outroImplicit
			);
			return clampSec(outroImplicit, assured.window.startSec, assured.window.endSec);
		}
		if (action === INTRO) return assured.window.startSec;
		return null;
	}

	const anchorSec = resolveEventAnchorSec(context, itemId, event);

	if (!Number.isFinite(assured.window.startSec) || !Number.isFinite(assured.window.endSec)) {
		return Number.isFinite(anchorSec) ? anchorSec : null;
	}

	if (assured.window.startSec > assured.window.endSec) return null;
	if (!Number.isFinite(anchorSec)) {
		if (event.action === OUTRO) {
			const outroImplicit = resolveImplicitOutroStartSec(
				assured.window.endSec,
				resolveTransitionDurationSec(event)
			);
			debugEventSelection(
				itemId,
				action,
				"implicit-outro-no-anchor",
				assured.window.startSec,
				assured.window.endSec,
				outroImplicit
			);
			return clampSec(outroImplicit, assured.window.startSec, assured.window.endSec);
		}
		return assured.window.startSec;
	}

	const resolved = clampSec(anchorSec, assured.window.startSec, assured.window.endSec);
	if (itemId === 55 && action === OUTRO) {
		debugEventSelection(itemId, action, "explicit", assured.window.startSec, assured.window.endSec, resolved);
	}
	return resolved;
}

function resolveSelectionEvent(
	context: SceneComp,
	itemId: number,
	action: string
): ContentEvent | null {
	const explicit = context.events?.[itemId]?.[action] ?? null;
	const kind = deriveEventKind(action);
	if (kind !== "intro" && kind !== "outro") return explicit;

	const explicitName = typeof explicit?.name === "string" ? explicit.name.trim() : "";
	const explicitCue = explicitName ? findSceneCueByName(context, explicitName) : null;
	if (explicitName.length > 0 && explicitCue) return explicit;

	const generated = resolveGeneratedTransitionEvent(context, itemId, action);
	const generatedName =
		typeof generated?.name === "string" && generated.name.trim().length > 0 ? generated.name.trim() : null;
	const generatedCue = generatedName ? findSceneCueByName(context, generatedName) : null;
	if (!generatedName || !generatedCue) {
		const fallbackName = resolveFallbackTransitionCueName(context, itemId, action);
		if (!fallbackName) return explicit;
		const defaultPosition = action === OUTRO ? "end" : "start";
		if (!explicit) {
			return {
				id: -1,
				itemId,
				action,
				name: fallbackName,
				ref: null,
				duration: null,
				delay: null,
				position: defaultPosition,
				decorId: null
			};
		}
		return {
			...explicit,
			name: fallbackName,
			position: explicit.position ?? defaultPosition
		};
	}
	if (!explicit) return { ...generated, name: generatedName };

	return {
		...explicit,
		name: generatedName,
		position: explicit.position ?? generated.position
	};
}

function resolveFallbackTransitionCueName(
	context: SceneComp,
	itemId: number,
	action: string
): string | null {
	const sceneContent = getActiveSceneContent(context);
	const cues = getSceneContentCues(sceneContent);
	if (!cues.length) return null;

	const defaultPosition: CustomEventPosition = action === OUTRO ? "end" : "start";
	const assured = getAssuredVisibleCue(context, itemId);
	const targetSec = action === OUTRO ? assured.window.endSec : assured.window.startSec;

	let nearestCueName: string | null = null;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const cue of cues) {
		const cueSec = getCueTimeAtPosition(cue, defaultPosition);
		if (!Number.isFinite(cueSec)) continue;
		const distance = Math.abs(cueSec - targetSec);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestCueName = cue.name;
		}
	}

	return nearestCueName;
}

function resolveGeneratedTransitionEvent(
	context: SceneComp,
	itemId: number,
	action: string
): ContentEvent | null {
	const behaviorByCapsuleId = buildCapsuleBehaviorById(context);
	const resolved = resolveCueWindows(context, {
		generateMissingEvents: true,
		behaviorByCapsuleId
	});
	return resolved.resolvedEvents[itemId]?.[action] ?? null;
}

/**
 * Resolve the semantic anchor for the selected event.
 */
export function resolveEventAnchorSec(
	context: SceneComp,
	itemId: number,
	event: ContentEvent
): number | null {
	if (event.action === INTRO) return resolveIntroAnchorSec(context, event);
	if (event.action === SUSTAIN) return resolveSustainAnchorSec(context, itemId);
	if (event.action === OUTRO) return resolveOutroAnchorSec(context, event);
	if (deriveEventKind(event.action) !== "custom") return null;

	if (event.name) {
		const cue = findSceneCueByName(context, event.name);
		if (!cue) return null;
		const position = normalizeCustomPosition(event.position);
		return toPreFlipAnchor(getCueTimeAtPosition(cue, position));
	}

	if (typeof event.delay === "number" && Number.isFinite(event.delay) && event.delay >= 0) {
		const introEvent = context.events?.[itemId]?.[INTRO];
		if (!introEvent) return null;
		const introAnchor = resolveIntroAnchorSec(context, introEvent);
		if (!Number.isFinite(introAnchor)) return null;
		return toPreFlipAnchor(introAnchor + event.delay);
	}

	return null;
}

function resolveIntroAnchorSec(context: SceneComp, event: ContentEvent): number | null {
	const cue = findSceneCueByName(context, event.name);
	if (!cue) return null;
	const cueTime = getCueTimeAtPosition(cue, normalizeEventPositionForAction(event.position, INTRO));
	return cueTime + resolveTransitionDurationSec(event);
}

function resolveOutroAnchorSec(context: SceneComp, event: ContentEvent): number | null {
	const cue = findSceneCueByName(context, event.name);
	if (!cue) return null;
	const durationSec = resolveTransitionDurationSec(event);
	const cueTime = getCueTimeAtPosition(cue, normalizeEventPositionForAction(event.position, OUTRO));
	return cueTime - durationSec;
}

function resolveSustainAnchorSec(context: SceneComp, itemId: number): number | null {
	const introEvent = context.events?.[itemId]?.[INTRO];
	if (!introEvent) return null;
	const introAnchor = resolveIntroAnchorSec(context, introEvent);
	if (!Number.isFinite(introAnchor)) return null;

	const outroEvent = context.events?.[itemId]?.[OUTRO];
	if (!outroEvent) return introAnchor;
	const outroCue = findSceneCueByName(context, outroEvent.name);
	if (!outroCue || !Number.isFinite(outroCue.start)) return introAnchor;

	return Math.min(introAnchor, outroCue.start);
}

function resolveTransitionDurationSec(event: ContentEvent): number {
	return typeof event.duration === "number" && Number.isFinite(event.duration) && event.duration > 0
		? event.duration
		: DEFAULT_DURATION_SEC;
}

function normalizeCustomPosition(position: string | null | undefined): CustomEventPosition {
	return position === "start" || position === "end" || position === "middle" ? position : "start";
}

function normalizeEventPositionForAction(
	position: string | null | undefined,
	action: string
): CustomEventPosition {
	if (position === "start" || position === "middle" || position === "end") return position;
	if (action === OUTRO) return "end";
	return "start";
}

function clampSec(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return max;
	if (value < min) return min;
	if (value > max) return max;
	return value;
}

function resolveImplicitOutroStartSec(outroEndSec: number, durationSec: number): number {
	if (!Number.isFinite(outroEndSec)) return outroEndSec;
	const safeDuration = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : DEFAULT_DURATION_SEC;
	return Math.max(0, outroEndSec - safeDuration);
}

function debugEventSelection(
	itemId: number,
	action: string,
	mode: string,
	windowStartSec: number,
	windowEndSec: number,
	resolvedCueSec: number
) {
	if (itemId !== 55) return;
}

/**
 * Shift custom selection anchor just before keyframe to expose pre-FLIP state.
 */
function toPreFlipAnchor(keyframeSec: number): number {
	if (!Number.isFinite(keyframeSec)) return keyframeSec;
	return Math.max(0, keyframeSec - CUSTOM_SELECTION_PRE_FLIP_SEC);
}

export function resolveSceneCueByName(
	context: SceneComp,
	cueName: string | null | undefined
): TextTime | null {
	return findSceneCueByName(context, cueName);
}
