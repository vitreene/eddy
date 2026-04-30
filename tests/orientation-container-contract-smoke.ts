import assert from "node:assert/strict";

import { buildScene } from "../app/player/builder";
import { orientationPlacementTokenToCssDefinition } from "../app/lib/oriented-placement";
import { buildPositionZoneOrientationCssRules } from "../app/lib/position-zones";

function createScene(): any {
	return {
		id: 1,
		title: "orientation-container-contract",
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
				orientationGrid: {
					portrait: "ed-grid-w9-h16",
					landscape: "ed-grid-w16-h9"
				},
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
				className: "ed-posv1-p(r2-c3-rs1-cs2)-l(r1-c1-rs1-cs1)",
				area: "cell-r1-c1",
				style: {},
				itemTargetId: null,
				basedUpon: null
			}
		}
	};
}

const styles = buildScene(createScene()).styles || "";
assert.equal(styles.includes("@container scene (aspect-ratio <= 1/1)"), true);
assert.equal(styles.includes("@container scene (aspect-ratio > 1/1)"), true);
assert.equal(styles.includes("@media (orientation:"), false);

const placementCss =
	orientationPlacementTokenToCssDefinition("ed-posv1-p(r2-c3-rs1-cs2)-l(r1-c1-rs1-cs1)") || "";
assert.equal(placementCss.includes("@container scene (aspect-ratio <= 1/1)"), true);
assert.equal(placementCss.includes("@container scene (aspect-ratio > 1/1)"), true);
assert.equal(placementCss.includes("@media (orientation:"), false);

const zoneCss = buildPositionZoneOrientationCssRules("ed-zone-hero", {
	portrait: { row: 1, column: 1, spanRow: 4, spanColumn: 6 },
	landscape: { row: 2, column: 5, spanRow: 3, spanColumn: 8 }
});
assert.equal(zoneCss.includes("@container scene (aspect-ratio <= 1/1)"), true);
assert.equal(zoneCss.includes("@container scene (aspect-ratio > 1/1)"), true);
assert.equal(zoneCss.includes("@media (orientation:"), false);

console.log("orientation container contract smoke: all checks passed");
