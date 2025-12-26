import { setup, assign, type UnknownActorLogic } from "xstate";
import { createActorContext } from "@xstate/react";

import { fetchReorder, reorderElements, updateOrder } from "./reorder-elements";

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
			| { type: "reset" }
			| { type: "item-update"; payload: Partial<ItemComp & { decor: Decor }> }
			| { type: "capsule-update"; payload: Partial<CapsuleComp & { decor: Decor }> }
			| { type: "events-update"; payload: Partial<ContentEvent> }
			| { type: "tree-move-item"; payload: TreeMoveEvent }
			| { type: "tree-after-move"; payload: TreeMoveEvent }
			| { type: "reorder.capsule"; payload: TreeMoveEvent }
	},
	actions: {
		fetchers: ({ context }, params: string[]) => {
			if (!params.length) return;
			console.log({ params });

			// events changes (per element)
			const elementId = context.active.itemId;
			const capsuleId = context.active.capsuleId;
			// decor changes — envoyer à la base quand on quitte l'édition d'une capsule ET decorTouched est vrai
			const capsuleIdChanged = params.includes("capsuleId");
			const elementIdChanged = params.includes("elementId");

			const decorTouched = params.includes("decorTouched");
			const eventTouched = params.includes("eventTouched");

			if (eventTouched) {
				const id = capsuleId ? getElementFromCapsule(capsuleId, context)!.id : elementId;
				console.log("fetchers", id, context.events[id!]);

				if (id)
					fetch(`api/media/${id}`, {
						method: "POST",
						headers: {
							Accept: "application/json",
							"Content-Type": "application/json"
						},
						body: JSON.stringify(context.events[id])
					});
			}

			if (elementIdChanged && elementId && decorTouched) {
				const decor = context.decors?.items?.[elementId];
				if (decor) {
					fetch(`api/decor`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ elementId, ...decor })
					});
				}
			}

			if (capsuleIdChanged && capsuleId && decorTouched) {
				const decor = context.decors?.capsules?.[capsuleId];
				if (decor) {
					fetch(`api/decor`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ capsuleId, ...decor })
					});
				}
			}
		}
	},
	actors: {
		initContext: {} as UnknownActorLogic,
		fetchReorder
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
							actions: [
								assign(({ context, event }) => {
									return {
										...context,
										active: {
											...context.active,
											...event.payload,
											...("elementId" in event.payload && { capsuleId: null }),
											...("capsuleId" in event.payload && { itemId: null })
										}
									};
								})
							]
						},
						commit: {
							target: "reset",
							actions: {
								type: "fetchers",

								params: ({ context, event }) => {
									console.log("commit", context.active, event.payload);
									// manque le traitement : passser de capsule à element et vice-versa
									const diffs: string[] = [];
									for (const id in event.payload) {
										if (context.active[id] !== event.payload[id]) diffs.push(id);
									}
									if (context.active.eventTouched) diffs.push("eventTouched");
									if (context.active.decorTouched) diffs.push("decorTouched");

									return diffs;
								}
							}
						}
					}
				},
				reset: {
					target: "active",
					entry: assign(({ context }) => {
						return {
							...context,
							active: {
								...context.active,
								eventTouched: false,
								decorTouched: false
							}
						};
					})
				},

				capsule: {
					on: {
						"capsule-update": {
							actions: [
								assign(({ context, event }) => {
									const capsuleId = context.active.capsuleId!;
									// const { decor: newDecor, ...payload } = event.payload;
									const newCapsule = {
										...context.capsules[capsuleId],
										...event.payload
									};

									return {
										...context,
										capsules: {
											...context.capsules,
											[capsuleId]: newCapsule
										}
									};
								}),
								({ context, event }) => {
									// a passer en commit
									const payload: any = event.payload as any;
									if (payload && payload.decor) return;
									const formData = new FormData();
									Object.entries(payload).forEach(([k, v]: [string, unknown]) => formData.set(k, v as any));
									const active = context.active;
									fetch(`api/capsule/${active.capsuleId}`, {
										method: "POST",
										body: formData
									});
								}
							],
							target: "#scene.edit"
						}
					}
				},
				element: {
					on: {
						"item-update": {
							actions: assign(({ context, event }) => {
								const itemId = context.active.itemId!;
								const { decor: newDecor, ...payload } = event.payload;
								const newElement = {
									...context.items[itemId],
									...payload
								};
								const decors = {
									...(context.decors || { capsules: {}, items: {} }),
									elements: {
										...(context.decors?.items || {}),
										...(newDecor
											? {
													[itemId]: {
														...context.decors?.items?.[itemId],
														...newDecor
													}
												}
											: {})
									}
								};
								return {
									...context,
									items: {
										...context.items,
										[itemId]: newElement
									},
									decors
								};
							}),

							target: "#scene.edit"
						}
					}
				},
				media: {
					on: {
						"events-update": {
							actions: assign(({ context, event }) => {
								const elementId =
									context.active.itemId ?? getElementFromCapsule(context.active.capsuleId, context)?.id;

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
								src: "fetchReorder",
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

export function getElementFromCapsule(
	capsuleId: number | null | undefined,
	context: SceneComp & {
		active: ActiveState;
	}
) {
	if (!capsuleId) return null;
	const media = Object.values(context.contents).find((m) => m.type == "capsule" && m.capsuleId == capsuleId);
	const element = media ? Object.values(context.items).find((e) => e.contentId == media.id) : null;
	return element;
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
