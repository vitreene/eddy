import { INTRO, OUTRO } from "@/config/constants";
import { deriveEventKind } from "@/config/custom-events";
import { getActiveSceneContent, getSceneContentCues } from "@/scene-runtime/scene-content";

import { getCueTimeAtPosition } from "./custom-event-cue-mapping";
import { buildCapsuleBehaviorById } from "./capsule-behavior";
import { resolveCueWindows } from "./resolve-cue-windows";

import type { ContentEvent, SceneComp, TextTime } from "@/api/db";

export type EffectiveTransitionSource = "explicit" | "implicit" | "mixed";

export type EffectiveTransitionResolution = {
	event: ContentEvent | null;
	source: EffectiveTransitionSource | null;
};

export type EffectiveItemEvents = {
	eventMap: Record<string, ContentEvent | undefined>;
	intro: EffectiveTransitionResolution;
	outro: EffectiveTransitionResolution;
	cues: TextTime[];
	cueByName: Map<string, TextTime>;
};

export function resolveEffectiveItemEvents(snapshot: SceneComp, itemId: number): EffectiveItemEvents {
	const sceneContent = getActiveSceneContent(snapshot);
	const cues = getSceneContentCues(sceneContent);
	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));

	const explicitMap = snapshot.events?.[itemId] || {};
	const resolved = resolveResolvedEventsSnapshot(snapshot);
	const resolvedMap = resolved.resolvedEvents[itemId] || explicitMap;
	const window = resolved.cueWindowsByItemId.get(itemId) || null;

	const intro = buildEffectiveTransitionResolution({
		action: INTRO,
		itemId,
		explicit: explicitMap[INTRO] || null,
		resolved: resolvedMap[INTRO] || null,
		window,
		cues,
		cueByName
	});

	const outro = buildEffectiveTransitionResolution({
		action: OUTRO,
		itemId,
		explicit: explicitMap[OUTRO] || null,
		resolved: resolvedMap[OUTRO] || null,
		window,
		cues,
		cueByName
	});

	const eventMap: Record<string, ContentEvent | undefined> = { ...explicitMap };
	if (intro.event) eventMap[INTRO] = intro.event;
	if (outro.event) eventMap[OUTRO] = outro.event;

	return {
		eventMap,
		intro,
		outro,
		cues,
		cueByName
	};
}

export function resolveEffectiveEventForAction(
	snapshot: SceneComp,
	itemId: number,
	action: string | null | undefined
): ContentEvent | null {
	if (!action) return null;
	const effective = resolveEffectiveItemEvents(snapshot, itemId).eventMap[action] || null;
	if (effective) return effective;
	if (deriveEventKind(action) !== "custom") return null;
	return snapshot.events?.[itemId]?.[action] || null;
}

function resolveResolvedEventsSnapshot(snapshot: SceneComp) {
	const behaviorByCapsuleId = buildCapsuleBehaviorById(snapshot);
	return resolveCueWindows(
		{
			...snapshot,
			events: cloneSceneEvents(snapshot.events)
		},
		{
			generateMissingEvents: true,
			behaviorByCapsuleId
		}
	);
}

function cloneSceneEvents(events: SceneComp["events"] | undefined): SceneComp["events"] {
	const source = events || {};
	const clonedEntries = Object.entries(source).map(([itemId, eventMap]) => {
		const nextMap: Record<string, ContentEvent | undefined> = {};
		for (const [action, event] of Object.entries(eventMap || {})) {
			nextMap[action] = event ? { ...event } : event;
		}
		return [itemId, nextMap];
	});
	return Object.fromEntries(clonedEntries) as SceneComp["events"];
}

function buildEffectiveTransitionResolution(params: {
	action: typeof INTRO | typeof OUTRO;
	itemId: number;
	explicit: ContentEvent | null;
	resolved: ContentEvent | null;
	window: { start: number; end: number } | null;
	cues: TextTime[];
	cueByName: Map<string, TextTime>;
}): EffectiveTransitionResolution {
	const { action, itemId, explicit, resolved, window, cues, cueByName } = params;
	const defaultPosition = action === OUTRO ? "end" : "start";

	const explicitName = resolveCueNameInSceneCues(explicit?.name, cueByName);
	const resolvedName = resolveCueNameInSceneCues(resolved?.name, cueByName);
	const targetSec = action === OUTRO ? Number(window?.end) : Number(window?.start);
	const nearestName = resolveNearestCueName(cues, targetSec, defaultPosition);
	const name = explicitName || resolvedName || nearestName;

	if (!explicit && !resolved && !name) {
		return { event: null, source: null };
	}

	const position = normalizeTransitionPosition(explicit?.position ?? resolved?.position, action);
	const base = explicit || resolved;
	const event: ContentEvent = {
		id: base?.id,
		itemId,
		action,
		name: name ?? null,
		ref: base?.ref ?? null,
		duration: base?.duration ?? null,
		delay: base?.delay ?? null,
		position,
		decorId: base?.decorId ?? null
	};

	if (!explicit) return { event, source: "implicit" };
	if (explicitName && explicitName === name && normalizeTransitionPosition(explicit.position, action) === position) {
		return { event, source: "explicit" };
	}
	return { event, source: "mixed" };
}

function resolveCueNameInSceneCues(
	cueName: string | null | undefined,
	cueByName: Map<string, TextTime>
): string | null {
	if (typeof cueName !== "string") return null;
	const normalized = cueName.trim();
	if (!normalized) return null;
	if (!cueByName.has(normalized)) return null;
	return normalized;
}

function resolveNearestCueName(
	cues: TextTime[],
	targetSec: number,
	position: "start" | "middle" | "end"
): string | null {
	if (!cues.length) return null;

	if (!Number.isFinite(targetSec)) {
		return position === "end" ? cues[cues.length - 1]?.name || null : cues[0]?.name || null;
	}

	let nearestCueName: string | null = null;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const cue of cues) {
		const cueSec = getCueTimeAtPosition(cue, position);
		if (!Number.isFinite(cueSec)) continue;
		const distance = Math.abs(cueSec - targetSec);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestCueName = cue.name;
		}
	}

	return nearestCueName;
}

function normalizeTransitionPosition(
	position: unknown,
	action: typeof INTRO | typeof OUTRO
): "start" | "middle" | "end" {
	if (position === "start" || position === "middle" || position === "end") return position;
	if (action === OUTRO) return "end";
	return "start";
}
