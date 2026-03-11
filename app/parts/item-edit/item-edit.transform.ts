import type { EditableStyle } from "@/components/style-editor/types";

export const TRANSFORM_RESET_STYLE: EditableStyle = {
	x: 0,
	y: 0,
	rotate: 0,
	originX: 0.5,
	originY: 0.5,
	scaleX: 1,
	scaleY: 1
};

export function buildResetTransformStyle(): EditableStyle {
	return { ...TRANSFORM_RESET_STYLE };
}
