import type { Route } from "../+types/root";

import { createDecor, updateDecor, getDecorByItemId, updateitem, type Decor } from "./db";

export async function action({ request }: Route.ActionArgs) {
	const contentType = request.headers.get("content-type") || "";
	if (contentType.includes("application/json")) {
		const body = await request.json();
		const { itemId, decorId, ...decorData } = body as Partial<Decor> & {
			decorId?: number;
			itemId?: number;
		};

		// Si decorId est fourni, mettre à jour directement
		if (decorId) {
			await updateDecor({ id: Number(decorId), ...decorData });
			return { ok: true };
		}

		if (itemId) {
			const existingDecor = await getDecorByItemId(Number(itemId));
			if (existingDecor) {
				// Mettre à jour le decor existant
				await updateDecor({ id: existingDecor.id, ...decorData });
				return { ok: true, decorId: existingDecor.id };
			} else {
				// Créer un nouveau decor pour la capsule
				const created = await createDecor(decorData);
				// Lier le decor à la capsule
				await updateitem({ id: Number(itemId), decorId: created.id });

				return { ok: true, decorId: created.id };
			}
		}
	}

	return { ok: false };
}
