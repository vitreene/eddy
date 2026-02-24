import type { Route } from "../+types/root";
import { addEventToContent, type TextTime, updateContent } from "./db";

export async function action({ request, params }: Route.ActionArgs) {
	const { id } = params;
	if (!id) return { ok: false };
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
		Object.entries(data).map(([action, texttime]) =>
			addEventToContent({
				action,
				id: texttime.id,
				name: texttime.name,
				ref: texttime.ref!,
				itemId: Number(id)
			})
		)
	);
	return { ok: true, id, events };
}
