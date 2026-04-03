import type { ActiveState, ItemEditTab } from "./types";

export type SceneLogicUiPreferences = {
	telcoMuted: boolean;
	itemEditTab: ItemEditTab;
};

export const SCENE_LOGIC_UI_PREFERENCES_STORAGE_KEY = "eddy.sceneLogic.uiPreferences.v1";

const ITEM_EDIT_TAB_VALUES: ItemEditTab[] = ["presets", "layout", "advanced"];

const DEFAULT_SCENE_LOGIC_UI_PREFERENCES: SceneLogicUiPreferences = {
	telcoMuted: false,
	itemEditTab: "presets"
};

export function isItemEditTab(value: unknown): value is ItemEditTab {
	return typeof value == "string" && ITEM_EDIT_TAB_VALUES.includes(value as ItemEditTab);
}

export function normalizeSceneLogicUiPreferences(
	value: Partial<Record<keyof SceneLogicUiPreferences, unknown>> | null | undefined,
	fallback: SceneLogicUiPreferences = DEFAULT_SCENE_LOGIC_UI_PREFERENCES
): SceneLogicUiPreferences {
	return {
		telcoMuted: typeof value?.telcoMuted == "boolean" ? value.telcoMuted : fallback.telcoMuted,
		itemEditTab: isItemEditTab(value?.itemEditTab) ? value.itemEditTab : fallback.itemEditTab
	};
}

export function pickSceneLogicUiPreferences(active: ActiveState): SceneLogicUiPreferences {
	return normalizeSceneLogicUiPreferences({
		telcoMuted: active.telcoMuted,
		itemEditTab: active.itemEditTab
	});
}

export function loadSceneLogicUiPreferences(): SceneLogicUiPreferences | null {
	if (typeof window == "undefined") return null;

	try {
		const raw = window.localStorage.getItem(SCENE_LOGIC_UI_PREFERENCES_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<SceneLogicUiPreferences>;
		return normalizeSceneLogicUiPreferences(parsed);
	} catch {
		return null;
	}
}

export function persistSceneLogicUiPreferences(preferences: SceneLogicUiPreferences): void {
	if (typeof window == "undefined") return;

	try {
		window.localStorage.setItem(
			SCENE_LOGIC_UI_PREFERENCES_STORAGE_KEY,
			JSON.stringify(normalizeSceneLogicUiPreferences(preferences))
		);
	} catch {
		// Ignore storage write failures (private mode/quota).
	}
}
