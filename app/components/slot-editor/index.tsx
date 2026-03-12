import { GridAreaRadioSelector } from "./grid-area-selector";
import { SceneLogicContext } from "@/provider/scene-logic";
import { getValuesFromGridName } from "@/lib/utils";
import type { EditableStyle } from "@/components/style-editor/types";
import { HEAVY_GRID_CELL_THRESHOLD } from "@/config/capsule-presets";
import {
	CAPSULE_TYPES,
	parseCardTemplateAreas,
	resolveCapsuleType,
	shouldCapsuleUseExplicitArea
} from "@/config/capsule-types";

interface Props {
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

export function SlotEditor({ value, onChange }: Props) {
	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);

	const capsule = SceneLogicContext.useSelector((state) =>
		item ? state.context.capsules[item.capsuleId] : undefined
	);

	if (!item || !capsule?.grid) return null;
	if (resolveCapsuleType(capsule.type) === CAPSULE_TYPES.CARROUSEL) return null;
	if (!shouldCapsuleUseExplicitArea(capsule.type)) return null;

	const setArea = (area: string) => {
		onChange({ area });
	};

	const capsuleType = resolveCapsuleType(capsule.type);
	if (capsuleType === CAPSULE_TYPES.CARD) {
		const templateAreas = parseCardTemplateAreas(capsule.grid);
		if (!templateAreas.length) return null;
		return <GridAreaRadioSelector templateAreas={templateAreas} value={value.area} onChange={setArea} />;
	}

	const { w, h } = getValuesFromGridName(capsule.grid);
	if (Math.max(1, w) * Math.max(1, h) > HEAVY_GRID_CELL_THRESHOLD) return null;

	return <GridAreaRadioSelector cols={w} rows={h} value={value.area} onChange={setArea} />;
}
