import type { Route } from "../+types/root";
import { updateTheme } from "./db";

export async function action({ request, params }: Route.ActionArgs) {
	const { id } = params;
	if (!id) return { ok: false };
	const json = await request.json();
	const { id: _, ...data } = json;
	console.log("UPDATE THEME", id, data);

	updateTheme(Number(id), data);
	return { ok: true };
}
