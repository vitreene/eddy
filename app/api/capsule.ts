import { getCapsule, reorderCapsule, updateCapsule } from "./db";

import type { Route } from "../+types/root";
import type { Capsule } from "prisma/generated/prisma/client";

export async function loader({ params }: Route.LoaderArgs) {
	const { "*": splat, id } = params;
	if (splat == "reorder") {
		console.log("SPLAT", splat);
		return await reorderCapsule(Number(id));
	}
	const capsule = await getCapsule(Number(params.id));
	return capsule;
}

export async function action({ params, request }: Route.ActionArgs) {
	const formData = await request.formData();
	const data: Partial<Omit<Capsule, "id" | "itemsId">> = Object.fromEntries(formData);
	updateCapsule(Number(params.id), data);
	return { ok: true };
}
//
