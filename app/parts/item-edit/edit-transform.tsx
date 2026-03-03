import { useMemo } from "react";

import { ItemTransformEditor } from "@/components/position-editor/visual-transform-grid";
import { SCENE_ID } from "@/player/constants";

import type { ElementTransform } from "@/components/position-editor/lib.types";
import { SceneLogicContext } from "@/provider/scene-logic";

type EditTransformProps = {
	onCommit: (
		transform: ElementTransform,
		mode: "move" | "rotate" | "resize-se" | "cell-snap",
		meta: { translateX: number; translateY: number }
	) => void;
};

export function EditTransform({ onCommit }: EditTransformProps) {
	const activeNode = SceneLogicContext.useSelector((state) => state.context.active.node as HTMLElement | null);

	const overlayContainer = useMemo(() => {
		if (!activeNode) return null;
		return activeNode.ownerDocument.getElementById(SCENE_ID);
	}, [activeNode]);

	return (
		<ItemTransformEditor
			element={activeNode}
			active={Boolean(activeNode)}
			onCommit={onCommit}
			overlayContainer={overlayContainer}
		/>
	);
}
