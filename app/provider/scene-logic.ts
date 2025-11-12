import { setup, assign } from "xstate";
import { createActorContext } from "@xstate/react";

import type { SceneComp } from "@/api/db";

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
		input: {} as SceneComp
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
				}
			}
		}
	}
});

export const SceneLogicContext = createActorContext(sceneLogic);
