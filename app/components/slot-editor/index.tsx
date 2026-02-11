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

	const capsule = SceneLogicContext.useSelector((state) =>
		item ? state.context.capsules[item.capsuleId] : undefined
	);

	const decor = SceneLogicContext.useSelector((state) =>
		item?.decorId ? state.context.decors[item.decorId] : undefined
	);

	if (!item || !capsule?.grid) return null;

	const { w, h } = getValuesFromGridName(capsule.grid);

	const setArea = (area: string) => {
		console.log(area);

		onChange({ area });
	};

	return <GridAreaRadioSelector cols={w} rows={h} value={value.area || decor?.area} onChange={setArea} />;
}
