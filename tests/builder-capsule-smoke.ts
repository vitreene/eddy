import assert from "node:assert/strict";

import type { SceneComp } from "../app/api/db";
import { buildScene } from "../app/player/builder";
import {
	resolveClosestCuePointFromDelay,
	resolveDelayFromCuePoint
} from "../app/scene-runtime/visibility/custom-event-cue-mapping";

type Case = { name: string; run: () => void };

function createSceneBase(): SceneComp {
	return {
		id: 1,
		title: "builder-smoke",
		main: 1,
		events: {
			100: {
				intro: { name: "capsule-intro", action: "intro", ref: "fade" } as any,
				outro: { name: "capsule-outro", action: "outro", ref: "fade" } as any
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
			1: {
				id: 1,
				name: "main",
				type: null,
				grid: "ed-grid-w1-h1",
				itemDurationMode: "auto",
				itemDurationSec: null,
				itemIds: [100]
			},
			2: {
				id: 2,
				name: "child",
				type: null,
				grid: "ed-grid-w1-h1",
				itemDurationMode: "auto",
				itemDurationSec: null,
				itemIds: [1, 2, 3]
			}
		},
		items: {
			100: { id: 100, order: 1000, contentId: 900, capsuleId: 1, decorId: 10, visible: true, eventIds: [] },
			1: { id: 1, order: 1000, contentId: 1, capsuleId: 2, decorId: 11, visible: true, eventIds: [] },
			2: { id: 2, order: 2000, contentId: 2, capsuleId: 2, decorId: 12, visible: true, eventIds: [] },
			3: { id: 3, order: 3000, contentId: 3, capsuleId: 2, decorId: 13, visible: true, eventIds: [] }
		},
		contents: {
			900: {
				id: 900,
				name: "child-capsule",
				type: "capsule",
				path: null,
				inner: null,
				lang: null,
				timestamp: "[]",
				capsuleId: 2
			},
			1: {
				id: 1,
				name: "img-1",
				type: "img",
				path: "a.jpg",
				inner: null,
				lang: null,
				timestamp: "[]",
				capsuleId: null
			},
			2: {
				id: 2,
				name: "img-2",
				type: "img",
				path: "b.jpg",
				inner: null,
				lang: null,
				timestamp: "[]",
				capsuleId: null
			},
			3: {
				id: 3,
				name: "img-3",
				type: "img",
				path: "c.jpg",
				inner: null,
				lang: null,
				timestamp: "[]",
				capsuleId: null
			}
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
		name: "img uses native img tag and src mapping",
		run: () => {
			const context = createSceneBase();
			context.decors[11].style = {
				backgroundSize: "cover",
				backgroundPosition: "right bottom",
				backgroundRepeat: "no-repeat",
				backgroundColor: "#ffffff"
			};
			const scene = buildScene(context);
			const item1 = getItemPerso(scene, 1);

			assert.equal(item1.initial.tag, "img");
			assert.equal(typeof item1.initial.src, "string");
			assert.equal(item1.initial.src.includes("a.jpg"), true);
			assert.equal(item1.initial.style.backgroundImage, undefined);
			assert.equal(item1.initial.style.backgroundSize, undefined);
			assert.equal(item1.initial.style.backgroundPosition, undefined);
			assert.equal(item1.initial.style.backgroundRepeat, undefined);
			assert.equal(item1.initial.style.objectFit, "cover");
			assert.equal(item1.initial.style.objectPosition, undefined);
			assert.equal(item1.initial.className.includes("ed-static-"), true);
			assert.equal(item1.initial.style.backgroundColor, "#ffffff");
		}
	},
	{
		name: "sprite defaults to contain object-fit",
		run: () => {
			const context = createSceneBase();
			context.contents[1].type = "sprite" as any;
			context.decors[11].style = {
				backgroundPosition: "right bottom"
			};

			const scene = buildScene(context);
			const item1 = getItemPerso(scene, 1);

			assert.equal(item1.initial.tag, "img");
			assert.equal(typeof item1.initial.src, "string");
			assert.equal(item1.initial.src.includes("a.jpg"), true);
			assert.equal(item1.initial.style.objectFit, "contain");
			assert.equal(item1.initial.style.objectPosition, undefined);
			assert.equal(item1.initial.className.includes("ed-static-"), true);
		}
	},
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
				intro: { name: "mid-intro", action: "intro", ref: "fade" } as any,
				outro: { name: "mid-outro", action: "outro", ref: "fade" } as any
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
			context.capsules[2].defaultItemIntroTransition = { action: "intro", ref: "swipe-left" };
			context.capsules[2].defaultItemOutroTransition = { action: "outro", ref: "swipe-left" };

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
			context.capsules[1].defaultItemIntroTransition = { action: "intro", ref: "swipe-right" };
			context.capsules[1].defaultItemOutroTransition = { action: "outro", ref: "swipe-right" };

			const scene = buildScene(context);
			const item1 = getItemPerso(scene, 1);
			const introKey = getItemActionName(scene, 1, "intro");

			assert.equal(item1.actions[introKey].style.x, undefined);
			assert.equal(item1.actions[introKey].style.opacity?.from, 0);
		}
	},
	{
		name: "zoom transition uses scale to 1 on intro",
		run: () => {
			const context = createSceneBase();
			context.events[1] = {
				intro: { ...context.events[1]?.intro, action: "intro", ref: "zoom", name: "c2" },
				outro: { ...context.events[1]?.outro, action: "outro", ref: "zoom", name: "c3" }
			} as any;

			const scene = buildScene(context);
			const item1 = getItemPerso(scene, 1);
			const introKey = getItemActionName(scene, 1, "intro");

			assert.equal(item1.actions[introKey].style.scale?.from, 0.2);
			assert.equal(item1.actions[introKey].style.scale?.to, 1);
		}
	},
	{
		name: "cut transition has empty style",
		run: () => {
			const context = createSceneBase();
			context.events[1] = {
				intro: { ...context.events[1]?.intro, action: "intro", ref: "cut", name: "c2" },
				outro: { ...context.events[1]?.outro, action: "outro", ref: "cut", name: "c3" }
			} as any;

			const scene = buildScene(context);
			const item1 = getItemPerso(scene, 1);
			const introKey = getItemActionName(scene, 1, "intro");
			const outroKey = getItemActionName(scene, 1, "outro");

			assert.deepEqual(item1.actions[introKey].style, {});
			assert.deepEqual(item1.actions[outroKey].style, {});
		}
	},
	{
		name: "degenerate auto windows become maximal auto events",
		run: () => {
			const context = createSceneBase();
			context.events[2] = {
				intro: { name: "capsule-intro", action: "intro", ref: "fade" } as any,
				outro: { name: "capsule-outro", action: "outro", ref: "fade" } as any
			};

			const scene = buildScene(context);
			const starts = getActionStarts(scene);
			const i1In = getItemActionName(scene, 1, "intro");
			const i1Out = getItemActionName(scene, 1, "outro");

			assert.equal(i1In.startsWith("__auto_maximal__"), true);
			assert.equal(i1Out.startsWith("__auto_maximal__"), true);
			assert.equal(starts.get(i1In), 2000);
			assert.equal(starts.get(i1Out), 8000);
		}
	},
	{
		name: "hidden item is ignored by builder",
		run: () => {
			const context = createSceneBase();
			context.items[1].visible = false;

			const scene = buildScene(context);
			const item1 = getItemPerso(scene, 1);
			assert.equal(Boolean(item1), false);
		}
	},
	{
		name: "hidden capsule host hides capsule and descendants",
		run: () => {
			const context = createSceneBase();
			context.items[100].visible = false;
			context.items[2].visible = false;

			const scene = buildScene(context);
			const capsule = scene.persos.find((perso: any) => perso?.initial?.id === "capsule__2");
			const childItem2 = getItemPerso(scene, 2);
			assert.equal(Boolean(capsule), false);
			assert.equal(Boolean(childItem2), false);
		}
	},
	{
		name: "line type does not auto-generate outro for child items",
		run: () => {
			const context = createSceneBase();
			context.capsules[2].type = "rangee" as any;
			context.capsules[2].grid = "ed-grid-w3-h1";

			const scene = buildScene(context);
			const item1 = getItemPerso(scene, 1);
			const actionKeys = Object.keys(item1.actions);

			const hasAutoIntro = actionKeys.some((key) => key.includes("item_1_intro"));
			const hasAutoOutro = actionKeys.some((key) => key.includes("item_1_outro"));

			assert.equal(hasAutoIntro, true);
			assert.equal(hasAutoOutro, false);
		}
	},
	{
		name: "line vertical preserves explicit areas when provided",
		run: () => {
			const context = createSceneBase();
			context.capsules[2].type = "rangee" as any;
			context.capsules[2].grid = "ed-grid-w1-h3";
			context.decors[11].area = "cell-r1-c2" as any;
			context.decors[12].area = "cell-r1-c1" as any;
			context.decors[13].area = "cell-r1-c3" as any;

			const scene = buildScene(context);
			const i1 = getItemPerso(scene, 1);
			const i2 = getItemPerso(scene, 2);
			const i3 = getItemPerso(scene, 3);

			assert.equal(i1.initial.className.includes("cell-r1-c2"), true);
			assert.equal(i2.initial.className.includes("cell-r1-c1"), true);
			assert.equal(i3.initial.className.includes("cell-r1-c3"), true);
		}
	},
	{
		name: "list type generates liste-rN classes without area css constraints",
		run: () => {
			const context = createSceneBase();
			context.capsules[2].type = "liste" as any;
			context.capsules[2].grid = "liste-vertical";

			const scene = buildScene(context);
			const i1 = getItemPerso(scene, 1);
			const i2 = getItemPerso(scene, 2);
			const i3 = getItemPerso(scene, 3);

			assert.equal(i1.initial.className.includes("liste-r1"), true);
			assert.equal(i2.initial.className.includes("liste-r2"), true);
			assert.equal(i3.initial.className.includes("liste-r3"), true);
			assert.equal((scene.styles || "").includes(".liste-r1{"), false);
		}
	},
	{
		name: "fixed item duration mode spaces intros by configured seconds",
		run: () => {
			const context = createSceneBase();
			(context.capsules[2] as any).itemDurationMode = "fixed";
			(context.capsules[2] as any).itemDurationSec = 2;

			const scene = buildScene(context);
			const starts = getActionStarts(scene);
			const i1In = getItemActionName(scene, 1, "intro");
			const i2In = getItemActionName(scene, 2, "intro");
			const i3In = getItemActionName(scene, 3, "intro");

			assert.equal(starts.get(i1In), 2000);
			assert.equal(starts.get(i2In), 4000);
			assert.equal(starts.get(i3In), 6000);
		}
	},
	{
		name: "custom event name+position maps to cue middle time",
		run: () => {
			const context = createSceneBase();
			context.sceneContents[1].events.push({ name: "custom-cue", text: "", start: 4, end: 6 } as any);
			context.events[1] = {
				intro: { name: "capsule-intro", action: "intro", ref: "fade" } as any,
				outro: { name: "capsule-outro", action: "outro", ref: "fade" } as any,
				"custom-1": {
					name: "custom-cue",
					action: "custom-1",
					position: "middle",
					ref: null
				} as any
			};

			const scene = buildScene(context);
			const starts = getActionStarts(scene);
			assert.equal(starts.get("custom-cue-custom-1"), 5000);
		}
	},
	{
		name: "custom event duration overrides interpolation duration",
		run: () => {
			const context = createSceneBase();
			context.sceneContents[1].events.push({ name: "custom-cue", text: "", start: 5, end: 5 } as any);
			context.decors[21] = {
				id: 21,
				name: null,
				className: "",
				area: "",
				style: { opacity: 0.25 },
				itemTargetId: null,
				basedUpon: null
			} as any;
			context.events[1] = {
				intro: { name: "capsule-intro", action: "intro", ref: "fade" } as any,
				outro: { name: "capsule-outro", action: "outro", ref: "fade" } as any,
				"custom-1": {
					name: "custom-cue",
					action: "custom-1",
					position: "start",
					duration: 1.5,
					decorId: 21,
					ref: null
				} as any
			};

			const scene = buildScene(context);
			const item1 = getItemPerso(scene, 1);
			const customKey = Object.keys(item1.actions).find((key) => key.endsWith("-custom-1"));
			assert.ok(customKey);
			assert.equal(item1.actions[customKey!].style.opacity.to, 0.25);
			assert.equal(item1.actions[customKey!].style.opacity.duration, 1500);
		}
	},
	{
		name: "main capsule children render in item.order",
		run: () => {
			const context = createSceneBase();
			context.capsules[3] = { id: 3, name: "child-2", type: null, grid: "ed-grid-w1-h1", itemIds: [] } as any;
			context.contents[901] = {
				id: 901,
				name: "child-capsule-2",
				type: "capsule",
				path: null,
				inner: null,
				lang: null,
				timestamp: "[]",
				capsuleId: 3
			} as any;
			context.decors[14] = {
				id: 14,
				name: null,
				className: "",
				area: "",
				style: {},
				itemTargetId: null,
				basedUpon: null
			} as any;
			context.items[101] = {
				id: 101,
				order: 500,
				contentId: 901,
				capsuleId: 1,
				decorId: 14,
				visible: true,
				eventIds: []
			} as any;
			context.capsules[1].itemIds = [100, 101];

			const scene = buildScene(context);
			const ids = scene.persos.map((perso: any) => perso?.initial?.id).filter(Boolean);
			const capsule2Pos = ids.indexOf("capsule__2");
			const capsule3Pos = ids.indexOf("capsule__3");

			assert.ok(capsule2Pos >= 0);
			assert.ok(capsule3Pos >= 0);
			assert.equal(capsule3Pos < capsule2Pos, true);
		}
	},
	{
		name: "delay to cue-point mapping picks nearest cue position",
		run: () => {
			const cues = [
				{ name: "intro", text: "", start: 2, end: 2 } as any,
				{ name: "a", text: "", start: 4, end: 5 } as any,
				{ name: "outro", text: "", start: 8, end: 8 } as any
			];
			const point = resolveClosestCuePointFromDelay({
				cues,
				introName: "intro",
				outroName: "outro",
				delaySec: 2.6
			});

			assert.equal(point?.name, "a");
			assert.equal(point?.position, "middle");
		}
	},
	{
		name: "cue-point to delay mapping converts back from intro",
		run: () => {
			const cues = [
				{ name: "intro", text: "", start: 2, end: 2 } as any,
				{ name: "a", text: "", start: 4, end: 6 } as any,
				{ name: "outro", text: "", start: 8, end: 8 } as any
			];
			const delay = resolveDelayFromCuePoint({
				cues,
				introName: "intro",
				outroName: "outro",
				cueName: "a",
				position: "middle"
			});

			assert.equal(delay, 3);
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
