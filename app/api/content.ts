import type { Route } from "../+types/root";
import { addEventToContent, removeCustomEventFromContent, type TextTime, updateContent } from "./db";
import { deriveEventKind } from "@/config/custom-events";
import { parseEventMediaFromRef } from "@/config/event-media";

export function shouldPersistEventPayload(action: string, texttime: TextTime | null | undefined): boolean {
	if (!texttime) return false;
	const kind = deriveEventKind(action);
	if (kind !== "custom") return true;
	const hasName = typeof texttime?.name == "string" && texttime.name.trim().length > 0;
	const hasDelay = typeof (texttime as any)?.delay == "number";
	const hasMedia = Boolean(parseEventMediaFromRef(texttime.ref));
	return hasName || hasDelay || hasMedia;
}

export async function action({ request, params }: Route.ActionArgs) {
	const { id } = params;
	if (!id) return { ok: false };

	if (request.method.toUpperCase() === "DELETE") {
		const body = (await request.json()) as { eventId?: number };
		if (!body?.eventId || !Number.isFinite(body.eventId)) {
			return Response.json({ ok: false, message: "eventId is required" }, { status: 400 });
		}

		try {
			const deleted = await removeCustomEventFromContent(Number(body.eventId));
			return Response.json({ ok: true, deleted });
		} catch (error) {
			return Response.json(
				{ ok: false, message: error instanceof Error ? error.message : "Deletion failed" },
				{ status: 400 }
			);
		}
	}

	const body = await request.json();

	if (body && typeof body === "object" && "inner" in body) {
		const inner = body.inner;
		if (typeof inner !== "string") {
			return Response.json({ ok: false, message: "inner must be a string" }, { status: 400 });
		}

		const content = await updateContent(Number(id), { inner });
		return { ok: true, id, content };
	}

	const data: {
		[x: string]: TextTime;
	} = body;

	const events = await Promise.all(
		Object.entries(data)
			.filter(([action, texttime]) => shouldPersistEventPayload(action, texttime))
			.map(([action, texttime]) =>
				addEventToContent({
					action,
					id: texttime.id,
					name: texttime.name,
					ref: texttime.ref,
					duration: (texttime as any).duration,
					delay: (texttime as any).delay,
					position: (texttime as any).position,
					itemId: Number(id)
				})
			)
	);
	return { ok: true, id, events };
}
