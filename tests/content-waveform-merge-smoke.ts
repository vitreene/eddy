import assert from "node:assert/strict";

import {
	parseContentTimestampWaveform,
	parseContentTimestampWords,
	prisma,
	upsertContentWaveform
} from "../app/api/db";

const seedTimestamp = JSON.stringify({
	words: [{ name: "w-1", text: "bonjour", start: 0, end: 0.4 }],
	custom: { foo: "bar" }
});

const content = await prisma.content.create({
	data: {
		name: "waveform-merge-smoke",
		type: "sound",
		path: "tests/sound.mp3",
		timestamp: seedTimestamp
	}
});

try {
	const updated = await upsertContentWaveform({
		contentId: content.id,
		waveform: {
			version: 1,
			sampleRate: 22050,
			durationSec: 2,
			points: 4,
			min: [-1, -0.5, -0.25, 0],
			max: [1, 0.5, 0.25, 0]
		}
	});

	const words = parseContentTimestampWords(updated.timestamp);
	const waveform = parseContentTimestampWaveform(updated.timestamp);
	const parsed = JSON.parse(updated.timestamp || "{}") as Record<string, unknown>;

	assert.equal(words.length, 1);
	assert.equal(words[0].name, "w-1");
	assert.ok(waveform);
	assert.equal(waveform?.points, 4);
	assert.deepEqual(parsed.custom, { foo: "bar" });

	console.log("content waveform merge smoke: all checks passed");
} finally {
	await prisma.content.delete({ where: { id: content.id } });
}
