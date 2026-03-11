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
import { buildCapsuleBehaviorById } from "@/player/visibility/capsule-behavior";
import { applyVisibilityRules as applyRuntimeVisibilityRules } from "@/player/visibility/apply-visibility-rules";
import { getCueTimeAtPosition } from "@/player/visibility/custom-event-cue-mapping";
import { shouldCapsuleUseExplicitArea } from "@/config/capsule-types";
import {
	deriveEventKind,
	parseCustomEventAutoOptions,
	type CustomEventPosition
} from "@/config/custom-events";
import { NON_ANIMATABLE_MANAGED_STYLE_KEYS } from "@/config/item-style-defaults";
import { buildPlacementCss } from "@/player/capsule-layout/layout-css";
import { buildNodeId } from "@/player/node-id";

import type { SceneComp, CapsuleComp, ItemComp, TextTime, Decor, ContentEvent } from "@/api/db";
import { P, type ClassNameAction, type ID } from "../types";
import { SCENE_ID } from "../constants";
import { DEFAULT_DURATION, INTRO, OUTRO } from "@/config/constants";
import { getMediaUrl } from "@/lib/media-url";

import type { PlayerProps } from "..";

const DEFAUT_PATH_IMAGE = "";

export function buildScene(snapshot: SceneComp): PlayerProps & { styles?: string } {
	// Builder pipeline stages:
	// 1) runtime visibility filter
	// 2) derived timing/events resolution
	// 3) timeline and CSS generation
	// 4) perso graph creation
	const visibilityFilteredSnapshot = applyRuntimeVisibilityRules(snapshot);
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
	const behaviorByCapsuleId = buildCapsuleBehaviorById(snapshot);

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

//STYLES
function createStyle(snapshot: SceneComp, areas: string[], gridDefinitions: string[]) {
	const staticStyleDefinitions = buildStaticStyleClassDefinitions(snapshot);
	return `${snapshot.theme?.generated || ""} \n ${snapshot.theme?.custom || ""} \n\n ${gridDefinitions.join("\n")}\n${areas.join("\n")}\n${staticStyleDefinitions.join("\n")}`.trim();
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
	const id = buildNodeId("capsule", capsule.id);

	if (capsule.id == snapshot.main) {
		const className = joinNodeClassNames(
			capsule.grid,
			snapshot.decor?.className || "",
			getStaticStyleClassName(snapshot.decor?.style)
		);
		const style = getInlineStyle(snapshot.decor?.style);

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
		const parentId = buildNodeId("capsule", item.capsuleId);
		const actions: Record<string | number, any> = {};
		const autoAreaClassName = additionalClassnames[item.id];
		let initialDecorState: DecorLike = decor;
		let previousClassDecor: DecorLike = decor;
		let previousDynamicClassName = buildDynamicClassName(capsule.type, previousClassDecor, autoAreaClassName);

		if (events) {
			const orderedEvents = getOrderedEventsForItem(snapshot, events);
			let previousMs = 0;
			let lastScheduledStartMs: number | null = null;
			let previousStyleState = getInlineStyle(decor.style);
			for (const entry of orderedEvents) {
				const ev = entry.event;
				const actionName = buildEventActionName(ev);
				const eventKind = deriveEventKind(ev.action);

				if (eventKind === "custom") {
					const targetDecor = getEventDecor(snapshot, ev.decorId, previousClassDecor);
					const targetStyle = getInlineStyle(targetDecor.style);
					const nextDynamicClassName = buildDynamicClassName(capsule.type, targetDecor, autoAreaClassName);
					const scheduledStartMs = previousMs;
					const hasPreviousScheduledAction =
						lastScheduledStartMs !== null && lastScheduledStartMs <= scheduledStartMs;
					const hasTransitionWindow = entry.startMs !== null && entry.startMs > previousMs;
					if (!hasTransitionWindow || !hasPreviousScheduledAction) {
						initialDecorState = targetDecor;
						previousStyleState = { ...previousStyleState, ...targetStyle };
						previousClassDecor = targetDecor;
						previousDynamicClassName = nextDynamicClassName;
						if (entry.startMs !== null) previousMs = entry.startMs;
						continue;
					}
					const classNameDiff = buildClassNameDiff(previousDynamicClassName, nextDynamicClassName);
					const layoutStyleChanged =
						getStaticStyleClassName(previousClassDecor?.style) !== getStaticStyleClassName(targetDecor?.style);
					const placementChanged =
						getEffectiveAreaClassName(capsule.type, previousClassDecor?.area, autoAreaClassName) !==
						getEffectiveAreaClassName(capsule.type, targetDecor?.area, autoAreaClassName);
					const positionStyleChanged = hasPositionStyleDelta(previousStyleState, targetStyle);
					const autoMoveOptions = parseCustomEventAutoOptions(ev.ref);
					const autoMoveRequested =
						hasTransitionWindow && (placementChanged || (autoMoveOptions.auto && positionStyleChanged));
					const durationMs = Math.max(0, (entry.startMs ?? previousMs) - previousMs);
					const targetStyleForInterpolation =
						autoMoveRequested && autoMoveOptions.clearTransforms
							? {
									...targetStyle,
									rotate: 0,
									scaleX: 1,
									scaleY: 1,
									originX: 0.5,
									originY: 0.5
								}
							: targetStyle;
					const customStyle = buildStyleInterpolation(previousStyleState, targetStyleForInterpolation, durationMs);
					if (autoMoveRequested) {
						delete customStyle.x;
						delete customStyle.y;
						delete customStyle.width;
						delete customStyle.height;
					}
					const customAction: Record<string, unknown> = { style: customStyle };
					if (classNameDiff) customAction.className = classNameDiff;
					if (autoMoveRequested || layoutStyleChanged) {
						customAction.move =
							autoMoveRequested && autoMoveOptions.clearTransforms
								? { mode: "auto", clearTransforms: true }
								: { mode: "auto" };
					}
					actions[actionName] = customAction;
					lastScheduledStartMs = scheduledStartMs;
					previousStyleState = { ...previousStyleState, ...targetStyleForInterpolation };
					previousClassDecor = targetDecor;
					previousDynamicClassName = nextDynamicClassName;
					if (entry.startMs !== null) previousMs = entry.startMs;
					continue;
				}

				const preset = getTransitionPresetForEvent({ snapshot, item, event: ev });
				const actionStyle = getActionStyle(preset.style);
				if (ev.action == INTRO) {
					actions[actionName] = { style: actionStyle, move: parentId };
				} else {
					actions[actionName] = { style: actionStyle };
				}
				if (entry.startMs !== null) lastScheduledStartMs = entry.startMs;
				if (entry.startMs !== null) previousMs = entry.startMs;
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
					initialDecorState.className || "",
					getStaticStyleClassName(initialDecorState.style),
					getEffectiveAreaClassName(capsule.type, initialDecorState.area, additionalClassnames[item.id])
				),
				style: getInlineStyle(initialDecorState.style)
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
	const parentId = buildNodeId("capsule", item.capsuleId);
	const id = item.nodeId || buildNodeId("item", item.id);
	const debugItem53 = item.id === 53;

	const actions: Record<string | number, any> = {};

	const orderedEvents = getOrderedEventsForItem(snapshot, events || {});
	let previousMs = 0;
	let lastScheduledStartMs: number | null = null;
	let previousStyleState = getInlineStyle(decor.style);
	const autoAreaClassName = additionalClassnames[item.id];
	let initialDecorState: DecorLike = decor;
	let previousClassDecor: DecorLike = decor;
	let previousDynamicClassName = buildDynamicClassName(
		snapshot.capsules[item.capsuleId]?.type,
		previousClassDecor,
		autoAreaClassName
	);
	for (const entry of orderedEvents) {
		const ev = entry.event;
		const actionName = buildEventActionName(ev);
		const eventKind = deriveEventKind(ev.action);

		if (eventKind === "custom") {
			const targetDecor = getEventDecor(snapshot, ev.decorId, previousClassDecor);
			const targetStyle = getInlineStyle(targetDecor.style);
			const nextDynamicClassName = buildDynamicClassName(
				snapshot.capsules[item.capsuleId]?.type,
				targetDecor,
				autoAreaClassName
			);
			const scheduledStartMs = previousMs;
			const hasPreviousScheduledAction =
				lastScheduledStartMs !== null && lastScheduledStartMs <= scheduledStartMs;
			const hasTransitionWindow = entry.startMs !== null && entry.startMs > previousMs;
			if (!hasTransitionWindow || !hasPreviousScheduledAction) {
				if (debugItem53) {
					console.log("[item_53][builder] folded-to-initial", {
						action: ev.action,
						name: ev.name,
						startMs: entry.startMs,
						previousMs,
						hasTransitionWindow,
						hasPreviousScheduledAction
					});
				}
				initialDecorState = targetDecor;
				previousStyleState = { ...previousStyleState, ...targetStyle };
				previousClassDecor = targetDecor;
				previousDynamicClassName = nextDynamicClassName;
				if (entry.startMs !== null) previousMs = entry.startMs;
				continue;
			}
			const classNameDiff = buildClassNameDiff(previousDynamicClassName, nextDynamicClassName);
			const layoutStyleChanged =
				getStaticStyleClassName(previousClassDecor?.style) !== getStaticStyleClassName(targetDecor?.style);
			const placementChanged =
				getEffectiveAreaClassName(
					snapshot.capsules[item.capsuleId]?.type,
					previousClassDecor?.area,
					autoAreaClassName
				) !==
				getEffectiveAreaClassName(snapshot.capsules[item.capsuleId]?.type, targetDecor?.area, autoAreaClassName);
			const positionStyleChanged = hasPositionStyleDelta(previousStyleState, targetStyle);
			const autoMoveOptions = parseCustomEventAutoOptions(ev.ref);
			const autoMoveRequested =
				hasTransitionWindow && (placementChanged || (autoMoveOptions.auto && positionStyleChanged));
			const durationMs = Math.max(0, (entry.startMs ?? previousMs) - previousMs);
			const targetStyleForInterpolation =
				autoMoveRequested && autoMoveOptions.clearTransforms
					? {
							...targetStyle,
							rotate: 0,
							scaleX: 1,
							scaleY: 1,
							originX: 0.5,
							originY: 0.5
						}
					: targetStyle;
			const customStyle = buildStyleInterpolation(previousStyleState, targetStyleForInterpolation, durationMs);
			if (autoMoveRequested) {
				delete customStyle.x;
				delete customStyle.y;
				delete customStyle.width;
				delete customStyle.height;
			}
			const customAction: Record<string, unknown> = { style: customStyle };
			if (classNameDiff) customAction.className = classNameDiff;
			if (autoMoveRequested || layoutStyleChanged) {
				customAction.move =
					autoMoveRequested && autoMoveOptions.clearTransforms
						? { mode: "auto", clearTransforms: true }
						: { mode: "auto" };
			}
			if (debugItem53) {
				console.log("[item_53][builder] custom-action", {
					action: ev.action,
					name: ev.name,
					startMs: entry.startMs,
					previousMs,
					autoMoveRequested,
					move: customAction.move ?? null,
					hasX: typeof (customStyle as any).x !== "undefined",
					hasY: typeof (customStyle as any).y !== "undefined",
					hasWidth: typeof (customStyle as any).width !== "undefined",
					hasHeight: typeof (customStyle as any).height !== "undefined"
				});
			}
			actions[actionName] = customAction;
			lastScheduledStartMs = scheduledStartMs;
			previousStyleState = { ...previousStyleState, ...targetStyleForInterpolation };
			previousClassDecor = targetDecor;
			previousDynamicClassName = nextDynamicClassName;
			if (entry.startMs !== null) previousMs = entry.startMs;
			continue;
		}

		const preset = getTransitionPresetForEvent({ snapshot, item, event: ev });
		const actionStyle = getActionStyle(preset.style);
		if (ev.action == INTRO) {
			actions[actionName] = { style: actionStyle, move: parentId };
		} else {
			actions[actionName] = { style: actionStyle };
		}
		if (entry.startMs !== null) lastScheduledStartMs = entry.startMs;
		if (entry.startMs !== null) previousMs = entry.startMs;
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
			initialDecorState.className || "",
			getStaticStyleClassName(initialDecorState.style),
			getEffectiveAreaClassName(
				snapshot.capsules[item.capsuleId]?.type,
				initialDecorState.area,
				additionalClassnames[item.id]
			)
		),
		style: getInlineStyle(initialDecorState.style)
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
		case P.SPRITE:
		case P.IMG:
			return {
				type,
				initial: {
					...initial,
					tag: "img",
					className: `bg-picture ${initial.className || ""}`,
					style: toImageStyle(initial.style, type == P.IMG ? "cover" : "contain"),
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

function toImageStyle(style: unknown, fallbackFit: "cover" | "contain"): Record<string, number | string> {
	if (!style || typeof style != "object") return { objectFit: fallbackFit };

	const source = style as Record<string, unknown>;
	const next: Record<string, number | string> = {};

	let hasObjectFit = false;

	for (const [key, value] of Object.entries(source)) {
		if (typeof value != "string" && typeof value != "number") continue;
		if (key === "backgroundImage") continue;
		if (key === "backgroundSize") {
			const objectFit = mapBackgroundSizeToObjectFit(value);
			if (objectFit) {
				next.objectFit = objectFit;
				hasObjectFit = true;
			}
			continue;
		}
		if (key === "backgroundPosition") {
			next.objectPosition = String(value);
			continue;
		}
		if (key === "backgroundRepeat") continue;
		next[key] = value;
	}

	if (!hasObjectFit) next.objectFit = fallbackFit;

	return next;
}

function mapBackgroundSizeToObjectFit(value: string | number): string | null {
	if (typeof value == "number") return null;
	const normalized = value.trim().toLowerCase();
	if (normalized === "cover") return "cover";
	if (normalized === "contain") return "contain";
	return null;
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

	let lastCue = 0;

	for (const item of Object.values(snapshot.items || {})) {
		const events = snapshot.events[item.id] || {};
		const orderedEvents = getOrderedEventsForItem(snapshot, events);
		let previousMs = 0;
		for (const entry of orderedEvents) {
			const ev = entry.event;
			if (entry.startMs === null) continue;
			if (entry.startMs > lastCue) lastCue = entry.startMs;
			const kind = deriveEventKind(ev.action);
			const scheduledStart = kind === "custom" ? previousMs : entry.startMs;

			const mapped = {
				name: buildEventActionName(ev),
				start: scheduledStart
			};

			const existing = map.get(scheduledStart) || [];
			existing.push(mapped);
			map.set(scheduledStart, existing);
			previousMs = entry.startMs;
		}
	}
	map.set(lastCue - DEFAULT_DURATION, [{ name: OUTRO, start: lastCue - DEFAULT_DURATION }]);
	return map;
}

type OrderedEvent = {
	event: ContentEvent;
	startMs: number | null;
};

function getOrderedEventsForItem(
	snapshot: SceneComp,
	events: Record<string, ContentEvent | undefined>
): OrderedEvent[] {
	const sceneContent =
		Object.values(snapshot.sceneContents).find((sc) => sc.sceneId == snapshot.id) ||
		Object.values(snapshot.sceneContents)[0];
	const cues = sceneContent?.events || [];
	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const result: OrderedEvent[] = [];
	for (const event of Object.values(events || {})) {
		if (!event) continue;
		const startMs = resolveEventStartMs(event, cueByName);
		result.push({ event, startMs });
	}

	return result.toSorted((a, b) => {
		if (a.startMs === null && b.startMs !== null) return 1;
		if (a.startMs !== null && b.startMs === null) return -1;
		if (a.startMs !== null && b.startMs !== null && a.startMs !== b.startMs) return a.startMs - b.startMs;
		return actionRank(a.event.action) - actionRank(b.event.action);
	});
}

function resolveEventStartMs(event: ContentEvent, cueByName: Map<string, TextTime>): number | null {
	const kind = deriveEventKind(event.action);
	if (kind === "outro") {
		const cue = event.name ? cueByName.get(event.name) : null;
		if (!cue) return null;
		return Math.round(Number(cue.end) * 1000);
	}

	if (kind === "intro") {
		const cue = event.name ? cueByName.get(event.name) : null;
		if (!cue) return null;
		return Math.round(Number(cue.start) * 1000);
	}

	if (event.name) {
		const cue = cueByName.get(event.name);
		if (!cue) return null;
		const position = (event.position || "middle") as CustomEventPosition;
		return Math.round(getCueTimeAtPosition(cue, position) * 1000);
	}

	return null;
}

function actionRank(action: string): number {
	if (action === INTRO) return 0;
	if (deriveEventKind(action) === "custom") return 1;
	if (action === OUTRO) return 2;
	return 3;
}

function buildEventActionName(event: ContentEvent): string {
	const label = event.name || event.action;
	return `${label}-${event.action}`;
}

function buildStyleInterpolation(
	fromStyle: Record<string, number | string>,
	toStyle: Record<string, number | string>,
	durationMs: number
): ActionStyle {
	const style: ActionStyle = {};
	const hasTransformLikeChange = ["rotate", "scale", "scaleX", "scaleY", "skewX", "skewY"].some(
		(key) => typeof toStyle[key] != "undefined" || typeof fromStyle[key] != "undefined"
	);
	for (const [key, to] of Object.entries(toStyle)) {
		const from = fromStyle[key];
		if (typeof from == "undefined" || from === to) {
			style[key] = { to, duration: durationMs };
		} else {
			style[key] = { from, to, duration: durationMs };
		}
	}

	if (
		hasTransformLikeChange &&
		typeof toStyle.transformOrigin == "undefined" &&
		typeof fromStyle.transformOrigin == "undefined"
	) {
		style.transformOrigin = { to: "50% 50%", duration: durationMs };
	}
	return style;
}

function hasPositionStyleDelta(
	fromStyle: Record<string, number | string>,
	toStyle: Record<string, number | string>
): boolean {
	for (const key of ["x", "y", "width", "height"] as const) {
		if (typeof fromStyle[key] == "undefined" && typeof toStyle[key] == "undefined") continue;
		if (fromStyle[key] !== toStyle[key]) return true;
	}
	return false;
}

type DecorLike = {
	className?: string | null;
	area?: string | null;
	style?: unknown;
};

const STATIC_STYLE_CLASS_KEYS = new Set<string>(NON_ANIMATABLE_MANAGED_STYLE_KEYS.map((key) => String(key)));

function getInlineStyle(style: unknown): Record<string, number | string> {
	if (!style || typeof style != "object") return {};
	const source = style as Record<string, unknown>;
	const filtered = Object.fromEntries(
		Object.entries(source).filter(([key, value]) => {
			if (typeof value != "string" && typeof value != "number") return false;
			if (STATIC_STYLE_CLASS_KEYS.has(key)) return false;
			return true;
		})
	) as Record<string, number | string>;

	const normalized: Record<string, number | string> = { ...filtered };

	if (typeof normalized.width == "number" && Number.isFinite(normalized.width)) {
		normalized.width = `${normalized.width}px`;
	}
	if (typeof normalized.height == "number" && Number.isFinite(normalized.height)) {
		normalized.height = `${normalized.height}px`;
	}

	const hasOriginX = typeof normalized.originX != "undefined";
	const hasOriginY = typeof normalized.originY != "undefined";
	if (hasOriginX || hasOriginY) {
		const originX = hasOriginX ? normalizeOriginToken(normalized.originX) : "50%";
		const originY = hasOriginY ? normalizeOriginToken(normalized.originY) : "50%";
		normalized.transformOrigin = `${originX} ${originY}`;
		delete normalized.originX;
		delete normalized.originY;
	}

	return normalized;
}

function normalizeOriginToken(value: string | number): string {
	if (typeof value == "number") {
		if (value >= 0 && value <= 1) return `${value * 100}%`;
		return `${value}px`;
	}
	const trimmed = value.trim();
	if (!trimmed) return "50%";
	const numeric = Number(trimmed);
	if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 1) return `${numeric * 100}%`;
	return trimmed;
}

function getStaticStyleClassName(style: unknown): string {
	const entries = extractStaticStyleEntries(style);
	if (!entries.length) return "";
	const signature = entries.map(([key, value]) => `${key}:${value}`).join(";");
	return `ed-static-${hashString(signature)}`;
}

function extractStaticStyleEntries(style: unknown): Array<[string, string | number]> {
	if (!style || typeof style != "object") return [];
	const source = style as Record<string, unknown>;
	return Object.entries(source)
		.filter(
			([key, value]) =>
				STATIC_STYLE_CLASS_KEYS.has(key) && (typeof value == "string" || typeof value == "number")
		)
		.sort(([a], [b]) => (a < b ? -1 : 1)) as Array<[string, string | number]>;
}

function buildStaticStyleClassDefinitions(snapshot: SceneComp): string[] {
	const definitions = new Set<string>();
	const allDecors = [
		snapshot.decor as DecorLike | undefined,
		...Object.values(snapshot.decors || {}).map((decor) => decor as DecorLike)
	].filter(Boolean) as DecorLike[];

	for (const decor of allDecors) {
		const className = getStaticStyleClassName(decor.style);
		if (!className) continue;
		const declarations = buildStaticStyleDeclarations(decor.style);
		if (!declarations.length) continue;
		definitions.add(`.${className}{${declarations.join(";")}}`);
	}

	return [...definitions];
}

function buildStaticStyleDeclarations(style: unknown): string[] {
	const entries = extractStaticStyleEntries(style);
	const declarations: string[] = [];

	for (const [key, value] of entries) {
		if (key === "backgroundPosition") {
			declarations.push(`background-position:${value}`);
			declarations.push(`object-position:${value}`);
			continue;
		}
		declarations.push(`${toKebabCase(key)}:${value}`);
	}

	return declarations;
}

function toKebabCase(value: string): string {
	return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function hashString(value: string): string {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash * 31 + value.charCodeAt(i)) | 0;
	}
	return Math.abs(hash).toString(36);
}

function getEventDecor(
	snapshot: SceneComp,
	decorId: number | null | undefined,
	fallback: DecorLike
): DecorLike {
	if (!decorId) return fallback;
	const incoming = (snapshot.decors?.[decorId] as DecorLike | undefined) || null;
	if (!incoming) return fallback;
	if (isNeutralDecor(incoming)) return fallback;

	const mergedStyle = {
		...(fallback.style && typeof fallback.style == "object" ? (fallback.style as Record<string, unknown>) : {}),
		...(incoming.style && typeof incoming.style == "object" ? (incoming.style as Record<string, unknown>) : {})
	};

	return {
		...fallback,
		...incoming,
		className: incoming.className ?? fallback.className,
		area: incoming.area ?? fallback.area,
		style: mergedStyle
	};
}

function isNeutralDecor(decor: DecorLike): boolean {
	const hasClass = typeof decor.className == "string" && decor.className.trim().length > 0;
	const hasArea = typeof decor.area == "string" && decor.area.trim().length > 0;
	const hasStyle = Boolean(
		decor.style && typeof decor.style == "object" && Object.keys(decor.style as Record<string, unknown>).length
	);
	return !hasClass && !hasArea && !hasStyle;
}

function buildDynamicClassName(
	capsuleType: string | null | undefined,
	decor: DecorLike,
	autoAreaClassName: string | null | undefined
): string {
	return joinNodeClassNames(
		decor?.className || "",
		getStaticStyleClassName(decor?.style),
		getEffectiveAreaClassName(capsuleType, decor?.area, autoAreaClassName)
	);
}

function buildClassNameDiff(previousClassName: string, nextClassName: string): ClassNameAction | undefined {
	const previous = new Set(
		previousClassName
			.split(/\s+/)
			.map((v) => v.trim())
			.filter(Boolean)
	);
	const next = new Set(
		nextClassName
			.split(/\s+/)
			.map((v) => v.trim())
			.filter(Boolean)
	);

	const remove = [...previous].filter((token) => !next.has(token)).join(" ");
	const add = [...next].filter((token) => !previous.has(token)).join(" ");
	if (!remove && !add) return undefined;

	return {
		...(add ? { add } : {}),
		...(remove ? { remove } : {})
	};
}

type ActionStyle = Record<string, { from?: number | string; to: number | string; duration?: number }>;
function getActionStyle(style: ActionStyle) {
	const actionStyle = {} as ActionStyle;
	for (const key in style) actionStyle[key] = { ...style[key], duration: DEFAULT_DURATION };
	return actionStyle;
}
