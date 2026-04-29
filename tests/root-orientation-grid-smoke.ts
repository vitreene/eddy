import assert from "node:assert/strict";

import { buildScene } from "../app/player/builder";

function createScene(): any {
	return {
		id: 1,
		title: "root-orientation-grid",
		main: 1,
		theme: { generated: "", custom: "" },
		events: {
			10: {
				intro: { id: 1, action: "intro", name: "cue-intro", itemId: 10, ref: "fade", decorId: null }
			}
		},
		sceneContents: {
			1: {
				id: 1,
				contentId: 100,
				sceneId: 1,
				order: 1,
				events: [{ name: "cue-intro", text: "intro", start: 0.5, end: 0.5 }]
			}
		},
		capsules: {
			1: {
				id: 1,
				name: "main",
				type: null,
				grid: "root-scene ed-grid-w16-h9",
				itemIds: [10]
			}
		},
		items: {
			10: { id: 10, order: 1000, visible: true, contentId: 100, capsuleId: 1, decorId: 100, eventIds: [1] }
		},
		contents: {
			100: { id: 100, name: "logo", type: "img", path: "/logo.png", inner: null, lang: null, capsuleId: null }
		},
		decors: {
			100: {
				id: 100,
				name: null,
				className: null,
				area: "cell-r1-c1",
				style: {},
				itemTargetId: null,
				basedUpon: null
			}
		}
	};
}

{
	const scene = createScene();
	scene.capsules[1].orientationGrid = {
		portrait: "ed-grid-w9-h16",
		landscape: "ed-grid-w16-h9"
	};

	const built = buildScene(scene);
	const styles = built.styles || "";

	assert.equal(styles.includes(".root-scene.ed-preview-orientation--portrait"), true);
	assert.equal(styles.includes(".root-scene.ed-preview-orientation--landscape"), true);
	assert.equal(styles.includes("@media (orientation: portrait){.root-scene"), true);
	assert.equal(styles.includes("@media (orientation: landscape){.root-scene"), true);
	assert.equal(styles.includes("grid-template-columns:repeat(9, minmax(0, 1fr))"), true);
	assert.equal(styles.includes("grid-template-rows:repeat(16, minmax(0, 1fr))"), true);
}

{
	const scene = createScene();
	scene.capsules[1].orientationGrid = {
		portrait: "ed-grid-w9-h16"
	};

	const built = buildScene(scene);
	const styles = built.styles || "";

	assert.equal(styles.includes(".root-scene.ed-preview-orientation--portrait"), true);
	assert.equal(styles.includes(".root-scene.ed-preview-orientation--landscape"), true);
	assert.equal(styles.includes("grid-template-columns:repeat(16, minmax(0, 1fr))"), true);
	assert.equal(styles.includes("grid-template-rows:repeat(9, minmax(0, 1fr))"), true);
}

console.log("root orientation grid smoke: all checks passed");
