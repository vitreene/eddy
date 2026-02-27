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
import { getCapsuleTypeConfig, shouldCapsuleUseExplicitArea } from "@/config/capsule-types";
import { buildPlacementCss } from "@/player/capsule-layout/layout-css";

import type { SceneComp, CapsuleComp, ItemComp, TextTime, Decor, ContentEvent } from "@/api/db";
import { P, type ID } from "../types";
import { SCENE_ID } from "../constants";
import { SEP, DEFAULT_DURATION, INTRO, OUTRO } from "@/config/constants";
import { getMediaUrl } from "@/lib/media-url";

import type { PlayerProps } from "..";

const DEFAUT_PATH_IMAGE = "";

export function buildScene(snapshot: SceneComp): PlayerProps & { styles?: string } {
	// Builder pipeline stages:
	// 1) runtime visibility filter
	// 2) derived timing/events resolution
	// 3) timeline and CSS generation
	// 4) perso graph creation
	const visibilityFilteredSnapshot = applyVisibilityRules(snapshot);
	const derivedSnapshot = applyCapsuleDefaultItemEvents(visibilityFilteredSnapshot);
	const events = mapEvents(derivedSnapshot);
	const { areas, itemPlacementClassByItemId, gridDefinitions } = buildPlacementCss(derivedSnapshot);
	const styles = createStyle(derivedSnapshot, areas, gridDefinitions);

	const persos = createRenderablesInDisplayOrder(derivedSnapshot, itemPlacementClassByItemId);

	return { persos, events, styles };
}

function createRenderablesInDisplayOrder(snapshot: SceneComp, additionalClassnames: Record<ID, string>) {
	const result: Array<any> = [];
	const mainCapsule = snapshot.capsules?.[snapshot.main];
	if (mainCapsule) {
		const mainPerso = createCapsule(mainCapsule, snapshot, additionalClassnames);
		if (mainPerso) result.push(mainPerso);
	}

	// Important ordering variable:
	// renderOrderItems is a DFS over capsule tree where siblings are sorted by item.order.
	// This guarantees DOM append order follows item.order for every parent capsule.
	const renderOrderItems = getItemsInDisplayOrder(snapshot, snapshot.main);

	for (const item of renderOrderItems) {
		const content = snapshot.contents[item.contentId];
		if (!content) continue;

		if (content.type == "capsule" && content.capsuleId) {
			const capsule = snapshot.capsules[content.capsuleId];
			if (!capsule) continue;
			const capsulePerso = createCapsule(capsule, snapshot, additionalClassnames);
			if (capsulePerso) result.push(capsulePerso);
			continue;
		}

		const itemPerso = createItems(item, snapshot, additionalClassnames);
		if (itemPerso) result.push(itemPerso);
	}

	return result;
}

function getItemsInDisplayOrder(snapshot: SceneComp, capsuleId: number): ItemComp[] {
	const capsule = snapshot.capsules?.[capsuleId];
	if (!capsule) return [];

	const siblings = (capsule.itemIds || [])
		.map((itemId) => snapshot.items[itemId])
		.filter((item): item is ItemComp => Boolean(item))
		.toSorted((a, b) => (a.order > b.order ? 1 : -1));

	const result: ItemComp[] = [];
	for (const item of siblings) {
		result.push(item);
		const content = snapshot.contents[item.contentId];
		if (content?.type == "capsule" && content.capsuleId) {
			result.push(...getItemsInDisplayOrder(snapshot, content.capsuleId));
		}
	}

	return result;
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

	// behaviorByCapsuleId centralizes per-capsule runtime policy used by resolver.
	// It is the extension point for future capsule types (line/grid/card).
	const behaviorByCapsuleId = buildBehaviorByCapsuleId(snapshot);

	const resolved = resolveCueWindows(snapshot, {
		generateMissingEvents: true,
		behaviorByCapsuleId
	});
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

type BuilderCapsuleBehavior = {
	timeMode: "distributed" | "fixed";
	fixedSeconds: number;
	generateDefaultOutro: boolean;
};

function buildBehaviorByCapsuleId(snapshot: SceneComp): Record<number, BuilderCapsuleBehavior> {
	const behaviorByCapsuleId: Record<number, BuilderCapsuleBehavior> = {};

	for (const capsule of Object.values(snapshot.capsules || {})) {
		const config = getCapsuleTypeConfig(capsule.type);

		behaviorByCapsuleId[capsule.id] = {
			timeMode: config.runtime.time.mode,
			fixedSeconds: config.runtime.time.defaultFixedSeconds,
			// Important policy variable:
			// if false, resolver generates no default outro for children of this capsule type.
			generateDefaultOutro: config.runtime.transitions.defaultOutroRef !== null
		};
	}

	return behaviorByCapsuleId;
}

//STYLES
function createStyle(snapshot: SceneComp, areas: string[], gridDefinitions: string[]) {
	return `${snapshot.theme?.generated || ""} \n ${snapshot.theme?.custom || ""} \n\n ${gridDefinitions.join("\n")}\n${areas.join("\n")}`.trim();
}

function joinNodeClassNames(...tokens: Array<string | null | undefined>): string {
	return tokens
		.map((token) => (token || "").trim())
		.filter(Boolean)
		.join(" ");
}

function getEffectiveAreaClassName(
	capsuleType: string | null | undefined,
	explicitArea: string | null | undefined,
	autoArea: string | null | undefined
): string {
	return shouldCapsuleUseExplicitArea(capsuleType)
		? explicitArea || autoArea || ""
		: autoArea || explicitArea || "";
}

//CAPSULES
function createCapsule(capsule: CapsuleComp, snapshot: SceneComp, additionalClassnames: Record<ID, string>) {
	const id = `capsule${SEP}${capsule.id}`;

	if (capsule.id == snapshot.main) {
		const className = joinNodeClassNames(capsule.grid, snapshot.decor?.className || "");
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
				className: joinNodeClassNames(
					capsule.grid,
					decor.className || "",
					getEffectiveAreaClassName(capsule.type, decor.area, additionalClassnames[item.id])
				),
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
		className: joinNodeClassNames(
			decor?.className || "",
			getEffectiveAreaClassName(
				snapshot.capsules[item.capsuleId]?.type,
				decor?.area,
				additionalClassnames[item.id]
			)
		),
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
