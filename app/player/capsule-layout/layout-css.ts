import type { CapsuleComp, SceneComp } from "@/api/db";
import {
	getCapsuleTypeConfig,
	parseCardTemplateAreas,
	shouldCapsuleUseExplicitArea
} from "@/config/capsule-types";
import { classNameToCssDefinition, getValuesFromGridName, gridClassNameToCssDefinition } from "@/lib/utils";

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

export function buildPlacementCss(snapshot: SceneComp): PlacementResult {
	const areas = new Set<string>();
	const itemPlacementClassByItemId: Record<number, string> = {};

	for (const item of Object.values(snapshot.items || {})) {
		const decor = snapshot.decors[item.decorId];
		const capsule = snapshot.capsules[item.capsuleId];
		if (!capsule) continue;
		const capsuleType = getCapsuleTypeConfig(capsule.type).type;

		if (decor?.area && shouldCapsuleUseExplicitArea(capsuleType)) {
			areas.add(classNameToCssDefinition(decor.area));
			continue;
		}

		const siblingItems = Object.values(snapshot.items)
			.filter((it) => it.capsuleId == item.capsuleId)
			.toSorted((a, b) => (a.order > b.order ? 1 : -1));

		const itemIndex = siblingItems.findIndex((it) => it.id == item.id) + 1;
		if (itemIndex <= 0) continue;

		const { areaClassName, areaDefinition } = getAutoAreaForItem(capsule, itemIndex);
		areas.add(areaDefinition);
		itemPlacementClassByItemId[item.id] = areaClassName;
	}

	const gridDefinitions = buildGridDefinitions(snapshot);

	return {
		areas: [...areas],
		itemPlacementClassByItemId,
		gridDefinitions
	};
}

function buildGridDefinitions(snapshot: SceneComp): string[] {
	const uniqueClassNames = new Set<string>();

	for (const capsule of Object.values(snapshot.capsules || {})) {
		if (!capsule?.grid) continue;
		const className = capsule.grid.trim().split(/\s+/)[0]?.replace(/^\./, "");
		if (!className) continue;
		uniqueClassNames.add(className);
	}

	return [...uniqueClassNames].flatMap((className) => {
		const definition = gridClassNameToCssDefinition(className);
		return definition ? [definition] : [];
	});
}

function getAutoAreaForItem(
	capsule: CapsuleComp,
	itemIndex: number
): { areaClassName: string; areaDefinition: string } {
	const typeConfig = getCapsuleTypeConfig(capsule.type);
	const grid = getValuesFromGridName(capsule.grid);

	let prefix = "cell_auto";
	if (typeConfig.type !== "legacy") {
		prefix = `cell_auto_${typeConfig.type}`;
	}

	const { r, c } = getCoordinatesByCapsuleType(capsule, itemIndex, grid);
	const areaClassName = `${prefix}-r${r}-c${c}`;

	if (typeConfig.type === "card") {
		const contractAreas = readCardAreasContract(capsule);
		if (contractAreas.length > 0) {
			// Future behavior: bind index -> named area from contract.
		}
	}

	return {
		areaClassName,
		areaDefinition: classNameToCssDefinition(areaClassName, { prefix })
	};
}

function getCoordinatesByCapsuleType(
	capsule: CapsuleComp,
	itemIndex: number,
	grid: { w: number; h: number }
): { r: number; c: number } {
	const type = getCapsuleTypeConfig(capsule.type).type;

	if (type === "carrousel") {
		return { r: 1, c: 1 };
	}

	if (type === "ligne") {
		const cells = Math.max(grid.w, grid.h, 1);
		const index0 = (((itemIndex - 1) % cells) + cells) % cells;
		const orientation = grid.h === 1 ? "horizontal" : "vertical";
		return orientation === "horizontal" ? { r: 1, c: index0 + 1 } : { r: index0 + 1, c: 1 };
	}

	if (type === "grille") {
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
