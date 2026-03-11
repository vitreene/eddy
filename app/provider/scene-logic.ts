import { setup, assign, raise } from "xstate";
import { createActorContext } from "@xstate/react";

import { capsuleReorder, reorderElements, updateOrder } from "./reorder-elements";
import { applyTreeMutation, treeMutation } from "./tree-mutations";
import { computeActiveCue } from "./active-cue";

import type { Decor, CapsuleComp, Content, ContentEvent, SceneComp, ItemComp } from "@/api/db";
import type { Theme } from "prisma/generated/prisma/client";
import { mergeCssStrings } from "@/lib/merge-css-classes";
import { AUTOCOMMIT_TOUCHED_IDLE_MS, INTRO, OUTRO } from "@/config/constants";
import {
	deriveEventKind,
	normalizeCustomEventDraft,
	parseCustomEventAutoOptions,
	serializeCustomEventAutoOptions,
	type CustomEventPosition
} from "@/config/custom-events";
import { getPlayerNode } from "@/player/node-resolver";
import {
	clearSequenceFlushRequest,
	isSequenceAction,
	markSequenceTouched,
	requestSequenceFlush,
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
	seedCustomEventPlacement,
	withItemNodeIds
} from "./scene-logic.helpers";
import { initializeSceneContext } from "./scene-logic.init";
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
	eventTouched: false,
	decorTouched: false,
	themeTouched: false
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

export const sceneLogic = setup({
	types: {
		context: {} as SceneComp & { active: ActiveState },
		input: {} as SceneComp,
		events: {} as
			| { type: "init"; payload: SceneComp }
			| { type: "persist-touched" }
			| { type: "active-set"; payload: Partial<ActiveState> }
			| { type: "sequence-flush-request"; payload?: { reason?: SequenceFlushReason; force?: boolean } }
			| { type: "sequence-flush-consumed"; payload?: { token?: number } }
			| { type: "commit"; payload: Partial<ActiveState> }
			| { type: "reset-active" }
			| { type: "end-edit" }
			| { type: "item-update"; payload: Partial<ItemComp & { decor: Decor }> }
			| { type: "item-visibility-toggle"; payload: { itemId: number; visible: boolean } }
			| { type: "content-update"; payload: { id: number; inner?: string; name?: string } }
			| { type: "capsule-update"; payload: Partial<CapsuleComp> }
			| { type: "events-update"; payload: Partial<ContentEvent> }
			| { type: "events-persisted"; payload: { itemId: number; events: ContentEvent[] } }
			| {
					type: "custom-event-create";
					payload?: {
						name?: string;
						delay?: number | null;
						duration?: number | null;
						position?: CustomEventPosition | null;
						auto?: boolean;
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
						auto?: boolean;
						clearTransforms?: boolean;
					};
			  }
			| { type: "custom-event-delete"; payload: { action: string } }
			| { type: "content-add"; payload: Content }
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
		commitTouchedOnSelectionSwitch: ({ context, event, self }) => {
			if (event.type !== "active-set") return;
			if (!("itemId" in event.payload)) return;
			if (!event.payload.itemId || event.payload.itemId === context.active.itemId) return;

			const params = getTouchedParams(context);
			if (!params.length) return;

			void executePersistTouchedCommits(context, params, {
				onEventsPersisted: (itemId, events) => {
					self.send({ type: "events-persisted", payload: { itemId, events } });
				}
			});
		},
		resetTouchedOnSelectionSwitch: assign(({ context, event }) => {
			if (event.type !== "active-set") return context;
			if (!("itemId" in event.payload)) return context;
			if (!event.payload.itemId || event.payload.itemId === context.active.itemId) return context;
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
			const formData = new FormData();
			formData.set("visible", params.visible ? "true" : "false");
			void fetch(`/api/item/${params.itemId}`, {
				method: "POST",
				body: formData
			});
		},
		deleteCustomEvent: async (_, params: { itemId: number; eventId: number }) => {
			if (!params?.itemId || !params?.eventId) return;

			void fetch(`/api/content/${params.itemId}`, {
				method: "DELETE",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ eventId: params.eventId })
			});
		}
	},
	guards: {
		hasTouchedChanges: ({ context }) => getTouchedParams(context).length > 0,
		hasTouchedChangesOnSelectionSwitch: ({ context, event }) => {
			if (event.type !== "active-set") return false;
			if (!("itemId" in event.payload)) return false;
			if (!event.payload.itemId || event.payload.itemId === context.active.itemId) return false;
			return getTouchedParams(context).length > 0;
		}
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
						"active-set": {
							target: "#scene.edit",
							actions: [
								{ type: "commitTouchedOnSelectionSwitch" },
								{ type: "resetTouchedOnSelectionSwitch" },
								assign(({ context, event }) => {
									const isSeekAction =
										"action" in event.payload &&
										typeof event.payload.action == "string" &&
										event.payload.action === "seek";
									const shouldIgnoreSelectionBecausePlaying =
										context.active.action === "play" && "itemId" in event.payload && !isSeekAction;
									const payload = shouldIgnoreSelectionBecausePlaying
										? { ...event.payload, itemId: null, node: null, contentId: null, event: null }
										: event.payload;

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
													? getPlayerNode(context.items[itemId]?.nodeId)
													: null
												: shouldResolveNodeLazily
													? getPlayerNode(context.items[context.active.itemId as number]?.nodeId)
													: context.active.node;
									const nextEvent =
										"event" in payload ? (payload.event ?? null) : itemChanged ? null : context.active.event;
									const sequenceActionFromPayload =
										"action" in payload && typeof payload.action == "string" ? payload.action : null;
									const shouldKeepCueOnSequenceDeselection =
										"itemId" in payload && payload.itemId == null && isSequenceAction(sequenceActionFromPayload);

									let cue =
										"itemId" in payload
											? shouldKeepCueOnSequenceDeselection
												? context.active.cue
												: itemId
													? computeActiveCue(context, itemId)
													: null
											: context.active.cue;

									if (itemId && "event" in payload && nextEvent) {
										const eventCue = computeCueForSelectedCustomEvent(context, itemId, nextEvent);
										if (typeof eventCue == "number" && Number.isFinite(eventCue)) cue = eventCue;
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
										if (
											selectedEvent &&
											deriveEventKind(selectedEvent.action) === "custom" &&
											typeof cue == "number" &&
											Number.isFinite(cue)
										) {
											nextActive = {
												...nextActive,
												action: "seek"
											};
										}
									}

									const shouldFlushFromPayload = isSequenceAction(sequenceActionFromPayload);
									if (shouldFlushFromPayload && nextActive.sequenceTouched) {
										nextActive = requestSequenceFlush(nextActive, "sequence-action");
									}

									return {
										...context,
										active: nextActive
									};
								})
							]
						},
						"sequence-flush-request": {
							actions: assign(({ context, event }) => {
								const shouldFlush = event.payload?.force || context.active.sequenceTouched;
								if (!shouldFlush) return context;
								const reason = event.payload?.reason || "manual";
								return {
									...context,
									active: requestSequenceFlush(context.active, reason)
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
										ref: serializeCustomEventAutoOptions({
											auto: event.payload?.auto,
											clearTransforms: event.payload?.clearTransforms
										})
									});

									const customEvent = {
										id: undefined,
										action,
										itemId,
										name: normalized.name,
										ref: normalized.ref,
										delay: normalized.delay,
										duration: normalized.duration,
										position: normalized.position,
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
										ref: serializeCustomEventAutoOptions({
											auto: hasOwn(event.payload, "auto")
												? event.payload.auto
												: parseCustomEventAutoOptions(current.ref).auto,
											clearTransforms: hasOwn(event.payload, "clearTransforms")
												? event.payload.clearTransforms
												: parseCustomEventAutoOptions(current.ref).clearTransforms
										})
									} as Parameters<typeof normalizeCustomEventDraft>[0];

									const normalized = normalizeCustomEventDraft(nextDraft);

									return {
										...context,
										events: {
											...context.events,
											[itemId]: {
												...(context.events[itemId] ?? {}),
												[event.payload.action]: {
													...current,
													name: normalized.name,
													ref: normalized.ref,
													delay: normalized.delay,
													duration: normalized.duration,
													position: normalized.position
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
										raise(({ event }) => ({
											type: "active-set",
											payload: getMutationActivePayload(event.output as TreeMutationResponse)
										})),
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
