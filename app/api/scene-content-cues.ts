import type { Route } from "../+types/root";

import { prisma, type TextTime, upsertSceneContentCues } from "./db";

type SceneContentCuesBody = {
	sceneId?: number;
	contentId?: number;
	cues?: TextTime[];
};

export async function action({ request }: Route.ActionArgs) {
	const body = (await request.json()) as SceneContentCuesBody;
	const sceneId = Number(body?.sceneId);
	const contentId = Number(body?.contentId);
	const cues = Array.isArray(body?.cues) ? body.cues : [];

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

	const sceneContent = await upsertSceneContentCues({ sceneId, contentId, cues });
	const events = JSON.parse(sceneContent.events || "[]") as TextTime[];
	return Response.json({
		ok: true,
		sceneContent: {
			...sceneContent,
			events
		}
	});
}
