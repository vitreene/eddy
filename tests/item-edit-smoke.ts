import assert from "node:assert/strict";

import type { SceneComp, Decor } from "../app/api/db";
import { mergeDecorChain, resolveDecorBeforeCustomEvent } from "../app/parts/item-edit/item-edit.helpers";

type Case = { name: string; run: () => void };

function makeDecor(id: number, patch: Partial<Decor>): Decor {
	return {
		id,
		name: null,
		className: "",
		area: "",
		style: {},
		itemTargetId: null,
		basedUpon: null,
		...patch
	} as Decor;
}

function createSceneBase(): SceneComp {
	return {
		id: 1,
		title: "item-edit-smoke",
		main: 1,
		events: {
			10: {
				intro: { id: 1, action: "intro", name: "cue-intro", itemId: 10, decorId: null, ref: "fade" } as any,
				outro: { id: 2, action: "outro", name: "cue-outro", itemId: 10, decorId: null, ref: "fade" } as any,
				"custom-1": {
					id: 3,
					action: "custom-1",
					name: "cue-a",
					position: "start",
					itemId: 10,
					decorId: 201,
					ref: null
				} as any,
				"custom-2": {
					id: 4,
					action: "custom-2",
					name: "cue-b",
					position: "start",
					itemId: 10,
					decorId: 202,
					ref: null
				} as any,
				"custom-3": {
					id: 5,
					action: "custom-3",
					name: "cue-c",
					position: "start",
					itemId: 10,
					decorId: 203,
					ref: null
				} as any
			}
		},
		sceneContents: {
			1: {
				id: 1,
				contentId: 100,
				sceneId: 1,
				order: 1,
				events: [
					{ name: "cue-intro", text: "intro", start: 1, end: 1 },
					{ name: "cue-a", text: "A", start: 2, end: 2 },
					{ name: "cue-b", text: "B", start: 3, end: 3 },
					{ name: "cue-c", text: "C", start: 4, end: 4 },
					{ name: "cue-outro", text: "outro", start: 8, end: 8 }
				]
			}
		},
		capsules: {
			1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [10] } as any
		},
		items: {
			10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 200, visible: true, eventIds: [1, 2] }
		},
		contents: {
			100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
		},
		decors: {
			200: makeDecor(200, {
				style: { x: 10, y: 20, scaleX: 1, scaleY: 1 },
				className: "base",
				area: "cell-r1-c1"
			}),
			201: makeDecor(201, { style: { x: 50, y: 80, rotate: 15 } }),
			202: makeDecor(202, { style: {} }),
			203: makeDecor(203, { style: { scaleX: 1.2, scaleY: 1.1 } })
		}
	};
}

const cases: Case[] = [
	{
		name: "mergeDecorChain preserves base class and area when override is neutral",
		run: () => {
			const base = makeDecor(1, { className: "base", area: "cell-r1-c1", style: { x: 12 } });
			const neutral = makeDecor(2, { className: null, area: null, style: {} as any });
			const merged = mergeDecorChain(base, neutral)!;

			assert.equal(merged.className, "base");
			assert.equal(merged.area, "cell-r1-c1");
			assert.equal((merged.style as any).x, 12);
		}
	},
	{
		name: "resolveDecorBeforeCustomEvent keeps previous custom state as live baseline",
		run: () => {
			const scene = createSceneBase();
			const base = scene.decors[200];
			const resolved = resolveDecorBeforeCustomEvent(scene, 10, "custom-3", base);

			assert.ok(resolved);
			assert.equal((resolved!.style as any).x, 50);
			assert.equal((resolved!.style as any).y, 80);
			assert.equal((resolved!.style as any).rotate, 15);
		}
	},
	{
		name: "custom event without decor delta remains a reference step",
		run: () => {
			const scene = createSceneBase();
			const base = scene.decors[200];
			const resolved = resolveDecorBeforeCustomEvent(scene, 10, "custom-3", base);

			assert.ok(resolved);
			assert.equal((resolved!.style as any).x, 50);
			assert.equal((resolved!.style as any).y, 80);
			assert.equal((resolved!.style as any).rotate, 15);
		}
	}
];

for (const testCase of cases) {
	testCase.run();
	console.log(`OK: ${testCase.name}`);
}

console.log("item edit smoke: all checks passed");
