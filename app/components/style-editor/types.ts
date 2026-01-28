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
	borderColor?: string; // border

	/* SPACING */
	padding?: string; // "10px"
	margin?: string; // "5px"

	/* LAYOUT / FLEX */
	display?: "flex" | "block" | "inline-block" | "grid";
	justifyContent?: "flex-start" | "center" | "flex-end";
	alignItems?: "flex-start" | "center" | "flex-end";

	/* EXTRA */
	area?: string;
}

export type StyleKey = keyof EditableStyle;

/**
 * Un preset visuel (ex. pour la palette)
 */
export type StylePreset = Partial<EditableStyle>;
