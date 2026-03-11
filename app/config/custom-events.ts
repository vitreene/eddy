import { INTRO, OUTRO } from "@/config/constants";

export const RESERVED_EVENT_ACTIONS = {
	INTRO,
	OUTRO
} as const;

export type ReservedEventAction =
	| (typeof RESERVED_EVENT_ACTIONS)["INTRO"]
	| (typeof RESERVED_EVENT_ACTIONS)["OUTRO"];

export type EventKind = "intro" | "outro" | "custom";
export type CustomEventPosition = "start" | "middle" | "end";

export type CustomEventDraft = {
	action: string;
	name?: string | null;
	delay?: number | null;
	duration?: number | null;
	position?: CustomEventPosition | null;
	ref?: string | null;
};

export type CustomEventAutoOptions = {
	auto: boolean;
	clearTransforms: boolean;
};

const DEFAULT_CUSTOM_EVENT_AUTO_OPTIONS: CustomEventAutoOptions = {
	auto: false,
	clearTransforms: false
};

export function parseCustomEventAutoOptions(ref: string | null | undefined): CustomEventAutoOptions {
	if (!ref || typeof ref !== "string") return { ...DEFAULT_CUSTOM_EVENT_AUTO_OPTIONS };
	const raw = ref.trim();
	if (!raw) return { ...DEFAULT_CUSTOM_EVENT_AUTO_OPTIONS };
	try {
		const parsed = JSON.parse(raw) as Partial<CustomEventAutoOptions>;
		return {
			auto: typeof parsed.auto === "boolean" ? parsed.auto : DEFAULT_CUSTOM_EVENT_AUTO_OPTIONS.auto,
			clearTransforms:
				typeof parsed.clearTransforms === "boolean"
					? parsed.clearTransforms
					: DEFAULT_CUSTOM_EVENT_AUTO_OPTIONS.clearTransforms
		};
	} catch {
		return { ...DEFAULT_CUSTOM_EVENT_AUTO_OPTIONS };
	}
}

export function serializeCustomEventAutoOptions(
	options: Partial<CustomEventAutoOptions> | null | undefined
): string {
	const normalized: CustomEventAutoOptions = {
		auto: typeof options?.auto === "boolean" ? options.auto : DEFAULT_CUSTOM_EVENT_AUTO_OPTIONS.auto,
		clearTransforms:
			typeof options?.clearTransforms === "boolean"
				? options.clearTransforms
				: DEFAULT_CUSTOM_EVENT_AUTO_OPTIONS.clearTransforms
	};
	return JSON.stringify(normalized);
}

export function deriveEventKind(action: string | null | undefined): EventKind {
	if (action === RESERVED_EVENT_ACTIONS.INTRO) return "intro";
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
		ref: draft.ref ?? serializeCustomEventAutoOptions(null)
	};
}

export function buildUniqueCustomEventName(existingNames: string[], prefix = "custom-event"): string {
	const used = new Set(existingNames.map((name) => name.trim()).filter(Boolean));
	if (!used.has(prefix)) return prefix;

	let index = 2;
	while (used.has(`${prefix}-${index}`)) index += 1;
	return `${prefix}-${index}`;
}
