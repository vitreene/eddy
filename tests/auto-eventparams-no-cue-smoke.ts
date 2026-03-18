import assert from "node:assert/strict";

import type { SceneComp } from "@/api/db";
import { applyCapsuleDefaultItemEvents } from "@/player/builder/derivation";
import { mapEvents } from "@/player/builder/events";
import { buildEventActionName } from "@/player/builder/lib";
import { INTRO, OUTRO } from "@/config/constants";

const snapshot = buildFixture();
const derived = applyCapsuleDefaultItemEvents(snapshot);

const hostItemEvents = derived.events[79] || {};
assert.ok(hostItemEvents[INTRO], "intro doit exister sur l'item hote");
assert.ok(hostItemEvents[OUTRO], "outro doit exister sur l'item hote");
assert.ok(hostItemEvents[INTRO]?.name, "intro.name doit etre resolu en mode auto sans cues");
assert.ok(hostItemEvents[OUTRO]?.name, "outro.name doit etre resolu en mode auto sans cues");

const timeline = mapEvents(derived);
const flat = [...timeline.values()].flat();
const introActionName = buildEventActionName(hostItemEvents[INTRO]!);
const outroActionName = buildEventActionName(hostItemEvents[OUTRO]!);

assert.ok(
	flat.some((entry) => entry.name === introActionName),
	"timeline doit contenir intro capsule hote"
);
assert.ok(
	flat.some((entry) => entry.name === outroActionName),
	"timeline doit contenir outro capsule hote"
);

console.log("auto eventparams without cues smoke: all checks passed");

function buildFixture(): SceneComp {
	return {
		id: 9,
		title: "scene-9",
		main: 27,
		events: {
			79: {
				intro: {
					id: 90,
					action: INTRO,
					name: null,
					ref: "swipe-top",
					duration: null,
					delay: null,
					position: null,
					itemId: 79,
					decorId: null
				},
				outro: {
					id: 91,
					action: OUTRO,
					name: null,
					ref: "swipe-down",
					duration: null,
					delay: null,
					position: null,
					itemId: 79,
					decorId: null
				}
			}
		},
		sceneContents: {},
		capsules: {
			27: {
				id: 27,
				name: "__MAIN__",
				type: "position",
				grid: "root-scene ed-grid-w160-h90",
				itemIds: [79],
				defaultItemIntroTransition: null,
				defaultItemOutroTransition: null,
				itemDurationMode: "auto",
				itemDurationSec: null,
				profil: null
			},
			28: {
				id: 28,
				name: "Capsule",
				type: "carrousel",
				grid: "ed-grid-w1-h1",
				itemIds: [76, 77, 78, 80],
				defaultItemIntroTransition: { action: INTRO, ref: "swipe-left" },
				defaultItemOutroTransition: { action: OUTRO, ref: "swipe-top" },
				itemDurationMode: "auto",
				itemDurationSec: null,
				profil: null
			}
		},
		items: {
			79: {
				id: 79,
				order: 1,
				contentId: 200,
				capsuleId: 27,
				decorId: null,
				visible: true,
				eventIds: []
			},
			76: { id: 76, order: 1, contentId: 301, capsuleId: 28, decorId: null, visible: true, eventIds: [] },
			77: { id: 77, order: 2, contentId: 302, capsuleId: 28, decorId: null, visible: true, eventIds: [] },
			78: { id: 78, order: 3, contentId: 303, capsuleId: 28, decorId: null, visible: true, eventIds: [] },
			80: { id: 80, order: 4, contentId: 304, capsuleId: 28, decorId: null, visible: true, eventIds: [] }
		},
		contents: {
			200: {
				id: 200,
				name: "Capsule",
				type: "capsule",
				path: null,
				inner: null,
				lang: null,
				capsuleId: 28,
				timestamp: "[]"
			},
			301: {
				id: 301,
				name: "A",
				type: "img",
				path: "/a.png",
				inner: null,
				lang: null,
				capsuleId: null,
				timestamp: "[]"
			},
			302: {
				id: 302,
				name: "B",
				type: "img",
				path: "/b.png",
				inner: null,
				lang: null,
				capsuleId: null,
				timestamp: "[]"
			},
			303: {
				id: 303,
				name: "C",
				type: "img",
				path: "/c.png",
				inner: null,
				lang: null,
				capsuleId: null,
				timestamp: "[]"
			},
			304: {
				id: 304,
				name: "D",
				type: "img",
				path: "/d.png",
				inner: null,
				lang: null,
				capsuleId: null,
				timestamp: "[]"
			}
		},
		decors: {}
	};
}
