import assert from "node:assert/strict";

import type { SceneComp } from "../app/api/db";
import { buildScene } from "../app/player/builder/builder";

type Case = { name: string; run: () => void };

function createSceneBase(): SceneComp {
	return {
		id: 1,
		title: "builder-smoke",
		main: 1,
		events: {
			100: {
				intro: { name: "capsule-intro", action: "intro", ref: "fadeIn" } as any,
				outro: { name: "capsule-outro", action: "outro", ref: "fadeOut" } as any
			}
		},
		sceneContents: {
			1: {
				id: 1,
				contentId: 900,
				sceneId: 1,
				order: 1,
				events: [
					{ name: "capsule-intro", text: "", start: 2, end: 2 },
					{ name: "mid-intro", text: "", start: 3, end: 3 },
					{ name: "mid-outro", text: "", start: 7, end: 7 },
					{ name: "capsule-outro", text: "", start: 8, end: 8 }
				]
			}
		},
		capsules: {
			1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [100] },
			2: { id: 2, name: "child", type: null, grid: "ed-grid-w1-h1", itemIds: [1, 2, 3] }
		},
		items: {
			100: { id: 100, order: 1000, contentId: 900, capsuleId: 1, decorId: 10, eventIds: [] },
			1: { id: 1, order: 1000, contentId: 1, capsuleId: 2, decorId: 11, eventIds: [] },
			2: { id: 2, order: 2000, contentId: 2, capsuleId: 2, decorId: 12, eventIds: [] },
			3: { id: 3, order: 3000, contentId: 3, capsuleId: 2, decorId: 13, eventIds: [] }
		},
		contents: {
			900: {
				id: 900,
				name: "child-capsule",
				type: "capsule",
				path: null,
				inner: null,
				lang: null,
				capsuleId: 2
			},
			1: { id: 1, name: "img-1", type: "img", path: "a.jpg", inner: null, lang: null, capsuleId: null },
			2: { id: 2, name: "img-2", type: "img", path: "b.jpg", inner: null, lang: null, capsuleId: null },
			3: { id: 3, name: "img-3", type: "img", path: "c.jpg", inner: null, lang: null, capsuleId: null }
		},
		decors: {
			10: { id: 10, name: null, className: "", area: "", style: {}, itemTargetId: null, basedUpon: null },
			11: { id: 11, name: null, className: "", area: "", style: {}, itemTargetId: null, basedUpon: null },
			12: { id: 12, name: null, className: "", area: "", style: {}, itemTargetId: null, basedUpon: null },
			13: { id: 13, name: null, className: "", area: "", style: {}, itemTargetId: null, basedUpon: null }
		}
	};
}

function getActionStarts(scene: ReturnType<typeof buildScene>) {
	const starts = new Map<string, number>();
	for (const [time, list] of scene.events.entries()) {
		const events = Array.isArray(list) ? list : [list];
		for (const event of events) {
			if (event?.name) starts.set(event.name, time);
		}
	}
	return starts;
}

function getItemPerso(scene: ReturnType<typeof buildScene>, itemId: number) {
	return scene.persos.find((perso: any) => perso?.initial?.id === `item__${itemId}`) as any;
}

function getItemActionName(scene: ReturnType<typeof buildScene>, itemId: number, action: "intro" | "outro") {
	const item = getItemPerso(scene, itemId);
	assert.ok(item, `item perso ${itemId} not found`);
	const key = Object.keys(item.actions || {}).find((k) => k.endsWith(`-${action}`));
	assert.ok(key, `action ${action} not found on item ${itemId}`);
	return key;
}

const cases: Case[] = [
	{
		name: "auto distribution 3 items in capsule window",
		run: () => {
			const context = createSceneBase();
			const scene = buildScene(context);
			const starts = getActionStarts(scene);

			const i1In = getItemActionName(scene, 1, "intro");
			const i1Out = getItemActionName(scene, 1, "outro");
			const i2In = getItemActionName(scene, 2, "intro");
			const i2Out = getItemActionName(scene, 2, "outro");
			const i3In = getItemActionName(scene, 3, "intro");
			const i3Out = getItemActionName(scene, 3, "outro");

			assert.equal(starts.get(i1In), 2000);
			assert.equal(starts.get(i1Out), 4000);
			assert.equal(starts.get(i2In), 4000);
			assert.equal(starts.get(i2Out), 6000);
			assert.equal(starts.get(i3In), 6000);
			assert.equal(starts.get(i3Out), 8000);
		}
	},
	{
		name: "override middle item and split remaining equally",
		run: () => {
			const context = createSceneBase();
			context.events[2] = {
				intro: { name: "mid-intro", action: "intro", ref: "fadeIn" } as any,
				outro: { name: "mid-outro", action: "outro", ref: "fadeOut" } as any
			};

			const scene = buildScene(context);
			const starts = getActionStarts(scene);

			const i1In = getItemActionName(scene, 1, "intro");
			const i1Out = getItemActionName(scene, 1, "outro");
			const i2In = getItemActionName(scene, 2, "intro");
			const i2Out = getItemActionName(scene, 2, "outro");
			const i3In = getItemActionName(scene, 3, "intro");
			const i3Out = getItemActionName(scene, 3, "outro");

			assert.equal(starts.get(i1In), 2000);
			assert.equal(starts.get(i1Out), 3000);
			assert.equal(starts.get(i2In), 3000);
			assert.equal(starts.get(i2Out), 7000);
			assert.equal(starts.get(i3In), 7000);
			assert.equal(starts.get(i3Out), 8000);
		}
	},
	{
		name: "capsule default transitions apply to child items",
		run: () => {
			const context = createSceneBase();
			context.capsules[2].defaultItemIntroTransition = { action: "intro", ref: "swipeLeftIn" };
			context.capsules[2].defaultItemOutroTransition = { action: "outro", ref: "swipeLeftOut" };

			const scene = buildScene(context);
			const item1 = getItemPerso(scene, 1);
			const introKey = getItemActionName(scene, 1, "intro");
			const outroKey = getItemActionName(scene, 1, "outro");

			assert.equal(item1.actions[introKey].style.x?.from, -250);
			assert.equal(item1.actions[outroKey].style.x?.to, -250);
		}
	},
	{
		name: "no transitive transition inheritance across capsules",
		run: () => {
			const context = createSceneBase();
			context.capsules[1].defaultItemIntroTransition = { action: "intro", ref: "swipeRightIn" };
			context.capsules[1].defaultItemOutroTransition = { action: "outro", ref: "swipeRightOut" };

			const scene = buildScene(context);
			const item1 = getItemPerso(scene, 1);
			const introKey = getItemActionName(scene, 1, "intro");

			assert.equal(item1.actions[introKey].style.x, undefined);
			assert.equal(item1.actions[introKey].style.opacity?.from, 0);
		}
	},
	{
		name: "missing decor does not crash builder",
		run: () => {
			const context = createSceneBase();
			context.items[1].decorId = null as any;
			const scene = buildScene(context);
			assert.ok(scene.persos.length > 0);
		}
	}
];

for (const testCase of cases) {
	testCase.run();
	console.log(`OK: ${testCase.name}`);
}

console.log("builder capsule smoke: all checks passed");
