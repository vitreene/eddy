import type { Item } from "prisma/generated/prisma/client";
import type { Route } from "../+types/root";
import { updateItem } from "./db";

export async function action({ params, request }: Route.ActionArgs) {
	const formData = await request.formData();
	const data: Partial<Item> = Object.fromEntries(formData);
	data.id = Number(params.id);
	if (formData.has("order")) data.order = Number(data.order);
	if (formData.has("contentId")) data.contentId = Number(data.contentId);
	if (formData.has("capsuleId")) data.capsuleId = Number(data.capsuleId);
	if (formData.has("visible")) {
		const raw = String(formData.get("visible") ?? "")
			.trim()
			.toLowerCase();
		data.visible = raw == "true" || raw == "1" || raw == "on";
	}

	await updateItem(data);
	return { ok: true };
}
//
