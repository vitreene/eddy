import { useCallback } from "react";

import { SceneLogicContext } from "@/provider/scene-logic";
import { CompactStyleEditor } from "@/components/ui/style-editor/compact-style-editor";
import { gridWHClassName, ResizableGridFrame, type GridSize } from "@/components/draw-grid";

import type { EditableStyle } from "@/components/ui/style-editor/types";

const DEFAULT_STYLE = { fontFamily: "Inter", fontSize: "16px", color: "#222222" };

export function EditCapsule() {
	const sceneLogic = SceneLogicContext.useActorRef();
	const capsule = SceneLogicContext.useSelector((state) =>
		state.context.active.capsuleId ? state.context.capsules[state.context.active.capsuleId] : null
	);
	const decor = SceneLogicContext.useSelector(
		(state) => (capsule && state.context.decors?.capsules[capsule.id]) || null
	);

	const onStyleChange = useCallback(
		(newStyle: EditableStyle) => {
			// Enregistrer le style dans le contexte (decor) de la capsule
			sceneLogic.send({
				type: "capsule.update",
				payload: { decor: { ...decor, style: newStyle } }
			});

			// Marquer que le decor a été modifié pour déclencher la persistance ultérieure
			sceneLogic.send({ type: "active.set", payload: { decorTouched: true } });
		},
		[sceneLogic, decor]
	);

	const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const type = formData.get("type") as string;
		sceneLogic.send({ type: "capsule.update", payload: { type } });
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
					name="type"
					defaultValue={capsule?.type}
				/>
			</form>
			<ResizableGridFrame onChange={onChangeGrid} />

			<CompactStyleEditor value={(decor?.style as EditableStyle) ?? DEFAULT_STYLE} onChange={onStyleChange} />
		</>
	);
}
