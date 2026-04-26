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

export function buildMaterializedTransitionEventPatch(args: {
	action: typeof INTRO | typeof OUTRO;
	itemId: number;
	explicitEvent: ContentEvent | undefined;
	resolvedEvent: ContentEvent | null;
}): Partial<ContentEvent> {
	const { action, itemId, explicitEvent, resolvedEvent } = args;
	const explicitRef = typeof explicitEvent?.ref === "string" ? explicitEvent.ref.trim() : "";
	const resolvedRef = typeof resolvedEvent?.ref === "string" ? resolvedEvent.ref.trim() : "";
	const ref = explicitRef || resolvedRef || DEFAULT_TRANSITION_BY_ACTION[action];

	return {
		action,
		itemId,
		name: resolvedEvent?.name ?? explicitEvent?.name ?? null,
		position: resolvedEvent?.position ?? explicitEvent?.position ?? null,
		duration:
			typeof explicitEvent?.duration === "number" && Number.isFinite(explicitEvent.duration) && explicitEvent.duration > 0
				? explicitEvent.duration
				: null,
		delay: null,
		ref,
		decorId: explicitEvent?.decorId ?? null
	};
}
