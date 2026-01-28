import { GridAreaRadioSelector } from "./grid-area-selector";
import { SceneLogicContext } from "@/provider/scene-logic";
import { getValuesFromGridName } from "@/lib/utils";
import type { EditableStyle } from "@/components/style-editor/types";

interface Props {
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

export function SlotEditor({ value, onChange }: Props) {
	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);

	const capsule = SceneLogicContext.useSelector((state) => state.context.capsules[item.capsuleId]);

	const { w, h } = getValuesFromGridName(capsule.grid);

	const setArea = (area: string) => {
		onChange({ ...value, area });
	};

	if (!capsule.grid) return null;
	return <GridAreaRadioSelector cols={w} rows={h} value={value.area} onChange={setArea} />;
}
