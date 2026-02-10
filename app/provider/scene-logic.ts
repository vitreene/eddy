import { setup, assign } from "xstate";
import { createActorContext } from "@xstate/react";

import { capsuleReorder, reorderElements, updateOrder } from "./reorder-elements";

import type { Decor, CapsuleComp, Content, ContentEvent, SceneComp, ItemComp } from "@/api/db";
import type { Theme } from "prisma/generated/prisma/client";
import { findCssClassRule, mergeCssStrings } from "@/lib/merge-css-classes";
import { DEFAULT_DURATION, INTRO } from "@/lib/constants";

export interface ActiveState {
	[key: string]: number | string | boolean | null;
	main: number | null;

	itemId: number | null;
	contentId: number | null;
	cue: number | null;
	action: string | null;
	eventTouched: boolean;
	decorTouched: boolean;
	themeTouched: boolean;
}
export const active: ActiveState = {
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
export interface TreeMoveEvent {
	sourceId: number;
	targetId?: number;
	targetCapsuleId?: number;
	insertionIndex?: number;
}

export const sceneLogic = setup({
	types: {
		context: {} as SceneComp & { active: ActiveState },
		input: {} as SceneComp,
		events: {} as
			| { type: "init"; payload: SceneComp }
			| { type: "active-set"; payload: Partial<ActiveState> }
			| { type: "commit"; payload: Partial<ActiveState> }
			| { type: "reset-active" }
			| { type: "end-edit" }
			| { type: "item-update"; payload: Partial<ItemComp & { decor: Decor }> }
			| { type: "capsule-update"; payload: Partial<CapsuleComp> }
			| { type: "events-update"; payload: Partial<ContentEvent> }
			| { type: "content-add"; payload: Content }
			| { type: "tree-move-item"; payload: TreeMoveEvent }
			| { type: "tree-after-move"; payload: TreeMoveEvent }
			| { type: "reorder.capsule"; payload: TreeMoveEvent }
			| { type: "theme-update"; payload: Partial<Theme> }
	},
	actions: {
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
			if (!params.length) return;
			const itemId = context.active.itemId;
			console.log({ itemId }, params);

			if (!itemId) return false;

			const decorTouched = params.includes("decorTouched");
			const eventTouched = params.includes("eventTouched");
			const themeTouched = params.includes("themeTouched");
			const capsuleTouched = params.includes("capsuleTouched");

			if (eventTouched) {
				fetch(`/api/content/${itemId}`, {
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json"
					},
					body: JSON.stringify(context.events[itemId])
				});
			}

			if (decorTouched && context.items[itemId].decorId) {
				const decor = context.decors?.[context.items[itemId].decorId];
				if (decor) {
					const { id: decorId, ...rest } = decor;
					fetch(`/api/decor`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ itemId, decorId, ...rest })
					});
				}
			}

			if (capsuleTouched) {
				const contentId = context.items[itemId].contentId;
				const { id, ...capsule } = context.capsules[context.contents[contentId].capsuleId];

				delete capsule.itemIds;

				const formData = new FormData();
				Object.entries(capsule).forEach(([k, v]: [string, unknown]) => formData.set(k, (v || "") as any));

				console.log("POST capsule-update", capsule);

				fetch(`/api/capsule/${id}`, {
					method: "POST",
					body: formData
				});
			}

			if (themeTouched) {
				const contentId = context.items[itemId].contentId;
				const capsule = context.capsules[context.contents[contentId].capsuleId];

				const gridClassName = capsule.grid;
				console.log("themeTouched", { gridClassName, theme: context.theme.generated });

				if (gridClassName) {
					const generated = findCssClassRule(context.theme.generated, gridClassName);
					console.log("generated", generated);

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
	},

	actors: { capsuleReorder }
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
				"end-edit": {
					actions: () => console.log("end-edit"),

					target: "#scene.start"
				},
				active: {
					on: {
						"active-set": {
							target: "#scene.edit",
							actions: [
								assign(({ context, event }) => {
									console.log("active-set", event.payload);
									let cue = null;
									if ("itemId" in event.payload) {
										const name = context.events[event.payload.itemId]?.[INTRO]?.name;
										cue = name
											? Object.values(context.sceneContents)
													.flatMap((sc) => sc.events)
													.find((ev) => ev.name == name)
											: null;
									}

									return {
										...context,
										active: {
											...context.active,
											// fin de la transition
											cue: cue?.start + DEFAULT_DURATION / 1000 || null,
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
									params: ({ context, event }) => {
										console.log("commit", context.active, event.payload);

										const diffs: string[] = [];
										for (const id in event.payload) {
											if (context.active[id] !== event.payload[id]) diffs.push(id);
										}
										if (context.active.eventTouched) diffs.push("eventTouched");
										if (context.active.decorTouched) diffs.push("decorTouched");
										if (context.active.themeTouched) diffs.push("themeTouched");
										if (context.active.capsuleTouched) diffs.push("capsuleTouched");

										return diffs;
									}
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
									console.log("capsule-update", active);

									return { ...context, capsules, active };
								})
							]
						}
					}
				},

				item: {
					on: {
						"item-update": {
							target: "#scene.edit",
							actions: assign(({ context, event }) => {
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
							})
						}
					}
				},

				content: {
					on: {
						"events-update": {
							actions: assign(({ context, event }) => {
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
							})
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
							actions: assign(({ context, event }) => {
								console.log("theme-update");

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
							})
						}
					}
				},
				tree: {
					initial: "idle",
					states: {
						idle: {
							on: {
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
						"tree-after-move": {
							invoke: {
								id: "tree-capsule-reorder",
								reenter: true,
								input: ({ context, event }) => ({ context, event }),
								src: "capsuleReorder",
								onDone: {
									target: "#scene.edit",
									actions: assign(({ context, event }) => {
										console.log("tree-capsule-reorder", event);

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
