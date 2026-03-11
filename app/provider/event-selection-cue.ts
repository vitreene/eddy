import { DEFAULT_DURATION, INTRO, OUTRO } from "@/config/constants";
import { deriveEventKind, type CustomEventPosition } from "@/config/custom-events";
import { getCueTimeAtPosition } from "@/scene-runtime/visibility/custom-event-cue-mapping";

import type { ContentEvent, SceneComp, TextTime } from "@/api/db";

import { findSceneCueByName, getAssuredVisibleCue } from "./active-cue";

const DEFAULT_DURATION_SEC = DEFAULT_DURATION / 1000;

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
	const event = context.events?.[itemId]?.[action];
	if (!event) return null;

	const anchorSec = resolveEventAnchorSec(context, itemId, event);
	const assured = getAssuredVisibleCue(context, itemId);

	if (!Number.isFinite(assured.window.startSec) || !Number.isFinite(assured.window.endSec)) {
		return Number.isFinite(anchorSec) ? anchorSec : null;
	}

	if (assured.window.startSec > assured.window.endSec) return null;
	if (!Number.isFinite(anchorSec)) return assured.window.startSec;

	return clampSec(anchorSec, assured.window.startSec, assured.window.endSec);
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
		return getCueTimeAtPosition(cue, position);
	}

	if (typeof event.delay === "number" && Number.isFinite(event.delay) && event.delay >= 0) {
		const introEvent = context.events?.[itemId]?.[INTRO];
		if (!introEvent) return null;
		const introAnchor = resolveIntroAnchorSec(context, introEvent);
		if (!Number.isFinite(introAnchor)) return null;
		return introAnchor + event.delay;
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
	return cue.end;
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

export function resolveSceneCueByName(
	context: SceneComp,
	cueName: string | null | undefined
): TextTime | null {
	return findSceneCueByName(context, cueName);
}
