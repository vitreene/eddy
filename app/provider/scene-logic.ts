import { setup, assign, raise } from "xstate";
import { createActorContext } from "@xstate/react";

import { capsuleReorder, reorderElements, updateOrder } from "./reorder-elements";
import { applyTreeMutation, treeMutation } from "./tree-mutations";
import { computeActiveCue } from "./active-cue";

import type { Decor, CapsuleComp, Content, ContentEvent, SceneComp, ItemComp, SceneContent } from "@/api/db";
import type { EditableStyle } from "@/components/style-editor/types";
import type { Theme } from "prisma/generated/prisma/client";
import { mergeCssStrings } from "@/lib/merge-css-classes";
import { AUTOCOMMIT_TOUCHED_IDLE_MS, INTRO, OUTRO, SUSTAIN } from "@/config/constants";
import {
	deriveEventKind,
	normalizeCustomEventDraft,
	parseCustomEventMoveOptions,
	serializeCustomEventMoveOptions,
	type CustomEventPosition
} from "@/config/custom-events";
import { replaceEventRefPreservingMedia } from "@/lib/event-ref";
import { traceEddy } from "@/lib/eddy-trace";
import { getPlayerNode } from "@/scene-runtime/node-resolver";
import { buildNodeId } from "@/scene-runtime/node-id";
import {
	clearSequenceFlushRequest,
	isSequenceAction,
	markSequenceTouched,
	requestSequenceFlush,
	shouldPreserveSelectionOnFlush,
	type SequenceFlushReason
} from "./scene-reload-policy";
import {
	computeCueForSelectedCustomEvent,
	executePersistTouchedCommits,
	getMutationActivePayload,
	getTouchedParams,
	hasOwn,
	mergeDecorStylePatch,
	nextCustomAction,
	resolveCustomEventNameCollision,
	seedCustomEventPlacement,
	withItemNodeIds
} from "./scene-logic.helpers";
import {
	normalizeSceneLogicUiPreferences,
	persistSceneLogicUiPreferences
} from "./scene-logic.ui-preferences";
import { initializeSceneContext } from "./scene-logic.init";
import {
	deleteCustomEventOnServer,
	patchSceneOnServer,
	persistContentTextOnServer,
	persistItemVisibilityOnServer,
	type ScenePatchRequest
} from "./scene-logic.api";
import { ensureEventDecorId } from "./scene-logic.decor";
import type {
	ActiveState,
	TreeMoveEvent,
	TreeCreateEvent,
	TreeDeleteEvent,
	TreeMutationResponse
} from "./types";

const active: ActiveState = {
	main: null,

	itemId: null,
	node: null,
	contentId: null,
	cue: null,
	progress: null,
	action: null,
	event: null,
	sequenceTouched: false,
	sequenceFlushToken: 0,
	sequenceFlushReason: null,
	telcoMuted: false,
	itemEditTab: "presets",
	eventTouched: false,
	decorTouched: false,
	themeTouched: false,
	capsuleTouched: false
};

const emptyScene: SceneComp = {
	id: null,
	title: "",
	main: null,
	events: {},
	sceneContents: {},
	capsules: {},
	items: {},
	contents: {},
	decors: {}
};

const ACTIVE_SET_SEEK_EPSILON_SEC = 0.0005;

function applyActivePayload(
	context: SceneComp & { active: ActiveState },
	payloadInput: Partial<ActiveState>
): SceneComp & { active: ActiveState } {
	const isSeekAction =
		"action" in payloadInput && typeof payloadInput.action == "string" && payloadInput.action === "seek";
	const shouldIgnoreSelectionBecausePlaying =
		context.active.action === "play" && "itemId" in payloadInput && !isSeekAction;
	const payload = shouldIgnoreSelectionBecausePlaying
		? { ...payloadInput, itemId: null, node: null, contentId: null, event: null }
		: payloadInput;

	const itemChanged = "itemId" in payload && payload.itemId !== context.active.itemId;
	const itemId = "itemId" in payload ? (payload.itemId ?? null) : context.active.itemId;
	const activeNodeDisconnected = Boolean(context.active.node) && !context.active.node!.isConnected;
	const shouldResolveNodeFromItem =
		"itemId" in payload && (itemChanged || !context.active.node || activeNodeDisconnected);
	const shouldResolveNodeLazily =
		!("itemId" in payload) &&
		!("node" in payload) &&
		(!context.active.node || activeNodeDisconnected) &&
		Boolean(context.active.itemId);
	const nextNode =
		"node" in payload
			? (payload.node ?? null)
			: shouldResolveNodeFromItem
				? itemId
					? (() => {
							const item = context.items[itemId];
							if (!item) return null;
							const content = context.contents[item.contentId];
							if (content?.type === "capsule" && content.capsuleId) {
								return getPlayerNode(buildNodeId("capsule", content.capsuleId));
							}
							return getPlayerNode(item.nodeId);
						})()
					: null
				: shouldResolveNodeLazily
					? (() => {
							const item = context.items[context.active.itemId as number];
							if (!item) return context.active.node;
							const content = context.contents[item.contentId];
							if (content?.type === "capsule" && content.capsuleId) {
								return getPlayerNode(buildNodeId("capsule", content.capsuleId));
							}
							return getPlayerNode(item.nodeId);
						})()
					: context.active.node;
	const nextEvent = "event" in payload ? (payload.event ?? null) : itemChanged ? null : context.active.event;
	const sequenceActionFromPayload =
		"action" in payload && typeof payload.action == "string" ? payload.action : null;
	const shouldKeepCueOnSequenceDeselection =
		"itemId" in payload && payload.itemId == null && isSequenceAction(sequenceActionFromPayload);
	const shouldPreserveCueOnItemReselect =
		"itemId" in payload &&
		!itemChanged &&
		!("cue" in payload) &&
		!("event" in payload) &&
		!("action" in payload);

	let cue =
		"itemId" in payload
			? shouldPreserveCueOnItemReselect || shouldKeepCueOnSequenceDeselection
				? context.active.cue
				: itemId
					? computeActiveCue(context, itemId)
					: null
			: context.active.cue;

	if (itemId && "event" in payload && nextEvent) {
		const eventCue = computeCueForSelectedCustomEvent(context, itemId, nextEvent);
		if (typeof eventCue == "number" && Number.isFinite(eventCue)) cue = eventCue;
		traceEddy(
			"selection",
			"event-cue-resolved",
			{
				event: nextEvent,
				resolvedCue: typeof eventCue == "number" && Number.isFinite(eventCue) ? eventCue : null,
				previousCue: context.active.cue,
				payloadCue: Object.prototype.hasOwnProperty.call(payload, "cue") ? (payload.cue ?? null) : null
			},
			{ itemId }
		);
	}

	let nextActive = {
		...context.active,
		node: nextNode,
		cue,
		event: nextEvent,
		...payload
	};

	if (itemId && "event" in payload && nextEvent) {
		const selectedEvent = context.events[itemId]?.[nextEvent];
		if (selectedEvent && typeof cue == "number" && Number.isFinite(cue)) {
			const kind = deriveEventKind(selectedEvent.action);
			if (kind === "custom" || kind === "intro" || kind === "sustain" || kind === "outro") {
				const eventChanged = nextEvent !== context.active.event;
				const previousCue = context.active.cue;
				const cueChanged =
					typeof previousCue !== "number" ||
					!Number.isFinite(previousCue) ||
					Math.abs(previousCue - cue) > ACTIVE_SET_SEEK_EPSILON_SEC;
				const explicitSeek =
					"action" in payload && typeof payload.action === "string" && payload.action === "seek";
				traceEddy(
					"selection",
					"seek-decision",
					{
						event: nextEvent,
						eventKind: kind,
						previousEvent: context.active.event,
						eventChanged,
						previousCue,
						nextCue: cue,
						cueChanged,
						explicitSeek
					},
					{ itemId }
				);
				if (eventChanged || cueChanged || explicitSeek) {
					nextActive = {
						...nextActive,
						action: "seek"
					};
				}
			}
		}
	}

	const effectiveSequenceAction =
		typeof nextActive.action == "string" ? nextActive.action : sequenceActionFromPayload;
	const isTelcoAction = isSequenceAction(effectiveSequenceAction);
	const isBeingEdited = Boolean(nextActive.eventTouched || nextActive.decorTouched || nextActive.themeTouched);
	const hasTelcoTriggerPayload =
		Object.prototype.hasOwnProperty.call(payload, "action") ||
		Object.prototype.hasOwnProperty.call(payload, "cue") ||
		Object.prototype.hasOwnProperty.call(payload, "event") ||
		Object.prototype.hasOwnProperty.call(payload, "itemId");

	if (isTelcoAction && isBeingEdited) {
		const params = getTouchedParams(context);
		if (params.length) {
			void executePersistTouchedCommits(context, params, {
				onEventsPersisted: () => {}
			});
		}
	}

	if (isTelcoAction && nextActive.sequenceTouched && hasTelcoTriggerPayload) {
		const keepSelectionWhileEditing = shouldPreserveSelectionOnFlush(nextActive, "sequence-action", {
			sequenceAction: effectiveSequenceAction
		});

		nextActive = requestSequenceFlush(nextActive, "sequence-action", {
			preserveSelection: keepSelectionWhileEditing
		});
	}

	if (hasTelcoTriggerPayload) {
		traceEddy(
			"selection",
			"active-apply",
			{
				payload: {
					itemId: Object.prototype.hasOwnProperty.call(payload, "itemId") ? (payload.itemId ?? null) : undefined,
					event: Object.prototype.hasOwnProperty.call(payload, "event") ? (payload.event ?? null) : undefined,
					action: Object.prototype.hasOwnProperty.call(payload, "action") ? (payload.action ?? null) : undefined,
					cue: Object.prototype.hasOwnProperty.call(payload, "cue") ? (payload.cue ?? null) : undefined
				},
				activeBefore: {
					itemId: context.active.itemId,
					event: context.active.event,
					action: context.active.action,
					cue: context.active.cue
				},
				activeAfter: {
					itemId: nextActive.itemId,
					event: nextActive.event,
					action: nextActive.action,
					cue: nextActive.cue
				},
				sequenceFlushToken: nextActive.sequenceFlushToken,
				sequenceFlushReason: nextActive.sequenceFlushReason
			},
			{ itemId: itemId ?? null }
		);
	}

	return {
		...context,
		active: nextActive
	};
}

export const sceneLogic = setup({
	types: {
		context: {} as SceneComp & { active: ActiveState },
		input: {} as SceneComp,
		events: {} as
			| { type: "init"; payload: SceneComp }
			| { type: "scene-update"; payload: Partial<Pick<SceneComp, "title">> }
			| { type: "scene-patch-requested"; payload: { sceneId: number; patch: ScenePatchRequest } }
			| { type: "persist-touched" }
			| {
					type: "selection.item.requested";
					payload: {
						itemId: number | null;
						contentId?: number | null;
						node?: HTMLElement | null;
						action?: string | null;
						cue?: number | null;
					};
			  }
			| { type: "selection.event.requested"; payload: { event: string | null } }
			| {
					type: "selection.event.seek.requested";
					payload: { itemId: number; contentId: number | null; event: string; cue?: number | null };
			  }
			| { type: "selection.clear.requested" }
			| { type: "transport.seek.requested"; payload: { progress?: number | null; cue: number } }
			| { type: "transport.play.requested" }
			| { type: "transport.pause.requested" }
			| { type: "transport.progress.updated"; payload: { progress: number } }
			| { type: "transport.seek.completed" }
			| {
					type: "ui.active.updated";
					payload: {
						telcoMuted?: boolean;
						itemEditTab?: ActiveState["itemEditTab"];
						timelineView?: string | null;
					};
			  }
			| { type: "sequence-flush-request"; payload?: { reason?: SequenceFlushReason; force?: boolean } }
			| { type: "sequence-flush-consumed"; payload?: { token?: number } }
			| { type: "commit"; payload: Partial<ActiveState> }
			| { type: "reset-active" }
			| { type: "end-edit" }
			| { type: "item-update"; payload: Partial<ItemComp & { decor: Decor }> }
			| { type: "item-visibility-toggle"; payload: { itemId: number; visible: boolean } }
			| { type: "content-update"; payload: { id: number; inner?: string; name?: string } }
			| { type: "content-text-commit-requested"; payload: { id: number; inner: string } }
			| {
					type: "decor-patch-requested";
					payload: {
						itemId: number;
						action: string | null;
						targetDecorId: number;
						selectedEventUsesItemDecor: boolean;
						seed?: { className?: string | null; area?: string | null; style?: Decor["style"] | null };
						patch: {
							className?: string | null;
							area?: string | null;
							style?: Decor["style"] | null;
						};
					};
			  }
			| {
					type: "decor-patch-apply";
					payload: {
						itemId: number;
						decorId: number;
						patch: {
							className?: string | null;
							area?: string | null;
							style?: Decor["style"] | null;
						};
					};
			  }
			| { type: "capsule-update"; payload: Partial<CapsuleComp> }
			| { type: "events-update"; payload: Partial<ContentEvent> }
			| { type: "events-persisted"; payload: { itemId: number; events: ContentEvent[] } }
			| {
					type: "decor-created";
					payload: { itemId: number; action: string; decor: Decor };
			  }
			| {
					type: "custom-event-create";
					payload?: {
						name?: string;
						delay?: number | null;
						duration?: number | null;
						position?: CustomEventPosition | null;
						autoMove?: boolean;
						clearTransforms?: boolean;
					};
			  }
			| {
					type: "custom-event-update";
					payload: {
						action: string;
						name?: string | null;
						delay?: number | null;
						duration?: number | null;
						position?: CustomEventPosition | null;
						autoMove?: boolean;
						clearTransforms?: boolean;
					};
			  }
			| { type: "custom-event-delete"; payload: { action: string } }
			| { type: "content-add"; payload: Content }
			| { type: "scene-content-upsert"; payload: SceneContent }
			| { type: "scene-content-remove"; payload: { sceneId: number } }
			| { type: "tree-move-item"; payload: TreeMoveEvent }
			| { type: "tree-create-text"; payload: TreeCreateEvent }
			| { type: "tree-create-capsule"; payload: TreeCreateEvent }
			| { type: "tree-create-from-content"; payload: TreeCreateEvent }
			| { type: "tree-delete-item"; payload: TreeDeleteEvent }
			| { type: "tree-delete-capsule"; payload: TreeDeleteEvent }
			| { type: "tree-after-move"; payload: TreeMoveEvent }
			| { type: "reorder.capsule"; payload: TreeMoveEvent }
			| { type: "theme-update"; payload: Partial<Theme> }
	},
	actions: {
		persistUiPreferencesFromUiUpdate: ({ context, event }) => {
			if (event.type !== "ui.active.updated") return;
			const payload = event.payload;
			const hasTelcoMuted = Object.prototype.hasOwnProperty.call(payload, "telcoMuted");
			const hasItemEditTab = Object.prototype.hasOwnProperty.call(payload, "itemEditTab");
			if (!hasTelcoMuted && !hasItemEditTab) return;

			persistSceneLogicUiPreferences(
				normalizeSceneLogicUiPreferences({
					telcoMuted: hasTelcoMuted ? Boolean(payload.telcoMuted) : context.active.telcoMuted,
					itemEditTab: hasItemEditTab ? payload.itemEditTab : context.active.itemEditTab
				})
			);
		},
		commitTouchedOnSelectionSwitch: ({ context, event, self }) => {
			const payload = event.type === "selection.item.requested" ? { itemId: event.payload.itemId } : null;
			if (!payload) return;
			if (!("itemId" in payload)) return;
			if (!payload.itemId || payload.itemId === context.active.itemId) return;

			const params = getTouchedParams(context);
			if (!params.length) return;

			void executePersistTouchedCommits(context, params, {
				onEventsPersisted: (itemId, events) => {
					self.send({ type: "events-persisted", payload: { itemId, events } });
				}
			});
		},
		resetTouchedOnSelectionSwitch: assign(({ context, event }) => {
			const payload = event.type === "selection.item.requested" ? { itemId: event.payload.itemId } : null;
			if (!payload) return context;
			if (!("itemId" in payload)) return context;
			if (!payload.itemId || payload.itemId === context.active.itemId) return context;
			if (!getTouchedParams(context).length) return context;

			return {
				...context,
				active: {
					...context.active,
					eventTouched: false,
					decorTouched: false,
					themeTouched: false,
					capsuleTouched: false
				}
			};
		}),
		resetTouched: assign(({ context }) => {
			return {
				...context,
				active: {
					...context.active,
					eventTouched: false,
					decorTouched: false,
					themeTouched: false,
					capsuleTouched: false
				}
			};
		}),
		reset: assign(({ context }) => {
			return {
				...context,
				active: {
					...context.active,
					eventTouched: false,
					decorTouched: false,
					themeTouched: false,
					capsuleTouched: false
				}
			};
		}),
		commitFetch: async ({ context, self }, params: string[]) => {
			await executePersistTouchedCommits(context, params, {
				onEventsPersisted: (itemId, events) => {
					self.send({ type: "events-persisted", payload: { itemId, events } });
				}
			});
		},
		persistItemVisibility: async (_, params: { itemId: number; visible: boolean }) => {
			await persistItemVisibilityOnServer(params.itemId, params.visible);
		},
		deleteCustomEvent: async (_, params: { itemId: number; eventId: number }) => {
			await deleteCustomEventOnServer(params.itemId, params.eventId);
		},
		persistContentText: async (_, params: { id: number; inner: string }) => {
			await persistContentTextOnServer(params.id, params.inner);
		},
		ensureDecorPatchTarget: async (
			{ self },
			params: {
				itemId: number;
				action: string | null;
				targetDecorId: number;
				selectedEventUsesItemDecor: boolean;
				seed?: { className?: string | null; area?: string | null; style?: Decor["style"] | null };
				patch: {
					className?: string | null;
					area?: string | null;
					style?: Decor["style"] | null;
				};
			}
		) => {
			let decorId = params.targetDecorId;
			const action = params.action;

			if (action && !params.selectedEventUsesItemDecor) {
				const snapshotContext = self.getSnapshot().context as SceneComp & { active: ActiveState };
				const ensured = await ensureEventDecorId({
					context: snapshotContext,
					itemId: params.itemId,
					action,
					seed: params.seed
				});

				if (!ensured.decorId) return;
				decorId = ensured.decorId;

				if (ensured.createdDecor) {
					const hasClassName = Object.prototype.hasOwnProperty.call(params.patch, "className");
					const hasArea = Object.prototype.hasOwnProperty.call(params.patch, "area");
					const hasStyle = Object.prototype.hasOwnProperty.call(params.patch, "style");
					const mergedCreatedDecor: Decor = {
						...ensured.createdDecor,
						...(hasClassName ? { className: params.patch.className ?? null } : {}),
						...(hasArea ? { area: params.patch.area ?? null } : {}),
						...(hasStyle
							? {
									style: {
										...((ensured.createdDecor.style as EditableStyle) ?? {}),
										...((params.patch.style as EditableStyle) ?? {})
									}
								}
							: {})
					};
					self.send({
						type: "decor-created",
						payload: {
							itemId: params.itemId,
							action,
							decor: mergedCreatedDecor
						}
					});
				}
			}

			self.send({
				type: "decor-patch-apply",
				payload: {
					itemId: params.itemId,
					decorId,
					patch: params.patch
				}
			});
		},
		persistScenePatch: async ({ self }, params: { sceneId: number; patch: ScenePatchRequest }) => {
			const payload = await patchSceneOnServer(params.sceneId, params.patch);
			if (!payload) return;

			if (payload.scene?.title) {
				self.send({ type: "scene-update", payload: { title: payload.scene.title } });
			}

			if (payload.sceneContent) {
				self.send({ type: "scene-content-upsert", payload: payload.sceneContent });
			} else if (
				Object.prototype.hasOwnProperty.call(params.patch, "contentId") &&
				params.patch.contentId === null
			) {
				self.send({ type: "scene-content-remove", payload: { sceneId: params.sceneId } });
			}

			if (payload.mainCapsule) {
				self.send({
					type: "capsule-update",
					payload: {
						id: payload.mainCapsule.id,
						grid: payload.mainCapsule.grid,
						cardZones: payload.mainCapsule.cardZones
					}
				});
			}
		}
	},
	guards: {
		hasTouchedChanges: ({ context }) => getTouchedParams(context).length > 0
	},

	actors: { capsuleReorder, treeMutation }
}).createMachine({
	id: "scene",
	context: { ...emptyScene, active },

	initial: "start",

	states: {
		start: {
			on: {
				init: {
					actions: assign(({ event }) => {
						return initializeSceneContext(event.payload, active);
					}),
					target: "#scene.edit"
				}
			}
		},

		edit: {
			type: "parallel",
			initial: "active",
			on: {
				init: {
					target: "#scene.edit",
					actions: assign(({ context, event }) => initializeSceneContext(event.payload, context.active))
				}
			},
			states: {
				autosave: {
					initial: "clean",
					states: {
						clean: {
							on: {
								"persist-touched": {
									target: "touched"
								}
							}
						},
						touched: {
							on: {
								"persist-touched": {
									target: "touched"
								},
								commit: {
									target: "clean"
								}
							},
							after: {
								[AUTOCOMMIT_TOUCHED_IDLE_MS]: {
									guard: "hasTouchedChanges",
									actions: raise(() => ({ type: "commit", payload: {} })),
									target: "clean"
								}
							}
						}
					}
				},
				"end-edit": {
					target: "#scene.start"
				},
				active: {
					on: {
						"selection.item.requested": {
							target: "#scene.edit",
							actions: [
								{ type: "commitTouchedOnSelectionSwitch" },
								{ type: "resetTouchedOnSelectionSwitch" },
								assign(({ context, event }) =>
									applyActivePayload(context, {
										itemId: event.payload.itemId,
										...(Object.prototype.hasOwnProperty.call(event.payload, "contentId")
											? { contentId: event.payload.contentId ?? null }
											: {}),
										...(Object.prototype.hasOwnProperty.call(event.payload, "node")
											? { node: event.payload.node ?? null }
											: {}),
										...(Object.prototype.hasOwnProperty.call(event.payload, "action")
											? { action: event.payload.action ?? null }
											: {}),
										...(Object.prototype.hasOwnProperty.call(event.payload, "cue")
											? { cue: event.payload.cue ?? null }
											: {})
									})
								)
							]
						},
						"selection.event.requested": {
							target: "#scene.edit",
							actions: assign(({ context, event }) => applyActivePayload(context, { event: event.payload.event }))
						},
						"selection.event.seek.requested": {
							target: "#scene.edit",
							actions: assign(({ context, event }) =>
								applyActivePayload(context, {
									itemId: event.payload.itemId,
									contentId: event.payload.contentId,
									event: event.payload.event,
									action: "seek",
									...(Object.prototype.hasOwnProperty.call(event.payload, "cue")
										? { cue: event.payload.cue ?? null }
										: {})
								})
							)
						},
						"selection.clear.requested": {
							target: "#scene.edit",
							actions: assign(({ context }) =>
								applyActivePayload(context, {
									itemId: null,
									contentId: null,
									node: null,
									event: null
								})
							)
						},
						"transport.seek.requested": {
							target: "#scene.edit",
							actions: assign(({ context, event }) =>
								applyActivePayload(context, {
									action: "seek",
									cue: event.payload.cue,
									...(Object.prototype.hasOwnProperty.call(event.payload, "progress")
										? { progress: event.payload.progress ?? null }
										: {})
								})
							)
						},
						"transport.play.requested": {
							target: "#scene.edit",
							actions: assign(({ context }) => applyActivePayload(context, { action: "play" }))
						},
						"transport.pause.requested": {
							target: "#scene.edit",
							actions: assign(({ context }) => applyActivePayload(context, { action: "pause" }))
						},
						"transport.progress.updated": {
							target: "#scene.edit",
							actions: assign(({ context, event }) =>
								applyActivePayload(context, { progress: event.payload.progress })
							)
						},
						"transport.seek.completed": {
							target: "#scene.edit",
							actions: assign(({ context }) => applyActivePayload(context, { action: null }))
						},
						"ui.active.updated": {
							target: "#scene.edit",
							actions: [
								{ type: "persistUiPreferencesFromUiUpdate" },
								assign(({ context, event }) => applyActivePayload(context, event.payload as Partial<ActiveState>))
							]
						},
						"sequence-flush-request": {
							actions: assign(({ context, event }) => {
								const shouldFlush = event.payload?.force || context.active.sequenceTouched;
								if (!shouldFlush) return context;
								const reason = event.payload?.reason || "manual";
								const selectedItemStillExists =
									typeof context.active.itemId == "number" && Boolean(context.items[context.active.itemId]);
								return {
									...context,
									active: requestSequenceFlush(context.active, reason, {
										preserveSelection: shouldPreserveSelectionOnFlush(context.active, reason, {
											selectedItemStillExists
										})
									})
								};
							})
						},
						"sequence-flush-consumed": {
							actions: assign(({ context, event }) => {
								const expectedToken = Number(event.payload?.token);
								if (expectedToken && expectedToken !== context.active.sequenceFlushToken) return context;
								return {
									...context,
									active: clearSequenceFlushRequest(context.active)
								};
							})
						},
						commit: {
							actions: [
								{
									type: "commitFetch",
									params: ({ context }) => getTouchedParams(context)
								},
								{ type: "reset" }
							]
						}
					}
				},

				capsule: {
					on: {
						"capsule-update": {
							target: "#scene.edit",
							actions: [
								assign(({ context, event }) => {
									const { id: capsuleId, ...payload } = event.payload;

									const capsules = {
										...context.capsules,
										[capsuleId]: {
											...context.capsules[capsuleId],
											...payload
										}
									};

									const active = {
										...markSequenceTouched(context.active),
										capsuleTouched: true
									};

									return { ...context, capsules, active };
								}),
								raise(() => ({ type: "persist-touched" }))
							]
						}
					}
				},

				item: {
					on: {
						"item-visibility-toggle": {
							actions: [
								assign(({ context, event }) => {
									const current = context.items[event.payload.itemId];
									if (!current) return context;
									return {
										...context,
										items: {
											...context.items,
											[event.payload.itemId]: {
												...current,
												visible: event.payload.visible
											}
										},
										active: markSequenceTouched(context.active)
									};
								}),
								{ type: "persistItemVisibility", params: ({ event }) => event.payload },
								raise(() => ({
									type: "sequence-flush-request",
									payload: { reason: "tree-mutation", force: true }
								}))
							]
						},
						"item-update": {
							target: "#scene.edit",
							actions: [
								assign(({ context, event }) => {
									const { decor, ...payload } = event.payload;
									if (!decor) return context;
									const decorId = decor.id;
									const itemId = context.active.itemId!;
									const newItem = {
										...context.items[itemId],
										...payload
									};

									return {
										...context,
										items: {
											...context.items,
											[itemId]: newItem
										},
										decors: {
											...context.decors,
											[decorId]: mergeDecorStylePatch(context.decors?.[decorId], decor)
										},

										active: {
											...markSequenceTouched(context.active),
											decorTouched: true
										}
									};
								}),
								raise(() => ({ type: "persist-touched" }))
							]
						}
					}
				},

				content: {
					on: {
						"scene-update": {
							actions: assign(({ context, event }) => {
								return {
									...context,
									...event.payload
								};
							})
						},
						"scene-patch-requested": {
							actions: [
								{
									type: "persistScenePatch",
									params: ({ event }) => ({ sceneId: event.payload.sceneId, patch: event.payload.patch })
								}
							]
						},
						"events-persisted": {
							actions: assign(({ context, event }) => {
								const current = context.events[event.payload.itemId] || {};
								const persistedByAction = Object.fromEntries(
									event.payload.events.map((persisted) => [persisted.action, persisted])
								) as Record<string, ContentEvent>;

								const merged = Object.fromEntries(
									Object.entries(current).map(([action, local]) => {
										const persisted = persistedByAction[action];
										return [action, persisted ? { ...local, ...persisted } : local];
									})
								);

								const decorsToEnsure = Object.fromEntries(
									event.payload.events
										.filter((persisted) => typeof persisted.decorId == "number")
										.map((persisted) => {
											const decorId = persisted.decorId as number;
											if (context.decors[decorId]) return [decorId, context.decors[decorId]];
											return [
												decorId,
												{
													id: decorId,
													name: null,
													className: null,
													area: null,
													style: {},
													itemTargetId: null,
													basedUpon: null
												} as Decor
											];
										})
								);

								return {
									...context,
									decors: {
										...context.decors,
										...decorsToEnsure
									},
									events: {
										...context.events,
										[event.payload.itemId]: merged
									}
								};
							})
						},
						"content-update": {
							actions: assign(({ context, event }) => {
								const current = context.contents[event.payload.id];
								if (!current) return context;

								return {
									...context,
									contents: {
										...context.contents,
										[event.payload.id]: {
											...current,
											...event.payload
										}
									},
									active: markSequenceTouched(context.active)
								};
							})
						},
						"content-text-commit-requested": {
							actions: [
								{
									type: "persistContentText",
									params: ({ event }) => event.payload
								}
							]
						},
						"decor-patch-requested": {
							actions: [
								{
									type: "ensureDecorPatchTarget",
									params: ({ event }) => event.payload
								}
							]
						},
						"decor-created": {
							actions: [
								assign(({ context, event }) => {
									const currentItemEvents = context.events[event.payload.itemId] || {};
									const currentEvent = currentItemEvents[event.payload.action];
									if (!currentEvent) return context;

									return {
										...context,
										decors: {
											...context.decors,
											[event.payload.decor.id]: event.payload.decor
										},
										events: {
											...context.events,
											[event.payload.itemId]: {
												...currentItemEvents,
												[event.payload.action]: {
													...currentEvent,
													decorId: event.payload.decor.id
												}
											}
										},
										active: {
											...markSequenceTouched(context.active),
											decorTouched: true,
											eventTouched: true
										}
									};
								}),
								raise(() => ({ type: "persist-touched" }))
							]
						},
						"decor-patch-apply": {
							actions: [
								assign(({ context, event }) => {
									if (!event.payload.decorId || !Number.isFinite(event.payload.decorId)) return context;

									const patch = event.payload.patch;
									const hasClassName = hasOwn(patch, "className");
									const hasArea = hasOwn(patch, "area");
									const hasStyle = hasOwn(patch, "style");
									if (!hasClassName && !hasArea && !hasStyle) return context;

									const decorPatch = {
										id: event.payload.decorId,
										...(hasClassName ? { className: patch.className ?? null } : {}),
										...(hasArea ? { area: patch.area ?? null } : {}),
										...(hasStyle ? { style: patch.style ?? {} } : {})
									} as Decor;

									return {
										...context,
										decors: {
											...context.decors,
											[event.payload.decorId]: mergeDecorStylePatch(context.decors?.[event.payload.decorId], decorPatch)
										},
										active: {
											...markSequenceTouched(context.active),
											decorTouched: true
										}
									};
								}),
								raise(() => ({ type: "persist-touched" }))
							]
						},
						"events-update": {
							actions: [
								assign(({ context, event }) => {
									const itemId = context.active.itemId;

									if (!itemId) return context;
									const action = event.payload.action;
									if (!action) return context;
									return {
										...context,
										events: {
											...context.events,
											[itemId]: {
												...(context.events[itemId] ?? {}),
												[action]: { ...context.events[itemId]?.[action], ...event.payload }
											}
										},
										active: {
											...markSequenceTouched(context.active),
											eventTouched: true
										}
									};
								}),
								raise(() => ({ type: "persist-touched" }))
							]
						},
						"custom-event-create": {
							actions: [
								assign(({ context, event }) => {
									const itemId = context.active.itemId;
									if (!itemId) return context;

									const currentEvents = context.events[itemId] ?? {};
									const existingActions = Object.keys(currentEvents);
									const action = nextCustomAction(existingActions);
									const seeded = seedCustomEventPlacement(context, itemId);
									const normalized = normalizeCustomEventDraft({
										action,
										name: event.payload?.name ?? seeded.name,
										delay: event.payload?.delay ?? seeded.delay,
										duration: event.payload?.duration ?? null,
										position: event.payload?.position ?? seeded.position,
										ref: serializeCustomEventMoveOptions({
											autoMove: event.payload?.autoMove,
											clearTransforms: event.payload?.clearTransforms
										})
									});
									const conflictSafe = resolveCustomEventNameCollision({
										context,
										itemId,
										action,
										draft: normalized
									});

									const customEvent = {
										id: undefined,
										action,
										itemId,
										name: conflictSafe.name,
										ref: normalized.ref,
										delay: conflictSafe.delay,
										duration: normalized.duration,
										position: conflictSafe.position,
										decorId: null
									} as ContentEvent;

									return {
										...context,
										events: {
											...context.events,
											[itemId]: {
												...currentEvents,
												[action]: customEvent
											}
										},
										active: {
											...markSequenceTouched(context.active),
											event: action,
											eventTouched: true
										}
									};
								}),
								raise(() => ({ type: "persist-touched" }))
							]
						},
						"custom-event-update": {
							actions: [
								assign(({ context, event }) => {
									const itemId = context.active.itemId;
									if (!itemId) return context;
									const current = context.events[itemId]?.[event.payload.action];
									if (!current || deriveEventKind(current.action) !== "custom") return context;

									const nextDraft = {
										action: current.action,
										name: hasOwn(event.payload, "name") ? event.payload.name : current.name,
										delay: hasOwn(event.payload, "delay") ? event.payload.delay : (current as any).delay,
										duration: hasOwn(event.payload, "duration") ? event.payload.duration : (current as any).duration,
										position: hasOwn(event.payload, "position") ? event.payload.position : (current as any).position,
										ref: replaceEventRefPreservingMedia(
											current.ref,
											serializeCustomEventMoveOptions({
												autoMove: hasOwn(event.payload, "autoMove")
													? event.payload.autoMove
													: parseCustomEventMoveOptions(current.ref).autoMove,
												clearTransforms: hasOwn(event.payload, "clearTransforms")
													? event.payload.clearTransforms
													: parseCustomEventMoveOptions(current.ref).clearTransforms
											})
										)
									} as Parameters<typeof normalizeCustomEventDraft>[0];

									const normalized = normalizeCustomEventDraft(nextDraft);
									const conflictSafe = resolveCustomEventNameCollision({
										context,
										itemId,
										action: event.payload.action,
										draft: normalized
									});

									return {
										...context,
										events: {
											...context.events,
											[itemId]: {
												...(context.events[itemId] ?? {}),
												[event.payload.action]: {
													...current,
													name: conflictSafe.name,
													ref: normalized.ref,
													delay: conflictSafe.delay,
													duration: normalized.duration,
													position: conflictSafe.position
												}
											}
										},
										active: {
											...markSequenceTouched(context.active),
											eventTouched: true
										}
									};
								}),
								raise(() => ({ type: "persist-touched" }))
							]
						},
						"custom-event-delete": {
							actions: [
								{
									type: "deleteCustomEvent",
									params: ({ context, event }) => {
										const itemId = context.active.itemId;
										if (!itemId) return { itemId: 0, eventId: 0 };
										const eventId = context.events[itemId]?.[event.payload.action]?.id;
										return {
											itemId,
											eventId: typeof eventId == "number" ? eventId : 0
										};
									}
								},
								assign(({ context, event }) => {
									const itemId = context.active.itemId;
									if (!itemId) return context;
									const current = context.events[itemId]?.[event.payload.action];
									if (!current || deriveEventKind(current.action) !== "custom") return context;

									const nextEvents = { ...(context.events[itemId] ?? {}) };
									delete nextEvents[event.payload.action];
									const nextDecors = { ...context.decors };
									if (typeof current.decorId == "number") {
										delete nextDecors[current.decorId];
									}

									return {
										...context,
										decors: nextDecors,
										events: {
											...context.events,
											[itemId]: nextEvents
										},
										active: {
											...markSequenceTouched(context.active),
											event: context.active.event === event.payload.action ? null : context.active.event,
											eventTouched: true
										}
									};
								})
							]
						},
						"content-add": {
							actions: assign(({ context, event }) => {
								return {
									...context,
									contents: {
										...context.contents,
										[event.payload.id]: event.payload
									},
									active: markSequenceTouched(context.active)
								};
							})
						},
						"scene-content-upsert": {
							actions: assign(({ context, event }) => {
								return {
									...context,
									sceneContents: {
										...context.sceneContents,
										[event.payload.id]: event.payload
									}
								};
							})
						},
						"scene-content-remove": {
							actions: assign(({ context, event }) => {
								const sceneContents = Object.fromEntries(
									Object.entries(context.sceneContents).filter(
										([, sceneContent]) => sceneContent.sceneId !== event.payload.sceneId
									)
								) as SceneComp["sceneContents"];
								return {
									...context,
									sceneContents
								};
							})
						}
					}
				},
				theme: {
					on: {
						"theme-update": {
							actions: [
								assign(({ context, event }) => {
									const custom = mergeCssStrings(context.theme?.custom, event.payload?.custom);
									const generated = mergeCssStrings(context.theme?.generated, event.payload?.generated);

									const theme = {
										...context.theme,
										...event.payload,
										custom,
										generated
									};

									const active = {
										...markSequenceTouched(context.active),
										themeTouched: true
									};

									return { ...context, theme, active };
								}),
								raise(() => ({ type: "persist-touched" }))
							]
						}
					}
				},
				tree: {
					initial: "idle",
					states: {
						idle: {
							on: {
								"tree-create-text": {
									target: "tree-mutation"
								},
								"tree-create-capsule": {
									target: "tree-mutation"
								},
								"tree-create-from-content": {
									target: "tree-mutation"
								},
								"tree-delete-item": {
									target: "tree-mutation"
								},
								"tree-delete-capsule": {
									target: "tree-mutation"
								},
								"tree-move-item": {
									target: "tree-after-move",

									actions: [
										assign(({ context, event }) => {
											const { capsules, items, moved } = reorderElements(context, event.payload);
											if (moved) updateOrder(moved);
											return {
												...context,
												capsules,
												items,
												active: markSequenceTouched(context.active)
											};
										})
									]
								}
							}
						},
						"tree-mutation": {
							invoke: {
								id: "tree-mutation",
								input: ({ context, event }) => ({ context, event }),
								src: "treeMutation",
								onDone: {
									target: "idle",
									actions: [
										assign(({ context, event }) => {
											const nextContext = applyTreeMutation(context, event.output as TreeMutationResponse);
											return {
												...nextContext,
												items: withItemNodeIds(nextContext.items),
												active: markSequenceTouched(nextContext.active)
											};
										}),
										raise(({ context, event }) => {
											const payload = getMutationActivePayload(event.output as TreeMutationResponse);
											const fallbackItemId = context.active.itemId;
											const nextItemId = typeof payload.itemId == "number" ? payload.itemId : fallbackItemId;
											return {
												type: "selection.item.requested",
												payload: {
													itemId: nextItemId ?? null,
													...(Object.prototype.hasOwnProperty.call(payload, "contentId")
														? { contentId: payload.contentId ?? null }
														: {})
												}
											};
										}),
										raise(() => ({
											type: "sequence-flush-request",
											payload: { reason: "tree-mutation", force: true }
										})),
										raise(({ event }) => ({
											type: "commit",
											payload: getMutationActivePayload(event.output as TreeMutationResponse)
										}))
									]
								},
								onError: {
									target: "idle"
								}
							}
						},
						"tree-after-move": {
							invoke: {
								id: "tree-capsule-reorder",
								input: ({ context, event }) => ({ context, event }),
								src: "capsuleReorder",
								onDone: {
									target: "#scene.edit",
									actions: [
										assign(({ context, event }) => {
											if (event.output == "no-reorder") return context;
											const reorders = (event.output as Array<{ id: 2; order: 1000 }[]>).map((out) => out[0]);
											const items = reorders.map((r) => ({
												[r.id]: { ...context.items[r.id], order: r.order }
											}));
											return {
												...context,
												items: Object.assign({}, context.items, ...items),
												active: markSequenceTouched(context.active)
											};
										}),
										raise(() => ({
											type: "sequence-flush-request",
											payload: { reason: "tree-mutation", force: true }
										}))
									]
								}
							}
						}
					}
				}
			}
		}
	}
});

export const SceneLogicContext = createActorContext(sceneLogic);
export { getItemFromCapsule } from "./scene-logic.helpers";
