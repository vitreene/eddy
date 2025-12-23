import { useCallback } from "react";
import { SceneLogicContext } from "@/provider/scene-logic";
import { CompactStyleEditor } from "@/components/style-editor/compact-style-editor";

import type { EditableStyle } from "@/components/style-editor/types";
import { DEFAULT_STYLE } from "@/lib/constants";

export function EditElement() {
	const sceneLogic = SceneLogicContext.useActorRef();
	const element = SceneLogicContext.useSelector((state) =>
		state.context.active.elementId ? state.context.elements[state.context.active.elementId] : null
	);
	const decor = SceneLogicContext.useSelector(
		(state) => (element && state.context.decors?.elements[element.id]) || null
	);

	const onStyleChange = useCallback(
		(newStyle: EditableStyle) => {
			// Enregistrer le style dans le contexte (decor) de la capsule
			sceneLogic.send({
				type: "element-update",
				payload: { decor: { ...decor, style: newStyle } }
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
