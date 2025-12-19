import type { Route } from "../+types/root";
import type { Decor } from "@prisma/client";
import { createDecor, updateDecor, getDecorByCapsuleId, prisma } from "./db";

export async function action({ request }: Route.ActionArgs) {
	const contentType = request.headers.get("content-type") || "";
	if (contentType.includes("application/json")) {
		const body = await request.json();
		const { capsuleId, decorId, ...decorData } = body as Partial<Decor> & { capsuleId?: number };

		// Si decorId est fourni, mettre à jour directement
		if (decorId) {
			await updateDecor({ id: Number(decorId), ...decorData });
			return { ok: true };
		}

		// Si capsuleId est fourni, chercher si la capsule a déjà un decor
		if (capsuleId) {
			const existingDecor = await getDecorByCapsuleId(Number(capsuleId));
			if (existingDecor) {
				// Mettre à jour le decor existant
				await updateDecor({ id: existingDecor.id, ...decorData });
				return { ok: true, decorId: existingDecor.id };
			} else {
				// Créer un nouveau decor pour la capsule
				const created = await createDecor({ ...decorData });
				// Lier le decor à la capsule
				await prisma.capsule.update({
					where: { id: Number(capsuleId) },
					data: { decorId: created.id }
				});
				return { ok: true, decorId: created.id };
			}
		}
	}

	return { ok: false };
}
