import type { ContentEvent } from "@/api/db";
import { deriveEventKind } from "@/config/custom-events";
import { buildEventCueName, resolveEventCuePoint } from "@/scene-runtime/visibility/event-cue-name";

/**
 * Build a stable action key used by both timeline events and item actions.
 */
export function buildEventActionName(event: ContentEvent): string {
	const itemScope = typeof event.itemId === "number" ? `item-${event.itemId}` : null;
	const label = resolveEventActionLabel(event, itemScope || event.action);
	return `${label}-${event.action}`;
}

export function buildCustomTweenActionName(event: ContentEvent): string {
	return `${buildEventActionName(event)}__tween`;
}

function resolveEventActionLabel(event: ContentEvent, fallbackLabel: string): string {
	const eventName = typeof event.name === "string" ? event.name.trim() : "";
	if (!eventName) return fallbackLabel;
	if (deriveEventKind(event.action) !== "custom") return eventName;

	const cuePoint = resolveEventCuePoint(eventName, event.position, "start");
	if (!cuePoint) return eventName;

	const normalized = buildEventCueName(cuePoint.cueName, cuePoint.position);
	return normalized || eventName;
}

/**
 * Style shape used by builder-generated action interpolations.
 */
export type ActionStyle = Record<string, { from?: number | string; to: number | string; duration?: number }>;
