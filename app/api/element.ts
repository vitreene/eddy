import type { CapsuleElement } from "@prisma/client";
import type { Route } from "../+types/root";
import { updateElement } from "./db";

export async function action({ params, request }: Route.ActionArgs) {
	const formData = await request.formData();
	const data: Partial<CapsuleElement> = Object.fromEntries(formData);
	data.id = Number(params.id);
	updateElement(data);
	return { ok: true };
}
//
