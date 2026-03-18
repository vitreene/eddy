import assert from "node:assert/strict";

import type { SceneComp } from "@/api/db";
import { applyCapsuleDefaultItemEvents } from "@/player/builder/derivation";
import { getOrderedEventsForItem } from "@/player/builder/events";
import { INTRO } from "@/config/constants";

const snapshot = buildFixture();
const derived = applyCapsuleDefaultItemEvents(snapshot);
const events = derived.events[78] || {};
const ordered = getOrderedEventsForItem(derived, events);
const intro = ordered.find((entry) => entry.event.action === INTRO) || null;

assert.ok(intro, "intro doit exister");
assert.ok(intro?.event.name, "intro.name doit etre renseigne");
assert.notEqual(intro?.event.name, "__auto_item_78_intro_fallback_0", "nom stale doit etre remplace");
assert.equal(typeof intro?.runtimeStartMs, "number", "intro runtimeStartMs doit etre resolu");

console.log("auto eventparams stale cue name smoke: all checks passed");

function buildFixture(): SceneComp {
	return {
		id: 9,
		title: "scene-9",
		main: 27,
		events: {
			79: {
				intro: {
					id: 90,
					action: "intro",
					name: "__auto_item_79_intro_fallback_0",
					ref: "swipe-top",
					duration: null,
					delay: null,
					position: null,
					itemId: 79,
					decorId: null
				},
				outro: {
					id: 91,
					action: "outro",
					name: "__auto_item_79_outro_fallback_5000",
					ref: "swipe-down",
					duration: null,
					delay: null,
					position: null,
					itemId: 79,
					decorId: null
				}
			},
			78: {
				intro: {
					id: 92,
					action: "intro",
					name: "__auto_item_78_intro_fallback_0",
					ref: "swipe-down",
					duration: null,
					delay: null,
					position: null,
					itemId: 78,
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
				defaultItemIntroTransition: { action: "intro", ref: "swipe-left" },
				defaultItemOutroTransition: { action: "outro", ref: "swipe-top" },
				itemDurationMode: "auto",
				itemDurationSec: null,
				profil: null
			}
		},
		items: {
			79: { id: 79, order: 1, contentId: 200, capsuleId: 27, decorId: null, visible: true, eventIds: [] },
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
