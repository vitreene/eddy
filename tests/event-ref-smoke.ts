import assert from "node:assert/strict";

import {
	normalizeEventRefForPersist,
	readEventTransition,
	writeEventMedia,
	writeEventTransition
} from "../app/lib/event-ref";

type Case = { name: string; run: () => void };

const cases: Case[] = [
	{
		name: "writeEventTransition stores transition key",
		run: () => {
			const next = writeEventTransition({ ref: "fade", media: { action: "pause", offset: 0 } }, "fade", "intro") as any;
			assert.equal(next.transition, "fade");
			assert.equal(typeof next.ref, "undefined");
			assert.equal(next.media.action, "pause");
		}
	},
	{
		name: "normalizeEventRefForPersist upgrades legacy intro string",
		run: () => {
			const next = normalizeEventRefForPersist({ raw: "swipe-left", kind: "intro", action: "intro" }) as any;
			assert.equal(next.transition, "swipe-left");
		}
	},
	{
		name: "normalizeEventRefForPersist upgrades legacy ref object",
		run: () => {
			const next = normalizeEventRefForPersist({
				raw: { ref: "fade", media: { action: "pause", offset: 0 } },
				kind: "outro",
				action: "outro"
			}) as any;
			assert.equal(next.transition, "fade");
			assert.equal(next.media.action, "pause");
			assert.equal(typeof next.ref, "undefined");
		}
	},
	{
		name: "writeEventMedia preserves transition payload",
		run: () => {
			const next = writeEventMedia({ transition: "fade" }, { action: "pause", offset: 2.3456, changeAt: 1.23456 }) as any;
			assert.equal(readEventTransition(next, "outro"), "fade");
			assert.equal(next.media.offset, 2.346);
			assert.equal(next.media.changeAt, 1.235);
		}
	}
];

for (const testCase of cases) {
	testCase.run();
	console.log(`OK: ${testCase.name}`);
}

console.log("event ref smoke: all checks passed");
