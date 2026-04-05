import { useCallback, useEffect, useMemo } from "react";
import { useMachine } from "@xstate/react";

import { SceneLogicContext } from "@/provider/scene-logic";
import { applyStyleDefaults, getDefaultStyleForContentType } from "@/config/item-style-defaults";
import { CAPSULE_TYPES } from "@/config/capsule-types";
import { INTRO, OUTRO, SUSTAIN } from "@/config/constants";
import { SCENE_ID } from "@/scene-runtime/constants";

import { CapsuleEdit } from "./capsule-edit";
import { EditTransform } from "./edit-transform";
import { ItemEditPanel } from "./item-edit-panel";
import { SceneEdit } from "./scene-edit";
import { applyLiveStyleOnNode } from "./live-node-style";
import {
	applyAreaClassPatch,
	applyClassNameAction,
	buildClassNameDiff,
	ensureLiveAreaClassDefinition
} from "./live-node-classes";
import { resolveDecorAtEventAction } from "./item-edit.helpers";
import { buildDefaultTransitionEventPatch, getCustomEventActions } from "./item-edit.reset";
import { buildEditableVisualState, projectEditableVisualStateToNode } from "./editable-visual-state";
import { editorSyncMachine } from "./editor-sync.machine";
import { computeCueForSelectedCustomEvent, isItemDecorEventContext } from "@/provider/scene-logic.helpers";

import type { Content, Decor, SceneComp } from "@/api/db";
import type { EditableStyle } from "@/components/style-editor/types";
import type { ItemEditTab } from "@/provider/types";

interface EditItemProps {
	allContents?: Content[];
}

const POSITION_PLACEMENT_TOKEN_RE =
	/^(?:cell-span-r\d+-c\d+-rs\d+-cs\d+|cell-span-fill|cell-r\d+-c\d+|cell_layout_auto(?:_[a-z0-9_-]+)?-r\d+-c\d+|liste-r\d+|ed-zone-[a-z0-9_-]+)$/i;
const ZONE_CLASS_TOKEN_RE = /^ed-zone-[a-z0-9_-]+$/i;

function sameStyleValue(a: unknown, b: unknown): boolean {
	return Object.is(a, b);
}

function roundToInt(value: number): number {
	const rounded = Math.round(value);
	return Object.is(rounded, -0) ? 0 : rounded;
}

function roundToTwoDecimals(value: number): number {
	const rounded = Math.round(value * 100) / 100;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function normalizeTransformPrecision(payload: EditableStyle): EditableStyle {
	const normalized: EditableStyle = { ...payload };
	const intKeys: Array<keyof EditableStyle> = ["x", "y", "rotate"];
	const twoDecimalKeys: Array<keyof EditableStyle> = ["originX", "originY", "scaleX", "scaleY"];

	for (const key of intKeys) {
		const value = normalized[key];
		if (typeof value == "number" && Number.isFinite(value)) {
			normalized[key] = roundToInt(value) as any;
		}
	}

	for (const key of twoDecimalKeys) {
		const value = normalized[key];
		if (typeof value == "number" && Number.isFinite(value)) {
			normalized[key] = roundToTwoDecimals(value) as any;
		}
	}

	return normalized;
}

function getNeutralTransformValue(key: string): number | null {
	if (key === "x" || key === "y" || key === "rotate") return 0;
	if (key === "scaleX" || key === "scaleY") return 1;
	return null;
}

function normalizeZonePlacementClassName(className: string | null | undefined): string | null {
	const tokens = String(className || "")
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	const zoneTokens = tokens.filter((token) => ZONE_CLASS_TOKEN_RE.test(token));
	if (!zoneTokens.length) return tokens.length ? tokens.join(" ") : null;
	const selectedZone = zoneTokens[zoneTokens.length - 1];
	const keptTokens = tokens.filter((token) => !POSITION_PLACEMENT_TOKEN_RE.test(token));
	const next = [...keptTokens, selectedZone].join(" ").trim();
	return next || null;
}

function resolveDecorSelection(args: {
	item: any;
	sceneId: number;
	eventsByItem: any;
	decors: Record<number, Decor>;
	sceneContents: any;
	activeEventAction: string | null;
	itemDecor: Decor | undefined;
	selectedEvent: any;
}): { decor: Decor | undefined; editDecor: Decor | undefined; selectedEventUsesItemDecor: boolean } {
	if (!args.item) {
		return {
			decor: undefined,
			editDecor: undefined,
			selectedEventUsesItemDecor: false
		};
	}

	const context = {
		id: args.sceneId,
		events: args.eventsByItem,
		decors: args.decors,
		sceneContents: args.sceneContents
	} as SceneComp;

	const resolvedDecor = resolveDecorAtEventAction(
		context,
		args.item.id,
		args.activeEventAction,
		args.itemDecor
	);
	const selectedEventUsesItemDecor = isItemDecorEventContext(context, args.item.id, args.activeEventAction);
	const selectedEventDecor = selectedEventUsesItemDecor
		? args.itemDecor
		: args.selectedEvent?.decorId
			? args.decors[args.selectedEvent.decorId]
			: args.itemDecor;

	return {
		decor: resolvedDecor,
		editDecor: selectedEventDecor || args.itemDecor,
		selectedEventUsesItemDecor
	};
}

function buildEditorSyncKey(visualState: ReturnType<typeof buildEditableVisualState> | null): string {
	if (!visualState) return "";
	return [
		visualState.itemId,
		visualState.eventAction ?? "",
		visualState.decorId ?? "",
		visualState.area ?? "",
		visualState.className ?? "",
		JSON.stringify(visualState.style || {})
	].join("|");
}

function makeSelectionKey(action: string | null, cueSec: number | null): string | null {
	if (!action) return null;
	if (typeof cueSec !== "number" || !Number.isFinite(cueSec)) return null;
	return `${action}:${cueSec.toFixed(4)}`;
}

type StyleMutationPlan = {
	stylePatch: EditableStyle;
	liveStylePatch: EditableStyle;
	nextArea: string | null;
	nextClassName: string | null;
	areaChanged: boolean;
	classNameChanged: boolean;
};

function buildStyleMutationPlan(args: {
	normalizedPayload: EditableStyle;
	targetDecor: Decor;
	effectiveCurrentStyle: EditableStyle;
	contentType: Content["type"] | undefined;
}): StyleMutationPlan {
	const payloadStyleOnly = { ...args.normalizedPayload };
	const hasArea = typeof payloadStyleOnly.area !== "undefined";
	const hasClassName = typeof payloadStyleOnly.className !== "undefined";

	if (hasArea) delete payloadStyleOnly.area;
	if (hasClassName) delete payloadStyleOnly.className;

	const currentPersistedStyle = ((args.targetDecor.style as EditableStyle) ?? {}) as Record<string, unknown>;
	const currentUiStyle = applyStyleDefaults(args.effectiveCurrentStyle as EditableStyle, args.contentType);
	const defaults = getDefaultStyleForContentType(args.contentType) as Record<string, unknown>;
	const stylePatch: EditableStyle = {};
	const liveStylePatch: EditableStyle = {};

	for (const key of Object.keys(payloadStyleOnly)) {
		const incomingValue = (payloadStyleOnly as Record<string, unknown>)[key];
		const baselineValue = (currentUiStyle as Record<string, unknown>)[key];
		if (sameStyleValue(incomingValue, baselineValue)) continue;

		const defaultValue = defaults[key];
		const neutralTransformValue = getNeutralTransformValue(key);
		const shouldDropAsDefault =
			sameStyleValue(incomingValue, defaultValue) ||
			(typeof neutralTransformValue == "number" && sameStyleValue(incomingValue, neutralTransformValue));
		const nextValue = shouldDropAsDefault ? null : incomingValue;
		const previousValue = currentPersistedStyle[key];
		if (sameStyleValue(nextValue, previousValue)) continue;
		(stylePatch as Record<string, unknown>)[key] = nextValue;
		(liveStylePatch as Record<string, unknown>)[key] = incomingValue;
	}

	const nextArea = hasArea ? (args.normalizedPayload.area ?? null) : (args.targetDecor.area ?? null);
	const nextClassName = hasClassName
		? normalizeZonePlacementClassName(args.normalizedPayload.className ?? null)
		: (args.targetDecor.className ?? null);
	const areaChanged = hasArea && !sameStyleValue(nextArea, args.targetDecor.area ?? null);
	const classNameChanged = hasClassName && !sameStyleValue(nextClassName, args.targetDecor.className ?? null);

	return {
		stylePatch,
		liveStylePatch,
		nextArea,
		nextClassName,
		areaChanged,
		classNameChanged
	};
}

export function EditItem({ allContents = [] }: EditItemProps) {
	const actorRef = SceneLogicContext.useActorRef();
	const { send } = actorRef;

	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);
	// NE PAS RETIRER CE CONSOLE.LOG
	console.log("ITEM", item);

	const content: Content = SceneLogicContext.useSelector((state) => state.context.contents[item?.contentId]);
	const decors = SceneLogicContext.useSelector((state) => state.context.decors);
	const eventsByItem = SceneLogicContext.useSelector((state) => state.context.events);
	const sceneContents = SceneLogicContext.useSelector((state) => state.context.sceneContents);
	const sceneId = SceneLogicContext.useSelector((state) => state.context.id);

	const itemDecor = item?.decorId ? decors[item.decorId] : undefined;
	const activeNode = SceneLogicContext.useSelector((state) => state.context.active.node as HTMLElement | null);
	const activeEventAction = SceneLogicContext.useSelector((state) => state.context.active.event ?? null);
	const activeCueSec = SceneLogicContext.useSelector((state) => state.context.active.cue ?? null);
	const activeAction = SceneLogicContext.useSelector((state) => state.context.active.action ?? null);
	const activeItemEditTab = SceneLogicContext.useSelector((state) => state.context.active.itemEditTab);

	const selectedEvent = item && activeEventAction ? eventsByItem[item.id]?.[activeEventAction] : null;
	const { decor, editDecor, selectedEventUsesItemDecor } = useMemo(
		() =>
			resolveDecorSelection({
				item,
				sceneId,
				eventsByItem,
				decors,
				sceneContents,
				activeEventAction,
				itemDecor,
				selectedEvent
			}),
		[item, sceneId, eventsByItem, decors, sceneContents, activeEventAction, itemDecor, selectedEvent]
	);

	const capsule = SceneLogicContext.useSelector((state) => {
		if (content?.type == "capsule" && content.capsuleId) return state.context.capsules[content.capsuleId];
		return undefined;
	});
	const parentCapsule = SceneLogicContext.useSelector((state) =>
		item ? state.context.capsules[item.capsuleId] : undefined
	);

	const onStyleChange = useCallback(
		(payload: EditableStyle) => {
			const normalizedPayload = normalizeTransformPrecision(payload);
			const targetDecor = editDecor || itemDecor;
			if (!targetDecor || !item) return;
			const hasPlacementIntent =
				Object.prototype.hasOwnProperty.call(normalizedPayload, "className") ||
				Object.prototype.hasOwnProperty.call(normalizedPayload, "area");
			const shouldForceDedicatedEventDecor = Boolean(
				hasPlacementIntent &&
				selectedEvent &&
				!selectedEventUsesItemDecor &&
				typeof selectedEvent.decorId !== "number"
			);
			const effectiveCurrentStyle = ((decor?.style as EditableStyle) ?? {}) as EditableStyle;
			const mutationPlan = buildStyleMutationPlan({
				normalizedPayload,
				targetDecor,
				effectiveCurrentStyle,
				contentType: content?.type
			});

			if (
				!Object.keys(mutationPlan.stylePatch).length &&
				!mutationPlan.areaChanged &&
				!mutationPlan.classNameChanged &&
				!shouldForceDedicatedEventDecor
			) {
				return;
			}

			applyLiveStyleOnNode(activeNode, mutationPlan.liveStylePatch, {
				currentStyle: effectiveCurrentStyle
			});
			if (mutationPlan.classNameChanged) {
				const classNameDiff = buildClassNameDiff(targetDecor.className ?? null, mutationPlan.nextClassName);
				applyClassNameAction(activeNode, classNameDiff);
			}
			if (mutationPlan.areaChanged) {
				ensureLiveAreaClassDefinition(activeNode, mutationPlan.nextArea);
				applyAreaClassPatch(activeNode, targetDecor.area ?? null, mutationPlan.nextArea);
			}

			send({
				type: "decor-patch-requested",
				payload: {
					itemId: item.id,
					action: selectedEvent?.action ?? null,
					targetDecorId: targetDecor.id,
					selectedEventUsesItemDecor,
					seed: {
						className: (decor || itemDecor)?.className ?? targetDecor.className ?? null,
						area: (decor || itemDecor)?.area ?? targetDecor.area ?? null,
						style: ((decor || itemDecor)?.style as EditableStyle) ?? (targetDecor.style as EditableStyle) ?? {}
					},
					patch: {
						...(mutationPlan.classNameChanged ? { className: mutationPlan.nextClassName } : {}),
						...(mutationPlan.areaChanged ? { area: mutationPlan.nextArea } : {}),
						style: mutationPlan.stylePatch
					}
				}
			});
		},
		[
			editDecor,
			itemDecor,
			item,
			decor,
			content?.type,
			activeNode,
			send,
			selectedEvent,
			selectedEventUsesItemDecor
		]
	);

	const onResetStyle = () => {
		if (!item || !editDecor) return;
		const itemEvents = eventsByItem[item.id] || null;
		const customActions = getCustomEventActions(itemEvents);
		for (const action of customActions) {
			send({ type: "custom-event-delete", payload: { action } });
		}

		send({
			type: "events-update",
			payload: buildDefaultTransitionEventPatch(INTRO, itemEvents?.[INTRO])
		});
		send({
			type: "events-update",
			payload: buildDefaultTransitionEventPatch(OUTRO, itemEvents?.[OUTRO])
		});
		send({
			type: "events-update",
			payload: buildDefaultTransitionEventPatch(SUSTAIN, itemEvents?.[SUSTAIN])
		});

		if (activeNode) {
			activeNode.removeAttribute("style");
		}
		send({
			type: "item-update",
			payload: {
				decor: {
					id: editDecor.id,
					className: null,
					area: null,
					style: null
				} as Decor
			}
		});

		send({
			type: "selection.event.seek.requested",
			payload: {
				itemId: item.id,
				contentId: item.contentId,
				event: INTRO
			}
		});
	};

	const onTextChange = (inner: string) => {
		if (!content || content.type !== "text") return;
		if (activeNode) activeNode.textContent = inner;
		send({ type: "content-update", payload: { id: content.id, inner } });
	};

	const onTextCommit = (inner: string) => {
		if (!content || content.type !== "text") return;
		send({ type: "content-text-commit-requested", payload: { id: content.id, inner } });
	};

	const editableVisualState = useMemo(
		() =>
			item
				? buildEditableVisualState({
						itemId: item.id,
						eventAction: activeEventAction,
						cueSec: activeCueSec,
						decor
					})
				: null,
		[item, activeEventAction, activeCueSec, decor]
	);

	const selectedEventCueSec = SceneLogicContext.useSelector((state) => {
		const itemId = state.context.active.itemId;
		const action = state.context.active.event;
		if (!itemId || !action) return null;
		return computeCueForSelectedCustomEvent(state.context as any, itemId, action);
	});

	const desiredEditorSyncKey = buildEditorSyncKey(editableVisualState);
	const selectionKey = makeSelectionKey(activeEventAction, selectedEventCueSec);

	const [syncState, syncSend] = useMachine(editorSyncMachine, {
		input: {
			onSeek: (request) => {
				if (!request.selectionAction) return;
				if (typeof request.selectionCueSec !== "number" || !Number.isFinite(request.selectionCueSec)) return;
				const snapshot = actorRef.getSnapshot();
				const selectedItemId = request.visualState?.itemId ?? snapshot.context.active.itemId;
				if (!selectedItemId) return;
				const currentItem = snapshot.context.items[selectedItemId];
				if (!currentItem) return;
				send({
					type: "selection.event.seek.requested",
					payload: {
						itemId: currentItem.id,
						contentId: currentItem.contentId,
						event: request.selectionAction,
						cue: request.selectionCueSec
					}
				});
			},
			onProject: (request) => {
				if (!request.visualState) return;
				const snapshot = actorRef.getSnapshot();
				projectEditableVisualStateToNode(snapshot.context.active.node as HTMLElement | null, request.visualState);
			}
		}
	});

	useEffect(() => {
		syncSend({
			type: "sync.update",
			payload: {
				visualKey: desiredEditorSyncKey,
				visualState: editableVisualState,
				selectionAction: activeEventAction,
				selectionCueSec: selectedEventCueSec,
				selectionKey,
				activeItemId: item?.id ?? null,
				activeEvent: activeEventAction,
				activeCueSec: activeCueSec,
				activeAction
			}
		});
	}, [
		syncSend,
		desiredEditorSyncKey,
		editableVisualState,
		activeEventAction,
		activeCueSec,
		activeAction,
		selectedEventCueSec,
		selectionKey,
		item?.id
	]);

	const onDecorUpdate = useCallback(
		(payload: { id: number; area?: string | null; className?: string | null }) => {
			if (!item) return;
			const currentDecor =
				decors[payload.id] || (selectedEvent?.decorId ? decors[selectedEvent.decorId] : decor || itemDecor);
			const patch: { area?: string | null; className?: string | null } = {};
			if (Object.prototype.hasOwnProperty.call(payload, "className")) {
				const nextClassName = normalizeZonePlacementClassName(payload.className ?? null);
				if ((currentDecor?.className ?? null) !== nextClassName) patch.className = nextClassName;
			}
			if (Object.prototype.hasOwnProperty.call(payload, "area")) {
				const nextArea = payload.area ?? null;
				if ((currentDecor?.area ?? null) !== nextArea) patch.area = nextArea;
			}
			if (!Object.keys(patch).length) return;

			send({
				type: "decor-patch-requested",
				payload: {
					itemId: item.id,
					action: selectedEvent?.action ?? null,
					targetDecorId: selectedEvent?.decorId ?? payload.id,
					selectedEventUsesItemDecor,
					seed: {
						className: (decor || itemDecor)?.className ?? null,
						area: (decor || itemDecor)?.area ?? null,
						style: ((decor || itemDecor)?.style as EditableStyle) ?? {}
					},
					patch
				}
			});
		},
		[item, send, selectedEvent, selectedEventUsesItemDecor, decor, itemDecor, decors]
	);

	const onTreeMove = useCallback(
		(payload: { sourceId: number; targetCapsuleId: number; insertionIndex: number }) => {
			send({ type: "tree-move-item", payload });
		},
		[send]
	);

	const onTabChange = useCallback(
		(value: ItemEditTab) => {
			send({ type: "ui.active.updated", payload: { itemEditTab: value } });
		},
		[send]
	);

	const editorSyncKey = activeEventAction ? syncState.context.projectedVisualKey : desiredEditorSyncKey;

	if (!item) return <SceneEdit allContents={allContents} />;
	const transformValue = editableVisualState?.transform ?? {};

	return (
		<>
			<EditTransform
				value={transformValue}
				editorSyncKey={editorSyncKey}
				decor={decor}
				editDecor={editDecor}
				onStyleChange={onStyleChange}
				onDecorUpdate={onDecorUpdate}
				onTreeMove={onTreeMove}
				item={item}
				parentCapsuleType={parentCapsule?.type}
				activeNode={activeNode}
			/>
			{capsule ? (
				<CapsuleEdit
					content={content}
					decor={decor}
					capsule={capsule}
					onChange={onStyleChange}
					onReset={onResetStyle}
					onTextChange={onTextChange}
					onTextCommit={onTextCommit}
					activeTab={activeItemEditTab}
					onTabChange={onTabChange}
				/>
			) : (
				<ItemEditPanel
					content={content}
					decor={decor}
					onChange={onStyleChange}
					onReset={onResetStyle}
					onTextChange={onTextChange}
					onTextCommit={onTextCommit}
					activeTab={activeItemEditTab}
					onTabChange={onTabChange}
				/>
			)}
		</>
	);
}
