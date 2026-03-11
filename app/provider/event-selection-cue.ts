import { DEFAULT_DURATION, INTRO, OUTRO } from "@/config/constants";
import { deriveEventKind, type CustomEventPosition } from "@/config/custom-events";
import { getCueTimeAtPosition } from "@/scene-runtime/visibility/custom-event-cue-mapping";

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
	const event = context.events?.[itemId]?.[action];
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

/**
 * Resolve the semantic anchor for the selected event.
 */
export function resolveEventAnchorSec(
	context: SceneComp,
	itemId: number,
	event: ContentEvent
): number | null {
	if (event.action === INTRO) return resolveIntroAnchorSec(context, event);
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
	return cue.start + resolveTransitionDurationSec(event);
}

function resolveOutroAnchorSec(context: SceneComp, event: ContentEvent): number | null {
	const cue = findSceneCueByName(context, event.name);
	if (!cue) return null;
	const durationSec = resolveTransitionDurationSec(event);
	return cue.end - durationSec;
}

function resolveTransitionDurationSec(event: ContentEvent): number {
	return typeof event.duration === "number" && Number.isFinite(event.duration) && event.duration > 0
		? event.duration
		: DEFAULT_DURATION_SEC;
}

function normalizeCustomPosition(position: string | null | undefined): CustomEventPosition {
	return position === "start" || position === "end" || position === "middle" ? position : "middle";
}

function clampSec(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
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
	console.log("[editor-sync][event-selection]", {
		itemId,
		action,
		mode,
		windowStartSec,
		windowEndSec,
		resolvedCueSec
	});
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
