import type { Route } from "../+types/root";

import { parseContentTimestampWords, prisma, type TextTime, upsertSceneContentCues } from "./db";
import { getSceneContentDurationSec } from "@/scene-runtime/scene-content";

type SceneContentCuesBody = {
	sceneId?: number;
	contentId?: number;
	cues?: TextTime[];
	totalDuration?: number;
};

export async function action({ request }: Route.ActionArgs) {
	const body = (await request.json()) as SceneContentCuesBody;
	const sceneId = Number(body?.sceneId);
	const contentId = Number(body?.contentId);
	const inputCues = Array.isArray(body?.cues) ? body.cues : [];
	const totalDuration = Number(body?.totalDuration);

	if (!Number.isFinite(sceneId) || sceneId <= 0) {
		return Response.json({ ok: false, message: "sceneId invalide" }, { status: 400 });
	}
	if (!Number.isFinite(contentId) || contentId <= 0) {
		return Response.json({ ok: false, message: "contentId invalide" }, { status: 400 });
	}
	if (!Array.isArray(body?.cues)) {
		return Response.json({ ok: false, message: "cues doit etre un tableau" }, { status: 400 });
	}

	const content = await prisma.content.findUnique({
		where: { id: contentId },
		select: { id: true, type: true }
	});
	if (!content) {
		return Response.json({ ok: false, message: "content introuvable" }, { status: 404 });
	}
	if (content.type !== "sound") {
		return Response.json({ ok: false, message: "content doit etre de type sound" }, { status: 400 });
	}

	const sceneContent = await upsertSceneContentCues({
		sceneId,
		contentId,
		cues: inputCues,
		totalDuration: Number.isFinite(totalDuration) ? totalDuration : undefined
	});
	const linkedContent = await prisma.content.findUnique({
		where: { id: sceneContent.contentId },
		select: { timestamp: true }
	});
	const events = JSON.parse(sceneContent.events || "[]") as TextTime[];
	const timestamp = parseContentTimestampWords(linkedContent?.timestamp);
	const durationSec = getSceneContentDurationSec({
		totalDuration: sceneContent.totalDuration,
		timestamp,
		events,
		cues: timestamp
	});
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
