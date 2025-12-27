import { useCallback } from "react";
import { SceneLogicContext } from "@/provider/scene-logic";
import { CompactStyleEditor } from "@/components/style-editor/compact-style-editor";
import { gridWHClassName, ResizableGridFrame, type GridSize } from "@/components/draw-grid";

import type { EditableStyle } from "@/components/style-editor/types";
import { DEFAULT_STYLE } from "@/lib/constants";
import type { CapsuleComp, Decor } from "@/api/db";

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
			send({ type: "active-set", payload: { decorTouched: true } });
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
		send({ type: "capsule-update", payload: { name, id: capsule.id } });
	};

	const onChangeGrid = (size: GridSize) => {
		const gridClassName = gridWHClassName(size);
		console.log(gridClassName);
	};
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
			<ResizableGridFrame onChange={onChangeGrid} />

			<CompactStyleEditor value={(decor?.style as EditableStyle) ?? DEFAULT_STYLE} onChange={onChange} />
		</>
	);
}
