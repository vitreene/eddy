import { buildEditorGridClassName } from "./class-prefix";

export const SCENE_GRID_WIDTH = 160;
export const SCENE_GRID_HEIGHT = 90;
export const HEAVY_GRID_CELL_THRESHOLD = 150;

export const CAPSULE_GRID_PRESETS = {
	scene: buildEditorGridClassName(SCENE_GRID_WIDTH, SCENE_GRID_HEIGHT)
} as const;

export const POSITION_FULL_SPAN_CLASS = "cell-span-fill";
