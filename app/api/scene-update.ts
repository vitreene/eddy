import type { Route } from "../+types/root";

import { parseContentTimestampWords, prisma, updateSceneTitle, upsertSceneAudioSettings } from "./db";
import {
	buildSceneFallbackEvents,
	getSceneContentDurationSec,
	SCENE_DEFAULT_DURATION_SEC
} from "@/scene-runtime/scene-content";

type SceneUpdateBody = {
	title?: string;
	contentId?: number | null;
	totalDuration?: number | null;
	mainGrid?: string | null;
};

export async function action({ params, request }: Route.ActionArgs) {
	const sceneId = Number(params.id);
	if (!Number.isFinite(sceneId) || sceneId <= 0) {
		return Response.json({ ok: false, message: "sceneId invalide" }, { status: 400 });
	}

	const body = (await request.json()) as SceneUpdateBody;
	const scene = await prisma.scene.findUnique({
		where: { id: sceneId },
		select: { id: true, title: true, capsuleId: true }
	});
	if (!scene) {
		return Response.json({ ok: false, message: "scene introuvable" }, { status: 404 });
	}

	let nextTitle = scene.title;
	if (typeof body.title == "string") {
		nextTitle = body.title.trim() || "Scene";
		await updateSceneTitle(sceneId, nextTitle);

		const existingSceneContent = await prisma.sceneContent.findFirst({
			where: { sceneId },
			orderBy: [{ order: "asc" }, { id: "asc" }]
		});
		const existingContent = existingSceneContent
			? await prisma.content.findUnique({
					where: { id: existingSceneContent.contentId },
					select: { timestamp: true }
				})
			: null;
		const existingTimestamp = parseContentTimestampWords(existingContent?.timestamp);
		if (existingSceneContent && existingTimestamp.length === 0) {
			const existingEvents = safeParseTextTimes(existingSceneContent.events);
			const nextDuration = getSceneContentDurationSec({
				timestamp: existingTimestamp,
				events: existingEvents,
				cues: existingTimestamp
			});
			await prisma.sceneContent.update({
				where: { id: existingSceneContent.id },
				data: {
					events: JSON.stringify(buildSceneFallbackEvents(nextTitle, nextDuration))
				}
			});
		}
	}

	if (typeof body.mainGrid == "string" && scene.capsuleId) {
		await prisma.capsule.update({ where: { id: scene.capsuleId }, data: { grid: body.mainGrid || null } });
	}

	const hasAudioSettingsPatch =
		Object.prototype.hasOwnProperty.call(body, "contentId") ||
		Object.prototype.hasOwnProperty.call(body, "totalDuration");
	let updatedSceneContent: Awaited<ReturnType<typeof upsertSceneAudioSettings>> = null;
	if (hasAudioSettingsPatch) {
		const currentSceneContent = await prisma.sceneContent.findFirst({
			where: { sceneId },
			orderBy: [{ order: "asc" }, { id: "asc" }]
		});
		const hasExplicitContent = Object.prototype.hasOwnProperty.call(body, "contentId");
		const nextContentId = hasExplicitContent
			? normalizeContentId(body.contentId)
			: currentSceneContent
				? Number(currentSceneContent.contentId)
				: null;
		const nextDuration = normalizeDuration(body.totalDuration);
		updatedSceneContent = await upsertSceneAudioSettings({
			sceneId,
			contentId: nextContentId,
			totalDuration: nextContentId ? nextDuration : SCENE_DEFAULT_DURATION_SEC
		});
	}

	const linkedContent = updatedSceneContent
		? await prisma.content.findUnique({
				where: { id: updatedSceneContent.contentId },
				select: { timestamp: true }
			})
		: null;
	const timestamp = parseContentTimestampWords(linkedContent?.timestamp);
	const events = updatedSceneContent ? JSON.parse(updatedSceneContent.events || "[]") : [];
	const durationSec = getSceneContentDurationSec({ timestamp, events, cues: timestamp });

	return Response.json({
		ok: true,
		scene: {
			id: sceneId,
			title: nextTitle
		},
		sceneContent: updatedSceneContent
			? {
					...updatedSceneContent,
					timestamp,
					events,
					cues: timestamp,
					totalDuration: durationSec
				}
			: null,
		mainCapsule: scene.capsuleId
			? await prisma.capsule.findUnique({ where: { id: scene.capsuleId }, select: { id: true, grid: true } })
			: null
	});
}

function normalizeContentId(value: number | null | undefined): number | null {
	const numberValue = Number(value);
	if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
	return Math.floor(numberValue);
}

function normalizeDuration(value: number | null | undefined): number | null {
	const numberValue = Number(value);
	if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
	return Number(numberValue.toFixed(3));
}

function safeParseTextTimes(raw: string): Array<{ start: number; end: number; name: string; text: string }> {
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
