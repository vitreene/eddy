import { useCallback } from "react";

import { SceneLogicContext } from "@/provider/scene-logic";
import { CompactStyleEditor } from "@/components/style-editor/compact-style-editor";
import { gridWHClassName, ResizableGridFrame } from "@/components/draw-grid";

import { DEFAULT_STYLE } from "@/lib/constants";

import type { CapsuleComp, Decor } from "@/api/db";
import type { GridSize } from "@/components/draw-grid";
import type { EditableStyle } from "@/components/style-editor/types";
import { SlotEditor } from "@/components/slot-editor/demo";

export function EditItem() {
	const { send } = SceneLogicContext.useActorRef();

	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);

	const decor = SceneLogicContext.useSelector((state) => {
		if (!item?.decorId) return undefined;
		return state.context.decors[item.decorId];
	});

	const capsule = SceneLogicContext.useSelector((state) => {
		if (!item) return undefined;
		const content = state.context.contents[item.contentId];
		if (content.type == "capsule" && content.capsuleId) return state.context.capsules[content.capsuleId];
		return undefined;
	});

	const onStyleChange = useCallback(
		(newStyle: EditableStyle) => {
			send({ type: "item-update", payload: { decor: { ...decor, style: newStyle } as Decor } });
		},
		[send, decor]
	);

	if (!item) return null;

	return capsule ? (
		<CapsuleEdit decor={decor} capsule={capsule} onChange={onStyleChange} />
	) : (
		<ContentEdit decor={decor} onChange={onStyleChange} />
	);
}

function ContentEdit({ decor, onChange }: { decor?: Decor; onChange: (newStyle: EditableStyle) => void }) {
	return <CompactStyleEditor value={(decor?.style as EditableStyle) ?? DEFAULT_STYLE} onChange={onChange} />;
}

function CapsuleEdit({
	decor,
	capsule,
	onChange
}: {
	decor?: Decor;
	capsule: CapsuleComp;
	onChange: (newStyle: EditableStyle) => void;
}) {
	const { send } = SceneLogicContext.useActorRef();

	const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		send({ type: "capsule-update", payload: { id: capsule.id, name } });
	};

	const onChangeGrid = (size: GridSize) => {
		const gridClassName = gridWHClassName(size);

		send({
			type: "capsule-update",
			payload: { id: capsule.id, grid: gridClassName.className }
		});
		send({ type: "theme-update", payload: { generated: gridClassName.cssText } });
	};

	const gridValues = getValuesFromGridName(capsule.grid);
	return (
		<>
			<form onBlur={onSubmit} className="mb-2">
				<input hidden name="id" defaultValue={capsule?.id} />
				<label className="mr-2 text-xs">Nom</label>
				<input
					key={capsule?.id}
					className="inline-block border border-stone-300 p-1"
					name="name"
					defaultValue={capsule?.name}
				/>
			</form>
			<SlotEditor />
			<ResizableGridFrame key={capsule.id} w={gridValues.w} h={gridValues.h} onChange={onChangeGrid} />

			<CompactStyleEditor value={(decor?.style as EditableStyle) ?? DEFAULT_STYLE} onChange={onChange} />
		</>
	);
}

const DEFAULT_GRID_VALUE = { w: 3, h: 1 };
function getValuesFromGridName(grid: string = "") {
	if (!grid) return DEFAULT_GRID_VALUE;
	const values = /-w(\d*)-h(\d*)/.exec(grid);
	if (!values) return DEFAULT_GRID_VALUE;
	return { w: Number(values[1]), h: Number(values[2]) };
}
