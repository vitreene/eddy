import type { Route } from "../+types/root";
import { addEventToMedia, type TextTime } from "./db";

export async function action({ request, params }: Route.ActionArgs) {
	const { id } = params;
	if (!id) return { ok: false };
	const data: {
		[x: string]: TextTime;
	} = await request.json();
	console.log("EVENT MEDIA", id, data);

	const events = await Promise.all(
		Object.entries(data).map(([action, texttime]) =>
			addEventToMedia({
				action,
				id: texttime.id,
				name: texttime.name,
				ref: texttime.ref!,
				elementId: Number(id)
			})
		)
	);
	return { ok: true, id, events };
}
