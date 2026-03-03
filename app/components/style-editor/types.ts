export interface EditableStyle {
	[k: string]: any;
	/* TYPO */
	fontFamily?: string;
	fontWeight?: "normal" | "bold" | string;
	fontStyle?: "normal" | "italic" | string;
	fontSize?: string; // ex: "16px"
	textAlign?: "left" | "center" | "right";

	/* COLORS */
	color?: string; // text color
	backgroundColor?: string; // bg
	backgroundPosition?: string;
	borderColor?: string; // border
	backgroundSize?: string;
	backgroundRepeat?: string;
	outline?: string;

	/* SPACING */
	padding?: string; // "10px"
	margin?: string; // "5px"

	/* LAYOUT / FLEX */
	display?: "flex" | "block" | "inline-block" | "grid";
	justifyContent?: "flex-start" | "center" | "flex-end";
	alignItems?: "flex-start" | "center" | "flex-end";
	justifySelf?: "start" | "center" | "end" | "stretch";
	alignSelf?: "start" | "center" | "end" | "stretch";
	placeSelf?: string;

	/* TRANSFORM */
	x?: number | string;
	y?: number | string;
	width?: number | string;
	height?: number | string;
	rotate?: number;
	originX?: number;
	originY?: number;
	scaleX?: number;
	scaleY?: number;

	/* EXTRA */
	area?: string;
	className?: string;
}

export type StyleKey = keyof EditableStyle;

/**
 * Un preset visuel (ex. pour la palette)
 */
export type StylePreset = Partial<EditableStyle>;
