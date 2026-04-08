import type { CustomEventPosition } from "@/config/custom-events";

const MIDDLE_SUFFIX = "-middle";
const END_SUFFIX = "-end";

export type EventCuePoint = {
	cueName: string;
	position: CustomEventPosition;
};

export function resolveCueEntryByEventName<T>(
	cueByName: Map<string, T>,
	eventCueName: string | null | undefined
): { cueName: string; cue: T } | null {
	if (typeof eventCueName !== "string") return null;
	const normalized = eventCueName.trim();
	if (!normalized) return null;

	const exactCue = cueByName.get(normalized);
	if (typeof exactCue !== "undefined") {
		return { cueName: normalized, cue: exactCue };
	}

	const parsedCueName = parseEventCueName(normalized)?.cueName;
	if (!parsedCueName || parsedCueName === normalized) return null;
	const parsedCue = cueByName.get(parsedCueName);
	if (typeof parsedCue === "undefined") return null;
	return { cueName: parsedCueName, cue: parsedCue };
}

export function hasCueByEventName<T>(
	cueByName: Map<string, T>,
	eventCueName: string | null | undefined
): boolean {
	return Boolean(resolveCueEntryByEventName(cueByName, eventCueName));
}

export function buildEventCueName(cueName: string, position: CustomEventPosition): string {
	const normalizedCueName = cueName.trim();
	if (!normalizedCueName) return "";
	if (position === "middle") return `${normalizedCueName}${MIDDLE_SUFFIX}`;
	if (position === "end") return `${normalizedCueName}${END_SUFFIX}`;
	return normalizedCueName;
}

export function parseEventCueName(eventCueName: string | null | undefined): EventCuePoint | null {
	if (typeof eventCueName !== "string") return null;
	const normalized = eventCueName.trim();
	if (!normalized) return null;

	if (normalized.endsWith(MIDDLE_SUFFIX)) {
		const cueName = normalized.slice(0, -MIDDLE_SUFFIX.length).trim();
		if (cueName) return { cueName, position: "middle" };
	}

	if (normalized.endsWith(END_SUFFIX)) {
		const cueName = normalized.slice(0, -END_SUFFIX.length).trim();
		if (cueName) return { cueName, position: "end" };
	}

	return { cueName: normalized, position: "start" };
}

export function resolveEventCuePoint(
	eventCueName: string | null | undefined,
	explicitPosition: unknown,
	fallbackPosition: CustomEventPosition
): EventCuePoint | null {
	const parsed = parseEventCueName(eventCueName);
	if (!parsed) return null;
	if (parsed.position !== "start") return parsed;

	return {
		cueName: parsed.cueName,
		position: normalizeEventCuePosition(explicitPosition, fallbackPosition)
	};
}

function normalizeEventCuePosition(
	value: unknown,
	fallbackPosition: CustomEventPosition
): CustomEventPosition {
	if (value === "start" || value === "middle" || value === "end") return value;
	return fallbackPosition;
}
