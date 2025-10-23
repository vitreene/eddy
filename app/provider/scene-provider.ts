import { createContext } from "react";
import type { SceneComp, TextTime } from "~/api/db";

export const SceneContext = createContext<{
	scene: SceneComp;
	state: SceneState;
	dispatch: React.ActionDispatch<[action: Actions]>;
} | null>(null);

export interface ActionEvent {
	name: string;
	action: string;
	duration: number | null;
	elementId: number;
}

export interface SceneState {
	capsuleId: number | null;
	elementId: number | null;
	activeCue: TextTime | null;
	activeAction: ActionEvent | null;
}

export type Actions =
	| { type: "edit-capsule"; capsuleId: number; mediaId: null }
	| { type: "edit-media"; mediaId: number }
	| { type: "set-cue"; cue: TextTime }
	| { type: "set-action"; event: ActionEvent };

export function reducer(state: SceneState, action: Actions): SceneState {
	switch (action.type) {
		case "edit-capsule":
			return {
				...state,
				capsuleId: action.capsuleId,
				elementId: action.mediaId
			};
		case "edit-media":
			return {
				...state,
				elementId: action.mediaId
			};
		case "set-cue":
			return {
				...state,
				activeCue: action.cue
			};
		case "set-action":
			return {
				...state,
				activeAction: action.event
			};

		default:
			throw Error("Unknown action: " + JSON.stringify(action as never));
	}
}
