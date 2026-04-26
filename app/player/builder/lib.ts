import type { ContentEvent } from "@/api/db";

/**
 * Build a stable action key used by both timeline events and item actions.
 */
export function buildEventActionName(event: ContentEvent): string {
	const itemScope = typeof event.itemId === "number" ? `item-${event.itemId}` : null;
	const label = event.name || itemScope || event.action;
	return `${label}-${event.action}`;
}

export function buildEventTweenActionName(event: ContentEvent): string {
	return `${buildEventActionName(event)}__tween`;
}

export function buildCustomTweenActionName(event: ContentEvent): string {
	return buildEventTweenActionName(event);
}

/**
 * Style shape used by builder-generated action interpolations.
 */
export type ActionStyle = Record<string, { from?: number | string; to: number | string; duration?: number }>;
