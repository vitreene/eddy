import { deriveEventKind } from "@/config/custom-events";
import { INTRO, OUTRO } from "@/config/constants";
import { getCueTimeAtPosition } from "@/player/visibility/custom-event-cue-mapping";

import type { ContentEvent, Decor, SceneComp, TextTime } from "@/api/db";
import type { EditableStyle } from "@/components/style-editor/types";

export function resolveDecorBeforeCustomEvent(
	context: SceneComp,
	itemId: number,
	currentAction: string,
	itemDecor: Decor | undefined
): Decor | undefined {
	const events = context.events[itemId] || {};
	const orderedCustomEvents = getOrderedCustomEvents(context, events);
	const currentIndex = orderedCustomEvents.findIndex((entry) => entry.event.action === currentAction);
	if (currentIndex < 0) return itemDecor;

	let resolved = itemDecor;
	for (const entry of orderedCustomEvents.slice(0, currentIndex)) {
		if (!entry.event.decorId) continue;
		const eventDecor = context.decors[entry.event.decorId];
		if (!eventDecor) continue;
		resolved = mergeDecorChain(resolved, eventDecor);
	}

	return resolved;
}

export function mergeDecorChain(base: Decor | undefined, override: Decor | undefined): Decor | undefined {
	if (!base) return override;
	if (!override) return base;

	return {
		...base,
		...override,
		area: override.area ?? base.area,
		className: override.className ?? base.className,
		style: {
			...((base.style as EditableStyle) || {}),
			...((override.style as EditableStyle) || {})
		}
	};
}

function getOrderedCustomEvents(
	context: SceneComp,
	events: Record<string, ContentEvent | undefined>
): Array<{ event: ContentEvent; timeSec: number }> {
	const sceneContent =
		Object.values(context.sceneContents).find((sceneContent) => sceneContent.sceneId == context.id) ||
		Object.values(context.sceneContents)[0];
	const cues = sceneContent?.events || [];
	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const introCue = events[INTRO]?.name ? cueByName.get(events[INTRO]!.name || "") : null;
	const outroCue = events[OUTRO]?.name ? cueByName.get(events[OUTRO]!.name || "") : null;

	const withTimes = Object.values(events)
		.filter((event): event is ContentEvent => Boolean(event) && deriveEventKind(event!.action) === "custom")
		.map((event) => ({
			event,
			timeSec: resolveCustomEventTimeSec(event, cueByName, introCue || null, outroCue || null)
		}))
		.filter((entry): entry is { event: ContentEvent; timeSec: number } => Number.isFinite(entry.timeSec));

	return withTimes.toSorted((a, b) => {
		if (a.timeSec !== b.timeSec) return a.timeSec - b.timeSec;
		return a.event.action.localeCompare(b.event.action);
	});
}

function resolveCustomEventTimeSec(
	event: ContentEvent,
	cueByName: Map<string, TextTime>,
	introCue: TextTime | null,
	outroCue: TextTime | null
): number {
	if (event.name) {
		const cue = cueByName.get(event.name);
		if (!cue) return Number.NaN;
		const position = (event.position === "start" || event.position === "end" ? event.position : "middle") as
			| "start"
			| "middle"
			| "end";
		return getCueTimeAtPosition(cue, position);
	}

	if (typeof event.delay == "number" && Number.isFinite(event.delay) && event.delay >= 0 && introCue) {
		const introStart = Number(introCue.start);
		if (!Number.isFinite(introStart)) return Number.NaN;
		const outroEnd = outroCue ? Number(outroCue.end) : Number.POSITIVE_INFINITY;
		const target = introStart + event.delay;
		if (Number.isFinite(outroEnd)) return Math.min(Math.max(target, introStart), outroEnd);
		return target;
	}

	return Number.NaN;
}
