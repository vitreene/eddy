import { INTRO, OUTRO, SUSTAIN } from "@/config/constants";
import { deriveEventKind, type CustomEventPosition } from "@/config/custom-events";
import { DEFAULT_TRANSITION_BY_ACTION } from "@/config/transitions";
import { writeEventTransition } from "@/lib/event-ref";
import { resolveClosestCuePointFromDelay } from "@/scene-runtime/visibility/custom-event-cue-mapping";
import {
	buildEventCueName,
	resolveCueEntryByEventName,
	resolveEventCuePoint
} from "@/scene-runtime/visibility/event-cue-name";

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
	const introEventPoint = resolveEventCuePoint(introEvent?.name, introEvent?.position, "start");
	const outroEventPoint = resolveEventCuePoint(outroEvent?.name, outroEvent?.position, "end");
	const introCueName = resolveCueNameForHandle(cues, introEventPoint?.cueName, INTRO);
	const outroCueName = resolveCueNameForHandle(cues, outroEventPoint?.cueName, OUTRO);

	const handles: Array<TimelineEditablePointHandle> = [];
	if (introCueName) {
		handles.push({
			action: INTRO,
			kind: "intro",
			cueName: introCueName,
			position: introEventPoint?.position ?? normalizePositionForAction(introEvent?.position, INTRO),
			isActive: activeEventAction === INTRO
		});
	}
	if (outroCueName) {
		handles.push({
			action: OUTRO,
			kind: "outro",
			cueName: outroCueName,
			position: outroEventPoint?.position ?? normalizePositionForAction(outroEvent?.position, OUTRO),
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

export function buildEventPayloadFromCuePoint(
	events: Record<string, { action?: string; name?: string; ref?: unknown } | undefined> | null,
	action: string,
	cueName: string,
	position: CustomEventPosition
) {
	const current = events?.[action] || {};
	const defaultRef =
		action === OUTRO ? DEFAULT_TRANSITION_BY_ACTION[OUTRO] : DEFAULT_TRANSITION_BY_ACTION[INTRO];
	const normalizedPosition = normalizePositionForAction(position, action);
	return {
		...current,
		action,
		name: buildEventCueName(cueName, normalizedPosition),
		position: normalizedPosition,
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
	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const introCueName = resolveCueEntryByEventName(cueByName, introName)?.cueName || null;
	const outroCueName = resolveCueEntryByEventName(cueByName, outroName)?.cueName || null;
	if (!introCueName || !outroCueName) return targetName;

	const introIndex = cues.findIndex((cue) => cue.name === introCueName);
	const outroIndex = cues.findIndex((cue) => cue.name === outroCueName);
	const targetIndex = cues.findIndex((cue) => cue.name === targetName);
	if (introIndex < 0 || outroIndex < 0 || targetIndex < 0) return targetName;

	const min = Math.min(introIndex, outroIndex);
	const max = Math.max(introIndex, outroIndex);
	if (targetIndex < min) return cues[min]?.name || targetName;
	if (targetIndex > max) return cues[max]?.name || targetName;
	return targetName;
}

function resolveCueNameForHandle(
	cues: Array<TextTime>,
	cueName: string | null | undefined,
	action: string
): string | null {
	if (!cueName) return null;
	if (cues.some((cue) => cue.name === cueName)) return cueName;

	// Recovery path for dangling legacy references: keep handles editable
	// by anchoring to a deterministic visible cue.
	if (action === INTRO) return cues[0]?.name || null;
	if (action === OUTRO) return cues[cues.length - 1]?.name || null;
	return null;
}

function resolveCustomPoint(params: {
	cues: Array<TextTime>;
	event: ContentEvent;
	introName: string | null;
	outroName: string | null;
}): { cueName: string; position: CustomEventPosition } | null {
	const { cues, event, introName, outroName } = params;
	const pointFromName = resolveEventCuePoint(event.name, event.position, "start");

	if (pointFromName?.cueName && cues.some((cue) => cue.name === pointFromName.cueName)) {
		return {
			cueName:
				clampCustomCueNameToIntroOutro(
					cues,
					introName ?? undefined,
					outroName ?? undefined,
					pointFromName.cueName
				) || pointFromName.cueName,
			position: pointFromName.position
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
