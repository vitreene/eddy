import { clearCapsuleItemAreas, getCapsule, reorderCapsule, updateCapsule } from "./db";

import type { Route } from "../+types/root";
import type { Capsule } from "prisma/generated/prisma/client";
import { normalizeTransitionRef } from "@/config/transitions";
import { normalizeSustainEffectRef } from "@/config/event-effects";
import {
	CAPSULE_TYPES,
	isCapsuleKnownType,
	resolveCapsuleType,
	shouldCapsuleUseExplicitArea
} from "@/config/capsule-types";

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
	const capsuleId = Number(params.id);
	const existingCapsule = await getCapsule(capsuleId);
	if (!existingCapsule) {
		return Response.json({ ok: false, message: "Capsule not found" }, { status: 404 });
	}

	const formData = await request.formData();
	const rawData = Object.fromEntries(formData) as Record<string, FormDataEntryValue>;

	const currentProfil = parseCapsuleProfil(existingCapsule.profil);
	const nextProfil = { ...currentProfil };

	if (formData.has("defaultItemIntroTransition")) {
		const introTransition = parseCapsuleTransitionField(rawData.defaultItemIntroTransition, "intro");
		if (introTransition.ok === false) {
			return Response.json({ ok: false, message: introTransition.message }, { status: 400 });
		}
		nextProfil.defaultItemIntroTransition = introTransition.value;
	}

	if (formData.has("defaultItemOutroTransition")) {
		const outroTransition = parseCapsuleTransitionField(rawData.defaultItemOutroTransition, "outro");
		if (outroTransition.ok === false) {
			return Response.json({ ok: false, message: outroTransition.message }, { status: 400 });
		}
		nextProfil.defaultItemOutroTransition = outroTransition.value;
	}

	if (formData.has("defaultItemSustainTransition")) {
		const sustainTransition = parseCapsuleSustainField(rawData.defaultItemSustainTransition);
		if (sustainTransition.ok === false) {
			return Response.json({ ok: false, message: sustainTransition.message }, { status: 400 });
		}
		nextProfil.defaultItemSustainTransition = sustainTransition.value;
	}

	if (formData.has("defaultItemSustainAlternate")) {
		nextProfil.defaultItemSustainAlternate = parseCapsuleSustainAlternateField(
			rawData.defaultItemSustainAlternate
		);
	}

	if (formData.has("itemDurationMode") && typeof rawData.itemDurationMode == "string") {
		nextProfil.itemDurationMode = rawData.itemDurationMode === "fixed" ? "fixed" : "auto";
	}

	if (formData.has("itemDurationSec") && typeof rawData.itemDurationSec == "string") {
		nextProfil.itemDurationSec = normalizeDurationValue(rawData.itemDurationSec);
	}

	const data: Partial<Omit<Capsule, "id" | "itemsId">> = {
		...(typeof rawData.name == "string" ? { name: rawData.name } : {}),
		...(typeof rawData.type == "string" ? { type: normalizeCapsuleTypeField(rawData.type) } : {}),
		...(typeof rawData.grid == "string" ? { grid: rawData.grid || null } : {}),
		profil: JSON.stringify(nextProfil)
	};

	await updateCapsule(capsuleId, data as any);

	if (typeof data.type == "string" || data.type === null) {
		if (!shouldCapsuleUseExplicitArea(data.type ?? null)) {
			await clearCapsuleItemAreas(capsuleId);
		}
	}

	return { ok: true };
}

function normalizeCapsuleTypeField(raw: string): string | null {
	const value = raw.trim();
	if (!value) return null;
	if (isCapsuleKnownType(value)) return value;
	const resolved = resolveCapsuleType(value);
	return resolved === CAPSULE_TYPES.LEGACY ? null : resolved;
}

function normalizeDurationValue(raw: string): number | null {
	const value = Number(raw);
	if (!Number.isFinite(value) || value <= 0) return null;
	return value;
}

function parseCapsuleProfil(raw: string | null | undefined): {
	itemDurationMode?: "auto" | "fixed";
	itemDurationSec?: number | null;
	defaultItemIntroTransition?: string | null;
	defaultItemSustainTransition?: string | null;
	defaultItemSustainAlternate?: boolean;
	defaultItemOutroTransition?: string | null;
} {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed != "object") return {};
		return parsed;
	} catch {
		return {};
	}
}

function parseCapsuleSustainAlternateField(value: FormDataEntryValue | undefined): boolean {
	if (typeof value != "string") return false;
	const normalized = value.trim().toLowerCase();
	if (!normalized) return false;
	return normalized === "true" || normalized === "1" || normalized === "on";
}

function parseCapsuleSustainField(value: FormDataEntryValue | undefined):
	| { ok: true; value: string | null }
	| {
			ok: false;
			message: string;
	  } {
	if (typeof value != "string") return { ok: true, value: null };
	const raw = value.trim();
	if (!raw) return { ok: true, value: null };

	const normalized = normalizeSustainEffectRef(raw);
	if (!normalized) {
		return {
			ok: false,
			message: 'Sustain capsule invalide: format attendu {"name":"zoom","in":n,"out":n}'
		};
	}

	return { ok: true, value: normalized };
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
		return { ok: true, value: JSON.stringify({ action, ref: normalizeTransitionRef(raw, action) }) };
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
			value: JSON.stringify({
				action: normalizedAction,
				ref: normalizeTransitionRef(parsed.ref.trim(), normalizedAction)
			})
		};
	} catch {
		return {
			ok: false,
			message: `Transition capsule invalide (${action}): format JSON invalide`
		};
	}
}
