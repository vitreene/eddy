import assert from "node:assert/strict";

import { computeActiveCue } from "../app/provider/active-cue";

const baseScene: any = {
	id: 1,
	title: "selection-visibility-contract",
	main: 1,
	events: {
		10: {
			intro: {
				id: 1,
				action: "intro",
				name: "__auto_item_10_intro_fallback_0",
				itemId: 10,
				ref: "fade",
				decorId: null
			},
			outro: {
				id: 2,
				action: "outro",
				name: "__auto_item_10_outro_fallback_5000",
				itemId: 10,
				ref: "fade",
				decorId: null
			}
		}
	},
	sceneContents: {
		1: {
			id: 1,
			contentId: 100,
			sceneId: 1,
			order: 1,
			events: [{ name: "cue-any", text: "", start: 0, end: 10 }]
		}
	},
	capsules: {
		1: { id: 1, name: "main", type: null, grid: "ed-grid-w1-h1", itemIds: [10] }
	},
	items: {
		10: { id: 10, order: 1000, contentId: 100, capsuleId: 1, decorId: 100, visible: true, eventIds: [1, 2] }
	},
	contents: {
		100: { id: 100, name: "txt", type: "text", path: null, inner: "hello", lang: null, capsuleId: null }
	},
	decors: {
		100: { id: 100, className: null, area: null, style: {}, itemTargetId: null, basedUpon: null }
	}
};

const cueWithMissingIntroName = computeActiveCue(baseScene, 10);
assert.equal(
	cueWithMissingIntroName,
	0.5,
	"selection cue should stay at intro-visible boundary (0.5s), not regress to hidden start"
);

const sceneWithExplicitCue: any = {
	...baseScene,
	sceneContents: {
		1: {
			...baseScene.sceneContents[1],
			events: [
				...baseScene.sceneContents[1].events,
				{ name: "__auto_item_10_intro_fallback_0", text: "", start: 2, end: 2 }
			]
		}
	}
};

const cueWithMappedIntroName = computeActiveCue(sceneWithExplicitCue, 10);
assert.equal(cueWithMappedIntroName, 2.5, "selection cue should honor explicit intro cue timing + intro duration");

console.log("selection visibility contract smoke: all checks passed");
