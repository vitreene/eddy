import { setup, assign, raise } from "xstate";
import { createActorContext } from "@xstate/react";

import { capsuleReorder, reorderElements, updateOrder } from "./reorder-elements";
import { applyTreeMutation, treeMutation } from "./tree-mutations";
import { computeActiveCue } from "./active-cue";

import type { Decor, CapsuleComp, Content, ContentEvent, SceneComp, ItemComp } from "@/api/db";
import type { Theme } from "prisma/generated/prisma/client";
import { findCssClassRule, mergeCssStrings } from "@/lib/merge-css-classes";
import { AUTOCOMMIT_TOUCHED_IDLE_MS, INTRO, OUTRO } from "@/config/constants";
import { normalizeTransitionRef } from "@/config/transitions";
import { deriveEventKind, normalizeCustomEventDraft, type CustomEventPosition } from "@/config/custom-events";
import { resolveClosestCuePointFromDelay } from "@/player/visibility/custom-event-cue-mapping";
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
	contentId: null,
	cue: null,
	progress: null,
	action: null,
	event: null,
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
		deleteCustomEvent: async ({ context }, params: { action: string }) => {
			const itemId = context.active.itemId;
			if (!itemId) return;
			const eventId = context.events[itemId]?.[params.action]?.id;
			if (!eventId) return;

			void fetch(`/api/content/${itemId}`, {
				method: "DELETE",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ eventId })
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
						return { active, ...event.payload };
					}),
					target: "#scene.edit"
				}
			}
		},

		edit: {
			type: "parallel",
			initial: "active",
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
									const cue =
										"itemId" in event.payload
											? event.payload.itemId
												? computeActiveCue(context, event.payload.itemId)
												: null
											: context.active.cue;

									return {
										...context,
										active: {
											...context.active,
											cue,
											event:
												"itemId" in event.payload && event.payload.itemId !== context.active.itemId
													? null
													: context.active.event,
											...event.payload
										}
									};
								})
							]
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
										...context.active,
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
										}
									};
								}),
								{ type: "persistItemVisibility", params: ({ event }) => event.payload }
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
											[decorId]: {
												...context.decors?.[decorId],
												...decor
											}
										},

										active: {
											...context.active,
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
									}
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
											...context.active,
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
										ref: null
									});

									const customEvent = {
										id: undefined,
										action,
										itemId,
										name: normalized.name,
										ref: null,
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
											...context.active,
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
										ref: null
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
													ref: null,
													delay: normalized.delay,
													duration: normalized.duration,
													position: normalized.position
												}
											}
										},
										active: {
											...context.active,
											eventTouched: true
										}
									};
								}),
								raise(() => ({ type: "persist-touched" }))
							]
						},
						"custom-event-delete": {
							actions: [
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
											...context.active,
											event: context.active.event === event.payload.action ? null : context.active.event,
											eventTouched: true
										}
									};
								}),
								{ type: "deleteCustomEvent", params: ({ event }) => ({ action: event.payload.action }) }
							]
						},
						"content-add": {
							actions: assign(({ context, event }) => {
								return {
									...context,
									contents: {
										...context.contents,
										[event.payload.id]: event.payload
									}
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
										...context.active,
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
											return { ...context, capsules, items };
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
											return applyTreeMutation(context, event.output as TreeMutationResponse);
										}),
										raise(({ event }) => ({
											type: "active-set",
											payload: getMutationActivePayload(event.output as TreeMutationResponse)
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
									actions: assign(({ context, event }) => {
										if (event.output == "no-reorder") return context;
										const reorders = (event.output as Array<{ id: 2; order: 1000 }[]>).map((out) => out[0]);
										const items = reorders.map((r) => ({
											[r.id]: { ...context.items[r.id], order: r.order }
										}));
										return {
											...context,
											items: Object.assign({}, context.items, ...items)
										};
									})
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

function serializeCapsuleTransition(value: unknown, action: "intro" | "outro"): string {
	// Canonical persistence format for capsule defaults.
	// We always store JSON { action, ref } in DB.
	if (!value) return "";

	if (typeof value == "string") {
		const ref = value.trim();
		if (!ref) return "";
		return JSON.stringify({ action, ref: normalizeTransitionRef(ref, action) });
	}

	if (typeof value == "object") {
		const record = value as Record<string, unknown>;
		const ref = typeof record.ref == "string" ? record.ref.trim() : "";
		if (!ref) return "";
		const currentAction = typeof record.action == "string" && record.action ? record.action : action;
		return JSON.stringify({ action: currentAction, ref: normalizeTransitionRef(ref, currentAction) });
	}

	return "";
}

function getMutationActivePayload(output: TreeMutationResponse): Partial<ActiveState> {
	const createdItem = output.created?.item;
	if (!createdItem) return {};
	return {
		itemId: createdItem.id,
		contentId: createdItem.contentId
	};
}

async function executePersistTouchedCommits(
	context: SceneComp & { active: ActiveState },
	params: string[],
	options?: {
		onEventsPersisted?: (itemId: number, events: ContentEvent[]) => void;
	}
) {
	if (!params.length) return;
	const itemId = context.active.itemId;

	if (!itemId) return false;

	const decorTouched = params.includes("decorTouched");
	const eventTouched = params.includes("eventTouched");
	const themeTouched = params.includes("themeTouched");
	const capsuleTouched = params.includes("capsuleTouched");

	if (eventTouched) {
		try {
			const response = await fetch(`/api/content/${itemId}`, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json"
				},
				body: JSON.stringify(context.events[itemId])
			});

			if (!response.ok) {
				console.error("Event persist failed", { itemId, status: response.status });
			} else {
				const payload = (await response.json()) as { events?: ContentEvent[] };
				if (Array.isArray(payload.events)) {
					options?.onEventsPersisted?.(itemId, payload.events);
				}
			}
		} catch (error) {
			console.error("Event persist failed", { itemId, error });
		}
	}

	if (decorTouched) {
		const target = resolveActiveDecorTarget(context, itemId);
		if (target.decor) {
			const { id: decorId, ...rest } = target.decor;
			const style =
				rest.style && typeof rest.style == "object"
					? Object.fromEntries(
							Object.entries(rest.style as Record<string, unknown>).filter(([key]) => key !== "outline")
						)
					: rest.style;
			fetch(`/api/decor`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ itemId, decorId, ...rest, style })
			});
		}
	}

	if (capsuleTouched) {
		const contentId = context.items[itemId].contentId;
		const { id, ...capsule } = context.capsules[context.contents[contentId].capsuleId];
		const capsuleRecord = capsule as Record<string, unknown>;

		delete capsule.itemIds;

		const introSerialized = serializeCapsuleTransition(capsuleRecord.defaultItemIntroTransition, "intro");
		const outroSerialized = serializeCapsuleTransition(capsuleRecord.defaultItemOutroTransition, "outro");

		const formData = new FormData();
		Object.entries(capsule).forEach(([k, v]: [string, unknown]) => {
			if (k == "defaultItemIntroTransition" || k == "defaultItemOutroTransition") return;
			formData.set(k, (v || "") as any);
		});

		formData.set("defaultItemIntroTransition", introSerialized);
		formData.set("defaultItemOutroTransition", outroSerialized);

		fetch(`/api/capsule/${id}`, {
			method: "POST",
			body: formData
		});
	}

	if (themeTouched) {
		const contentId = context.items[itemId].contentId;
		const capsule = context.capsules[context.contents[contentId].capsuleId];

		const gridClassName = capsule.grid;

		if (gridClassName) {
			const generated = findCssClassRule(context.theme.generated, gridClassName);

			fetch(`/api/theme/${context.theme.id}`, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ generated })
			});
		}
	}
}

function nextCustomAction(existingActions: string[]): string {
	const used = new Set(existingActions);
	let index = 1;
	while (used.has(`custom-${index}`)) index += 1;
	return `custom-${index}`;
}

function hasOwn<T extends object>(obj: T, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(obj, key);
}

function resolveActiveDecorTarget(
	context: SceneComp & { active: ActiveState },
	itemId: number
): { decor: Decor | undefined } {
	const activeEventAction = context.active.event;
	if (activeEventAction) {
		const activeEvent = context.events[itemId]?.[activeEventAction];
		if (activeEvent && deriveEventKind(activeEvent.action) === "custom" && activeEvent.decorId) {
			return { decor: context.decors[activeEvent.decorId] };
		}
	}

	const itemDecorId = context.items[itemId]?.decorId;
	if (!itemDecorId) return { decor: undefined };
	return { decor: context.decors[itemDecorId] };
}

function computeDefaultCustomDelaySec(
	context: SceneComp & { active: ActiveState },
	itemId: number
): number | null {
	const itemEvents = context.events[itemId] || {};
	const introName = itemEvents[INTRO]?.name;
	const outroName = itemEvents[OUTRO]?.name;
	if (!introName || !outroName) return null;

	const sceneContent =
		Object.values(context.sceneContents || {}).find((sc) => sc.sceneId == context.id) ||
		Object.values(context.sceneContents || {})[0];
	if (!sceneContent?.events?.length) return null;

	const introCue = sceneContent.events.find((cue) => cue.name == introName);
	const outroCue = sceneContent.events.find((cue) => cue.name == outroName);
	if (!introCue || !outroCue) return null;

	const start = Number(introCue.start);
	const end = Number(outroCue.end);
	if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

	const activeCueSec = context.active.cue;
	if (typeof activeCueSec == "number" && Number.isFinite(activeCueSec)) {
		const clamped = Math.min(Math.max(activeCueSec, start), end);
		return clamped - start;
	}

	return (end - start) / 2;
}

function seedCustomEventPlacement(
	context: SceneComp & { active: ActiveState },
	itemId: number
): { name: string | null; delay: number | null; position: CustomEventPosition | null } {
	const itemEvents = context.events[itemId] || {};
	const introName = itemEvents[INTRO]?.name;
	const outroName = itemEvents[OUTRO]?.name;
	const sceneContent =
		Object.values(context.sceneContents || {}).find((sc) => sc.sceneId == context.id) ||
		Object.values(context.sceneContents || {})[0];
	const cues = sceneContent?.events || [];

	if (introName && outroName && cues.length) {
		const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
		const introCue = cueByName.get(introName);
		if (introCue) {
			const introStart = Number(introCue.start);
			const baseDelay = computeDefaultCustomDelaySec(context, itemId);
			const activeDelay =
				typeof context.active.cue == "number" &&
				Number.isFinite(context.active.cue) &&
				Number.isFinite(introStart)
					? Math.max(0, context.active.cue - introStart)
					: baseDelay;

			const point = resolveClosestCuePointFromDelay({
				cues,
				introName,
				outroName,
				delaySec: activeDelay
			});

			if (point) {
				return {
					name: point.name,
					delay: null,
					position: point.position
				};
			}
		}
	}

	return {
		name: null,
		delay: computeDefaultCustomDelaySec(context, itemId),
		position: null
	};
}

function getTouchedParams(context: SceneComp & { active: ActiveState }): string[] {
	const params: string[] = [];
	if (context.active.eventTouched) params.push("eventTouched");
	if (context.active.decorTouched) params.push("decorTouched");
	if (context.active.themeTouched) params.push("themeTouched");
	if (context.active.capsuleTouched) params.push("capsuleTouched");
	return params;
}

export function getItemFromCapsule(
	capsuleId: number | null | undefined,
	context: SceneComp & {
		active: ActiveState;
	}
) {
	if (!capsuleId) return null;
	const content = Object.values(context.contents).find((m) => m.type == "capsule" && m.capsuleId == capsuleId);
	const item = content ? Object.values(context.items).find((e) => e.contentId == content.id) : null;
	return item;
}
