import { INTRO, OUTRO, SUSTAIN } from "@/config/constants";
import { deriveEventKind, type CustomEventPosition } from "@/config/custom-events";
import { DEFAULT_TRANSITION_BY_ACTION } from "@/config/transitions";
import { writeEventTransition } from "@/lib/event-ref";
import { resolveClosestCuePointFromDelay } from "@/scene-runtime/visibility/custom-event-cue-mapping";

import type { ContentEvent, TextTime } from "@/api/db";

export type TimelineEditablePointKind = "intro" | "outro" | "custom";

export interface TimelineEditablePointHandle {
	action: string;
	kind: TimelineEditablePointKind;
	cueName: string;
	position: CustomEventPosition;
	isActive: boolean;
}

export function buildEditablePointHandles(params: {
	cues: Array<TextTime>;
	events: Record<string, ContentEvent | undefined> | null;
	activeEventAction: string | null;
}): Array<TimelineEditablePointHandle> {
	const { cues, events, activeEventAction } = params;
	if (!cues.length) return [];

	const introEvent = events?.[INTRO] ?? null;
	const outroEvent = events?.[OUTRO] ?? null;
	const introCueName = resolveDefinedCueName(cues, introEvent?.name);
	const outroCueName = resolveDefinedCueName(cues, outroEvent?.name);

	const handles: Array<TimelineEditablePointHandle> = [];
	if (introCueName) {
		handles.push({
			action: INTRO,
			kind: "intro",
			cueName: introCueName,
			position: normalizePositionForAction(introEvent?.position, INTRO),
			isActive: activeEventAction === INTRO
		});
	}
	if (outroCueName) {
		handles.push({
			action: OUTRO,
			kind: "outro",
			cueName: outroCueName,
			position: normalizePositionForAction(outroEvent?.position, OUTRO),
			isActive: activeEventAction === OUTRO
		});
	}

	if (!events) return handles;

	const customEvents = Object.values(events)
		.filter((event): event is ContentEvent => Boolean(event))
		.filter((event) => deriveEventKind(event.action) === "custom" && event.action !== SUSTAIN)
		.toSorted((a, b) => a.action.localeCompare(b.action));

	for (const event of customEvents) {
		const point = resolveCustomPoint({
			cues,
			event,
			introName: introCueName,
			outroName: outroCueName
		});
		if (!point) continue;
		handles.push({
			action: event.action,
			kind: "custom",
			cueName: point.cueName,
			position: point.position,
			isActive: activeEventAction === event.action
		});
	}

	return handles;
}

export function makeIntroOutroEventPayload(
	events: Record<string, { action?: string; name?: string; ref?: unknown } | undefined> | null,
	action: string,
	cueName: string,
	position: CustomEventPosition
) {
	const current = events?.[action] || {};
	const defaultRef =
		action === OUTRO ? DEFAULT_TRANSITION_BY_ACTION[OUTRO] : DEFAULT_TRANSITION_BY_ACTION[INTRO];
	return {
		...current,
		action,
		name: cueName,
		position: normalizePositionForAction(position, action),
		ref: writeEventTransition(current.ref, defaultRef, action)
	};
}

export function clampCustomCueNameToIntroOutro(
	cues: Array<TextTime>,
	introName: string | undefined,
	outroName: string | undefined,
	targetName: string
): string | null {
	if (!targetName) return null;
	if (!introName || !outroName) return targetName;

	const introIndex = cues.findIndex((cue) => cue.name === introName);
	const outroIndex = cues.findIndex((cue) => cue.name === outroName);
	const targetIndex = cues.findIndex((cue) => cue.name === targetName);
	if (introIndex < 0 || outroIndex < 0 || targetIndex < 0) return targetName;

	const min = Math.min(introIndex, outroIndex);
	const max = Math.max(introIndex, outroIndex);
	if (targetIndex < min) return cues[min]?.name || targetName;
	if (targetIndex > max) return cues[max]?.name || targetName;
	return targetName;
}

function resolveDefinedCueName(cues: Array<TextTime>, cueName: string | null | undefined): string | null {
	if (!cueName) return null;
	if (!cues.some((cue) => cue.name === cueName)) return null;
	return cueName;
}

function resolveCustomPoint(params: {
	cues: Array<TextTime>;
	event: ContentEvent;
	introName: string | null;
	outroName: string | null;
}): { cueName: string; position: CustomEventPosition } | null {
	const { cues, event, introName, outroName } = params;

	if (typeof event.name === "string" && event.name && cues.some((cue) => cue.name === event.name)) {
		return {
			cueName:
				clampCustomCueNameToIntroOutro(cues, introName ?? undefined, outroName ?? undefined, event.name) ||
				event.name,
			position: sanitizePosition(event.position)
		};
	}

	const fromDelay = resolveClosestCuePointFromDelay({
		cues,
		introName,
		outroName,
		delaySec: event.delay
	});
	if (fromDelay?.name) {
		return {
			cueName:
				clampCustomCueNameToIntroOutro(cues, introName ?? undefined, outroName ?? undefined, fromDelay.name) ||
				fromDelay.name,
			position: sanitizePosition(fromDelay.position)
		};
	}

	const fallbackTargetCueName = introName || cues[0]?.name || null;
	if (!fallbackTargetCueName) return null;
	const fallbackCueName = clampCustomCueNameToIntroOutro(
		cues,
		introName ?? undefined,
		outroName ?? undefined,
		fallbackTargetCueName
	);
	if (!fallbackCueName) return null;
	return {
		cueName: fallbackCueName,
		position: "start"
	};
}

function sanitizePosition(value: unknown): CustomEventPosition {
	if (value === "middle" || value === "end") return value;
	return "start";
}

function normalizePositionForAction(value: unknown, action: string): CustomEventPosition {
	if (value === "start" || value === "middle" || value === "end") return value;
	if (action === OUTRO) return "end";
	return "start";
}
