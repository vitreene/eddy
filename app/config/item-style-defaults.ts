import type { EditableStyle } from "@/components/style-editor/types";

export const MANAGED_ITEM_STYLE_KEYS: Array<keyof EditableStyle> = [
	"fontFamily",
	"fontWeight",
	"fontStyle",
	"fontSize",
	"textAlign",
	"color",
	"backgroundColor",
	"borderColor",
	"padding",
	"margin",
	"justifySelf",
	"alignSelf",
	"placeSelf",
	"x",
	"y",
	"width",
	"height",
	"rotate",
	"originX",
	"originY",
	"scaleX",
	"scaleY",
	"backgroundSize",
	"backgroundRepeat",
	"outline",
	"area",
	"className"
];

// Managed keys that should not be interpolated as dynamic timeline style.
// They are better represented as generated classes (layout/placement semantics).
export const NON_ANIMATABLE_MANAGED_STYLE_KEYS: Array<keyof EditableStyle> = [
	"justifySelf",
	"alignSelf",
	"placeSelf",
	"backgroundPosition"
];

export const ANIMATABLE_MANAGED_STYLE_KEYS: Array<keyof EditableStyle> = MANAGED_ITEM_STYLE_KEYS.filter(
	(key) => !NON_ANIMATABLE_MANAGED_STYLE_KEYS.includes(key) && key !== "area" && key !== "className"
);

export const DEFAULT_STYLE: EditableStyle = {
	fontFamily: "Inter",
	fontWeight: "normal",
	fontStyle: "normal",
	fontSize: "3cqw",
	textAlign: "left",
	color: "#222222",
	backgroundColor: undefined,
	borderColor: undefined,
	padding: "0px",
	margin: "0px",
	justifySelf: undefined,
	alignSelf: undefined,
	placeSelf: undefined,
	x: undefined,
	y: undefined,
	width: undefined,
	height: undefined,
	rotate: undefined,
	originX: 0.5,
	originY: 0.5,
	scaleX: undefined,
	scaleY: undefined,
	backgroundSize: "cover",
	backgroundRepeat: "no-repeat",
	outline: undefined,
	area: undefined,
	className: undefined
};

export function getDefaultStyleForContentType(_contentType?: string): EditableStyle {
	return DEFAULT_STYLE;
}

export function sanitizeEditableStyle(style: EditableStyle | null | undefined): EditableStyle {
	if (!style || typeof style !== "object") return {};
	const entries = Object.entries(style).filter(([key, value]) => {
		if (!MANAGED_ITEM_STYLE_KEYS.includes(key as keyof EditableStyle)) return false;
		if (key === "area" || key === "className") return false;
		if (value === undefined || value === null) return false;
		if (typeof value === "string" && !value.trim()) return false;
		return true;
	});
	return Object.fromEntries(entries);
}

export function applyStyleDefaults(
	style: EditableStyle | null | undefined,
	contentType?: string
): EditableStyle {
	return {
		...getDefaultStyleForContentType(contentType),
		...sanitizeEditableStyle(style)
	};
}

export function stripDefaultStyleValues(
	style: EditableStyle | null | undefined,
	contentType?: string
): EditableStyle {
	const cleaned = sanitizeEditableStyle(style);
	const defaults = getDefaultStyleForContentType(contentType);

	const entries = Object.entries(cleaned).filter(
		([key, value]) => defaults[key as keyof EditableStyle] !== value
	);
	return Object.fromEntries(entries);
}
