import { findCssClassRule } from "@/lib/merge-css-classes";
import { INTRO, OUTRO } from "@/config/constants";
import { normalizeTransitionRef } from "@/config/transitions";
import { deriveEventKind, type CustomEventPosition } from "@/config/custom-events";
import {
	getCueTimeAtPosition,
	resolveClosestCuePointFromDelay
} from "@/player/visibility/custom-event-cue-mapping";
import { buildNodeId } from "@/player/node-id";

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
const DEBUG_SKIP_COMPONENT_TRANSFORM_PERSIST = true;

function serializeCapsuleTransition(value: unknown, action: "intro" | "outro"): string {
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

		const introSerialized = serializeCapsuleTransition(capsuleRecord.defaultItemIntroTransition, "intro");
		const outroSerialized = serializeCapsuleTransition(capsuleRecord.defaultItemOutroTransition, "outro");

		const formData = new FormData();
		Object.entries(capsule).forEach(([k, v]: [string, unknown]) => {
			if (k == "defaultItemIntroTransition" || k == "defaultItemOutroTransition") return;
			formData.set(k, (v || "") as any);
		});
		formData.set("defaultItemIntroTransition", introSerialized);
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

function resolveActiveDecorTarget(
	context: SceneComp & { active: ActiveState },
	itemId: number
): { decor: Decor | undefined } {
	const activeEventAction = context.active.event;
	if (activeEventAction) {
		const activeEvent = context.events[itemId]?.[activeEventAction];
		if (activeEvent && deriveEventKind(activeEvent.action) === "custom" && activeEvent.decorId) {
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

	const sceneContent =
		Object.values(context.sceneContents || {}).find((sc) => sc.sceneId == context.id) ||
		Object.values(context.sceneContents || {})[0];
	if (!sceneContent?.events?.length) return null;

	const introCue = sceneContent.events.find((cue) => cue.name == introName);
	const outroCue = sceneContent.events.find((cue) => cue.name == outroName);
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
	const itemEvents = context.events[itemId] || {};
	const introName = itemEvents[INTRO]?.name;
	const outroName = itemEvents[OUTRO]?.name;
	const sceneContent =
		Object.values(context.sceneContents || {}).find((sc) => sc.sceneId == context.id) ||
		Object.values(context.sceneContents || {})[0];
	const cues = sceneContent?.events || [];

	if (introName && outroName && cues.length) {
		const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
		const introCue = cueByName.get(introName);
		if (introCue) {
			const introStart = Number(introCue.start);
			const baseDelay = computeDefaultCustomDelaySec(context, itemId);
			const activeDelay =
				typeof context.active.cue == "number" &&
				Number.isFinite(context.active.cue) &&
				Number.isFinite(introStart)
					? Math.max(0, context.active.cue - introStart)
					: baseDelay;

			const point = resolveClosestCuePointFromDelay({
				cues,
				introName,
				outroName,
				delaySec: activeDelay
			});

			if (point) return { name: point.name, delay: null, position: point.position };
		}
	}

	return { name: null, delay: computeDefaultCustomDelaySec(context, itemId), position: null };
}

export function computeCueForSelectedCustomEvent(
	context: SceneComp & { active: ActiveState },
	itemId: number,
	action: string
): number | null {
	const event = context.events[itemId]?.[action];
	if (!event || deriveEventKind(event.action) !== "custom") return null;

	const sceneContent =
		Object.values(context.sceneContents || {}).find((sc) => sc.sceneId == context.id) ||
		Object.values(context.sceneContents || {})[0];
	const cues = sceneContent?.events || [];
	if (!cues.length) return null;

	if (event.name) {
		const cue = cues.find((entry) => entry.name == event.name);
		if (!cue) return null;
		const position = (event.position === "start" || event.position === "end" ? event.position : "middle") as
			| "start"
			| "middle"
			| "end";
		return getCueTimeAtPosition(cue, position);
	}

	if (typeof event.delay == "number" && Number.isFinite(event.delay) && event.delay >= 0) {
		const introName = context.events[itemId]?.[INTRO]?.name;
		const introCue = introName ? cues.find((entry) => entry.name == introName) : null;
		if (!introCue) return null;
		const introStart = Number(introCue.start);
		if (!Number.isFinite(introStart)) return null;
		return introStart + event.delay;
	}

	return null;
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
