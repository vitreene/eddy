import { setup, assign, type AnyEventObject } from "xstate";
import { createActorContext } from "@xstate/react";

import type { SceneComp } from "@/api/db";

interface ActiveState {
	capsuleId: number | null;
	elementId: number | null;
	mediaId: number | null;
	cue: string | null;
	action: string | null;
}
const active: ActiveState = {
	capsuleId: null,
	elementId: null,
	mediaId: null,
	cue: null,
	action: null
};

export const sceneLogic = setup({
	types: {
		context: {} as SceneComp & { active: ActiveState },
		input: {} as SceneComp
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
						"active.set": { actions: assign(setActive) }
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
						UPDATE: {
							actions: assign(({ context, event }) => ({
								...context,
								events: {
									...context.events,
									[event.id]: { ...context.events[event.id], ...event.payload }
								}
							}))
						}
					}
				}
			}
		}
	}
});

function setActive({
	context,
	event
}: {
	context: SceneComp & { active: ActiveState };
	event: AnyEventObject;
}) {
	return {
		...context,
		active: {
			...context.active,
			...event.payload
		}
	};
}

/* 
export const sceneLogic = createMachine({
	context: {} as SceneComp,
	on: {
SET: {
			actions: assign(({ event }) => {
				return {

					[event.target]: event.payload
				};
			})
		},
		ADD: {
			actions: assign(({ context, event }) => {
				return {
					...context,
					[event.target]: event.payload
				};
			})
		},
		REMOVE: {
			actions: assign(({ context, event }) => {
				const newContext: Record<string, TextTime> = {};
				for (const target in context) if (target != event.target) newContext[target] = context[target];
				return newContext;
			})
		},
 */

export const SceneLogicContext = createActorContext(sceneLogic);
