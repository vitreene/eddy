import type { CapsuleComp, SceneComp } from "@/api/db";
import {
	getCapsuleTypeConfig,
	parseCardTemplateAreas,
	shouldCapsuleUseExplicitArea
} from "@/config/capsule-types";
import {
	classNameToCssDefinition,
	getValuesFromGridName,
	gridClassNameToCssDefinition,
	gridPlacementClassNameToCssDefinition
} from "@/lib/utils";
import { normalizePositionZones, toRuntimePositionZones } from "@/lib/position-zones";
import { ROOT } from "@/scene-runtime/constants";

type PlacementResult = {
	areas: string[];
	itemPlacementClassByItemId: Record<number, string>;
	gridDefinitions: string[];
};

/**
 * Contract placeholder for future `card` visual editor:
 * this parser will later read named grid-areas from capsule config.
 */
export function readCardAreasContract(_capsule: CapsuleComp): string[] {
	return parseCardTemplateAreas(_capsule.grid);
}

/**
 * Build placement CSS and per-item auto area classes for the scene snapshot.
 */
export function buildPlacementCss(snapshot: SceneComp): PlacementResult {
	const areas = new Set<string>();
	const itemPlacementClassByItemId: Record<number, string> = {};
	const zoneDefinitionsByClass = buildZoneDefinitionsByClass(snapshot);

	for (const item of Object.values(snapshot.items || {})) {
		const decor = snapshot.decors[item.decorId];
		const capsule = snapshot.capsules[item.capsuleId];
		if (!capsule) continue;
		const capsuleType = getCapsuleTypeConfig(capsule.type).type;
		collectPlacementClassDefinitions(areas, decor?.className, zoneDefinitionsByClass);
		if (hasGridPlacementClass(decor?.className, zoneDefinitionsByClass)) {
			continue;
		}

		if (decor?.area && shouldCapsuleUseExplicitArea(capsuleType)) {
			areas.add(classNameToCssDefinition(decor.area));
			continue;
		}

		const siblingItems = Object.values(snapshot.items)
			.filter((it) => it.capsuleId == item.capsuleId)
			.toSorted((a, b) => (a.order > b.order ? 1 : -1));

		const itemIndex = siblingItems.findIndex((it) => it.id == item.id) + 1;
		if (itemIndex <= 0) continue;

		const { areaClassName, areaDefinition } = getAutoLayoutAreaForItem(capsule, itemIndex);
		if (areaDefinition) areas.add(areaDefinition);
		itemPlacementClassByItemId[item.id] = areaClassName;
	}

	for (const [itemIdRaw, eventsByAction] of Object.entries(snapshot.events || {})) {
		const itemId = Number(itemIdRaw);
		const item = snapshot.items[itemId];
		if (!item) continue;
		const capsule = snapshot.capsules[item.capsuleId];
		if (!capsule) continue;
		const capsuleType = getCapsuleTypeConfig(capsule.type).type;
		if (!shouldCapsuleUseExplicitArea(capsuleType)) continue;

		for (const event of Object.values(eventsByAction || {})) {
			if (!event?.decorId) continue;
			const eventDecor = snapshot.decors[event.decorId];
			collectPlacementClassDefinitions(areas, eventDecor?.className, zoneDefinitionsByClass);
			if (!eventDecor?.area) continue;
			areas.add(classNameToCssDefinition(eventDecor.area));
		}
	}

	const gridDefinitions = buildGridDefinitions(snapshot);

	return {
		areas: [...areas],
		itemPlacementClassByItemId,
		gridDefinitions
	};
}

function collectPlacementClassDefinitions(
	target: Set<string>,
	className: string | null | undefined,
	zoneDefinitionsByClass: Record<string, string>
) {
	if (!className) return;
	const tokens = className
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	for (const token of tokens) {
		if (zoneDefinitionsByClass[token]) {
			target.add(zoneDefinitionsByClass[token]);
			continue;
		}
		const definition = gridPlacementClassNameToCssDefinition(token);
		if (definition) target.add(definition);
	}
}

function hasGridPlacementClass(
	className: string | null | undefined,
	zoneDefinitionsByClass: Record<string, string>
): boolean {
	if (!className) return false;
	const tokens = className
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	for (const token of tokens) {
		if (zoneDefinitionsByClass[token]) return true;
		if (gridPlacementClassNameToCssDefinition(token)) return true;
	}
	return false;
}

function buildZoneDefinitionsByClass(snapshot: SceneComp): Record<string, string> {
	const byClass: Record<string, string> = {};
	for (const capsule of Object.values(snapshot.capsules || {})) {
		for (const zone of toRuntimePositionZones(
			normalizePositionZones((capsule as CapsuleComp & { cardZones?: unknown }).cardZones)
		)) {
			byClass[zone.className] = zone.cssRule;
		}
	}
	return byClass;
}

/**
 * Build unique grid class definitions required by visible capsules.
 */
function buildGridDefinitions(snapshot: SceneComp): string[] {
	const definitions = new Set<string>();

	for (const capsule of Object.values(snapshot.capsules || {})) {
		if (!capsule?.grid) continue;
		const classNames = capsule.grid
			.trim()
			.split(/\s+/)
			.map((token) => token.replace(/^\./, "").trim())
			.filter(Boolean);

		const type = getCapsuleTypeConfig(capsule.type).type;
		for (const className of classNames) {
			if (className === ROOT) {
				definitions.add(`.${className}{display:grid}`);
				continue;
			}

			const definition = gridClassNameToCssDefinition(className);
			if (definition) definitions.add(definition);
		}
	}

	return [...definitions];
}

/**
 * Compute auto-layout area class and optional css definition for one item slot.
 */
function getAutoLayoutAreaForItem(
	capsule: CapsuleComp,
	itemIndex: number
): { areaClassName: string; areaDefinition: string } {
	const typeConfig = getCapsuleTypeConfig(capsule.type);
	const grid = getValuesFromGridName(capsule.grid);

	let prefix = "cell_layout_auto";
	if (typeConfig.type !== "legacy") {
		prefix = `cell_layout_auto_${typeConfig.type}`;
	}

	const { r, c } = getCoordinatesByCapsuleType(capsule, itemIndex, grid);
	const areaClassName = typeConfig.type === "liste" ? `liste-r${r}` : `${prefix}-r${r}-c${c}`;

	if (typeConfig.type === "card") {
		const contractAreas = readCardAreasContract(capsule);
		if (contractAreas.length > 0) {
			// Future behavior: bind index -> named area from contract.
		}
	}

	return {
		areaClassName,
		areaDefinition: typeConfig.type === "liste" ? "" : classNameToCssDefinition(areaClassName, { prefix })
	};
}

/**
 * Compute row/column coordinates according to capsule type rules.
 */
function getCoordinatesByCapsuleType(
	capsule: CapsuleComp,
	itemIndex: number,
	grid: { w: number; h: number }
): { r: number; c: number } {
	const type = getCapsuleTypeConfig(capsule.type).type;

	if (type === "carrousel") {
		return { r: 1, c: 1 };
	}

	if (type === "rangee") {
		const cells = Math.max(grid.w, grid.h, 1);
		const index0 = (((itemIndex - 1) % cells) + cells) % cells;
		const orientation = grid.h === 1 ? "horizontal" : "vertical";
		return orientation === "horizontal" ? { r: 1, c: index0 + 1 } : { r: index0 + 1, c: 1 };
	}

	if (type === "liste") {
		// Classe informative seulement (aucune definition CSS associee pour l'instant).
		return { r: itemIndex, c: 1 };
	}

	if (type === "grille" || type === "position") {
		const cols = Math.max(grid.w, 1);
		const rows = Math.max(grid.h, 1);
		const total = cols * rows;
		const index0 = (((itemIndex - 1) % total) + total) % total;
		const r = Math.floor(index0 / cols) + 1;
		const c = (index0 % cols) + 1;
		return { r, c };
	}

	// Legacy/card keep previous formula until dedicated card area editor lands.
	return computeLegacyCompatibleGridCoordinates(itemIndex, grid.w, grid.h);
}

/**
 * Preserve legacy grid coordinate formula for backward compatibility.
 */
function computeLegacyCompatibleGridCoordinates(
	index: number,
	w: number,
	h: number
): { r: number; c: number } {
	// Important compatibility variable:
	// this formula intentionally mirrors current builder behavior, even if unconventional,
	// to avoid changing existing scene layouts during the refactor.
	const r = w == 1 ? 1 : index % w || w;
	const c = h == 1 ? 1 : Math.round(index / w) + 1;
	return { r, c };
}
