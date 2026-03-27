import type { SceneComp, SceneContent, TextTime } from "@/api/db";

export const SCENE_DEFAULT_DURATION_SEC = 5;

export function getActiveSceneContent(scene: Pick<SceneComp, "id" | "sceneContents">): SceneContent | null {
	return (
		Object.values(scene.sceneContents || {}).find((sceneContent) => sceneContent.sceneId == scene.id) ||
		Object.values(scene.sceneContents || {})[0] ||
		null
	);
}

export function getSceneContentCues(
	sceneContent: Pick<SceneContent, "timestamp" | "events" | "cues"> | null | undefined
): TextTime[] {
	if (!sceneContent) return [];
	if (Array.isArray(sceneContent.cues) && sceneContent.cues.length) return sceneContent.cues;
	if (Array.isArray(sceneContent.timestamp)) {
		if (sceneContent.timestamp.length) return sceneContent.timestamp;
		return [];
	}
	if (Array.isArray(sceneContent.events)) return sceneContent.events;
	return [];
}

export function mergeSceneEditorCues(timestamp: TextTime[], events: TextTime[]): TextTime[] {
	const byName = new Map<string, TextTime>();

	for (const cue of Array.isArray(timestamp) ? timestamp : []) {
		if (!cue?.name) continue;
		byName.set(cue.name, cue);
	}

	for (const cue of Array.isArray(events) ? events : []) {
		if (!cue?.name) continue;
		byName.set(cue.name, cue);
	}

	return [...byName.values()].toSorted((a, b) => {
		if (a.start !== b.start) return a.start - b.start;
		return a.name.localeCompare(b.name);
	});
}

export function getSceneContentDurationSec(
	sceneContent: Pick<SceneContent, "totalDuration" | "timestamp" | "events" | "cues"> | null | undefined
): number {
	const fromField = Number(sceneContent?.totalDuration);
	if (Number.isFinite(fromField) && fromField > 0) return Number(fromField.toFixed(3));

	const timestamp =
		Array.isArray(sceneContent?.timestamp) && sceneContent.timestamp.length ? sceneContent.timestamp : [];
	const fallbackEvents = Array.isArray(sceneContent?.events) ? sceneContent.events : [];
	const cues = timestamp.length > 0 ? timestamp : fallbackEvents;
	let maxSec = 0;
	for (const cue of cues) {
		const start = Number(cue?.start);
		const end = Number(cue?.end);
		const candidate = Number.isFinite(end) ? end : Number.isFinite(start) ? start : 0;
		if (candidate > maxSec) maxSec = candidate;
	}

	if (maxSec > 0) return Number(maxSec.toFixed(3));
	return SCENE_DEFAULT_DURATION_SEC;
}

export function buildSceneFallbackEvents(sceneTitle: string, totalDurationSec: number): TextTime[] {
	const safeTitle = (sceneTitle || "Scene").trim() || "Scene";
	const name = slugifySceneName(safeTitle);
	const end =
		Number.isFinite(totalDurationSec) && totalDurationSec > 0 ? Number(totalDurationSec.toFixed(3)) : 0;
	return [
		{
			name,
			text: safeTitle,
			start: 0,
			end
		}
	];
}

function slugifySceneName(value: string): string {
	return (
		value
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "scene"
	);
}
