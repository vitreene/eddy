import { setup, assign, type UnknownActorLogic } from "xstate";
import { createActorContext } from "@xstate/react";

import type { CapsuleComp, ElementComp, MediaEvent, SceneComp } from "@/api/db";

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

export const sceneLogic = setup({
	types: {
		context: {} as SceneComp & { active: ActiveState },
		input: {} as SceneComp,
		events: {} as
			| { type: "active.set"; payload: Partial<ActiveState> }
			| { type: "capsule.update"; payload: Partial<CapsuleComp> }
			| { type: "events-update"; payload: Partial<MediaEvent> }
			| {
					type: "tree-move";
					payload: {
						sourceId: number;
						sourceType: "element" | "capsule";
						targetId: number;
						targetType: "element" | "capsule";
					};
			  }
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
									Object.entries(event.payload).forEach(([k, v]: [string, unknown]) => formData.set(k, v as any));
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

				/* 
				revoir la logique :
				- invoke le calcul des ordres,
				- si reorder fetch,
				- fetch element
				renvoyer les données à modifier
				*/

				tree: {
					on: {
						"tree-move": {
							actions: [
								assign(({ context, event }) => {
									const { sourceId, targetId, sourceType, targetType } = event.payload;

									if (targetType === "element") {
										if (sourceType === "element") {
											const element = context.elements[sourceId];
											const target = context.elements[targetId];

											const capsule = context.capsules[target.capsuleId];
											const sourceCapsule = context.capsules[element.capsuleId];

											// Récupérer les éléments de la capsule cible triés par order
											const capsuleElementIds = capsule.elementIds.filter((id) => id !== sourceId);
											const sortedElements = capsuleElementIds
												.map((id) => context.elements[id])
												.sort((a, b) => a.order - b.order);

											// Trouver la position du target
											const targetIndex = sortedElements.findIndex((el) => el.id === targetId);

											// Déterminer la nouvelle valeur order
											let newOrder: number;
											if (targetIndex === -1) {
												// Target non trouvé, placer à la fin
												const lastElement = sortedElements[sortedElements.length - 1];
												newOrder = calculateNewOrder(lastElement?.order ?? STEP);
											} else {
												// Placer après target
												const nextElement = sortedElements[targetIndex + 1];
												const targetOrder = sortedElements[targetIndex].order;
												newOrder = calculateNewOrder(targetOrder, nextElement?.order);
											}

											// Mettre à jour uniquement l'élément déplacé
											element.order = newOrder;
											element.capsuleId = target.capsuleId;

											// Mettre à jour les références des capsules si changement
											if (element.capsuleId !== sourceCapsule.id) {
												sourceCapsule.elementIds = sourceCapsule.elementIds.filter((id) => id !== sourceId);
												capsule.elementIds.push(sourceId);
											}

											return {
												...context,
												capsules: {
													...context.capsules,
													[sourceCapsule.id]: sourceCapsule,
													[capsule.id]: capsule
												},
												elements: {
													...context.elements,
													[sourceId]: element
												}
											};
										}
									}

									if (targetType === "capsule") {
										const element = context.elements[sourceId];
										const capsule = context.capsules[targetId];
										const sourceCapsule = context.capsules[element.capsuleId];

										const nextElement = findElementWithSmallestOrder(
											Object.values(context.elements).filter((el) => el.capsuleId == targetId)
										);
										const newOrder = calculateNewOrder(0, nextElement?.order);
										// Placer en premier dans la capsule
										element.order = newOrder;
										element.capsuleId = capsule.id;

										sourceCapsule.elementIds = sourceCapsule.elementIds.filter((id) => id !== sourceId);
										capsule.elementIds.push(sourceId);

										return {
											...context,
											capsules: {
												...context.capsules,
												[sourceCapsule.id]: sourceCapsule,
												[targetId]: capsule
											},
											elements: {
												...context.elements,
												[sourceId]: element
											}
										};
									}

									return context;
								}),

								async ({ context, event }) => {
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
								},
								({ context, event }) => {
									const { sourceId, sourceType } = event.payload;
									if (sourceType == "element") {
										const element = context.elements[sourceId];

										const formData = new FormData();
										formData.set("order", String(element.order));
										formData.set("capsuleId", String(element.capsuleId));

										fetch(`api/element/${element.id}`, {
											method: "PUT",
											body: formData
										});
									}
								}
							]
						}
					}
				}
			}
		}
	}
});

export const SceneLogicContext = createActorContext(sceneLogic);

const STEP = 1000;
const calculateNewOrder = (targetOrder: number, nextElementOrder?: number, step: number = STEP): number => {
	if (nextElementOrder === undefined) {
		// Pas de suivant : order = target.order + step
		return targetOrder + step;
	}
	// Avec suivant : order = floor(target.order + (next.order - target.order) / 2)
	return Math.floor(targetOrder + (nextElementOrder - targetOrder) / 2);
};

function findElementWithSmallestOrder<T extends { order: number }>(elements: T[]): T | undefined {
	return elements.reduce((min, current) => (current.order < min.order ? current : min));
}
