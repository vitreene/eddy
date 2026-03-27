import type { Route } from "../+types/root";

import {
	deleteSceneContentPositionCue,
	parseContentTimestampWords,
	prisma,
	type TextTime,
	upsertSceneContentPositionCue
} from "./db";
import { getSceneContentDurationSec } from "@/scene-runtime/scene-content";
import { isWaveformPositionCueName } from "@/scene-runtime/waveform-position-cues";

type SceneContentPositionCuesBody = {
	sceneId?: number;
	name?: string;
	timeSec?: number;
	remove?: boolean;
};

export async function action({ request }: Route.ActionArgs) {
	const body = (await request.json()) as SceneContentPositionCuesBody;
	const sceneId = Number(body?.sceneId);
	const cueName = typeof body?.name == "string" ? body.name.trim() : "";
	const remove = body?.remove === true;

	if (!Number.isFinite(sceneId) || sceneId <= 0) {
		return Response.json({ ok: false, message: "sceneId invalide" }, { status: 400 });
	}
	if (!isWaveformPositionCueName(cueName)) {
		return Response.json({ ok: false, message: "name invalide" }, { status: 400 });
	}

	if (remove) {
		await deleteSceneContentPositionCue({ sceneId, cueName });
	} else {
		const timeSec = Number(body?.timeSec);
		if (!Number.isFinite(timeSec) || timeSec < 0) {
			return Response.json({ ok: false, message: "timeSec invalide" }, { status: 400 });
		}
		await upsertSceneContentPositionCue({ sceneId, cueName, timeSec });
	}

	const sceneContent = await prisma.sceneContent.findFirst({
		where: { sceneId },
		orderBy: [{ order: "asc" }, { id: "asc" }]
	});
	if (!sceneContent) {
		return Response.json({ ok: false, message: "scene_content introuvable" }, { status: 404 });
	}

	const linkedContent = await prisma.content.findUnique({
		where: { id: sceneContent.contentId },
		select: { timestamp: true }
	});
	const events = JSON.parse(sceneContent.events || "[]") as TextTime[];
	const timestamp = parseContentTimestampWords(linkedContent?.timestamp);
	const durationSec = getSceneContentDurationSec({ timestamp, events, cues: timestamp });

	return Response.json({
		ok: true,
		sceneContent: {
			...sceneContent,
			events,
			timestamp,
			cues: timestamp,
			totalDuration: durationSec
		}
	});
}
