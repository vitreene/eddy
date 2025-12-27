import { setup, assign, fromPromise, type UnknownActorLogic } from "xstate";
import { createActorContext } from "@xstate/react";

import { capsuleReorder, reorderElements, updateOrder } from "./reorder-elements";

import type { Decor, CapsuleComp, ContentEvent, SceneComp, ItemComp } from "@/api/db";

export interface ActiveState {
	[key: string]: number | string | boolean | null;
	main: number | null;
	capsuleId: number | null;
	itemId: number | null;
	contentId: number | null;
	cue: string | null;
	action: string | null;
	eventTouched: boolean;
	decorTouched: boolean;
}
export const active: ActiveState = {
	main: null,
	capsuleId: null,
	itemId: null,
	contentId: null,
	cue: null,
	action: null,
	eventTouched: false,
	decorTouched: false
};

export interface TreeMoveEvent {
	sourceId: number;
	sourceType: "element" | "capsule";
	targetId: number;
	targetType: "element" | "capsule";
}

export const sceneLogic = setup({
	types: {
		context: {} as SceneComp & { active: ActiveState },
		input: {} as SceneComp,
		events: {} as
			| { type: "active-set"; payload: Partial<ActiveState> }
			| { type: "commit"; payload: Partial<ActiveState> }
			| { type: "reset-active" }
			| { type: "item-update"; payload: Partial<ItemComp & { decor: Decor }> }
			| { type: "capsule-update"; payload: Pick<CapsuleComp, "id" | "name"> }
			| { type: "events-update"; payload: Partial<ContentEvent> }
			| { type: "tree-move-item"; payload: TreeMoveEvent }
			| { type: "tree-after-move"; payload: TreeMoveEvent }
			| { type: "reorder.capsule"; payload: TreeMoveEvent }
	},
	actions: {
		reset: assign(({ context }) => {
			return {
				...context,
				active: {
					...context.active,
					eventTouched: false,
					decorTouched: false
				}
			};
		}),
		fetchers: async ({ context }, params: string[]) => {
			if (!params.length) return;
			const itemId = context.active.itemId;
			// decor changes — envoyer à la base quand on quitte l'édition d'une capsule ET decorTouched est vrai

			const decorTouched = params.includes("decorTouched");
			const eventTouched = params.includes("eventTouched");

			if (eventTouched) {
				if (itemId)
					fetch(`api/media/${itemId}`, {
						method: "POST",
						headers: {
							Accept: "application/json",
							"Content-Type": "application/json"
						},
						body: JSON.stringify(context.events[itemId])
					});
			}

			if (itemId && decorTouched && context.items[itemId].decorId) {
				const decor = context.decors?.[context.items[itemId].decorId];
				if (decor) {
					const { id: decorId, ...rest } = decor;
					fetch(`api/decor`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ itemId, decorId, ...rest })
					});
				}
			}
		}
	},

	actors: {
		initContext: {} as UnknownActorLogic,
		capsuleReorder
	}
}).createMachine({
	id: "scene",

	context: ({ input }) => ({ ...input, active }),
	initial: "start",

	states: {
		start: {
			invoke: {
				src: "initContext",
				onDone: {
					target: "edit",
					actions: assign(({ event }) => event.output)
				}
			}
		},
		edit: {
			type: "parallel",
			initial: "active",

			states: {
				active: {
					on: {
						"active-set": {
							target: "#scene.edit",
							actions: [
								assign(({ context, event }) => {
									console.log("active-set", event.payload);

									return {
										...context,
										active: {
											...context.active,
											...event.payload
										}
									};
								})
							]
						},
						commit: {
							actions: [
								{
									type: "fetchers",
									params: ({ context, event }) => {
										console.log("commit", context.active, event.payload);

										const diffs: string[] = [];
										for (const id in event.payload) {
											if (context.active[id] !== event.payload[id]) diffs.push(id);
										}
										if (context.active.eventTouched) diffs.push("eventTouched");
										if (context.active.decorTouched) diffs.push("decorTouched");

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
									console.log("--->capsule-update");
									const { id: capsuleId, ...payload } = event.payload;

									const newCapsule = {
										...context.capsules[capsuleId],
										...payload
									};

									return {
										...context,
										capsules: {
											...context.capsules,
											[capsuleId]: newCapsule
										}
									};
								}),
								({ event }) => {
									// a passer en commit
									const { id: capsuleId, ...payload } = event.payload;

									const formData = new FormData();
									Object.entries(payload).forEach(([k, v]: [string, unknown]) => formData.set(k, v as any));

									fetch(`api/capsule/${capsuleId}`, {
										method: "POST",
										body: formData
									});
								}
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
									}
								};
							})
						}
					}
				},

				media: {
					on: {
						"events-update": {
							actions: assign(({ context, event }) => {
								const elementId = context.active.itemId ?? getItemFromCapsule(context.active.capsuleId, context)?.id;

								if (!elementId) return context;
								const action = event.payload.action;
								if (!action) return context;
								return {
									...context,
									events: {
										...context.events,
										[elementId]: {
											...(context.events[elementId] ?? {}),
											[action]: { ...context.events[elementId]?.[action], ...event.payload }
										}
									},
									active: {
										...context.active,
										eventTouched: true
									}
								};
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
											const { capsules, elements, moved } = reorderElements(context, event.payload);
											if (moved) updateOrder(moved);
											return { ...context, capsules, items: elements };
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
										if (event.output == "no-reorder") return context;
										const reorders = (event.output as Array<{ id: 2; order: 1000 }[]>).map((out) => out[0]);
										const elements = reorders.map((r) => ({
											[r.id]: { ...context.items[r.id], order: r.order }
										}));
										return {
											...context,
											items: Object.assign({}, context.items, ...elements)
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

/* 
comme capsule est traité comme un element, la différence ne se justifie plus 
- pour le décor$
- pour les events 

cela modifie entierement le schéma 
la capsule est un media spécifique 
- qui contient une liste d'items
- qui à une grille

les decors et events sont traités par item

*/
