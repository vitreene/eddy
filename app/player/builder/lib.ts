import type { ContentEvent } from "@/api/db";

/**
 * Build a stable action key used by both timeline events and item actions.
 */
export function buildEventActionName(event: ContentEvent): string {
	const label = event.name || event.action;
	return `${label}-${event.action}`;
}

export function buildCustomTweenActionName(event: ContentEvent): string {
	return `${buildEventActionName(event)}__tween`;
}

/**
 * Style shape used by builder-generated action interpolations.
 */
export type ActionStyle = Record<string, { from?: number | string; to: number | string; duration?: number }>;
