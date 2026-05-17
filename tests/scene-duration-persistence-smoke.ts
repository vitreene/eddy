import assert from "node:assert/strict";

import { createScene, getScene, prisma } from "../app/api/db";
import { action as updateSceneAction } from "../app/api/scene-update";
import { getSceneContentDurationSec } from "../app/scene-runtime/scene-content";

await prisma.$connect();

const scene = await createScene("scene-duration-persistence-smoke");
const content = await prisma.content.create({
	data: {
		name: "linked sound",
		type: "sound",
		timestamp: JSON.stringify({
			words: [{ name: "word-1", text: "hello", start: 0, end: 4.2 }]
		})
	}
});

try {
	const first = await updateSceneAction({
		params: { id: String(scene.id) },
		request: new Request(`http://localhost/api/scene/${scene.id}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ contentId: content.id, totalDuration: 4.2 })
		})
	} as any);
	assert.equal(first.status, 200, "linking the sound should succeed");

	const firstBody = (await first.json()) as { sceneContent?: { totalDuration?: number } };
	assert.equal(firstBody.sceneContent?.totalDuration, 4.2, "sound selection should adopt the sound duration");

	const second = await updateSceneAction({
		params: { id: String(scene.id) },
		request: new Request(`http://localhost/api/scene/${scene.id}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ contentId: content.id, totalDuration: 7.25 })
		})
	} as any);
	assert.equal(second.status, 200, "manual duration update should succeed");

	const secondBody = (await second.json()) as { sceneContent?: { totalDuration?: number } };
	assert.equal(secondBody.sceneContent?.totalDuration, 7.25, "manual duration must persist in the response");

	const reloaded = await getScene(scene.id);
	const activeSceneContent = Object.values(reloaded.sceneContents).find((entry) => entry.contentId === content.id);
	assert.ok(activeSceneContent, "scene content should still exist after reload");
	assert.equal(
		getSceneContentDurationSec(activeSceneContent),
		7.25,
		"manual duration must persist when the scene is reloaded"
	);

	console.log("scene duration persistence smoke: all checks passed");
} finally {
	await prisma.sceneContent.deleteMany({ where: { sceneId: scene.id } });
	await prisma.sceneCapsule.deleteMany({ where: { sceneId: scene.id } });
	await prisma.scene.delete({ where: { id: scene.id } });
	if (scene.capsuleId) {
		await prisma.capsule.delete({ where: { id: scene.capsuleId } });
	}
	await prisma.content.delete({ where: { id: content.id } });
}
