import { DEFAULT_TRANSITION_BY_ACTION, getTransitionPreset } from "@/config/transitions";
import { DEFAULT_DURATION, INTRO, OUTRO } from "@/config/constants";
import { deriveEventKind, parseCustomEventAutoOptions } from "@/config/custom-events";
import { buildNodeId } from "@/scene-runtime/node-id";
import { getMediaUrl } from "@/lib/media-url";

import type { CapsuleComp, ContentEvent, ItemComp, SceneComp } from "@/api/db";
import { P, type ID } from "../types";
import { SCENE_ID } from "@/scene-runtime/constants";
import { buildCustomTweenActionName, buildEventActionName } from "./lib";
import { getOrderedEventsForItem, getTransitionPresetForEvent } from "./events";
import {
	buildClassNameDiff,
	buildDynamicClassName,
	buildStyleInterpolation,
	getActionStyle,
	getEffectiveAreaClassName,
	getEventDecor,
	getInlineStyle,
	getStaticStyleClassName,
	hasPositionStyleDelta,
	joinNodeClassNames,
	toImageStyle,
	type DecorLike
} from "./styles";

const DEFAULT_IMAGE_PATH = "";

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

type TimedActionBuildResult = {
	actions: Record<string | number, any>;
	initialDecorState: DecorLike;
};

/**
 * Build perso payload for a capsule node (root and nested).
 */
export function createCapsuleRenderable(
	capsule: CapsuleComp,
	snapshot: SceneComp,
	additionalClassnames: Record<ID, string>
) {
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
	}

	const content = Object.values(snapshot.contents).find((c) => c.capsuleId == capsule.id);
	if (!content) return null;
	const item = Object.values(snapshot.items).find((it) => content.id == it.contentId);
	if (!item) return null;

	const events = snapshot.events[item.id];
	const decor = snapshot.decors[item.decorId] || { className: "", area: "", style: {} };
	const parentId = buildNodeId("capsule", item.capsuleId);
	const autoAreaClassName = additionalClassnames[item.id];

	const { actions, initialDecorState } = buildTimedActions({
		snapshot,
		item,
		events,
		baseDecor: decor,
		parentId,
		capsuleType: capsule.type,
		autoAreaClassName,
		debugLabel: null
	});

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

/**
 * Build perso payload for a regular item node.
 */
export function createItemRenderable(
	item: ItemComp,
	snapshot: SceneComp,
	additionalClassnames: Record<ID, string>
) {
	const content = snapshot.contents[item.contentId];
	if (content.type == "capsule") return null;

	const events = snapshot.events[item.id];
	const decor = snapshot.decors[item.decorId] || { className: "", area: "", style: {} };
	const parentId = buildNodeId("capsule", item.capsuleId);
	const id = item.nodeId || buildNodeId("item", item.id);

	const { actions, initialDecorState } = buildTimedActions({
		snapshot,
		item,
		events,
		baseDecor: decor,
		parentId,
		capsuleType: snapshot.capsules[item.capsuleId]?.type,
		autoAreaClassName: additionalClassnames[item.id],
		debugLabel: item.id === 53 ? "item_53" : null
	});

	const move = !events || Object.keys(events).length == 0 ? parentId : undefined;
	actions[id] = true;
	const tag = itemTag[content.type as keyof typeof itemTag];

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
	const mediaPath = content.path ?? DEFAULT_IMAGE_PATH;
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

/**
 * Build event-driven actions and initial state fold shared by capsules and items.
 */
function buildTimedActions(input: {
	snapshot: SceneComp;
	item: ItemComp;
	events: Record<string, ContentEvent | undefined> | undefined;
	baseDecor: DecorLike;
	parentId: string;
	capsuleType: string | null | undefined;
	autoAreaClassName: string | null | undefined;
	debugLabel: string | null;
}): TimedActionBuildResult {
	const { snapshot, item, events, baseDecor, parentId, capsuleType, autoAreaClassName, debugLabel } = input;
	const actions: Record<string | number, any> = {};
	let initialDecorState: DecorLike = baseDecor;
	let previousClassDecor: DecorLike = baseDecor;
	let previousDynamicClassName = buildDynamicClassName(capsuleType, previousClassDecor, autoAreaClassName);

	if (events) {
		const orderedEvents = getOrderedEventsForItem(snapshot, events);
		let previousMs = 0;
		let lastScheduledStartMs: number | null = null;
		let previousStyleState = getInlineStyle(baseDecor.style);

		for (const entry of orderedEvents) {
			const ev = entry.event;
			const actionName = buildEventActionName(ev);
			const eventKind = deriveEventKind(ev.action);

			if (eventKind === "custom") {
				const targetDecor = getEventDecor(snapshot, ev.decorId, previousClassDecor);
				const targetStyle = getInlineStyle(targetDecor.style);
				const nextDynamicClassName = buildDynamicClassName(capsuleType, targetDecor, autoAreaClassName);
				const scheduledStartMs = previousMs;
				const hasPreviousScheduledAction =
					lastScheduledStartMs !== null && lastScheduledStartMs <= scheduledStartMs;
				const hasTransitionWindow = entry.startMs !== null && entry.startMs > previousMs;

				if (!hasTransitionWindow || !hasPreviousScheduledAction) {
					if (debugLabel) {
						console.log(`[${debugLabel}][builder] folded-to-initial`, {
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
					getEffectiveAreaClassName(capsuleType, previousClassDecor?.area, autoAreaClassName) !==
					getEffectiveAreaClassName(capsuleType, targetDecor?.area, autoAreaClassName);
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

				const tweenActionName = buildCustomTweenActionName(ev);
				const tweenAction: Record<string, unknown> = { style: customStyle };
				const keyframeAction: Record<string, unknown> = {};
				if (classNameDiff) keyframeAction.className = classNameDiff;
				if (autoMoveRequested || layoutStyleChanged) {
					keyframeAction.move =
						autoMoveRequested && autoMoveOptions.clearTransforms
							? { mode: "auto", clearTransforms: true }
							: { mode: "auto" };
				}

				if (debugLabel) {
					console.log(`[${debugLabel}][builder] custom-action`, {
						action: ev.action,
						name: ev.name,
						startMs: entry.startMs,
						previousMs,
						autoMoveRequested,
						move: keyframeAction.move ?? null,
						hasX: typeof (customStyle as any).x !== "undefined",
						hasY: typeof (customStyle as any).y !== "undefined",
						hasWidth: typeof (customStyle as any).width !== "undefined",
						hasHeight: typeof (customStyle as any).height !== "undefined"
					});
				}

				if (Object.keys(customStyle).length) {
					actions[tweenActionName] = tweenAction;
				}
				if (Object.keys(keyframeAction).length) {
					actions[actionName] = keyframeAction;
				}
				lastScheduledStartMs = scheduledStartMs;
				previousStyleState = { ...previousStyleState, ...targetStyleForInterpolation };
				previousClassDecor = targetDecor;
				previousDynamicClassName = nextDynamicClassName;
				if (entry.startMs !== null) previousMs = entry.startMs;
				continue;
			}

			const preset = getTransitionPresetForEvent({ snapshot, item, event: ev });
			const actionStyle = getActionStyle(preset.style);
			if (ev.action == INTRO) actions[actionName] = { style: actionStyle, move: parentId };
			else actions[actionName] = { style: actionStyle };
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

	return { actions, initialDecorState };
}
