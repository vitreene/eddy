import { setup, assign } from "xstate";
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
	}
}).createMachine({
	id: "scene",
	// Initialise le contexte avec input
	context: ({ input }: { input: SceneComp }) => ({ ...input, active }),
	initial: "start",

	states: {
		start: {
			invoke: {
				// @ts-ignore src est ok
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
									// @ts-ignore src est ok
									type: "fetchers",
									// @ts-ignore src est ok
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
				tree: {
					on: {
						"tree-move": {
							actions: assign(({ context, event }) => {
								const { sourceId, targetId, sourceType, targetType } = event.payload;

								if (targetType == "element") {
									if (sourceType == "element") {
										const element = context.elements[sourceId];
										const target = context.elements[targetId];

										const capsule = context.capsules[target.capsuleId];
										const sourceCapsule = context.capsules[element.capsuleId];

										const capsuleElements: { [key: number]: ElementComp } = {};

										//Re-order
										element.capsuleId = target.capsuleId;

										const elements = Object.values(context.elements)
											.filter((el) => sourceCapsule.elementIds.includes(el.id))
											.sort((a, b) => (a.order > b.order ? 1 : -1))
											.filter((el) => el.id !== sourceId);

										/* 
									- si source.order > target.order -> placer source AVANT target 
									sinon source APRES target
								
									*/
										let index = elements.findIndex((el) => el.order == target.order);
										index = index + (element.order > target.order ? -1 : 1);

										if (index <= 0) {
											elements.unshift(element);
										} else elements.splice(index, 0, element);

										elements.forEach((el, i) => (capsuleElements[el.id] = { ...el, order: i }));

										// console.log("ELEMNTS", capsuleElement);
										if (capsule != sourceCapsule) {
											sourceCapsule.elementIds = sourceCapsule.elementIds.filter((id) => id != sourceId);
											capsule.elementIds.push(sourceId);
										}

										return {
											...context,
											capsules: {
												...context.capsules,
												[sourceCapsule.id]: sourceCapsule,
												[target.capsuleId]: capsule
											},
											elements: {
												...context.elements,
												...capsuleElements
											}
										};
									}
									if (sourceType == "capsule") {
										// todo capsule -> capsule
									}
								}

								//la capsule est vide
								if (targetType == "capsule") {
									const element = context.elements[sourceId];
									const capsule = context.capsules[targetId];
									const sourceCapsule = context.capsules[element.capsuleId];

									sourceCapsule.elementIds = sourceCapsule.elementIds.filter((id) => id != sourceId);
									capsule.elementIds.push(sourceId);
									element.capsuleId = capsule.id;

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
							})
						}
					}
				}
			}
		}
	}
});

export const SceneLogicContext = createActorContext(sceneLogic);

export const arrayMove = <T>(arr: T[], fromIndex: number, toIndex: number) => {
	const newArr = [...arr];
	newArr.splice(toIndex, 0, newArr.splice(fromIndex, 1)[0]);
	return newArr;
};
