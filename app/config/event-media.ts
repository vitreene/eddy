export type EventMediaParams = {
	action: "play" | "pause";
	offset: number;
	changeAt: number;
};

export function parseEventMediaFromRef(ref: string | null | undefined): EventMediaParams | null {
	const parsed = parseRefObject(ref);
	if (!parsed) return null;
	const media = parsed.media;
	if (!media || typeof media !== "object") return null;

	const action = (media as { action?: unknown }).action === "pause" ? "pause" : "play";
	const offset = Number((media as { offset?: unknown }).offset);
	const changeAt = Number((media as { changeAt?: unknown }).changeAt);
	return {
		action,
		offset: Number.isFinite(offset) && offset >= 0 ? Number(offset.toFixed(3)) : 0,
		changeAt: Number.isFinite(changeAt) && changeAt >= 0 ? Number(changeAt.toFixed(3)) : 0
	};
}

export function upsertEventMediaInRef(ref: string | null | undefined, media: EventMediaParams): string {
	const base = parseRefObject(ref) || deriveBaseRefObject(ref);
	return JSON.stringify({
		...base,
		media: {
			action: media.action === "pause" ? "pause" : "play",
			offset: Number.isFinite(media.offset) && media.offset >= 0 ? Number(media.offset.toFixed(3)) : 0,
			changeAt: Number.isFinite(media.changeAt) && media.changeAt >= 0 ? Number(media.changeAt.toFixed(3)) : 0
		}
	});
}

export function replaceEventRefPreservingMedia(
	currentRef: string | null | undefined,
	nextRef: string | null | undefined
): string | null {
	const media = parseEventMediaFromRef(currentRef);
	if (!media) {
		if (typeof nextRef !== "string") return null;
		const trimmed = nextRef.trim();
		return trimmed.length ? trimmed : null;
	}
	return upsertEventMediaInRef(nextRef, media);
}

function parseRefObject(ref: string | null | undefined): Record<string, unknown> | null {
	if (typeof ref !== "string") return null;
	const raw = ref.trim();
	if (!raw || !raw.startsWith("{")) return null;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}

function deriveBaseRefObject(ref: string | null | undefined): Record<string, unknown> {
	if (typeof ref !== "string") return {};
	const trimmed = ref.trim();
	if (!trimmed) return {};
	return { ref: trimmed };
}
