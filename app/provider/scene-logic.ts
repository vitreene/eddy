import { setup, assign, raise } from "xstate";
import { createActorContext } from "@xstate/react";

import { capsuleReorder, reorderElements, updateOrder } from "./reorder-elements";
import { applyTreeMutation, treeMutation } from "./tree-mutations";
import { computeActiveCue } from "./active-cue";

import type { Decor, CapsuleComp, Content, ContentEvent, SceneComp, ItemComp } from "@/api/db";
import type { Theme } from "prisma/generated/prisma/client";
import { findCssClassRule, mergeCssStrings } from "@/lib/merge-css-classes";
import { AUTOCOMMIT_TOUCHED_IDLE_MS } from "@/config/constants";
import { normalizeTransitionRef } from "@/config/transitions";
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
	action: null,
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
		commitTouchedOnSelectionSwitch: ({ context, event }) => {
			if (event.type !== "active-set") return;
			if (!("itemId" in event.payload)) return;
			if (!event.payload.itemId || event.payload.itemId === context.active.itemId) return;

			const params = getTouchedParams(context);
			if (!params.length) return;

			executePersistTouchedCommits(context, params);
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
		commitFetch: async ({ context }, params: string[]) => {
			executePersistTouchedCommits(context, params);
		},
		persistItemVisibility: async (_, params: { itemId: number; visible: boolean }) => {
			const formData = new FormData();
			formData.set("visible", params.visible ? "true" : "false");
			void fetch(`/api/item/${params.itemId}`, {
				method: "POST",
				body: formData
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
										"itemId" in event.payload && event.payload.itemId
											? computeActiveCue(context, event.payload.itemId)
											: null;

									return {
										...context,
										active: {
											...context.active,
											cue,
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

function executePersistTouchedCommits(context: SceneComp & { active: ActiveState }, params: string[]) {
	if (!params.length) return;
	const itemId = context.active.itemId;

	if (!itemId) return false;

	const decorTouched = params.includes("decorTouched");
	const eventTouched = params.includes("eventTouched");
	const themeTouched = params.includes("themeTouched");
	const capsuleTouched = params.includes("capsuleTouched");

	if (eventTouched) {
		void fetch(`/api/content/${itemId}`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify(context.events[itemId])
		})
			.then((response) => {
				if (!response.ok) {
					console.error("Event persist failed", { itemId, status: response.status });
				}
			})
			.catch((error) => {
				console.error("Event persist failed", { itemId, error });
			});
	}

	if (decorTouched && context.items[itemId].decorId) {
		const decor = context.decors?.[context.items[itemId].decorId];
		if (decor) {
			const { id: decorId, ...rest } = decor;
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
