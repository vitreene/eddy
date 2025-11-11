import { setup, assign, type AnyEventObject } from "xstate";

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
			initial: "active",

			states: {
				active: {
					on: {
						"active.capsule": { actions: assign(setActive), target: "capsule" },
						"active.media": { actions: assign(setActive), target: "media" },
						SET: { actions: assign(setActive) }
					}
				},
				capsule: {
					on: {
						"capsule.update": {
							actions: assign(({ context, event }) => ({
								...context,
								capsules: {
									...context.capsules,
									[event.id]: {
										...context.capsules[event.id],
										...event.payload
									}
								}
							}))
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
