import { setup, assign, type UnknownActorLogic } from "xstate";
import { createActorContext } from "@xstate/react";

import type { CapsuleComp, MediaEvent, SceneComp } from "@/api/db";
import { fetchReorder, reorderElements, updateOrder } from "./reorder-elements";
import type { Decor } from "@prisma/client";

export interface ActiveState {
	[key: string]: number | string | boolean | null;
	main: number | null;
	capsuleId: number | null;
	elementId: number | null;
	mediaId: number | null;
	cue: string | null;
	action: string | null;
	eventTouched: boolean;
	decorTouched: boolean;
}
export const active: ActiveState = {
	main: null,
	capsuleId: null,
	elementId: null,
	mediaId: null,
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
		// context: {} as Omit<SceneComp, "main"> & { active: ActiveState },
		context: {} as SceneComp & { active: ActiveState },
		input: {} as SceneComp,
		events: {} as
			| { type: "active-set"; payload: Partial<ActiveState> }
			| { type: "commit"; payload: Partial<ActiveState> }
			| { type: "reset" }
			| { type: "element-update"; payload: Partial<CapsuleComp & Decor> }
			| { type: "capsule-update"; payload: Partial<CapsuleComp & Decor> }
			| { type: "events-update"; payload: Partial<MediaEvent> }
			| { type: "tree-move-item"; payload: TreeMoveEvent }
			| { type: "tree-after-move"; payload: TreeMoveEvent }
			| { type: "reorder.capsule"; payload: TreeMoveEvent }
	},
	actions: {
		fetchers: ({ context }, params: string[]) => {
			if (!params.length) return;

			// events changes (per element)
			const elementId = context.active.elementId;
			const capsuleId = context.active.capsuleId;
			// decor changes — envoyer à la base quand on quitte l'édition d'une capsule ET decorTouched est vrai
			const capsuleIdChanged = params.includes("capsuleId");
			const elementIdChanged = params.includes("elementId");

			const decorTouched = params.includes("decorTouched");
			const eventTouched = params.includes("eventTouched");

			if (elementId && eventTouched) {
				//FIXME elementId dans json, media:mediaId
				fetch(`api/media/${elementId}`, {
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json"
					},
					body: JSON.stringify(context.events[elementId])
				});
			}

			if (elementIdChanged && elementId && decorTouched) {
				const decor = context.decors?.elements?.[elementId];
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

	context: ({ input }: { input: SceneComp }) => ({ input, active }),
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
								//@ts-ignore
								assign(({ context, event }) => {
									return {
										...context,
										active: {
											...context.active,
											...event.payload,
											...("elementId" in event.payload && { capsuleId: null }),
											...("capsuleId" in event.payload && { elementId: null })
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
					actions: assign(({ context }) => {
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
									const { decor: newDecor, ...payload } = event.payload;
									const newCapsule = {
										...context.capsules[capsuleId],
										...payload
									};
									const decors = {
										...(context.decors || { capsules: {}, elements: {} }),
										capsules: {
											...(context.decors?.capsules || {}),
											...(newDecor
												? {
														[capsuleId]: {
															...context.decors?.capsules?.[capsuleId],
															...newDecor
														}
													}
												: {})
										}
									};
									return {
										...context,
										capsules: {
											...context.capsules,
											[capsuleId]: newCapsule
										},
										decors
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
						"element-update": {
							actions: assign(({ context, event }) => {
								const elementId = context.active.elementId!;
								const { decor: newDecor, ...payload } = event.payload;
								const newElement = {
									...context.elements[elementId],
									...payload
								};
								const decors = {
									...(context.decors || { capsules: {}, elements: {} }),
									elements: {
										...(context.decors?.elements || {}),
										...(newDecor
											? {
													[elementId]: {
														...context.decors?.elements?.[elementId],
														...newDecor
													}
												}
											: {})
									}
								};
								return {
									...context,
									elements: {
										...context.elements,
										[elementId]: newElement
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
								const elementId = context.active.elementId;
								if (!elementId) return context;
								const action = event.payload.action;
								if (!action) return context;
								return {
									...context,
									events: {
										...context.events,
										[elementId]: {
											...context.events[elementId],
											[action]: { ...context.events[elementId][action], ...event.payload }
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
											return { ...context, capsules, elements };
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
											[r.id]: { ...context.elements[r.id], order: r.order }
										}));
										return {
											...context,
											elements: Object.assign({}, context.elements, ...elements)
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

/* async ({ context, event }) => {
									const { sourceId, sourceType } = event.payload;
									if (sourceType == "element") {
										const element = context.elements[sourceId];
										// Signaler pour réajustement global des orders
										console.warn("⚠️ Réajustement nécessaire : les ordres sont identiques après déplacement");
										const orders = await fetch(`api/capsule/${element.capsuleId}/reorder`);
										console.log("orders====>", orders);
										return {
											...context,
											active: {
												...context.active,
												reorder: orders
											}
										};
									}
								}, */

/* 
								TODO 
								- move capsule dans une autre capsule
		- reorder element d'une capsule si les order sont identiques
		
		
		sinon, 
		- faire le chutier
		- l'éditeur d'élément

		et voir le rendu ! 

								*/
