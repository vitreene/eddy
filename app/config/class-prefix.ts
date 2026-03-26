import { ITEM_DEFAULT_PREFIX } from "./constants";

export const EDITOR_CLASS_PREFIX = ITEM_DEFAULT_PREFIX;

export function withEditorPrefix(token: string): string {
	const safeToken = (token || "").trim().replace(/^-+/, "");
	return safeToken ? `${EDITOR_CLASS_PREFIX}-${safeToken}` : EDITOR_CLASS_PREFIX;
}

export function buildEditorGridClassName(cols: number, rows: number): string {
	return withEditorPrefix(
		`grid-w${Math.max(1, Math.floor(cols || 1))}-h${Math.max(1, Math.floor(rows || 1))}`
	);
}

export const EDITOR_ITEM_CLASS = withEditorPrefix("item");
export const EDITOR_CAPSULE_CLASS = withEditorPrefix("caps");
export const EDITOR_VIDEO_CLASS = withEditorPrefix("video");
export const EDITOR_STATIC_STYLE_CLASS_PREFIX = withEditorPrefix("static");
