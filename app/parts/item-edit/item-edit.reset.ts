import { DEFAULT_TRANSITION_BY_ACTION } from "@/config/transitions";
import { INTRO, OUTRO, SUSTAIN } from "@/config/constants";
import { deriveEventKind } from "@/config/custom-events";

import type { ContentEvent } from "@/api/db";

export function getCustomEventActions(
	events: Record<string, ContentEvent | undefined> | null | undefined
): string[] {
	if (!events) return [];
	return Object.values(events)
		.filter((event): event is ContentEvent => Boolean(event))
		.filter((event) => deriveEventKind(event.action) === "custom")
		.map((event) => event.action);
}

export function buildDefaultTransitionEventPatch(
	action: typeof INTRO | typeof OUTRO | typeof SUSTAIN,
	event: ContentEvent | undefined
): Partial<ContentEvent> {
	return {
		...event,
		action,
		ref: action === SUSTAIN ? null : DEFAULT_TRANSITION_BY_ACTION[action],
		duration: null,
		delay: null,
		position: null
	};
}
