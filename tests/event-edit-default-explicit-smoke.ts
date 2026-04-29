import assert from "node:assert/strict";

import { INTRO, OUTRO } from "../app/config/constants";
import { buildEventPayloadFromCuePoint } from "../app/parts/rubber/timeline-point-editor.model";

const payloadIntro = buildEventPayloadFromCuePoint(
	{
		[INTRO]: { action: INTRO, name: "__auto_item_1_intro_fallback_0", ref: null }
	} as any,
	INTRO,
	"whisper-0001",
	"start"
);

assert.equal(payloadIntro.action, INTRO);
assert.equal(payloadIntro.name, "whisper-0001");
assert.equal(payloadIntro.position, "start");

const payloadOutro = buildEventPayloadFromCuePoint(
	{
		[OUTRO]: { action: OUTRO, name: "__auto_item_1_outro_fallback_0", ref: null }
	} as any,
	OUTRO,
	"whisper-0032",
	"end"
);

assert.equal(payloadOutro.action, OUTRO);
assert.equal(payloadOutro.name, "whisper-0032-end");
assert.equal(payloadOutro.position, "end");

console.log("event edit default explicit smoke: all checks passed");
