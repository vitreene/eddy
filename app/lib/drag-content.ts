import type { Content } from "@/api/db";

export const CHUTIER_DRAG_MIME = "application/x-eddy-content";

export type ChutierDragPayload = {
	contentId: number;
	type: string;
	name: string;
};

export function toChutierDragPayload(content: Content): ChutierDragPayload {
	return {
		contentId: content.id,
		type: content.type,
		name: content.name || ""
	};
}

export function readChutierDragPayload(dataTransfer: DataTransfer): ChutierDragPayload | null {
	const raw = dataTransfer.getData(CHUTIER_DRAG_MIME);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<ChutierDragPayload>;
		if (!parsed || typeof parsed.contentId !== "number") return null;
		return {
			contentId: parsed.contentId,
			type: String(parsed.type || ""),
			name: String(parsed.name || "")
		};
	} catch {
		return null;
	}
}
