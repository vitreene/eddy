/* 

pour placer correctement un item dans une grille, l'index ne suffit pas :
par exemple, une capsule peut contenir des elemments qui tour à tour, vont occuper la meme position. 
aussi , plusieurs éléments transparents peuvent se superposer. 
créer un systeme sur le meme principe que les grilles ou un item possede une classe qui le positionne au bon endroit.
pour une grille 2x2, nous aurons les positions  :
- 1-1, 1-2, 2-1, 2-2
- avec un prefixe : slot- par exemple

en cas de re-parent, cette classe n'est plus utile, voire nuisible. 
pour l'inactiver :
- soit la supprimer au moment du re-parent,
- soit la scoper dans la capsule parente pour la rendre inopérante en dehors 

De toute fçon, s'il y a un déplacement de slot, il faut remplacer la classe. 
Donc plutot partir sur une suppression lors d'un "move"

note, au fur et a mesure des solutions trouvées, plusieurs conflits ptentiels de créqtion de style à résoudre. 
*/

import * as transitions from "@/player/presets/transitions";

import type { SceneComp, CapsuleComp, ItemComp, TextTime, Decor } from "@/api/db";
import { P } from "../types";
import { SCENE_ID } from "../constants";
import { SEP, DEFAULT_DURATION, INTRO, OUTRO } from "@/lib/constants";

import type { PlayerProps } from "..";
import { classNameToCssDefinition } from "@/lib/utils";

const DEFAUT_PATH_IMAGE = "";

const TR = Object.fromEntries(Object.entries(transitions).map(([k, { name: _, ...v }]) => [k, v]));

export function buildScene(snapshot: SceneComp): PlayerProps & { styles?: string } {
	const events = mapEvents(snapshot);
	// console.log("->events", events);

	const styles = createStyle(snapshot);

	let $capsules;
	if (snapshot.capsules) {
		$capsules = Object.values(snapshot.capsules).map((c) => createCapsule(c, snapshot));
	}
	let $items;
	if (snapshot.items) {
		$items = Object.values(snapshot.items)
			.map((it) => createItems(it, snapshot))
			.filter(Boolean);
	}

	return { persos: [...$capsules, ...$items], events, styles };
}

//STYLES
function createStyle(snapshot: SceneComp) {
	const areas = Object.values(snapshot.decors)
		.filter((decor) => decor.area)
		.map((decor) => classNameToCssDefinition(decor.area));
	console.log("createStyle", areas);

	return `${snapshot.theme?.generated || ""} ${snapshot.theme?.custom || ""} ${areas.join()}`.trim();
}

//CAPSULES
function createCapsule(capsule: CapsuleComp, snapshot: SceneComp) {
	const id = `capsule${SEP}${capsule.id}`;

	if (capsule.id == snapshot.main) {
		const className = `${capsule.grid || ""} ${snapshot.decor?.className || ""}`.trim();
		const style = snapshot.decor?.style;

		return {
			type: P.LIST,
			initial: {
				move: SCENE_ID,
				tag: "div",
				id,
				...(className && { className }),
				...(style && { style })
			},
			actions: { [id]: true }
		};
	} else {
		const content = Object.values(snapshot.contents).find((c) => c.capsuleId == capsule.id);
		const item = Object.values(snapshot.items).find((it) => content.id == it.contentId);
		const events = snapshot.events[item.id];
		const decor = snapshot.decors[item.decorId];
		const parentId = `capsule${SEP}${item.capsuleId}`;
		const actions: Record<string | number, any> = {};

		if (events) {
			for (const action in events) {
				const ev = events[action];
				const actionStyle = getActionStyle(TR[ev.ref].style);
				const actionName = `${ev.name}-${ev.action}`;
				if (action == INTRO) {
					actions[actionName] = { style: actionStyle, move: parentId };
				} else actions[actionName] = { style: actionStyle };
			}
		} else {
			actions[INTRO] = { style: getActionStyle(TR.DEFAULT_IN.style) };
			actions[OUTRO] = { style: getActionStyle(TR.DEFAULT_OUT.style) };
		}
		actions[id] = true;

		const move = !events || Object.keys(events).length == 0 ? parentId : undefined;

		return {
			type: P.LIST,
			initial: {
				...(move && { move }),
				tag: "div",
				id,
				className: `${capsule.grid || ""} ${decor.className || ""} ${decor.area || ""}`.trim(),
				style: { isolation: "isolate", ...decor.style }
			},
			actions
		};
	}
}

//ITEMS

const itemType = {
	img: P.IMG,
	text: P.TEXT,
	sound: P.SOUND,
	video: P.VIDEO,
	sprite: P.SPRITE
} as const;

const itemTag = {
	img: "div",
	text: "p",
	sound: "audio",
	video: "video",
	sprite: "div"
} as const;

function createItems(item: ItemComp, snapshot: SceneComp) {
	const content = snapshot.contents[item.contentId];
	if (content.type == "capsule") return null;
	const events = snapshot.events[item.id];
	const decor = snapshot.decors[item.decorId];
	const parentId = `capsule${SEP}${item.capsuleId}`;
	const id = `item${SEP}${item.id}`;

	const actions: Record<string | number, any> = {};

	for (const action in events) {
		const ev = events[action];
		const actionStyle = getActionStyle(TR[ev.ref].style);
		const actionName = `${ev.name}-${ev.action}`;
		if (action == INTRO) {
			actions[actionName] = { style: actionStyle, move: parentId };
		} else actions[actionName] = { style: actionStyle };
	}

	const move = !events || Object.keys(events).length == 0 ? parentId : undefined;
	actions[id] = true;
	const tag = itemTag[content.type as keyof typeof itemTag];
	const initial = {
		id,
		tag,
		...(move && { move }),
		className: `${decor?.className || ""}  ${decor.area || ""}`.trim(),
		style: decor?.style
	};

	const type = itemType[content.type as keyof typeof itemType];

	switch (type) {
		case P.SOUND:
		case P.VIDEO:
			return {
				type,
				initial: {
					...initial,
					src: `/${content.path ?? DEFAUT_PATH_IMAGE}`
				},
				actions
			};
		case P.IMG:
			return {
				type,
				initial: {
					...initial,
					className: `bg-image ${initial.className || ""}`,
					style: {
						...initial.style,
						backgroundImage: `url("/${content.path ?? DEFAUT_PATH_IMAGE}")`
					},
					src: `/${content.path ?? DEFAUT_PATH_IMAGE}`
				},
				actions
			};
		case P.SPRITE:
			return {
				type,
				initial: {
					...initial,
					className: `bg-sprite ${initial.className || ""}`,
					style: {
						...initial.style,
						backgroundImage: `url("/${content.path ?? DEFAUT_PATH_IMAGE}")`
					},
					src: `/${content.path ?? DEFAUT_PATH_IMAGE}`
				},
				actions
			};
		case P.TEXT:
			return {
				type,
				initial: {
					...initial,
					content: content.inner
				},
				actions
			};

		default:
			return {
				type,
				initial,
				actions
			};
	}
}
/* 
export type MapEvent = Map<number, Eventime | Eventime[]>;

export interface Eventime {
	name: string;
	startAt: number;
	data?: any;
	duration?: number;
	events?: Eventime[];
}
*/

//EVENTS
function mapEvents(snapshot: SceneComp) {
	// renvoie les events utilisés dans la scene sous la forme Map<number, Eventime|Eventime[]>
	const map = new Map<number, Array<Partial<TextTime> & Pick<TextTime, "name" | "start">>>();

	map.set(0, [{ name: INTRO, start: 0 }]);

	if (!snapshot || !snapshot.events || !snapshot.sceneContents) return map;

	const sceneContents = Object.values(snapshot.sceneContents).find((sc) => sc.sceneId == snapshot.id);

	const cues: Array<TextTime> = (sceneContents && sceneContents.events) || [];
	let lastCue = 0;

	for (const actions in snapshot.events) {
		const action = snapshot.events[actions];
		for (const key in action) {
			const ev = action[key];
			if (!ev || !ev.name) continue;

			const cue = cues.find((c) => c.name == ev.name);
			if (!cue) continue;

			const timeSec = ev.action == OUTRO ? cue.end : cue.start;
			const timeMs = Math.round(timeSec * 1000);

			if (timeMs > lastCue) lastCue = timeMs;

			const item = {
				name: `${ev.name}-${ev.action}`,
				start: timeMs
			};

			if (map.has(timeMs)) {
				const existing = map.get(timeMs);
				if (Array.isArray(existing)) {
					existing.push(item);
				} else {
					map.set(timeMs, [existing, item]);
				}
			} else {
				map.set(timeMs, [item]);
			}
		}
	}
	map.set(lastCue - DEFAULT_DURATION, [{ name: OUTRO, start: lastCue - DEFAULT_DURATION }]);
	return map;
}

type ActionStyle = Record<string, { from?: number | string; to: number | string; duration?: number }>;
function getActionStyle(style: ActionStyle) {
	const actionStyle = {} as ActionStyle;
	for (const key in style) actionStyle[key] = { ...style[key], duration: DEFAULT_DURATION };
	return actionStyle;
}

function getClassNameFromArea(decor: Decor) {}
/* 
const context: SceneComp = {
	id: 1,
	title: "Scène 1",
	main: 1,
	events: {
		"1": {
			intro: {
				id: 2,
				name: "3-004-vu",
				action: "intro",
				ref: "balayage haut",
				duration: 0,
				delay: null,
				itemId: 1,
				decorId: null
			},
			outro: {
				id: 3,
				name: "3-009-risques",
				action: "outro",
				ref: "balayage bas",
				duration: 0,
				delay: null,
				itemId: 1,
				decorId: null
			}
		},
		"2": {
			outro: {
				id: 1,
				name: "3-053-parler",
				action: "outro",
				ref: "fondu zoom in",
				duration: 0,
				delay: null,
				itemId: 2,
				decorId: null
			},
			intro: {
				id: 4,
				name: "3-050-Nous",
				action: "intro",
				ref: "fondu zoom out",
				duration: 0,
				delay: null,
				itemId: 2,
				decorId: null
			}
		},
		"3": {
			intro: {
				id: 5,
				name: "3-006-lectricit",
				action: "intro",
				ref: "fondu zoom in",
				duration: null,
				delay: null,
				itemId: 3,
				decorId: null
			},
			outro: {
				id: 6,
				name: "3-023-est",
				action: "outro",
				ref: "fondu",
				duration: null,
				delay: null,
				itemId: 3,
				decorId: null
			}
		},
		"6": {
			intro: {
				id: 7,
				name: "3-023-est",
				action: "intro",
				ref: "fondu",
				duration: null,
				delay: null,
				itemId: 6,
				decorId: null
			},
			outro: {
				id: 8,
				name: "3-050-Nous",
				action: "outro",
				ref: "fondu",
				duration: null,
				delay: null,
				itemId: 6,
				decorId: null
			}
		}
	},
	sceneContents: {
		"1": {
			id: 1,
			order: 1,
			contentId: 3,
			sceneId: 1,
			decorId: null,
			events: [
				{
					text: " Vous",
					start: 0,
					end: 0.26,
					name: "3-000-Vous"
				},
				{
					text: " l",
					start: 0.26,
					end: 0.38,
					name: "3-001-l"
				},
				{
					text: "'avez",
					start: 0.38,
					end: 0.5,
					name: "3-002-avez"
				},
				{
					text: " donc",
					start: 0.5,
					end: 0.66,
					name: "3-003-donc"
				},
				{
					text: " vu",
					start: 0.66,
					end: 0.92,
					name: "3-004-vu"
				},
				{
					text: " l",
					start: 0.92,
					end: 1.32,
					name: "3-005-l"
				},
				{
					text: "'électricité",
					start: 1.32,
					end: 1.78,
					name: "3-006-lectricit"
				},
				{
					text: " présente",
					start: 1.78,
					end: 2.24,
					name: "3-007-prsente"
				},
				{
					text: " des",
					start: 2.24,
					end: 2.42,
					name: "3-008-des"
				},
				{
					text: " risques.",
					start: 2.42,
					end: 3.22,
					name: "3-009-risques"
				},
				{
					text: " Si",
					start: 3.4,
					end: 3.56,
					name: "3-010-Si"
				},
				{
					text: " nous",
					start: 3.56,
					end: 3.72,
					name: "3-011-nous"
				},
				{
					text: " connaissons",
					start: 3.72,
					end: 4.16,
					name: "3-012-connaissons"
				},
				{
					text: " ces",
					start: 4.16,
					end: 4.38,
					name: "3-013-ces"
				},
				{
					text: " risques,",
					start: 4.38,
					end: 4.96,
					name: "3-014-risques"
				},
				{
					text: " nous",
					start: 4.96,
					end: 5.04,
					name: "3-015-nous"
				},
				{
					text: " pouvons",
					start: 5.04,
					end: 5.32,
					name: "3-016-pouvons"
				},
				{
					text: " les",
					start: 5.32,
					end: 5.44,
					name: "3-017-les"
				},
				{
					text: " prévenir.",
					start: 5.44,
					end: 6.16,
					name: "3-018-prvenir"
				},
				{
					text: " C",
					start: 6.46,
					end: 6.58,
					name: "3-019-C"
				},
				{
					text: "'est",
					start: 6.58,
					end: 6.62,
					name: "3-020-est"
				},
				{
					text: " pourquoi",
					start: 6.62,
					end: 6.86,
					name: "3-021-pourquoi"
				},
				{
					text: " il",
					start: 6.86,
					end: 7.02,
					name: "3-022-il"
				},
				{
					text: " est",
					start: 7.02,
					end: 7.12,
					name: "3-023-est"
				},
				{
					text: " essentiel",
					start: 7.12,
					end: 7.62,
					name: "3-024-essentiel"
				},
				{
					text: " d",
					start: 7.62,
					end: 7.82,
					name: "3-025-d"
				},
				{
					text: "'évaluer",
					start: 7.82,
					end: 8.1,
					name: "3-026-valuer"
				},
				{
					text: " le",
					start: 8.1,
					end: 8.24,
					name: "3-027-le"
				},
				{
					text: " risque",
					start: 8.24,
					end: 8.52,
					name: "3-028-risque"
				},
				{
					text: " électrique",
					start: 8.52,
					end: 8.92,
					name: "3-029-lectrique"
				},
				{
					text: " dans",
					start: 8.92,
					end: 9.12,
					name: "3-030-dans"
				},
				{
					text: " le",
					start: 9.12,
					end: 9.24,
					name: "3-031-le"
				},
				{
					text: " travail",
					start: 9.24,
					end: 9.54,
					name: "3-032-travail"
				},
				{
					text: " que",
					start: 9.54,
					end: 9.78,
					name: "3-033-que"
				},
				{
					text: " vous",
					start: 9.78,
					end: 9.92,
					name: "3-034-vous"
				},
				{
					text: " effectuez.",
					start: 9.92,
					end: 10.84,
					name: "3-035-effectuez"
				},
				{
					text: " Cette",
					start: 11.18,
					end: 11.44,
					name: "3-036-Cette"
				},
				{
					text: " évaluation",
					start: 11.44,
					end: 11.82,
					name: "3-037-valuation"
				},
				{
					text: " des",
					start: 11.82,
					end: 12.1,
					name: "3-038-des"
				},
				{
					text: " risques",
					start: 12.1,
					end: 12.38,
					name: "3-039-risques"
				},
				{
					text: " en",
					start: 12.38,
					end: 12.5,
					name: "3-040-en"
				},
				{
					text: " général",
					start: 12.5,
					end: 12.88,
					name: "3-041-gnral"
				},
				{
					text: " est",
					start: 12.88,
					end: 13.24,
					name: "3-042-est"
				},
				{
					text: " du",
					start: 13.24,
					end: 13.38,
					name: "3-043-du"
				},
				{
					text: " risque",
					start: 13.38,
					end: 13.66,
					name: "3-044-risque"
				},
				{
					text: " électrique",
					start: 13.66,
					end: 14.04,
					name: "3-045-lectrique"
				},
				{
					text: " en",
					start: 14.04,
					end: 14.24,
					name: "3-046-en"
				},
				{
					text: " particulier",
					start: 14.24,
					end: 14.7,
					name: "3-047-particulier"
				},
				{
					text: " et",
					start: 14.7,
					end: 15.2,
					name: "3-048-et"
				},
				{
					text: " obligatoire.",
					start: 15.2,
					end: 16.32,
					name: "3-049-obligatoire"
				},
				{
					text: " Nous",
					start: 16.6,
					end: 16.68,
					name: "3-050-Nous"
				},
				{
					text: " allons",
					start: 16.68,
					end: 16.9,
					name: "3-051-allons"
				},
				{
					text: " en",
					start: 16.9,
					end: 17.1,
					name: "3-052-en"
				},
				{
					text: " parler.",
					start: 17.1,
					end: 21.42,
					name: "3-053-parler"
				}
			]
		}
	},
	capsules: {
		"1": {
			id: 1,
			name: "__MAIN__",
			type: null,
			grid: null,
			itemIds: [5, 6]
		},
		"2": {
			id: 2,
			name: "listing",
			type: "null",
			grid: ".ed-grid-w6-h2",
			itemIds: [1, 2]
		},
		"3": {
			id: 3,
			name: "background",
			type: "null",
			grid: ".ed-grid-w7-h2",
			itemIds: [3, 4]
		}
	},
	items: {
		"1": {
			id: 1,
			order: 5250,
			contentId: 1,
			capsuleId: 2,
			decorId: 1,
			eventIds: [2, 3]
		},
		"2": {
			id: 2,
			order: 4250,
			contentId: 2,
			capsuleId: 2,
			decorId: 4,
			eventIds: [1, 4]
		},
		"3": {
			id: 3,
			order: 3250,
			contentId: 2,
			capsuleId: 3,
			decorId: 3,
			eventIds: [5, 6]
		},
		"4": {
			id: 4,
			order: 3000,
			contentId: 4,
			capsuleId: 3,
			decorId: 5,
			eventIds: []
		},
		"5": {
			id: 5,
			order: 2000,
			contentId: 5,
			capsuleId: 1,
			decorId: 2,
			eventIds: []
		},
		"6": {
			id: 6,
			order: 1000,
			contentId: 6,
			capsuleId: 1,
			decorId: 6,
			eventIds: [7, 8]
		}
	},
	contents: {
		"1": {
			id: 1,
			type: "img",
			path: "assets/28970388742_2f75d527d6_z.jpg",
			inner: null,
			lang: null,
			capsuleId: null
		},
		"2": {
			id: 2,
			type: "img",
			path: "assets/28999069391_5893263112_z.jpg",
			inner: null,
			lang: null,
			capsuleId: null
		},
		"4": {
			id: 4,
			type: "text",
			path: null,
			inner: "je suis content",
			lang: "fr",
			capsuleId: null
		},
		"5": {
			id: 5,
			type: "capsule",
			path: null,
			inner: null,
			lang: null,
			capsuleId: 2
		},
		"6": {
			id: 6,
			type: "capsule",
			path: null,
			inner: null,
			lang: null,
			capsuleId: 3
		}
	},
	decors: {
		"1": {
			id: 1,
			name: null,
			className: null,
			basedUpon: null,
			style: {
				fontFamily: "Inter",
				fontSize: "24px",
				color: "#F40505",
				fontWeight: "bold"
			}
		},
		"2": {
			id: 2,
			name: null,
			className: null,
			basedUpon: null,
			style: {
				fontFamily: "Inter",
				fontSize: "29px",
				color: "#DD1111",
				fontStyle: "italic",
				backgroundColor: "#FF0000"
			}
		},
		"3": {
			id: 3,
			name: null,
			className: null,
			basedUpon: null,
			style: {
				fontFamily: "Inter",
				fontSize: "29px",
				color: "#DD1111",
				fontStyle: "italic",
				backgroundColor: "#10E499",
				fontWeight: "normal"
			}
		},
		"4": {
			id: 4,
			name: null,
			className: null,
			basedUpon: null,
			style: {
				fontFamily: "Inter",
				fontSize: "16px",
				color: "#222222",
				backgroundColor: "#DD11AA"
			}
		},
		"5": {
			id: 5,
			name: null,
			className: null,
			basedUpon: null,
			style: {}
		},
		"6": {
			id: 6,
			name: null,
			className: null,
			basedUpon: null,
			style: {
				fontSize: "40px",
				color: "#0873E6",
				fontWeight: "bold"
			}
		}
	},
	theme: {
		id: 0,
		name: null,
		custom: "",
		generated:
			".ed-grid-w5-h2{display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));grid-template-rows:repeat(2, minmax(0, 1fr))}.ed-grid-w6-h2{display:grid;grid-template-columns:repeat(6, minmax(0, 1fr));grid-template-rows:repeat(2, minmax(0, 1fr))}.ed-grid-w10-h1{display:grid;grid-template-columns:repeat(10, minmax(0, 1fr));grid-template-rows:repeat(1, minmax(0, 1fr))}.ed-grid-w4-h2{display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));grid-template-rows:repeat(2, minmax(0, 1fr))}.ed-grid-w7-h2{display:grid;grid-template-columns:repeat(7, minmax(0, 1fr));grid-template-rows:repeat(2, minmax(0, 1fr))}"
	}
};

*/
