import type { SceneContent } from "@/api/db";

export type ScenePatchRequest = {
	title?: string;
	contentId?: number | null;
	totalDuration?: number | null;
	mainGrid?: string;
};

export type ScenePatchResponse = {
	scene?: { title?: string };
	sceneContent?: SceneContent | null;
	mainCapsule?: { id: number; grid: string | null } | null;
};

type SceneContentPositionCuePatch = {
	sceneId: number;
	name: string;
	timeSec?: number;
	remove?: boolean;
};

type SceneContentPositionCuePatchResponse = {
	sceneContent?: SceneContent;
};

export async function createDecorOnServer(): Promise<number | null> {
	const response = await fetch("/api/decor", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({})
	});
	if (!response.ok) return null;

	const payload = (await response.json()) as { decorId?: number };
	const decorId = Number(payload.decorId);
	if (!decorId || !Number.isFinite(decorId)) return null;
	return decorId;
}

export async function persistContentTextOnServer(contentId: number, inner: string): Promise<void> {
	void fetch(`/api/content/${contentId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ inner })
	});
}

export async function patchSceneOnServer(
	sceneId: number,
	patch: ScenePatchRequest
): Promise<ScenePatchResponse | null> {
	const response = await fetch(`/api/scene/${sceneId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		body: JSON.stringify(patch)
	});
	if (!response.ok) return null;
	return (await response.json()) as ScenePatchResponse;
}

export async function persistItemVisibilityOnServer(itemId: number, visible: boolean): Promise<void> {
	const formData = new FormData();
	formData.set("visible", visible ? "true" : "false");
	void fetch(`/api/item/${itemId}`, {
		method: "POST",
		body: formData
	});
}

export async function deleteCustomEventOnServer(itemId: number, eventId: number): Promise<void> {
	if (!itemId || !eventId) return;

	void fetch(`/api/content/${itemId}`, {
		method: "DELETE",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ eventId })
	});
}

export async function patchSceneContentPositionCueOnServer(
	patch: SceneContentPositionCuePatch
): Promise<SceneContent | null> {
	const response = await fetch("/api/scene-content/position-cues", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json"
		},
		body: JSON.stringify(patch)
	});
	if (!response.ok) return null;

	const payload = (await response.json()) as SceneContentPositionCuePatchResponse;
	return payload.sceneContent || null;
}
