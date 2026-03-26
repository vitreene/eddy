import assert from "node:assert/strict";

import type { SceneComp } from "../app/api/db";
import { buildScene } from "../app/player/builder";

function createVideoMediaScene(): SceneComp {
	return {
		id: 1,
		title: "event-media-action",
		main: 1,
		events: {
			10: {
				intro: {
					action: "intro",
					name: "cue-intro",
					ref: { transition: "fade", media: { action: "play", offset: 1.25 } }
				} as any,
				outro: {
					action: "outro",
					name: "cue-outro",
					ref: { transition: "fade", media: { action: "pause", offset: 0 } }
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
					{ name: "cue-intro", text: "", start: 1, end: 1 },
					{ name: "cue-outro", text: "", start: 4, end: 4 }
				]
			}
		},
		capsules: {
			1: { id: 1, name: "main", type: "carrousel" as any, grid: "ed-grid-w1-h1", itemIds: [10] } as any
		},
		items: {
			10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 10, visible: true, eventIds: [] } as any
		},
		contents: {
			100: {
				id: 100,
				name: "video",
				type: "video",
				path: "v.mp4",
				inner: null,
				lang: null,
				timestamp: "[]",
				capsuleId: null
			} as any
		},
		decors: {
			10: { id: 10, name: null, className: "", area: "", style: {}, itemTargetId: null, basedUpon: null } as any
		}
	};
}

function createVideoDefaultMediaScene(): SceneComp {
	const base = createVideoMediaScene();
	(base.events[10].intro as any).ref = { transition: "fade" };
	(base.events[10].outro as any).ref = { transition: "fade" };
	return base;
}

const built = buildScene(createVideoMediaScene());
const item = built.persos.find((perso: any) => perso?.initial?.id === "item__10") as any;

assert.ok(item, "video item should exist");
const introActionName = Object.keys(item.actions).find((key) => key.endsWith("-intro"));
const outroActionName = Object.keys(item.actions).find((key) => key.endsWith("-outro"));

assert.ok(introActionName, "intro action should be generated");
assert.ok(outroActionName, "outro action should be generated");
assert.equal(item.actions[introActionName!].media.action, "play");
assert.equal(item.actions[introActionName!].media.offset, 1250);
assert.equal(item.actions[introActionName!].media.changeAt, 0);
assert.equal(item.actions[outroActionName!].media.action, "pause");
assert.equal(item.actions[outroActionName!].media.offset, 0);
assert.equal(item.actions[outroActionName!].media.changeAt, 0);

const builtDefault = buildScene(createVideoDefaultMediaScene());
const itemDefault = builtDefault.persos.find((perso: any) => perso?.initial?.id === "item__10") as any;
const introDefaultActionName = Object.keys(itemDefault.actions).find((key) => key.endsWith("-intro"));
const outroDefaultActionName = Object.keys(itemDefault.actions).find((key) => key.endsWith("-outro"));
assert.ok(introDefaultActionName, "default intro action should be generated");
assert.ok(outroDefaultActionName, "default outro action should be generated");
assert.equal(itemDefault.actions[introDefaultActionName!].media.action, "play");
assert.equal(itemDefault.actions[introDefaultActionName!].media.offset, 0);
assert.equal(itemDefault.actions[outroDefaultActionName!].media.action, "pause");
assert.equal(itemDefault.actions[outroDefaultActionName!].media.offset, 0);

console.log("event media action smoke: all checks passed");
