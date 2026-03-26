import assert from "node:assert/strict";

import type { SceneComp } from "../app/api/db";
import { buildScene } from "../app/player/builder";
import { setStaticChanges } from "../app/player/deps/static-changes";
import { onUpdateStaticChanges } from "../app/player/deps/on-update";
import { Player } from "../app/player/player";

(globalThis as any).window = {
	location: {
		href: "http://localhost/"
	}
};

function createScene(): SceneComp {
	return {
		id: 1,
		title: "player-media-runtime",
		main: 1,
		events: {
			10: {
				intro: { action: "intro", name: "cue-intro", ref: { transition: "fade" } } as any,
				outro: { action: "outro", name: "cue-outro", ref: { transition: "fade" } } as any
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
			10: { id: 10, order: 1000, contentId: 200, capsuleId: 1, decorId: 10, visible: true, eventIds: [] } as any
		},
		contents: {
			100: {
				id: 100,
				name: "scene-audio",
				type: "sound",
				path: "scene.mp3",
				inner: null,
				lang: null,
				timestamp: null,
				capsuleId: null
			} as any,
			200: {
				id: 200,
				name: "video",
				type: "video",
				path: "video.mp4",
				inner: null,
				lang: null,
				timestamp: null,
				capsuleId: null
			} as any
		},
		decors: {
			10: { id: 10, name: null, className: "", area: "", style: {}, itemTargetId: null, basedUpon: null } as any
		}
	};
}

function makeMediaNode() {
	return {
		currentTime: 0,
		paused: true,
		playCalls: 0,
		pauseCalls: 0,
		play() {
			this.playCalls += 1;
			this.paused = false;
			return Promise.resolve();
		},
		pause() {
			this.pauseCalls += 1;
			this.paused = true;
		}
	};
}

const built = buildScene(createScene());
const sceneSoundPerso = built.persos.find((perso: any) => perso?.initial?.id === "scene-sound__1") as any;
const videoPerso = built.persos.find((perso: any) => perso?.initial?.id === "item__10") as any;

assert.ok(sceneSoundPerso, "scene sound perso should exist");
assert.ok(videoPerso, "video perso should exist");

const sceneSoundNode = makeMediaNode();
const videoNode = makeMediaNode();
const sceneSoundRuntimePerso = { ...sceneSoundPerso, media: sceneSoundNode };
const videoRuntimePerso = { ...videoPerso, media: videoNode };

const fakePlayer: any = {
	persos: new Map([
		[sceneSoundRuntimePerso.initial.id, sceneSoundRuntimePerso],
		[videoRuntimePerso.initial.id, videoRuntimePerso]
	]),
	eventtimes: built.events,
	persoChanges: new Map(),
	$elements: new Map([
		[sceneSoundPerso.initial.id, sceneSoundNode],
		[videoPerso.initial.id, videoNode]
	]),
	mediaStatus: new Map([
		[sceneSoundPerso.initial.id, { node: sceneSoundNode, startAt: 0, status: "pause" }],
		[videoPerso.initial.id, { node: videoNode, startAt: 0, status: "pause" }]
	]),
	timeLine: { paused: false },
	_applyChanges: (): void => {},
	_moveChange: (): undefined => undefined,
	applyMediaChanges: (Player.prototype as any).applyMediaChanges,
	executeMediaAction: (Player.prototype as any).executeMediaAction
};

setStaticChanges.call(fakePlayer);
const update = onUpdateStaticChanges.call(fakePlayer);

update({ iterationCurrentTime: 0 } as any);
update({ iterationCurrentTime: 1001 } as any);
update({ iterationCurrentTime: 4001 } as any);

assert.equal(sceneSoundNode.playCalls > 0, true, "scene sound should be played by runtime media circuit");
assert.equal(videoNode.playCalls > 0, true, "video intro should trigger node.play via runtime media circuit");
assert.equal(videoNode.pauseCalls > 0, true, "video outro should trigger node.pause via runtime media circuit");

console.log("player media runtime smoke: all checks passed");
