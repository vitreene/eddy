import assert from "node:assert/strict";

import type { SceneComp } from "../app/api/db";
import {
	CAPSULE_TYPES,
	getSelectableCapsuleTypeConfigs,
	parseCardTemplateAreas,
	resolveCapsuleType
} from "../app/config/capsule-types";
import { resolveCueWindows } from "../app/scene-runtime/visibility/resolve-cue-windows";

type Case = { name: string; run: () => void };

function createContext(): SceneComp {
	return {
		id: 1,
		title: "capsule-types",
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
				type: "carrousel",
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
				name: "capsule-content",
				type: "capsule",
				path: null,
				inner: null,
				lang: null,
				timestamp: "[]",
				capsuleId: 2
			},
			1: {
				id: 1,
				name: "a",
				type: "img",
				path: "a.jpg",
				inner: null,
				lang: null,
				timestamp: "[]",
				capsuleId: null
			},
			2: {
				id: 2,
				name: "b",
				type: "img",
				path: "b.jpg",
				inner: null,
				lang: null,
				timestamp: "[]",
				capsuleId: null
			},
			3: {
				id: 3,
				name: "c",
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

function cueStartByName(cues: Array<{ name: string; start: number }>): Map<string, number> {
	const map = new Map<string, number>();
	for (const cue of cues) map.set(cue.name, cue.start);
	return map;
}

const cases: Case[] = [
	{
		name: "capsule type registry exposes only selectable types",
		run: () => {
			const selectable = getSelectableCapsuleTypeConfigs().map((cfg) => cfg.type);
			assert.deepEqual(selectable, ["carrousel", "rangee", "liste", "grille", "position", "card"]);
		}
	},
	{
		name: "capsule type resolver falls back to legacy",
		run: () => {
			assert.equal(resolveCapsuleType(null), CAPSULE_TYPES.LEGACY);
			assert.equal(resolveCapsuleType("unknown"), CAPSULE_TYPES.LEGACY);
			assert.equal(resolveCapsuleType("carrousel"), CAPSULE_TYPES.CARROUSEL);
		}
	},
	{
		name: "card areas parser accepts valid format",
		run: () => {
			const rows = parseCardTemplateAreas("areas:header header|media body|footer footer");
			assert.deepEqual(rows, ["header header", "media body", "footer footer"]);
		}
	},
	{
		name: "card areas parser rejects malformed rows",
		run: () => {
			const rows = parseCardTemplateAreas("areas:header header|media|footer footer");
			assert.deepEqual(rows, []);
		}
	},
	{
		name: "fixed mode uses fixed slot duration",
		run: () => {
			const context = createContext();
			const resolved = resolveCueWindows(context, {
				generateMissingEvents: true,
				behaviorByCapsuleId: {
					2: {
						timeMode: "fixed",
						fixedSeconds: 2,
						generateDefaultOutro: true
					}
				}
			});

			const cues = cueStartByName(resolved.resolvedSceneContentEvents as any);
			const i1In = resolved.resolvedEvents[1]?.intro?.name as string;
			const i2In = resolved.resolvedEvents[2]?.intro?.name as string;
			const i3In = resolved.resolvedEvents[3]?.intro?.name as string;

			assert.equal(cues.get(i1In), 2);
			assert.equal(cues.get(i2In), 4);
			assert.equal(cues.get(i3In), 6);
		}
	}
];

for (const testCase of cases) {
	testCase.run();
	console.log(`OK: ${testCase.name}`);
}

console.log("capsule types smoke: all checks passed");
