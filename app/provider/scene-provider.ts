import { createContext } from 'react';
import type { SceneComp } from '~/api/db';

export const SceneContext = createContext<{
	scene: SceneComp;
	state: State;
	dispatch: React.ActionDispatch<[action: Actions]>;
} | null>(null);

interface State {
	capsuleId: number | null;
	elementId: number | null;
	activeCue: string | null;
}

export type Actions =
	| { type: 'edit-capsule'; capsuleId: number; mediaId: null }
	| { type: 'edit-media'; mediaId: number }
	| { type: 'set-cue'; cue: 'string' };

export function reducer(state: State, action: Actions): State {
	switch (action.type) {
		case 'edit-capsule':
			return {
				...state,
				capsuleId: action.capsuleId,
				elementId: action.mediaId,
			};
		case 'edit-media':
			return {
				...state,
				elementId: action.mediaId,
			};
		case 'set-cue':
			return {
				...state,
				activeCue: action.cue,
			};

		default:
			throw Error('Unknown action: ' + (action as any).type);
	}
}
