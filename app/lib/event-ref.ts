import { normalizeTransitionAction, normalizeTransitionRef } from "@/config/transitions";
import type { Prisma } from "prisma/generated/prisma/client";

export type EventMediaParams = {
	action: "play" | "pause";
	offset: number;
	changeAt: number;
};

type EventRefObject = Prisma.JsonObject;
type EventRefJsonValue = Prisma.JsonValue;

export type EventRefPatch = {
	transition?: string | null;
	media?: EventMediaParams | null;
};

export type EventRefKind = "intro" | "outro" | "sustain" | "custom";

export function readEventRefObject(raw: unknown): EventRefObject | null {
	if (!raw) return null;
	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (!trimmed) return null;
		if (!trimmed.startsWith("{")) return { transition: trimmed } as EventRefObject;
		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
			return parsed as EventRefObject;
		} catch {
			return null;
		}
	}
	if (typeof raw !== "object" || Array.isArray(raw)) return null;
	return raw as EventRefObject;
}

export function readEventTransition(raw: unknown, action: string): string {
	const normalizedAction = normalizeTransitionAction(action);
	const transition = readEventTransitionValue(raw);
	return normalizeTransitionRef(transition, normalizedAction);
}

export function readEventTransitionValue(raw: unknown): string | null {
	const payload = readEventRefObject(raw);
	if (typeof payload?.transition === "string" && payload.transition.trim().length) {
		return payload.transition.trim();
	}
	if (typeof payload?.ref === "string" && payload.ref.trim().length) {
		return payload.ref.trim();
	}
	if (typeof raw !== "string") return null;
	const trimmed = raw.trim();
	if (!trimmed || trimmed.startsWith("{")) return null;
	return trimmed;
}

export function writeEventTransition(raw: unknown, transition: string | null | undefined, action: string): EventRefObject {
	return writeEventRef(raw, { transition }, action);
}

export function parseEventMediaFromRef(raw: unknown): EventMediaParams | null {
	const payload = readEventRefObject(raw);
	if (!payload) return null;
	const media = payload.media;
	if (!media || typeof media !== "object" || Array.isArray(media)) return null;

	const action = (media as { action?: unknown }).action === "pause" ? "pause" : "play";
	const offset = Number((media as { offset?: unknown }).offset);
	const changeAt = Number((media as { changeAt?: unknown }).changeAt);

	return {
		action,
		offset: Number.isFinite(offset) && offset >= 0 ? Number(offset.toFixed(3)) : 0,
		changeAt: Number.isFinite(changeAt) && changeAt >= 0 ? Number(changeAt.toFixed(3)) : 0
	};
}

export function writeEventMedia(raw: unknown, media: EventMediaParams): EventRefObject {
	return writeEventRef(raw, { media });
}

export function writeEventRef(
	raw: unknown,
	patch: EventRefPatch,
	action?: string
): EventRefObject {
	const payload = toWritableRefObject(raw);

	if (typeof patch.transition !== "undefined") {
		const normalizedAction = normalizeTransitionAction(action || "intro");
		payload.transition = normalizeTransitionRef(patch.transition, normalizedAction);
		delete payload.ref;
	}

	if (typeof patch.media !== "undefined") {
		if (patch.media === null) {
			delete payload.media;
		} else {
			payload.media = {
				action: patch.media.action === "pause" ? "pause" : "play",
				offset:
					Number.isFinite(patch.media.offset) && patch.media.offset >= 0
						? Number(patch.media.offset.toFixed(3))
						: 0,
				changeAt:
					Number.isFinite(patch.media.changeAt) && patch.media.changeAt >= 0
						? Number(patch.media.changeAt.toFixed(3))
						: 0
			};
		}
	}

	return payload;
}

export function replaceEventRefPreservingMedia(currentRaw: unknown, nextRaw: unknown): EventRefJsonValue | null {
	const media = parseEventMediaFromRef(currentRaw);
	if (!media) return normalizeRawRef(nextRaw);
	return writeEventMedia(nextRaw, media);
}

export function normalizeEventRefForPersist(input: {
	raw: unknown;
	kind: EventRefKind;
	action: string;
	normalizeSustainRef?: (raw: unknown) => EventRefJsonValue | null;
}): EventRefJsonValue | null {
	if (input.kind === "custom") {
		return normalizeRawRef(input.raw);
	}

	if (input.kind === "sustain") {
		const media = parseEventMediaFromRef(input.raw);
		const base = input.normalizeSustainRef ? input.normalizeSustainRef(input.raw) : normalizeRawRef(input.raw);
		if (!media) return base;
		return writeEventMedia(base, media);
	}

	const media = parseEventMediaFromRef(input.raw);
	const transition = readEventTransition(input.raw, input.action);
	const withTransition = writeEventTransition(input.raw, transition, input.action);
	if (!media) return withTransition;
	return writeEventMedia(withTransition, media);
}

function normalizeRawRef(raw: unknown): EventRefJsonValue | null {
	if (typeof raw === "string") {
		const trimmed = raw.trim();
		return trimmed.length ? trimmed : null;
	}
	if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as EventRefObject;
	return null;
}

function toWritableRefObject(raw: unknown): EventRefObject {
	const payload = readEventRefObject(raw);
	if (payload) return { ...payload };
	const normalizedRaw = normalizeRawRef(raw);
	if (typeof normalizedRaw === "string") return { transition: normalizedRaw };
	if (normalizedRaw && typeof normalizedRaw === "object") return { ...(normalizedRaw as EventRefObject) };
	return {};
}
