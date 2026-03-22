import { findCssClassRule } from "@/lib/merge-css-classes";
import { INTRO, OUTRO } from "@/config/constants";
import { normalizeTransitionRef } from "@/config/transitions";
import { normalizeSustainEffectRef } from "@/config/event-effects";
import { deriveEventKind, type CustomEventPosition } from "@/config/custom-events";
import {
	getCueTimeAtPosition,
	resolveClosestCuePointFromDelay
} from "@/scene-runtime/visibility/custom-event-cue-mapping";
import { getActiveSceneContent, getSceneContentCues } from "@/scene-runtime/scene-content";
import { buildNodeId } from "@/scene-runtime/node-id";
import { resolveSelectedEventCueSec } from "./event-selection-cue";

import type { Decor, ContentEvent, ItemComp, SceneComp } from "@/api/db";
import type { ActiveState, TreeMutationResponse } from "./types";

const COMPONENT_TRANSFORM_DEBUG_KEYS = new Set([
	"x",
	"y",
	"width",
	"height",
	"rotate",
	"originX",
	"originY",
	"scaleX",
	"scaleY"
]);

// Temporary debug switch: when true, transform keys are not persisted.
// Remove this block when transform persistence is re-enabled.
const DEBUG_SKIP_COMPONENT_TRANSFORM_PERSIST = false;

function serializeCapsuleTransition(value: unknown, action: typeof INTRO | typeof OUTRO): string {
	if (!value) return "";

	if (typeof value == "string") {
		const ref = value.trim();
		if (!ref) return "";
		return JSON.stringify({ action, ref: normalizeTransitionRef(ref, action) });
	}

	if (typeof value == "object") {
		const record = value as Record<string, unknown>;
		const ref = typeof record.ref == "string" ? record.ref.trim() : "";
		if (!ref) return "";
		const currentAction = typeof record.action == "string" && record.action ? record.action : action;
		return JSON.stringify({ action: currentAction, ref: normalizeTransitionRef(ref, currentAction) });
	}

	return "";
}

function serializeCapsuleSustain(value: unknown): string {
	if (!value) return "";
	if (typeof value != "string") return "";
	const normalized = normalizeSustainEffectRef(value);
	return normalized ?? "";
}

export function getMutationActivePayload(output: TreeMutationResponse): Partial<ActiveState> {
	const createdItem = output.created?.item;
	if (!createdItem) return {};
	return {
		itemId: createdItem.id,
		contentId: createdItem.contentId
	};
}

export async function executePersistTouchedCommits(
	context: SceneComp & { active: ActiveState },
	params: string[],
	options?: {
		onEventsPersisted?: (itemId: number, events: ContentEvent[]) => void;
	}
) {
	if (!params.length) return;
	const itemId = context.active.itemId;
	if (!itemId) return false;

	const decorTouched = params.includes("decorTouched");
	const eventTouched = params.includes("eventTouched");
	const themeTouched = params.includes("themeTouched");
	const capsuleTouched = params.includes("capsuleTouched");

	if (eventTouched) {
		try {
			const response = await fetch(`/api/content/${itemId}`, {
				method: "POST",
				headers: { Accept: "application/json", "Content-Type": "application/json" },
				body: JSON.stringify(context.events[itemId])
			});

			if (!response.ok) {
				console.error("Event persist failed", { itemId, status: response.status });
			} else {
				const payload = (await response.json()) as { events?: ContentEvent[] };
				if (Array.isArray(payload.events)) options?.onEventsPersisted?.(itemId, payload.events);
			}
		} catch (error) {
			console.error("Event persist failed", { itemId, error });
		}
	}

	if (decorTouched) {
		const target = resolveActiveDecorTarget(context, itemId);
		if (target.decor) {
			const { id: decorId, ...rest } = target.decor;
			const style =
				rest.style && typeof rest.style == "object"
					? Object.fromEntries(
							Object.entries(rest.style as Record<string, unknown>).filter(
								([key]) =>
									key !== "outline" &&
									(!DEBUG_SKIP_COMPONENT_TRANSFORM_PERSIST || !COMPONENT_TRANSFORM_DEBUG_KEYS.has(key))
							)
						)
					: rest.style;
			fetch(`/api/decor`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ itemId, decorId, ...rest, style })
			});
		}
	}

	if (capsuleTouched) {
		const contentId = context.items[itemId].contentId;
		const { id, ...capsule } = context.capsules[context.contents[contentId].capsuleId];
		const capsuleRecord = capsule as Record<string, unknown>;
		delete capsule.itemIds;

		const introSerialized = serializeCapsuleTransition(capsuleRecord.defaultItemIntroTransition, INTRO);
		const sustainSerialized = serializeCapsuleSustain(capsuleRecord.defaultItemSustainTransition);
		const sustainAlternate = capsuleRecord.defaultItemSustainAlternate === true ? "true" : "false";
		const outroSerialized = serializeCapsuleTransition(capsuleRecord.defaultItemOutroTransition, OUTRO);

		const formData = new FormData();
		Object.entries(capsule).forEach(([k, v]: [string, unknown]) => {
			if (
				k == "defaultItemIntroTransition" ||
				k == "defaultItemSustainTransition" ||
				k == "defaultItemSustainAlternate" ||
				k == "defaultItemOutroTransition"
			)
				return;
			formData.set(k, v == null ? "" : String(v));
		});
		formData.set("defaultItemIntroTransition", introSerialized);
		formData.set("defaultItemSustainTransition", sustainSerialized);
		formData.set("defaultItemSustainAlternate", sustainAlternate);
		formData.set("defaultItemOutroTransition", outroSerialized);

		fetch(`/api/capsule/${id}`, { method: "POST", body: formData });
	}

	if (themeTouched) {
		const contentId = context.items[itemId].contentId;
		const capsule = context.capsules[context.contents[contentId].capsuleId];
		const gridClassName = capsule.grid;
		if (gridClassName) {
			const generated = findCssClassRule(context.theme.generated, gridClassName);
			fetch(`/api/theme/${context.theme.id}`, {
				method: "POST",
				headers: { Accept: "application/json", "Content-Type": "application/json" },
				body: JSON.stringify({ generated })
			});
		}
	}
}

export function nextCustomAction(existingActions: string[]): string {
	const used = new Set(existingActions);
	let index = 1;
	while (used.has(`custom-${index}`)) index += 1;
	return `custom-${index}`;
}

export function hasOwn<T extends object>(obj: T, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(obj, key);
}

export function isItemDecorEventContext(
	context: SceneComp,
	itemId: number,
	action: string | null | undefined
): boolean {
	if (!action) return false;
	if (action === INTRO) return true;
	if (deriveEventKind(action) !== "custom") return false;

	const itemEvents = context.events?.[itemId] || {};
	if (itemEvents[INTRO]) return false;

	const orderedCustomActions = Object.values(itemEvents)
		.filter((event): event is ContentEvent => Boolean(event) && deriveEventKind(event.action) === "custom")
		.map((event) => event.action)
		.toSorted((a, b) => {
			const aSec = resolveSelectedEventCueSec(context, itemId, a);
			const bSec = resolveSelectedEventCueSec(context, itemId, b);
			const aFinite = typeof aSec == "number" && Number.isFinite(aSec);
			const bFinite = typeof bSec == "number" && Number.isFinite(bSec);
			if (aFinite && bFinite && aSec !== bSec) return aSec - bSec;
			if (aFinite && !bFinite) return -1;
			if (!aFinite && bFinite) return 1;
			return a.localeCompare(b);
		});

	return orderedCustomActions[0] === action;
}

function resolveActiveDecorTarget(
	context: SceneComp & { active: ActiveState },
	itemId: number
): { decor: Decor | undefined } {
	const activeEventAction = context.active.event;
	if (activeEventAction) {
		if (isItemDecorEventContext(context, itemId, activeEventAction)) {
			const itemDecorId = context.items[itemId]?.decorId;
			if (!itemDecorId) return { decor: undefined };
			return { decor: context.decors[itemDecorId] };
		}
		const activeEvent = context.events[itemId]?.[activeEventAction];
		if (activeEvent?.decorId) {
			return { decor: context.decors[activeEvent.decorId] };
		}
	}

	const itemDecorId = context.items[itemId]?.decorId;
	if (!itemDecorId) return { decor: undefined };
	return { decor: context.decors[itemDecorId] };
}

function computeDefaultCustomDelaySec(
	context: SceneComp & { active: ActiveState },
	itemId: number
): number | null {
	const itemEvents = context.events[itemId] || {};
	const introName = itemEvents[INTRO]?.name;
	const outroName = itemEvents[OUTRO]?.name;
	if (!introName || !outroName) return null;

	const sceneContent = getActiveSceneContent(context);
	const cues = getSceneContentCues(sceneContent);
	if (!cues.length) return null;

	const introCue = cues.find((cue) => cue.name == introName);
	const outroCue = cues.find((cue) => cue.name == outroName);
	if (!introCue || !outroCue) return null;

	const start = Number(introCue.start);
	const end = Number(outroCue.end);
	if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

	const activeCueSec = context.active.cue;
	if (typeof activeCueSec == "number" && Number.isFinite(activeCueSec)) {
		const clamped = Math.min(Math.max(activeCueSec, start), end);
		return clamped - start;
	}

	return (end - start) / 2;
}

export function seedCustomEventPlacement(
	context: SceneComp & { active: ActiveState },
	itemId: number
): { name: string | null; delay: number | null; position: CustomEventPosition | null } {
	const nearest = resolveNearestCuePointFromSeek(context, itemId);
	if (nearest) return { name: nearest.name, delay: null, position: nearest.position };

	const fallbackDelay = computeDefaultCustomDelaySec(context, itemId);
	return { name: null, delay: fallbackDelay ?? 0, position: null };
}

function resolveNearestCuePointFromSeek(
	context: SceneComp & { active: ActiveState },
	itemId: number
): { name: string; position: CustomEventPosition } | null {
	// Resolve nearest cue point around current seek; prefer points within intro/outro bounds.
	const itemEvents = context.events[itemId] || {};
	const introName = itemEvents[INTRO]?.name;
	const outroName = itemEvents[OUTRO]?.name;
	const sceneContent = getActiveSceneContent(context);
	const cues = getSceneContentCues(sceneContent);
	if (!cues.length) return null;

	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const introCue = introName ? cueByName.get(introName) : null;
	const outroCue = outroName ? cueByName.get(outroName) : null;

	const introStart = introCue ? Number(introCue.start) : Number.NaN;
	const outroEnd = outroCue ? Number(outroCue.end) : Number.NaN;
	const hasBounds = Number.isFinite(introStart) && Number.isFinite(outroEnd) && outroEnd >= introStart;

	const activeCueSec = context.active.cue;
	const targetSec =
		typeof activeCueSec == "number" && Number.isFinite(activeCueSec)
			? activeCueSec
			: hasBounds
				? introStart + (outroEnd - introStart) / 2
				: Number(cues[0]?.start) || 0;

	let bestInBounds: { name: string; position: CustomEventPosition; time: number } | null = null;
	let bestAny: { name: string; position: CustomEventPosition; time: number } | null = null;

	for (const cue of cues) {
		for (const position of ["start", "middle", "end"] as const) {
			const time = getCueTimeAtPosition(cue, position);
			if (!Number.isFinite(time)) continue;
			const candidate = { name: cue.name, position: position as CustomEventPosition, time };
			if (!bestAny || Math.abs(candidate.time - targetSec) < Math.abs(bestAny.time - targetSec)) {
				bestAny = candidate;
			}
			if (hasBounds && (time < introStart || time > outroEnd)) continue;
			if (!bestInBounds || Math.abs(candidate.time - targetSec) < Math.abs(bestInBounds.time - targetSec)) {
				bestInBounds = candidate;
			}
		}
	}

	if (bestInBounds) return { name: bestInBounds.name, position: bestInBounds.position };
	if (bestAny) return { name: bestAny.name, position: bestAny.position };

	if (introName && outroName) {
		const delay = computeDefaultCustomDelaySec(context, itemId);
		const point = resolveClosestCuePointFromDelay({
			cues,
			introName,
			outroName,
			delaySec: delay
		});
		if (point) return { name: point.name, position: point.position };
	}

	return null;
}

export function computeCueForSelectedCustomEvent(
	context: SceneComp & { active: ActiveState },
	itemId: number,
	action: string
): number | null {
	return resolveSelectedEventCueSec(context, itemId, action);
}

export function getTouchedParams(context: SceneComp & { active: ActiveState }): string[] {
	const params: string[] = [];
	if (context.active.eventTouched) params.push("eventTouched");
	if (context.active.decorTouched) params.push("decorTouched");
	if (context.active.themeTouched) params.push("themeTouched");
	if (context.active.capsuleTouched) params.push("capsuleTouched");
	return params;
}

export function mergeDecorStylePatch(currentDecor: Decor | undefined, incomingDecor: Decor): Decor {
	const baseDecor = currentDecor || incomingDecor;
	const nextDecor: Decor = {
		...baseDecor,
		...incomingDecor
	};

	if (incomingDecor.style === null) {
		nextDecor.style = {};
		return nextDecor;
	}

	if (!incomingDecor.style || typeof incomingDecor.style !== "object") {
		return nextDecor;
	}

	const currentStyle =
		currentDecor?.style && typeof currentDecor.style === "object"
			? { ...(currentDecor.style as Record<string, unknown>) }
			: {};
	const patchStyle = incomingDecor.style as Record<string, unknown>;

	for (const [key, value] of Object.entries(patchStyle)) {
		if (typeof value === "undefined" || value === null) delete currentStyle[key];
		else currentStyle[key] = value;
	}

	nextDecor.style = currentStyle;
	return nextDecor;
}

export function getItemFromCapsule(
	capsuleId: number | null | undefined,
	context: SceneComp & { active: ActiveState }
): ItemComp | null {
	if (!capsuleId) return null;
	const content = Object.values(context.contents).find((m) => m.type == "capsule" && m.capsuleId == capsuleId);
	const item = content ? Object.values(context.items).find((e) => e.contentId == content.id) : null;
	return item ?? null;
}

export function withGeneratedItemNodeIds<T extends SceneComp>(scene: T): T {
	return {
		...scene,
		items: withItemNodeIds(scene.items)
	};
}

export function withItemNodeIds(items: SceneComp["items"]): SceneComp["items"] {
	return Object.fromEntries(
		Object.entries(items || {}).map(([itemId, item]) => {
			if (!item) return [itemId, item];
			if (item.nodeId) return [itemId, item];
			return [itemId, { ...item, nodeId: buildNodeId("item", item.id) }];
		})
	) as SceneComp["items"];
}
