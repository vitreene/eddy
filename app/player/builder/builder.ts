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

import { DEFAULT_TRANSITION_BY_ACTION, getTransitionPreset } from "@/config/transitions";
import { resolveCueWindows } from "@/player/visibility/resolve-cue-windows";

import type { SceneComp, CapsuleComp, ItemComp, TextTime, Decor, ContentEvent } from "@/api/db";
import { P, type ID } from "../types";
import { SCENE_ID } from "../constants";
import { SEP, DEFAULT_DURATION, INTRO, OUTRO } from "@/config/constants";
import { getMediaUrl } from "@/lib/media-url";

import type { PlayerProps } from "..";
import { classNameToCssDefinition, getValuesFromGridName, gridClassNameToCssDefinition } from "@/lib/utils";

const DEFAUT_PATH_IMAGE = "";

export function buildScene(snapshot: SceneComp): PlayerProps & { styles?: string } {
	const visibilityFilteredSnapshot = applyVisibilityRules(snapshot);
	const derivedSnapshot = applyCapsuleDefaultItemEvents(visibilityFilteredSnapshot);
	const events = mapEvents(derivedSnapshot);
	// console.log("->events", events);
	const { areas, itemsPositionClassName } = positionElements(derivedSnapshot);
	const gridDefinitions = getGridDefinitions(derivedSnapshot);
	const styles = createStyle(derivedSnapshot, areas, gridDefinitions);

	// console.log({ itemsPositionClassName });

	let $capsules;
	if (derivedSnapshot.capsules) {
		$capsules = Object.values(derivedSnapshot.capsules).map((c) =>
			createCapsule(c, derivedSnapshot, itemsPositionClassName)
		);
	}
	let $items;
	if (derivedSnapshot.items) {
		$items = Object.values(derivedSnapshot.items)
			.map((it) => createItems(it, derivedSnapshot, itemsPositionClassName))
			.filter(Boolean);
	}

	return { persos: [...$capsules, ...$items], events, styles };
}

function applyVisibilityRules(snapshot: SceneComp): SceneComp {
	if (!snapshot?.items || !snapshot?.capsules || !snapshot?.contents) return snapshot;

	const capsuleHostItemIdByCapsuleId = buildCapsuleHostItemMap(snapshot);
	const visibleItemIds = new Set<number>();
	for (const item of Object.values(snapshot.items)) {
		if (isItemEffectivelyVisible(item.id, snapshot, capsuleHostItemIdByCapsuleId)) {
			visibleItemIds.add(item.id);
		}
	}

	const visibleItems = Object.fromEntries(
		Object.entries(snapshot.items).filter(([id]) => visibleItemIds.has(Number(id)))
	) as SceneComp["items"];

	const visibleCapsuleIds = collectReachableVisibleCapsuleIds(snapshot, visibleItemIds);
	const visibleCapsules = Object.fromEntries(
		Object.entries(snapshot.capsules || {})
			.filter(([id]) => visibleCapsuleIds.has(Number(id)))
			.map(([id, capsule]) => [
				id,
				{
					...capsule,
					itemIds: (capsule.itemIds || []).filter((itemId) => visibleItemIds.has(itemId))
				}
			])
	) as SceneComp["capsules"];

	const visibleEvents = Object.fromEntries(
		Object.entries(snapshot.events || {}).filter(([itemId]) => visibleItemIds.has(Number(itemId)))
	) as SceneComp["events"];

	return {
		...snapshot,
		capsules: visibleCapsules,
		items: visibleItems,
		events: visibleEvents
	};
}

function collectReachableVisibleCapsuleIds(snapshot: SceneComp, visibleItemIds: Set<number>): Set<number> {
	const visibleCapsuleIds = new Set<number>();
	if (!snapshot.main) return visibleCapsuleIds;

	const queue = [snapshot.main];
	while (queue.length) {
		const capsuleId = queue.shift();
		if (!capsuleId || visibleCapsuleIds.has(capsuleId)) continue;
		visibleCapsuleIds.add(capsuleId);

		const capsule = snapshot.capsules[capsuleId];
		if (!capsule) continue;

		for (const itemId of capsule.itemIds || []) {
			if (!visibleItemIds.has(itemId)) continue;
			const item = snapshot.items[itemId];
			if (!item) continue;
			const content = snapshot.contents[item.contentId];
			if (content?.type === "capsule" && content.capsuleId) {
				queue.push(content.capsuleId);
			}
		}
	}

	return visibleCapsuleIds;
}

function buildCapsuleHostItemMap(snapshot: SceneComp): Record<number, number> {
	const map: Record<number, number> = {};
	for (const item of Object.values(snapshot.items || {})) {
		const content = snapshot.contents[item.contentId];
		if (content?.type === "capsule" && content.capsuleId) {
			map[content.capsuleId] = item.id;
		}
	}
	return map;
}

function isItemEffectivelyVisible(
	itemId: number,
	snapshot: SceneComp,
	capsuleHostItemIdByCapsuleId: Record<number, number>
): boolean {
	const item = snapshot.items[itemId];
	if (!item) return false;
	if (item.visible === false) return false;

	let capsuleId: number | null | undefined = item.capsuleId;
	const visitedCapsules = new Set<number>();

	while (typeof capsuleId === "number" && !visitedCapsules.has(capsuleId)) {
		visitedCapsules.add(capsuleId);
		const hostItemId = capsuleHostItemIdByCapsuleId[capsuleId];
		if (!hostItemId) break;

		const hostItem = snapshot.items[hostItemId];
		if (!hostItem) break;
		if (hostItem.visible === false) return false;

		capsuleId = hostItem.capsuleId;
	}

	return true;
}

function applyCapsuleDefaultItemEvents(snapshot: SceneComp): SceneComp {
	if (!snapshot?.capsules || !snapshot?.items || !snapshot?.sceneContents) return snapshot;
	const sceneContent =
		Object.values(snapshot.sceneContents).find((sc) => sc.sceneId == snapshot.id) ||
		Object.values(snapshot.sceneContents)[0];
	if (!sceneContent) return snapshot;

	const resolved = resolveCueWindows(snapshot, { generateMissingEvents: true });
	const clonedSceneContents: SceneComp["sceneContents"] = {
		...snapshot.sceneContents,
		[sceneContent.id]: {
			...sceneContent,
			events: resolved.resolvedSceneContentEvents
		}
	};

	return {
		...snapshot,
		events: resolved.resolvedEvents,
		sceneContents: clonedSceneContents
	};
}

//STYLES
function createStyle(snapshot: SceneComp, areas: string[], gridDefinitions: string[]) {
	return `${snapshot.theme?.generated || ""} \n ${snapshot.theme?.custom || ""} \n\n ${gridDefinitions.join("\n")}\n${areas.join("\n")}`.trim();
}

function getGridDefinitions(snapshot: SceneComp): string[] {
	const uniqueClassNames = new Set<string>();

	for (const capsule of Object.values(snapshot.capsules || {})) {
		if (!capsule?.grid) continue;
		const className = capsule.grid.trim().split(/\s+/)[0]?.replace(/^\./, "");
		if (!className) continue;
		uniqueClassNames.add(className);
	}

	return [...uniqueClassNames].flatMap((className) => {
		const definition = gridClassNameToCssDefinition(className);
		return definition ? [definition] : [];
	});
}

function positionElements(snapshot: SceneComp) {
	/*
- pour chaque item,
- chercher s'il posede une position
	oui -> ajouter à areas
	non ->
		- chercher sa position dans la capsule
		- placer selon la grid de la capsule 
		- créer classe
		- ajouter à areas
*/

	const areas = new Set<string>();
	const itemsPositionClassName: Record<ID, string> = {};

	for (const item of Object.values(snapshot.items)) {
		const decor = snapshot.decors[item.decorId];
		if (decor?.area) {
			areas.add(classNameToCssDefinition(decor.area));
		} else {
			const capsule = snapshot.capsules[item.capsuleId];
			const grid = getValuesFromGridName(capsule.grid);
			// position dans la capsule ( 1 ... n)
			const index =
				Object.values(snapshot.items)
					.filter((it) => it.capsuleId == item.capsuleId)
					.toSorted((a, b) => (a.order > b.order ? 1 : -1))
					.findIndex((it) => it.id == item.id) + 1;

			// console.log({ id: capsule.id, grid });

			const r = grid.w == 1 ? 1 : index % grid.w || grid.w;
			const c = grid.h == 1 ? 1 : Math.round(index / grid.w) + 1;
			const prefix = "cell_auto";
			const area = `${prefix}-r${r}-c${c}`;
			areas.add(classNameToCssDefinition(area, { prefix }));
			itemsPositionClassName[item.id] = area;
		}
	}

	return { areas: [...areas], itemsPositionClassName };
}

//CAPSULES
function createCapsule(capsule: CapsuleComp, snapshot: SceneComp, additionalClassnames: Record<ID, string>) {
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
		if (!content) return null;
		// console.log({ capsule, content, snapshot });
		const item = Object.values(snapshot.items).find((it) => content.id == it.contentId);
		if (!item) return null;
		const events = snapshot.events[item.id];
		const decor = snapshot.decors[item.decorId] || { className: "", area: "", style: {} };
		const parentId = `capsule${SEP}${item.capsuleId}`;
		const actions: Record<string | number, any> = {};

		if (events) {
			for (const action in events) {
				const ev = events[action];
				const preset = getTransitionPresetForEvent({ snapshot, item, event: ev });
				const actionStyle = getActionStyle(preset.style);
				const actionName = `${ev.name}-${ev.action}`;
				if (action == INTRO) {
					actions[actionName] = { style: actionStyle, move: parentId };
				} else actions[actionName] = { style: actionStyle };
			}
		} else {
			actions[INTRO] = {
				style: getActionStyle(getTransitionPreset(DEFAULT_TRANSITION_BY_ACTION[INTRO], INTRO).style)
			};
			actions[OUTRO] = {
				style: getActionStyle(getTransitionPreset(DEFAULT_TRANSITION_BY_ACTION[OUTRO], OUTRO).style)
			};
		}
		actions[id] = true;

		const move = !events || Object.keys(events).length == 0 ? parentId : undefined;

		return {
			type: P.LIST,
			initial: {
				...(move && { move }),
				tag: "div",
				id,
				className:
					`${capsule.grid || ""} ${decor.className || ""} ${decor.area || additionalClassnames[item.id] || ""}`.trim(),
				style: { ...decor.style }
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

function createItems(item: ItemComp, snapshot: SceneComp, additionalClassnames: Record<ID, string>) {
	const content = snapshot.contents[item.contentId];
	if (content.type == "capsule") return null;
	const events = snapshot.events[item.id];
	const decor = snapshot.decors[item.decorId] || { className: "", area: "", style: {} };
	const parentId = `capsule${SEP}${item.capsuleId}`;
	const id = `item${SEP}${item.id}`;

	const actions: Record<string | number, any> = {};

	for (const action in events || {}) {
		const ev = events[action];
		const preset = getTransitionPresetForEvent({ snapshot, item, event: ev });
		const actionStyle = getActionStyle(preset.style);
		const actionName = `${ev.name}-${ev.action}`;
		if (action == INTRO) {
			actions[actionName] = { style: actionStyle, move: parentId };
		} else actions[actionName] = { style: actionStyle };
	}

	const move = !events || Object.keys(events).length == 0 ? parentId : undefined;
	actions[id] = true;
	const tag = itemTag[content.type as keyof typeof itemTag];

	// console.log(id, "className", decor?.area, additionalClassnames[item.id]);

	const initial = {
		id,
		tag,
		...(move && { move }),
		className: `${decor?.className || ""}  ${decor?.area || additionalClassnames[item.id] || ""}`.trim(),
		style: decor?.style
	};

	const type = itemType[content.type as keyof typeof itemType];
	const mediaPath = content.path ?? DEFAUT_PATH_IMAGE;
	const mediaSrc = getMediaUrl(mediaPath);

	switch (type) {
		case P.SOUND:
		case P.VIDEO:
			return {
				type,
				initial: {
					...initial,
					src: mediaSrc
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
						backgroundImage: `url("${mediaSrc}")`
					},
					src: mediaSrc
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
						backgroundImage: `url("${mediaSrc}")`
					},
					src: mediaSrc
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

function getTransitionPresetForEvent({
	snapshot,
	item,
	event
}: {
	snapshot: SceneComp;
	item: ItemComp;
	event: ContentEvent;
}) {
	// Priority chain:
	// 1) explicit event ref
	// 2) capsule default transition for this action
	// 3) global default transition for this action
	const eventAction = event.action == OUTRO ? OUTRO : INTRO;
	const eventRef = parseTransitionRef(event.ref);
	const capsule = snapshot.capsules?.[item.capsuleId];
	const capsuleRef = getCapsuleDefaultTransitionRef(capsule, eventAction);
	const fallbackRef = DEFAULT_TRANSITION_BY_ACTION[eventAction];
	const resolvedRef = eventRef || capsuleRef || fallbackRef;
	return getTransitionPreset(resolvedRef, eventAction);
}

function getCapsuleDefaultTransitionRef(capsule: CapsuleComp | undefined, action: string): string | null {
	// Capsule defaults are distinct from capsule-host item events.
	if (!capsule) return null;

	const transitionValue =
		action == INTRO
			? (capsule as unknown as Record<string, unknown>).defaultItemIntroTransition
			: (capsule as unknown as Record<string, unknown>).defaultItemOutroTransition;

	return parseTransitionRef(transitionValue);
}

function parseTransitionRef(value: unknown): string | null {
	// Accepts either plain preset key, or serialized action/ref JSON.
	if (!value) return null;
	if (typeof value == "string") {
		const raw = value.trim();
		if (!raw) return null;
		if (raw.startsWith("{")) {
			try {
				const parsed = JSON.parse(raw) as { ref?: unknown };
				if (typeof parsed.ref == "string") return parsed.ref;
			} catch {
				return raw;
			}
		}
		return raw;
	}
	if (typeof value != "object") return null;

	const record = value as Record<string, unknown>;
	if (typeof record.ref == "string") return record.ref;
	return null;
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
/* 
creation de capsule grid par défaut !!! 


*/
