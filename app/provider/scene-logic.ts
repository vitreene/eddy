import { setup, assign, type UnknownActorLogic } from "xstate";
import { createActorContext } from "@xstate/react";

import type { CapsuleComp, MediaEvent, SceneComp } from "@/api/db";
import { reorderElements, updateOrder } from "./reorder-elements";

interface ActiveState {
	[key: string]: number | string | boolean | null;
	capsuleId: number | null;
	elementId: number | null;
	mediaId: number | null;
	cue: string | null;
	action: string | null;
	eventTouched: boolean;
}
const active: ActiveState = {
	capsuleId: null,
	elementId: null,
	mediaId: null,
	cue: null,
	action: null,
	eventTouched: false
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
			| { type: "active.set"; payload: Partial<ActiveState> }
			| { type: "capsule.update"; payload: Partial<CapsuleComp> }
			| { type: "events-update"; payload: Partial<MediaEvent> }
			| { type: "tree-move"; payload: TreeMoveEvent }
	},
	actions: {
		fetchers: ({ context }, params: string[]) => {
			const elementId = context.active.elementId;
			if (!params.length || !elementId) return;

			if (params.includes("eventTouched")) {
				fetch(`api/media/${elementId}`, {
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json"
					},
					body: JSON.stringify(context.events[elementId])
				});
			}
		}
	},
	actors: {
		initContext: {} as UnknownActorLogic
	}
}).createMachine({
	id: "scene",
	// Initialise le contexte avec input
	context: ({ input }: { input: SceneComp }) => ({ ...input, active }),
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
						"active.set": {
							actions: [
								{
									type: "fetchers",

									params: ({ context, event }) => {
										const diffs: string[] = [];
										for (const id in event.payload) {
											if (context.active[id] !== event.payload[id]) diffs.push(id);
										}
										if (context.active.eventTouched) diffs.push("eventTouched");
										return diffs;
									}
								},

								assign(({ context, event }) => ({
									...context,
									active: {
										...context.active,
										...event.payload,
										eventTouched: false
									}
								}))
							]
						}
					}
				},
				capsule: {
					on: {
						"capsule.update": {
							actions: [
								assign(({ context, event }) => ({
									...context,
									capsules: {
										...context.capsules,
										[context.active.capsuleId!]: {
											...context.capsules[context.active.capsuleId!],
											...event.payload
										}
									}
								})),
								({ context, event }) => {
									const formData = new FormData();
									Object.entries(event.payload).forEach(([k, v]: [string, unknown]) =>
										formData.set(k, v as any)
									);
									const active = context.active;
									fetch(`api/capsule/${active.capsuleId}`, {
										method: "POST",
										body: formData
									});
								}
							],
							target: "active"
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
					on: {
						"tree-move": {
							target: "tree.reorder-capsule",
							actions: [
								assign(({ context, event }) => {
									const { capsules, elements, moved } = reorderElements(context, event.payload);
									moved && updateOrder(moved);
									return { ...context, capsules, elements };
									/* 
									TODO si egalité dans les order, -> reorder la capsule  en base, puis updater le context 
									*/
								})
							]
						}
					},
					states: {
						idle: {},
						"reorder-capsule": {
							entry: ({ event }) => {
								console.log("reorder-capsule", event);
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
