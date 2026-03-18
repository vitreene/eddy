import { DEFAULT_TRANSITION_BY_ACTION, getTransitionPreset } from "@/config/transitions";
import { getCueTimeAtPosition } from "@/scene-runtime/visibility/custom-event-cue-mapping";
import { DEFAULT_DURATION, INTRO, OUTRO } from "@/config/constants";
import { deriveEventKind, type CustomEventPosition } from "@/config/custom-events";
import {
	getActiveSceneContent,
	getSceneContentCues,
	getSceneContentDurationSec
} from "@/scene-runtime/scene-content";

import type { ContentEvent, ItemComp, SceneComp, TextTime, CapsuleComp } from "@/api/db";
import { buildCustomTweenActionName, buildEventActionName } from "./lib";

type OrderedEvent = {
	event: ContentEvent;
	keyframeMs: number | null;
	runtimeStartMs: number | null;
};

/**
 * Build timeline event map from all item events.
 */
export function mapEvents(snapshot: SceneComp) {
	const map = new Map<number, Array<Partial<TextTime> & Pick<TextTime, "name" | "start">>>();

	map.set(0, [{ name: INTRO, start: 0 }]);

	if (!snapshot || !snapshot.events || !snapshot.sceneContents) return map;

	const sceneContent = getActiveSceneContent(snapshot);
	const sceneDurationMs = Math.round(getSceneContentDurationSec(sceneContent) * 1000);
	let lastCue = sceneDurationMs;

	for (const item of Object.values(snapshot.items || {})) {
		const events = snapshot.events[item.id] || {};
		const orderedEvents = getOrderedEventsForItem(snapshot, events);
		let previousKeyframeMs = 0;
		for (const entry of orderedEvents) {
			const ev = entry.event;
			if (entry.keyframeMs === null || entry.runtimeStartMs === null) continue;
			if (entry.keyframeMs > lastCue) lastCue = entry.keyframeMs;
			const kind = deriveEventKind(ev.action);

			if (kind === "custom") {
				const tweenStart = previousKeyframeMs;
				const tweenMapped = {
					name: buildCustomTweenActionName(ev),
					start: tweenStart
				};
				const tweenExisting = map.get(tweenStart) || [];
				tweenExisting.push(tweenMapped);
				map.set(tweenStart, tweenExisting);

				const keyframeMapped = {
					name: buildEventActionName(ev),
					start: entry.keyframeMs
				};
				const keyframeExisting = map.get(entry.keyframeMs) || [];
				keyframeExisting.push(keyframeMapped);
				map.set(entry.keyframeMs, keyframeExisting);
			} else {
				const mapped = {
					name: buildEventActionName(ev),
					start: entry.runtimeStartMs
				};

				const existing = map.get(entry.runtimeStartMs) || [];
				existing.push(mapped);
				map.set(entry.runtimeStartMs, existing);
			}
			previousKeyframeMs = entry.keyframeMs;
		}
	}
	const outroStart = Math.max(0, lastCue - DEFAULT_DURATION);
	map.set(outroStart, [{ name: OUTRO, start: outroStart }]);
	return map;
}

/**
 * Sort item events in playback order, with computed start times.
 */
export function getOrderedEventsForItem(
	snapshot: SceneComp,
	events: Record<string, ContentEvent | undefined>
): OrderedEvent[] {
	const sceneContent = getActiveSceneContent(snapshot);
	const cues = getSceneContentCues(sceneContent);
	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const result: OrderedEvent[] = [];
	for (const event of Object.values(events || {})) {
		if (!event) continue;
		const timing = resolveEventTiming(event, cueByName);
		result.push({ event, keyframeMs: timing.keyframeMs, runtimeStartMs: timing.runtimeStartMs });
	}

	return result.toSorted((a, b) => {
		if (a.keyframeMs === null && b.keyframeMs !== null) return 1;
		if (a.keyframeMs !== null && b.keyframeMs === null) return -1;
		if (a.keyframeMs !== null && b.keyframeMs !== null && a.keyframeMs !== b.keyframeMs)
			return a.keyframeMs - b.keyframeMs;
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
/**
 * Resolve keyframe time and runtime trigger time for one event.
 * - intro keyframe = end of intro transition, runtime = keyframe - duration
 * - outro keyframe = cue end, runtime = keyframe
 * - custom keyframe = cue position (or null), runtime = keyframe
 */
function resolveEventTiming(
	event: ContentEvent,
	cueByName: Map<string, TextTime>
): { keyframeMs: number | null; runtimeStartMs: number | null } {
	const kind = deriveEventKind(event.action);
	if (kind === "outro") {
		const cue = event.name ? cueByName.get(event.name) : null;
		if (!cue) return { keyframeMs: null, runtimeStartMs: null };
		const keyframeMs = Math.round(Number(cue.end) * 1000);
		return { keyframeMs, runtimeStartMs: keyframeMs };
	}

	if (kind === "intro") {
		const cue = event.name ? cueByName.get(event.name) : null;
		if (!cue) return { keyframeMs: null, runtimeStartMs: null };
		const durationMs = resolveTransitionDurationMs(event);
		const introStartMs = Math.round(Number(cue.start) * 1000);
		const keyframeMs = introStartMs + durationMs;
		return {
			keyframeMs,
			runtimeStartMs: Math.max(0, keyframeMs - durationMs)
		};
	}

	if (event.name) {
		const cue = cueByName.get(event.name);
		if (!cue) return { keyframeMs: null, runtimeStartMs: null };
		const position = (event.position || "middle") as CustomEventPosition;
		const keyframeMs = Math.round(getCueTimeAtPosition(cue, position) * 1000);
		return { keyframeMs, runtimeStartMs: keyframeMs };
	}

	return { keyframeMs: null, runtimeStartMs: null };
}

function resolveTransitionDurationMs(event: ContentEvent): number {
	if (typeof event.duration === "number" && Number.isFinite(event.duration) && event.duration > 0) {
		return Math.round(event.duration * 1000);
	}
	return DEFAULT_DURATION;
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
