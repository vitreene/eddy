import { GridAreaRadioSelector } from "./grid-area-selector";
import { SceneLogicContext } from "@/provider/scene-logic";
import { getValuesFromGridName } from "@/lib/utils";
import type { EditableStyle } from "@/components/style-editor/types";

interface Props {
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

export function SlotEditor({ value, onChange }: Props) {
	console.log(value);

	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);

	const capsule = SceneLogicContext.useSelector((state) => state.context.capsules[item.capsuleId]);

	const decor = SceneLogicContext.useSelector((state) => state.context.decors[item.decorId]);

	const { w, h } = getValuesFromGridName(capsule.grid);

	const setArea = (area: string) => {
		console.log(area);

		onChange({ area });
	};

	if (!capsule.grid) return null;
	return <GridAreaRadioSelector cols={w} rows={h} value={decor.area} onChange={setArea} />;
}
