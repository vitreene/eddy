import assert from "node:assert/strict";

import type { SceneComp } from "@/api/db";
import { getAssuredVisibleCue, type SafeCueResult } from "@/provider/active-cue";

type Case = {
	name: string;
	build: () => { context: SceneComp; itemId: number };
	check: (result: SafeCueResult) => void;
};

const durationSec = 0.5;

function createBaseContext(): SceneComp {
	return {
		id: 1,
		title: "smoke",
		main: 1,
		events: {},
		sceneContents: {
			1: {
				id: 1,
				contentId: 1,
				sceneId: 1,
				order: 1,
				events: [
					{ name: "item-intro", text: "", start: 2, end: 2.1 },
					{ name: "parent-intro", text: "", start: 3, end: 3.1 },
					{ name: "ancestor-intro", text: "", start: 4, end: 4.1 },
					{ name: "parent-outro", text: "", start: 6, end: 6.2 },
					{ name: "scene-end", text: "", start: 10, end: 10 }
				]
			}
		},
		capsules: {
			1: { id: 1, name: "main", type: null, grid: null, itemIds: [] },
			2: { id: 2, name: "c2", type: null, grid: null, itemIds: [] },
			3: { id: 3, name: "c3", type: null, grid: null, itemIds: [] }
		},
		items: {},
		contents: {},
		decors: {}
	};
}

function addCapsuleHost(
	context: SceneComp,
	args: { hostItemId: number; hostCapsuleId: number; childCapsuleId: number }
) {
	const contentId = args.hostItemId + 1000;
	context.contents[contentId] = {
		id: contentId,
		name: `capsule-content-${contentId}`,
		type: "capsule",
		path: "",
		inner: "",
		lang: "",
		capsuleId: args.childCapsuleId
	};
	context.items[args.hostItemId] = {
		id: args.hostItemId,
		order: 1000,
		contentId,
		capsuleId: args.hostCapsuleId,
		decorId: null,
		eventIds: []
	};
}

function addLeafItem(context: SceneComp, itemId: number, capsuleId: number) {
	const contentId = itemId + 2000;
	context.contents[contentId] = {
		id: contentId,
		name: `text-content-${contentId}`,
		type: "text",
		path: "",
		inner: "leaf",
		lang: "fr",
		capsuleId: 0
	};
	context.items[itemId] = {
		id: itemId,
		order: 2000,
		contentId,
		capsuleId,
		decorId: null,
		eventIds: []
	};
}

const cases: Case[] = [
	{
		name: "item intro + parent sans intro",
		build: () => {
			const context = createBaseContext();
			addCapsuleHost(context, { hostItemId: 20, hostCapsuleId: 1, childCapsuleId: 2 });
			addLeafItem(context, 10, 2);
			context.events[10] = { intro: { name: "item-intro", action: "intro", ref: "x" } as any };
			return { context, itemId: 10 };
		},
		check: (result) => {
			assert.equal(result.cueSec, 2 + durationSec);
		}
	},
	{
		name: "item sans intro + parent intro tardif",
		build: () => {
			const context = createBaseContext();
			addCapsuleHost(context, { hostItemId: 20, hostCapsuleId: 1, childCapsuleId: 2 });
			addLeafItem(context, 10, 2);
			context.events[20] = { intro: { name: "parent-intro", action: "intro", ref: "x" } as any };
			return { context, itemId: 10 };
		},
		check: (result) => {
			assert.equal(result.cueSec, 3 + durationSec);
		}
	},
	{
		name: "capsules imbriquees avec intros successifs",
		build: () => {
			const context = createBaseContext();
			addCapsuleHost(context, { hostItemId: 30, hostCapsuleId: 1, childCapsuleId: 2 });
			addCapsuleHost(context, { hostItemId: 20, hostCapsuleId: 2, childCapsuleId: 3 });
			addLeafItem(context, 10, 3);
			context.events[20] = { intro: { name: "parent-intro", action: "intro", ref: "x" } as any };
			context.events[30] = { intro: { name: "ancestor-intro", action: "intro", ref: "x" } as any };
			return { context, itemId: 10 };
		},
		check: (result) => {
			assert.equal(result.cueSec, 4 + durationSec);
		}
	},
	{
		name: "outro parent ferme la fenetre",
		build: () => {
			const context = createBaseContext();
			addCapsuleHost(context, { hostItemId: 20, hostCapsuleId: 1, childCapsuleId: 2 });
			addLeafItem(context, 10, 2);
			context.events[10] = { intro: { name: "parent-outro", action: "intro", ref: "x" } as any };
			context.events[20] = { outro: { name: "parent-outro", action: "outro", ref: "x" } as any };
			return { context, itemId: 10 };
		},
		check: (result) => {
			assert.equal(result.cueSec, null);
			assert.equal(result.fallbackUsed, true);
		}
	},
	{
		name: "item dans main sans parent",
		build: () => {
			const context = createBaseContext();
			addLeafItem(context, 10, 1);
			context.events[10] = { intro: { name: "item-intro", action: "intro", ref: "x" } as any };
			return { context, itemId: 10 };
		},
		check: (result) => {
			assert.equal(result.cueSec, 2 + durationSec);
		}
	},
	{
		name: "donnees partielles chaine capsule incomplete",
		build: () => {
			const context = createBaseContext();
			addLeafItem(context, 10, 2);
			return { context, itemId: 10 };
		},
		check: (result) => {
			assert.equal(result.cueSec, 0);
			assert.equal(result.ancestorChain.isComplete, false);
		}
	}
];

for (const testCase of cases) {
	const { context, itemId } = testCase.build();
	const result = getAssuredVisibleCue(context, itemId);
	testCase.check(result);
	console.log(`OK: ${testCase.name}`);
}

console.log("active-cue smoke: all checks passed");
