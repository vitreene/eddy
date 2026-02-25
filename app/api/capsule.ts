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
	const rawData = Object.fromEntries(formData) as Record<string, FormDataEntryValue>;

	const introTransition = parseCapsuleTransitionField(rawData.defaultItemIntroTransition, "intro");
	if (introTransition.ok === false) {
		return Response.json({ ok: false, message: introTransition.message }, { status: 400 });
	}

	const outroTransition = parseCapsuleTransitionField(rawData.defaultItemOutroTransition, "outro");
	if (outroTransition.ok === false) {
		return Response.json({ ok: false, message: outroTransition.message }, { status: 400 });
	}

	const data: Partial<Omit<Capsule, "id" | "itemsId">> & {
		defaultItemIntroTransition?: string | null;
		defaultItemOutroTransition?: string | null;
	} = {
		...(typeof rawData.name == "string" ? { name: rawData.name } : {}),
		...(typeof rawData.type == "string" ? { type: rawData.type || null } : {}),
		...(typeof rawData.grid == "string" ? { grid: rawData.grid || null } : {}),
		defaultItemIntroTransition: introTransition.value,
		defaultItemOutroTransition: outroTransition.value
	};

	await updateCapsule(Number(params.id), data as any);
	return { ok: true };
}
//

function parseCapsuleTransitionField(
	value: FormDataEntryValue | undefined,
	action: "intro" | "outro"
):
	| { ok: true; value: string | null }
	| {
			ok: false;
			message: string;
	  } {
	// Accepts:
	// - plain ref string (converted to { action, ref })
	// - JSON payload already shaped as { action?, ref }
	if (typeof value != "string") return { ok: true, value: null };
	const raw = value.trim();
	if (!raw) return { ok: true, value: null };

	if (!raw.startsWith("{")) {
		return { ok: true, value: JSON.stringify({ action, ref: raw }) };
	}

	try {
		const parsed = JSON.parse(raw) as { action?: unknown; ref?: unknown };
		if (typeof parsed != "object" || !parsed || typeof parsed.ref != "string" || !parsed.ref.trim()) {
			return {
				ok: false,
				message: `Transition capsule invalide (${action}): "ref" est obligatoire`
			};
		}

		const normalizedAction =
			typeof parsed.action == "string" && parsed.action.trim() ? parsed.action.trim() : action;

		return {
			ok: true,
			value: JSON.stringify({ action: normalizedAction, ref: parsed.ref.trim() })
		};
	} catch {
		return {
			ok: false,
			message: `Transition capsule invalide (${action}): format JSON invalide`
		};
	}
}
