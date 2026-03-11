import { applyVisibilityRules } from "@/scene-runtime/visibility/apply-visibility-rules";
import { buildPlacementCss } from "@/scene-runtime/capsule-layout/layout-css";

import type { SceneComp } from "@/api/db";
import type { PlayerProps } from "..";
import { applyCapsuleDefaultItemEvents } from "./derivation";
import { mapEvents } from "./events";
import { createRenderablesInDisplayOrder } from "./renderables";
import { createStyle } from "./styles";

/**
 * Build a complete player scene snapshot (events, styles, renderables).
 */
export function buildScene(snapshot: SceneComp): PlayerProps & { styles?: string } {
	const visibilityFilteredSnapshot = applyVisibilityRules(snapshot);
	const derivedSnapshot = applyCapsuleDefaultItemEvents(visibilityFilteredSnapshot);
	const events = mapEvents(derivedSnapshot);
	const { areas, itemPlacementClassByItemId, gridDefinitions } = buildPlacementCss(derivedSnapshot);
	const styles = createStyle(derivedSnapshot, areas, gridDefinitions);
	const persos = createRenderablesInDisplayOrder(derivedSnapshot, itemPlacementClassByItemId);

	return { persos, events, styles };
}
