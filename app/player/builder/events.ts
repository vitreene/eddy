import { DEFAULT_TRANSITION_BY_ACTION, getTransitionPreset } from "@/config/transitions";
import { getCueTimeAtPosition } from "@/scene-runtime/visibility/custom-event-cue-mapping";
import { DEFAULT_DURATION, INTRO, OUTRO, SUSTAIN } from "@/config/constants";
import { deriveEventKind, type CustomEventPosition } from "@/config/custom-events";
import { normalizeSustainEffectRef, parseSustainEffectRef } from "@/config/event-effects";
import {
	getActiveSceneContent,
	getSceneContentCues,
	getSceneContentDurationSec
} from "@/scene-runtime/scene-content";
import {
	resolveCueWindows,
	type ResolveCueWindowsResult
} from "@/scene-runtime/visibility/resolve-cue-windows";
import { readEventTransitionValue } from "@/lib/event-ref";

import type { ContentEvent, ItemComp, SceneComp, TextTime, CapsuleComp } from "@/api/db";
import { buildCustomTweenActionName, buildEventActionName } from "./lib";

type OrderedEvent = {
	event: ContentEvent;
	keyframeMs: number | null;
	runtimeStartMs: number | null;
};

const SCENE_END_MARKER_ACTION = "__scene_end__";

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
		const orderedEvents = getOrderedEventsForItem(snapshot, events, item.id);
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
	const sceneEndExisting = map.get(sceneDurationMs) || [];
	sceneEndExisting.push({ name: SCENE_END_MARKER_ACTION, start: sceneDurationMs });
	map.set(sceneDurationMs, sceneEndExisting);
	return map;
}

/**
 * Sort item events in playback order, with computed start times.
 */
export function getOrderedEventsForItem(
	snapshot: SceneComp,
	events: Record<string, ContentEvent | undefined>,
	itemId?: number
): OrderedEvent[] {
	const effectiveEvents = withCapsuleDefaultSustainEvent(snapshot, events, itemId);
	const sceneContent = getActiveSceneContent(snapshot);
	const cues = getSceneContentCues(sceneContent);
	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const result: OrderedEvent[] = [];
	for (const event of Object.values(effectiveEvents || {})) {
		if (!event) continue;
		const timing = resolveEventTiming(event, cueByName, effectiveEvents, snapshot, itemId);
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

function withCapsuleDefaultSustainEvent(
	snapshot: SceneComp,
	events: Record<string, ContentEvent | undefined>,
	itemId?: number
): Record<string, ContentEvent | undefined> {
	if (typeof itemId !== "number") return events;
	if (events[SUSTAIN]) return events;

	const item = snapshot.items?.[itemId];
	if (!item) return events;
	const capsule = snapshot.capsules?.[item.capsuleId];
	if (!capsule) return events;

	const defaultRef = normalizeSustainEffectRef(capsule.defaultItemSustainTransition ?? null);
	if (!defaultRef) return events;

	let resolvedRef = defaultRef;
	if (capsule.defaultItemSustainAlternate === true) {
		const itemIndex = (capsule.itemIds || []).indexOf(itemId);
		const shouldInvert = itemIndex > -1 && itemIndex % 2 === 1;
		if (shouldInvert) {
			const parsed = parseSustainEffectRef(defaultRef);
			if (parsed) {
				resolvedRef = JSON.stringify({ name: parsed.name, in: parsed.out, out: parsed.in });
			}
		}
	}

	return {
		...events,
		[SUSTAIN]: {
			id: undefined,
			name: null,
			action: SUSTAIN,
			ref: resolvedRef,
			duration: null,
			delay: null,
			position: null,
			itemId,
			decorId: null
		}
	};
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
	const eventRef = readEventTransitionValue(event.ref);
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
	cueByName: Map<string, TextTime>,
	eventsByAction: Record<string, ContentEvent | undefined>,
	snapshot: SceneComp,
	itemId?: number
): { keyframeMs: number | null; runtimeStartMs: number | null } {
	const kind = deriveEventKind(event.action);
	if (kind === "sustain") {
		const sustain = resolveSustainTimingMs(snapshot, eventsByAction, cueByName, itemId);
		if (!sustain) return { keyframeMs: null, runtimeStartMs: null };
		return { keyframeMs: sustain.startMs, runtimeStartMs: sustain.startMs };
	}

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

export function resolveSustainWindowMs(
	snapshot: SceneComp,
	eventsByAction: Record<string, ContentEvent | undefined>,
	itemId?: number
): { startMs: number; endMs: number; durationMs: number } | null {
	const effectiveEvents = withCapsuleDefaultSustainEvent(snapshot, eventsByAction, itemId);
	const sceneContent = getActiveSceneContent(snapshot);
	const cues = getSceneContentCues(sceneContent);
	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	return resolveSustainTimingMs(snapshot, effectiveEvents, cueByName, itemId);
}

function resolveSustainTimingMs(
	snapshot: SceneComp,
	eventsByAction: Record<string, ContentEvent | undefined>,
	cueByName: Map<string, TextTime>,
	itemId?: number
): { startMs: number; endMs: number; durationMs: number } | null {
	const sustainEvent = eventsByAction[SUSTAIN];
	let introEvent = eventsByAction[INTRO];
	let outroEvent = eventsByAction[OUTRO];
	if (!sustainEvent) return null;

	if ((!introEvent?.name || !outroEvent?.name) && typeof itemId === "number") {
		const resolved = getResolvedCueWindows(snapshot);
		const resolvedEvents = resolved.resolvedEvents[itemId] || {};
		introEvent = introEvent || resolvedEvents[INTRO];
		outroEvent = outroEvent || resolvedEvents[OUTRO];
		cueByName = resolved.cueByName;
	}

	const sceneDurationMs = Math.max(
		0,
		Math.round(getSceneContentDurationSec(getActiveSceneContent(snapshot)) * 1000)
	);

	const introCue = introEvent?.name ? cueByName.get(introEvent.name) : null;
	const introStartMs = introCue ? Math.round(Number(introCue.start) * 1000) : 0;
	const introDurationMs = introEvent ? resolveTransitionDurationMs(introEvent) : DEFAULT_DURATION;
	const introEndMs = Math.max(0, introStartMs + introDurationMs);

	const outroCue = outroEvent?.name ? cueByName.get(outroEvent.name) : null;
	const outroDurationMs = outroEvent ? resolveTransitionDurationMs(outroEvent) : DEFAULT_DURATION;
	const outroStartMs = outroCue
		? Math.round(Number(outroCue.start) * 1000)
		: Math.max(introEndMs, sceneDurationMs - outroDurationMs);
	if (!Number.isFinite(introEndMs) || !Number.isFinite(outroStartMs)) return null;

	const startMs = Math.max(0, introEndMs);
	const endMs = Math.max(startMs, outroStartMs);
	const durationMs = Math.max(0, endMs - startMs);
	return { startMs, endMs, durationMs };
}

const resolvedCueWindowsCache = new WeakMap<SceneComp, ResolveCueWindowsResult>();

function getResolvedCueWindows(snapshot: SceneComp): ResolveCueWindowsResult {
	const cached = resolvedCueWindowsCache.get(snapshot);
	if (cached) return cached;
	const resolved = resolveCueWindows(snapshot, { generateMissingEvents: true });
	resolvedCueWindowsCache.set(snapshot, resolved);
	return resolved;
}

/**
 * Stable tie-breaker used when two actions share same start time.
 */
function actionRank(action: string): number {
	if (action === INTRO) return 0;
	if (action === SUSTAIN) return 1;
	if (deriveEventKind(action) === "custom") return 2;
	if (action === OUTRO) return 3;
	return 4;
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
