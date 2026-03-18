import assert from "node:assert/strict";

import type { SceneComp } from "@/api/db";
import { createCapsuleRenderable } from "@/player/builder/entities";

const snapshot = buildSnapshot();
const renderable = createCapsuleRenderable(snapshot.capsules[29], snapshot, {}, 0);

assert.ok(renderable, "capsule renderable must exist");
assert.equal(
	renderable?.initial?.move,
	"capsule__27",
	"capsule with outro-only event must stay attached initially"
);

console.log("capsule outro-only initial attach smoke: all checks passed");

function buildSnapshot(): SceneComp {
	return {
		id: 9,
		title: "scene-9",
		main: 27,
		events: {
			81: {
				outro: {
					id: 93,
					action: "outro",
					name: "__auto_item_81_outro_fallback_5000",
					ref: "swipe-top",
					duration: null,
					delay: null,
					position: null,
					itemId: 81,
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
				itemIds: [81],
				defaultItemIntroTransition: null,
				defaultItemOutroTransition: null,
				itemDurationMode: "auto",
				itemDurationSec: null,
				profil: null
			},
			29: {
				id: 29,
				name: "Capsule",
				type: "grille",
				grid: "ed-grid-w4-h1",
				itemIds: [],
				defaultItemIntroTransition: null,
				defaultItemOutroTransition: null,
				itemDurationMode: "auto",
				itemDurationSec: null,
				profil: null
			}
		},
		items: {
			81: {
				id: 81,
				order: 1,
				contentId: 43,
				capsuleId: 27,
				decorId: null,
				visible: true,
				eventIds: []
			}
		},
		contents: {
			43: {
				id: 43,
				name: "Capsule",
				type: "capsule",
				path: null,
				inner: null,
				lang: null,
				capsuleId: 29,
				timestamp: "[]"
			}
		},
		decors: {}
	};
}
