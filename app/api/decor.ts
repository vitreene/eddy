import type { Route } from "../+types/root";
import type { Decor } from "@prisma/client";
import {
	createDecor,
	updateDecor,
	getDecorByCapsuleId,
	updateCapsule,
	getDecorByElementId,
	updateElement
} from "./db";

export async function action({ request }: Route.ActionArgs) {
	const contentType = request.headers.get("content-type") || "";
	if (contentType.includes("application/json")) {
		const body = await request.json();
		const { elementId, capsuleId, decorId, style, ...decorData } = body as Partial<Decor> & {
			capsuleId?: number;
			elementId?: number;
		};

		// Si decorId est fourni, mettre à jour directement
		if (decorId) {
			await updateDecor({ id: Number(decorId), style: JSON.stringify(style), ...decorData });
			return { ok: true };
		}

		// Si capsuleId est fourni, chercher si la capsule a déjà un decor
		if (capsuleId) {
			const existingDecor = await getDecorByCapsuleId(Number(capsuleId));
			if (existingDecor) {
				// Mettre à jour le decor existant
				await updateDecor({ id: existingDecor.id, style: JSON.stringify(style), ...decorData });
				return { ok: true, decorId: existingDecor.id };
			} else {
				// Créer un nouveau decor pour la capsule
				const created = await createDecor({ style: JSON.stringify(style), ...decorData });
				// Lier le decor à la capsule
				await updateCapsule({ id: Number(capsuleId), decorId: created.id });

				return { ok: true, decorId: created.id };
			}
		}
		// Si elementId est fourni, chercher si le capsuleElement a déjà un decor
		if (elementId) {
			const existingDecor = await getDecorByElementId(Number(elementId));
			if (existingDecor) {
				// Mettre à jour le decor existant
				await updateDecor({ id: existingDecor.id, style: JSON.stringify(style), ...decorData });
				return { ok: true, decorId: existingDecor.id };
			} else {
				// Créer un nouveau decor pour la capsule
				const created = await createDecor({ style: JSON.stringify(style), ...decorData });
				// Lier le decor à la capsule
				await updateElement({ id: Number(elementId), decorId: created.id });

				return { ok: true, decorId: created.id };
			}
		}
	}

	return { ok: false };
}
