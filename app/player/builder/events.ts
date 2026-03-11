import { DEFAULT_TRANSITION_BY_ACTION, getTransitionPreset } from "@/config/transitions";
import { getCueTimeAtPosition } from "@/scene-runtime/visibility/custom-event-cue-mapping";
import { DEFAULT_DURATION, INTRO, OUTRO } from "@/config/constants";
import { deriveEventKind, type CustomEventPosition } from "@/config/custom-events";

import type { ContentEvent, ItemComp, SceneComp, TextTime, CapsuleComp } from "@/api/db";
import { buildEventActionName } from "./lib";

type OrderedEvent = {
	event: ContentEvent;
	startMs: number | null;
};

/**
 * Build timeline event map from all item events.
 */
export function mapEvents(snapshot: SceneComp) {
	const map = new Map<number, Array<Partial<TextTime> & Pick<TextTime, "name" | "start">>>();

	map.set(0, [{ name: INTRO, start: 0 }]);

	if (!snapshot || !snapshot.events || !snapshot.sceneContents) return map;

	let lastCue = 0;

	for (const item of Object.values(snapshot.items || {})) {
		const events = snapshot.events[item.id] || {};
		const orderedEvents = getOrderedEventsForItem(snapshot, events);
		let previousMs = 0;
		for (const entry of orderedEvents) {
			const ev = entry.event;
			if (entry.startMs === null) continue;
			if (entry.startMs > lastCue) lastCue = entry.startMs;
			const kind = deriveEventKind(ev.action);
			const scheduledStart = kind === "custom" ? previousMs : entry.startMs;

			const mapped = {
				name: buildEventActionName(ev),
				start: scheduledStart
			};

			const existing = map.get(scheduledStart) || [];
			existing.push(mapped);
			map.set(scheduledStart, existing);
			previousMs = entry.startMs;
		}
	}
	map.set(lastCue - DEFAULT_DURATION, [{ name: OUTRO, start: lastCue - DEFAULT_DURATION }]);
	return map;
}

/**
 * Sort item events in playback order, with computed start times.
 */
export function getOrderedEventsForItem(
	snapshot: SceneComp,
	events: Record<string, ContentEvent | undefined>
): OrderedEvent[] {
	const sceneContent =
		Object.values(snapshot.sceneContents).find((sc) => sc.sceneId == snapshot.id) ||
		Object.values(snapshot.sceneContents)[0];
	const cues = sceneContent?.events || [];
	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const result: OrderedEvent[] = [];
	for (const event of Object.values(events || {})) {
		if (!event) continue;
		const startMs = resolveEventStartMs(event, cueByName);
		result.push({ event, startMs });
	}

	return result.toSorted((a, b) => {
		if (a.startMs === null && b.startMs !== null) return 1;
		if (a.startMs !== null && b.startMs === null) return -1;
		if (a.startMs !== null && b.startMs !== null && a.startMs !== b.startMs) return a.startMs - b.startMs;
		return actionRank(a.event.action) - actionRank(b.event.action);
	});
}

/**
 * Resolve transition preset following event -> capsule -> global priority.
 */
export function getTransitionPresetForEvent({
	snapshot,
	item,
	event
}: {
	snapshot: SceneComp;
	item: ItemComp;
	event: ContentEvent;
}) {
	const eventAction = event.action == OUTRO ? OUTRO : INTRO;
	const eventRef = parseTransitionRef(event.ref);
	const capsule = snapshot.capsules?.[item.capsuleId];
	const capsuleRef = getCapsuleDefaultTransitionRef(capsule, eventAction);
	const fallbackRef = DEFAULT_TRANSITION_BY_ACTION[eventAction];
	const resolvedRef = eventRef || capsuleRef || fallbackRef;
	return getTransitionPreset(resolvedRef, eventAction);
}

/**
 * Decode event start time from cue mapping and event kind.
 */
function resolveEventStartMs(event: ContentEvent, cueByName: Map<string, TextTime>): number | null {
	const kind = deriveEventKind(event.action);
	if (kind === "outro") {
		const cue = event.name ? cueByName.get(event.name) : null;
		if (!cue) return null;
		return Math.round(Number(cue.end) * 1000);
	}

	if (kind === "intro") {
		const cue = event.name ? cueByName.get(event.name) : null;
		if (!cue) return null;
		return Math.round(Number(cue.start) * 1000);
	}

	if (event.name) {
		const cue = cueByName.get(event.name);
		if (!cue) return null;
		const position = (event.position || "middle") as CustomEventPosition;
		return Math.round(getCueTimeAtPosition(cue, position) * 1000);
	}

	return null;
}

/**
 * Stable tie-breaker used when two actions share same start time.
 */
function actionRank(action: string): number {
	if (action === INTRO) return 0;
	if (deriveEventKind(action) === "custom") return 1;
	if (action === OUTRO) return 2;
	return 3;
}

/**
 * Read per-capsule default transition override.
 */
function getCapsuleDefaultTransitionRef(capsule: CapsuleComp | undefined, action: string): string | null {
	if (!capsule) return null;

	const transitionValue =
		action == INTRO
			? (capsule as unknown as Record<string, unknown>).defaultItemIntroTransition
			: (capsule as unknown as Record<string, unknown>).defaultItemOutroTransition;

	return parseTransitionRef(transitionValue);
}

/**
 * Parse transition refs stored as plain keys or JSON payloads.
 */
function parseTransitionRef(value: unknown): string | null {
	if (!value) return null;
	if (typeof value == "string") {
		const raw = value.trim();
		if (!raw) return null;
		if (raw.startsWith("{")) {
			try {
				const parsed = JSON.parse(raw) as { ref?: unknown };
				if (typeof parsed.ref == "string") return parsed.ref;
			} catch {
				return raw;
			}
		}
		return raw;
	}
	if (typeof value != "object") return null;

	const record = value as Record<string, unknown>;
	if (typeof record.ref == "string") return record.ref;
	return null;
}
