import type { Route } from "../+types/root";

import { stripDefaultStyleValues } from "@/config/item-style-defaults";
import { shouldCapsuleUseExplicitArea } from "@/config/capsule-types";
import {
	createDecor,
	updateDecor,
	getDecorByItemId,
	getItemCapsuleType,
	getItemContentType,
	updateItem,
	type Decor
} from "./db";

const COMPONENT_TRANSFORM_DEBUG_KEYS = new Set([
	"x",
	"y",
	"width",
	"height",
	"rotate",
	"originX",
	"originY",
	"scaleX",
	"scaleY"
]);

// Temporary debug switch mirrored server-side (safety net).
// Remove this block when transform persistence is re-enabled.
const DEBUG_SKIP_COMPONENT_TRANSFORM_PERSIST = true;

export async function action({ request }: Route.ActionArgs) {
	const contentType = request.headers.get("content-type") || "";
	if (contentType.includes("application/json")) {
		const body = await request.json();
		const { itemId, decorId, ...decorData } = body as Partial<Decor> & {
			decorId?: number;
			itemId?: number;
		};
		const contentType = itemId ? await getItemContentType(Number(itemId)) : null;
		const capsuleType = itemId ? await getItemCapsuleType(Number(itemId)) : null;
		const normalizedDecorData = normalizeDecorPayload(decorData, contentType, capsuleType);

		// Si decorId est fourni, mettre à jour directement
		if (decorId) {
			await updateDecor({ id: Number(decorId), ...normalizedDecorData });
			return { ok: true };
		}

		if (itemId) {
			const existingDecor = await getDecorByItemId(Number(itemId));
			if (existingDecor) {
				// Mettre à jour le decor existant
				await updateDecor({ id: existingDecor.id, ...normalizedDecorData });
				return { ok: true, decorId: existingDecor.id };
			} else {
				// Créer un nouveau decor pour la capsule
				const created = await createDecor(normalizedDecorData);
				// Lier le decor à la capsule
				await updateItem({ id: Number(itemId), decorId: created.id });

				return { ok: true, decorId: created.id };
			}
		}
	}

	return { ok: false };
}

function normalizeDecorPayload(
	decorData: Partial<Decor>,
	contentType: string | null,
	capsuleType: string | null
): Partial<Decor> {
	const rawStyle = (decorData.style as Record<string, unknown>) ?? {};
	const styleWithoutDebug = Object.fromEntries(
		Object.entries(rawStyle).filter(
			([key]) =>
				key !== "outline" && (!DEBUG_SKIP_COMPONENT_TRANSFORM_PERSIST || !COMPONENT_TRANSFORM_DEBUG_KEYS.has(key))
		)
	);

	return {
		...decorData,
		area: shouldCapsuleUseExplicitArea(capsuleType) ? (decorData.area ?? null) : null,
		style: stripDefaultStyleValues(styleWithoutDebug, contentType ?? undefined)
	};
}
