import assert from "node:assert/strict";
import { createActor } from "xstate";

import type { SceneComp } from "../app/api/db";
import { buildUniqueCustomEventName, normalizeCustomEventDraft } from "../app/config/custom-events";
import {
	resolveClosestCuePointFromDelay,
	resolveDelayFromCuePoint
} from "../app/scene-runtime/visibility/custom-event-cue-mapping";
import { shouldPersistEventPayload } from "../app/api/content";
import { sceneLogic } from "../app/provider/scene-logic";

type Case = { name: string; run: () => void };

function createSceneBase(): SceneComp {
	return {
		id: 1,
		title: "custom-events-smoke",
		main: 1,
		events: {
			10: {
				intro: { id: 1, action: "intro", name: "intro-cue", ref: "fade", itemId: 10, decorId: null } as any,
				outro: { id: 2, action: "outro", name: "outro-cue", ref: "fade", itemId: 10, decorId: null } as any
			}
		},
		sceneContents: {
			1: {
				id: 1,
				contentId: 100,
				sceneId: 1,
				order: 1,
				events: [
					{ name: "intro-cue", text: "", start: 2, end: 2 },
					{ name: "middle-cue", text: "", start: 4, end: 6 },
					{ name: "outro-cue", text: "", start: 8, end: 8 }
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
			200: { id: 200, name: null, className: "", area: "", style: {}, itemTargetId: null, basedUpon: null }
		},
		theme: { id: 1, custom: "", generated: "" } as any
	};
}

const cases: Case[] = [
	{
		name: "buildUniqueCustomEventName enforces unique names",
		run: () => {
			const name = buildUniqueCustomEventName(["custom-event", "custom-event-2", "x"]);
			assert.equal(name, "custom-event-3");
		}
	},
	{
		name: "normalizeCustomEventDraft enforces name/delay exclusivity",
		run: () => {
			const fromName = normalizeCustomEventDraft({ action: "custom-1", name: "go", delay: 2.5 });
			assert.equal(fromName.name, "go");
			assert.equal(fromName.delay, null);

			const fromDelay = normalizeCustomEventDraft({ action: "custom-1", name: "", delay: 2.5 });
			assert.equal(fromDelay.name, null);
			assert.equal(fromDelay.delay, 2.5);
		}
	},
	{
		name: "cue mapping converts delay and reverse mapping",
		run: () => {
			const cues = [
				{ name: "intro", text: "", start: 2, end: 2 } as any,
				{ name: "word", text: "", start: 4, end: 6 } as any,
				{ name: "outro", text: "", start: 8, end: 8 } as any
			];

			const point = resolveClosestCuePointFromDelay({
				cues,
				introName: "intro",
				outroName: "outro",
				delaySec: 3
			});
			assert.equal(point?.name, "word");
			assert.equal(point?.position, "middle");

			const delay = resolveDelayFromCuePoint({
				cues,
				introName: "intro",
				outroName: "outro",
				cueName: "word",
				position: "middle"
			});
			assert.equal(delay, 3);
		}
	},
	{
		name: "cue mapping prefers in-bounds point around seek",
		run: () => {
			const cues = [
				{ name: "before", text: "", start: 0.2, end: 0.45 } as any,
				{ name: "intro", text: "", start: 0.5, end: 0.66 } as any,
				{ name: "next", text: "", start: 1.2, end: 1.4 } as any,
				{ name: "outro", text: "", start: 3, end: 3.2 } as any
			];

			const point = resolveClosestCuePointFromDelay({
				cues,
				introName: "intro",
				outroName: "outro",
				delaySec: 0
			});

			assert.equal(point?.name, "intro");
			assert.equal(point?.position, "start");
		}
	},
	{
		name: "sceneLogic create/update/delete custom event",
		run: () => {
			const actor = createActor(sceneLogic, { input: createSceneBase() });
			actor.start();
			actor.send({ type: "init", payload: createSceneBase() });
			actor.send({ type: "active-set", payload: { itemId: 10, contentId: 100 } });

			actor.send({ type: "custom-event-create", payload: {} });
			const afterCreate = actor.getSnapshot().context;
			const created = afterCreate.events[10]["custom-1"] as any;
			assert.ok(created);
			assert.equal(afterCreate.active.event, "custom-1");
			assert.equal(typeof created.name, "string");
			assert.ok(created.name.length > 0);
			assert.equal(created.delay, null);

			actor.send({ type: "custom-event-update", payload: { action: "custom-1", name: "middle-cue" } });
			const afterName = actor.getSnapshot().context.events[10]["custom-1"] as any;
			assert.equal(afterName.name, "middle-cue");
			assert.equal(afterName.delay, null);

			actor.send({ type: "custom-event-update", payload: { action: "custom-1", name: "", delay: 1.2 } });
			const afterDelay = actor.getSnapshot().context.events[10]["custom-1"] as any;
			assert.equal(afterDelay.name, null);
			assert.equal(afterDelay.delay, 1.2);

			actor.send({ type: "custom-event-delete", payload: { action: "custom-1" } });
			const afterDelete = actor.getSnapshot().context;
			assert.equal(Boolean(afterDelete.events[10]["custom-1"]), false);
			assert.equal(afterDelete.active.event, null);

			actor.stop();
		}
	},
	{
		name: "sceneLogic custom create snaps to nearest in-bounds cue at seek",
		run: () => {
			const base = createSceneBase();
			(base.sceneContents[1] as any).events = [
				{ name: "before-intro", text: "", start: 1.6, end: 1.9 },
				{ name: "intro-cue", text: "", start: 2, end: 2 },
				{ name: "middle-cue", text: "", start: 4, end: 6 },
				{ name: "outro-cue", text: "", start: 8, end: 8 }
			] as any;

			const actor = createActor(sceneLogic, { input: base });
			actor.start();
			actor.send({ type: "init", payload: base });
			actor.send({ type: "active-set", payload: { itemId: 10, contentId: 100, cue: 2 } });
			actor.send({ type: "custom-event-create", payload: {} });

			const created = actor.getSnapshot().context.events[10]["custom-1"] as any;
			assert.ok(created);
			assert.equal(created.name, "intro-cue");
			assert.equal(created.position, "start");
			assert.equal(created.delay, null);

			actor.stop();
		}
	},
	{
		name: "sceneLogic custom create keeps payload persistable without cue mapping",
		run: () => {
			const base = createSceneBase();
			(base.sceneContents[1] as any).events = [];
			(base.events[10] as any).intro.name = null;
			(base.events[10] as any).outro.name = null;

			const actor = createActor(sceneLogic, { input: base });
			actor.start();
			actor.send({ type: "init", payload: base });
			actor.send({ type: "active-set", payload: { itemId: 10, contentId: 100, cue: null } });
			actor.send({ type: "custom-event-create", payload: {} });

			const created = actor.getSnapshot().context.events[10]["custom-1"] as any;
			assert.ok(created);
			assert.equal(created.name, null);
			assert.equal(created.delay, 0);
			assert.equal(shouldPersistEventPayload(created.action, created), true);

			actor.stop();
		}
	}
];

for (const testCase of cases) {
	testCase.run();
	console.log(`OK: ${testCase.name}`);
}

console.log("custom events smoke: all checks passed");
