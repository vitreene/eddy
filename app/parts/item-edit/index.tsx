import { useCallback } from "react";
import { SceneLogicContext } from "@/provider/scene-logic";
import { CompactStyleEditor } from "@/components/style-editor/compact-style-editor";

import type { EditableStyle } from "@/components/style-editor/types";
import { DEFAULT_STYLE } from "@/lib/constants";
import type { Decor } from "@/api/db";

export function EditItem() {
	const sceneLogic = SceneLogicContext.useActorRef();
	const element = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : null
	);
	const decor = SceneLogicContext.useSelector(
		(state) => (element && state.context.decors?.items[element.id]) || null
	);

	const onStyleChange = useCallback(
		(newStyle: EditableStyle) => {
			// Enregistrer le style dans le contexte (decor) de la capsule
			sceneLogic.send({
				type: "item-update",
				payload: { decor: { ...decor, style: newStyle } as Decor }
			});
			sceneLogic.send({ type: "active-set", payload: { decorTouched: true } });
		},
		[sceneLogic, decor]
	);

	if (!element) return null;
	return (
		<CompactStyleEditor value={(decor?.style as EditableStyle) ?? DEFAULT_STYLE} onChange={onStyleChange} />
	);
}
