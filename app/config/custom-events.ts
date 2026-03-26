import { INTRO, OUTRO, SUSTAIN } from "@/config/constants";
import type { Prisma } from "prisma/generated/prisma/client";

export const RESERVED_EVENT_ACTIONS = {
	INTRO,
	SUSTAIN,
	OUTRO
} as const;

export type ReservedEventAction =
	| (typeof RESERVED_EVENT_ACTIONS)["INTRO"]
	| (typeof RESERVED_EVENT_ACTIONS)["SUSTAIN"]
	| (typeof RESERVED_EVENT_ACTIONS)["OUTRO"];

export type EventKind = "intro" | "sustain" | "outro" | "custom";
export type CustomEventPosition = "start" | "middle" | "end";

export type CustomEventDraft = {
	action: string;
	name?: string | null;
	delay?: number | null;
	duration?: number | null;
	position?: CustomEventPosition | null;
	ref?: Prisma.JsonValue | null;
};

export type CustomEventMoveOptions = {
	autoMove: boolean;
	clearTransforms: boolean;
};

const DEFAULT_CUSTOM_EVENT_MOVE_OPTIONS: CustomEventMoveOptions = {
	autoMove: true,
	clearTransforms: false
};

export function parseCustomEventMoveOptions(ref: unknown): CustomEventMoveOptions {
	const parsed = parseCustomEventMovePayload(ref);
	if (!parsed) return { ...DEFAULT_CUSTOM_EVENT_MOVE_OPTIONS };
	return {
		autoMove:
			typeof parsed.autoMove === "boolean" ? parsed.autoMove : DEFAULT_CUSTOM_EVENT_MOVE_OPTIONS.autoMove,
		clearTransforms:
			typeof parsed.clearTransforms === "boolean"
				? parsed.clearTransforms
				: DEFAULT_CUSTOM_EVENT_MOVE_OPTIONS.clearTransforms
	};
}

function parseCustomEventMovePayload(ref: unknown): Partial<CustomEventMoveOptions> | null {
	if (!ref) return null;
	if (typeof ref === "string") {
		const raw = ref.trim();
		if (!raw || !raw.startsWith("{")) return null;
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
			return parsed as Partial<CustomEventMoveOptions>;
		} catch {
			return null;
		}
	}
	if (typeof ref !== "object" || Array.isArray(ref)) return null;
	return ref as Partial<CustomEventMoveOptions>;
}

export function serializeCustomEventMoveOptions(
	options: Partial<CustomEventMoveOptions> | null | undefined
): string {
	const normalized: CustomEventMoveOptions = {
		autoMove:
			typeof options?.autoMove === "boolean" ? options.autoMove : DEFAULT_CUSTOM_EVENT_MOVE_OPTIONS.autoMove,
		clearTransforms:
			typeof options?.clearTransforms === "boolean"
				? options.clearTransforms
				: DEFAULT_CUSTOM_EVENT_MOVE_OPTIONS.clearTransforms
	};
	return JSON.stringify(normalized);
}

export function deriveEventKind(action: string | null | undefined): EventKind {
	if (action === RESERVED_EVENT_ACTIONS.INTRO) return "intro";
	if (action === RESERVED_EVENT_ACTIONS.SUSTAIN) return "sustain";
	if (action === RESERVED_EVENT_ACTIONS.OUTRO) return "outro";
	return "custom";
}

export function isCustomEventAction(action: string | null | undefined): boolean {
	return deriveEventKind(action) === "custom";
}

export function normalizeCustomEventDraft(draft: CustomEventDraft): CustomEventDraft {
	const kind = deriveEventKind(draft.action);

	const name = typeof draft.name === "string" ? draft.name.trim() : "";
	const normalizedName = name.length ? name : null;

	const normalizedDelay =
		typeof draft.delay === "number" && Number.isFinite(draft.delay) && draft.delay >= 0 ? draft.delay : null;

	const normalizedDuration =
		typeof draft.duration === "number" && Number.isFinite(draft.duration) && draft.duration > 0
			? draft.duration
			: null;

	if (kind !== "custom") {
		return {
			...draft,
			name: normalizedName,
			delay: null,
			duration: normalizedDuration,
			position: null
		};
	}

	// Exclusivity rule:
	// if name is set, delay is disabled; if no name, delay can be used.
	const resolvedDelay = normalizedName ? null : normalizedDelay;

	return {
		...draft,
		name: normalizedName,
		delay: resolvedDelay,
		duration: normalizedDuration,
		position: draft.position ?? null,
		ref: draft.ref ?? serializeCustomEventMoveOptions(null)
	};
}

export function buildUniqueCustomEventName(existingNames: string[], prefix = "custom-event"): string {
	const used = new Set(existingNames.map((name) => name.trim()).filter(Boolean));
	if (!used.has(prefix)) return prefix;

	let index = 2;
	while (used.has(`${prefix}-${index}`)) index += 1;
	return `${prefix}-${index}`;
}
