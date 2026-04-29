export const ORIENTATION_PORTRAIT = "portrait" as const;
export const ORIENTATION_LANDSCAPE = "landscape" as const;

export type OrientationMode = typeof ORIENTATION_PORTRAIT | typeof ORIENTATION_LANDSCAPE;

export const DEFAULT_EDITOR_PREVIEW_ORIENTATION: OrientationMode = ORIENTATION_LANDSCAPE;

export function normalizeOrientationMode(value: unknown): OrientationMode {
	return value === ORIENTATION_PORTRAIT ? ORIENTATION_PORTRAIT : ORIENTATION_LANDSCAPE;
}
