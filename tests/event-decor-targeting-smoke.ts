import assert from "node:assert/strict";

import { INTRO, OUTRO } from "../app/config/constants";
import { ensureEventDecorId } from "../app/provider/scene-logic.decor";

type MockResponse = {
	ok: boolean;
	json: () => Promise<unknown>;
};

const originalFetch = globalThis.fetch;

let fetchCalls = 0;
globalThis.fetch = (async () => {
	fetchCalls += 1;
	const payload = { decorId: 999 + fetchCalls };
	return {
		ok: true,
		json: async () => payload
	} as MockResponse as Response;
}) as typeof fetch;

const context: any = {
	items: {
		10: { id: 10, decorId: 200 }
	},
	events: {
		10: {
			[INTRO]: { action: INTRO, itemId: 10, decorId: 200 },
			[OUTRO]: { action: OUTRO, itemId: 10, decorId: 200 },
			"custom-1": { action: "custom-1", itemId: 10, decorId: 200 }
		}
	},
	decors: {}
};

try {
	const intro = await ensureEventDecorId({ context, itemId: 10, action: INTRO });
	assert.equal(intro.decorId, 200, "intro should keep shared item decor id");
	assert.equal(fetchCalls, 0, "intro should not trigger decor creation");

	const outro = await ensureEventDecorId({ context, itemId: 10, action: OUTRO });
	assert.equal(outro.decorId, 1000, "outro should allocate a dedicated event decor");
	assert.ok(outro.createdDecor, "outro should return created decor payload");
	assert.equal(fetchCalls, 1, "outro should trigger one decor creation");

	const custom = await ensureEventDecorId({ context, itemId: 10, action: "custom-1" });
	assert.equal(custom.decorId, 1001, "custom should allocate a dedicated event decor");
	assert.ok(custom.createdDecor, "custom should return created decor payload");
	assert.equal(fetchCalls, 2, "custom should trigger a second decor creation");

	console.log("event decor targeting smoke: all checks passed");
} finally {
	globalThis.fetch = originalFetch;
}
