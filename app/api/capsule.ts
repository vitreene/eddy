import type { Capsule } from "@prisma/client";
import type { Route } from "../+types/root";
import { getCapsule, reorderCapsule, updateCapsule } from "./db";

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
	const data: Partial<Capsule> = Object.fromEntries(formData);
	data.id = Number(params.id);
	updateCapsule(data);
	return { ok: true };
}
//
