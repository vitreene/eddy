import type { Route } from "../+types/root";
import { addEventToContent, type TextTime } from "./db";

export async function action({ request, params }: Route.ActionArgs) {
	const { id } = params;
	if (!id) return { ok: false };
	const data: {
		[x: string]: TextTime;
	} = await request.json();
	console.log("EVENT CONTENT", id, data);

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
