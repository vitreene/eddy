import { getCapsuleTypeConfig } from "@/config/capsule-types";

import type { SceneComp } from "@/api/db";
import type { ResolveCueWindowsCapsuleBehavior } from "./resolve-cue-windows";

export function buildCapsuleBehaviorById(
	snapshot: SceneComp
): Record<number, ResolveCueWindowsCapsuleBehavior> {
	const behaviorByCapsuleId: Record<number, ResolveCueWindowsCapsuleBehavior> = {};

	for (const capsule of Object.values(snapshot.capsules || {})) {
		const config = getCapsuleTypeConfig(capsule.type);
		const fixedSeconds =
			typeof (capsule as any).itemDurationSec == "number" && Number.isFinite((capsule as any).itemDurationSec)
				? Math.max(0.1, Number((capsule as any).itemDurationSec))
				: config.runtime.time.defaultFixedSeconds;
		const timeMode = (capsule as any).itemDurationMode === "fixed" ? "fixed" : config.runtime.time.mode;

		behaviorByCapsuleId[capsule.id] = {
			timeMode,
			fixedSeconds,
			generateDefaultOutro: config.runtime.transitions.defaultOutroRef !== null
		};
	}

	return behaviorByCapsuleId;
}
