import { useCallback } from "react";

import { getValuesFromGridName } from "@/lib/utils";
import { SceneLogicContext } from "@/provider/scene-logic";
import { StyleEditor } from "@/components/style-editor";
import { gridWHClassName, ResizableGridFrame } from "@/components/draw-grid";

import { DEFAULT_STYLE } from "@/lib/constants";

import type { CapsuleComp, Decor, Content } from "@/api/db";
import type { GridSize } from "@/components/draw-grid";
import type { EditableStyle } from "@/components/style-editor/types";

export function EditItem() {
	const { send } = SceneLogicContext.useActorRef();

	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);

	const content: Content = SceneLogicContext.useSelector((state) => state.context.contents[item?.contentId]);

	const decor = SceneLogicContext.useSelector((state) => {
		if (!item?.decorId) return undefined;
		return state.context.decors[item.decorId];
	});

	const capsule = SceneLogicContext.useSelector((state) => {
		if (content?.type == "capsule" && content.capsuleId) return state.context.capsules[content.capsuleId];
		return undefined;
	});

	const onStyleChange = useCallback(
		({ area, className, ...style }: EditableStyle) => {
			send({
				type: "item-update",
				payload: {
					decor: {
						...decor,
						...(className && { className }),
						...(area && { area }),
						...(Object.keys(style).length && { style })
					} as Decor
				}
			});
		},
		[send, decor]
	);

	if (!item) return null;

	return capsule ? (
		<CapsuleEdit content={content} decor={decor} capsule={capsule} onChange={onStyleChange} />
	) : (
		<ContentEdit content={content} decor={decor} onChange={onStyleChange} />
	);
}

function ContentEdit({
	content,
	decor,
	onChange
}: {
	content: Content;
	decor?: Decor;
	onChange: (newStyle: EditableStyle) => void;
}) {
	return (
		<StyleEditor
			content={content}
			value={(decor?.style as EditableStyle) ?? DEFAULT_STYLE}
			onChange={onChange}
		/>
	);
}

function CapsuleEdit({
	content,
	decor,
	capsule,
	onChange
}: {
	content: Content;
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
		const { className } = gridWHClassName(size);

		send({
			type: "capsule-update",
			payload: { id: capsule.id, grid: className }
		});
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

			<ResizableGridFrame key={capsule.id} w={gridValues.w} h={gridValues.h} onChange={onChangeGrid} />

			<StyleEditor
				content={content}
				value={(decor?.style as EditableStyle) ?? DEFAULT_STYLE}
				onChange={onChange}
			/>
		</>
	);
}
