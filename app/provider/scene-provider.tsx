import { createContext } from 'react';
import type { SceneComp } from '~/api/db';

export const SceneContext = createContext<{
	scene: SceneComp;
	state: any;
	dispatch: React.ActionDispatch<[action: Actions]>;
} | null>(null);

interface State {
	capsuleId: number | null;
	mediaId: number | null;
}

export type Actions =
	| { type: 'edit-capsule'; capsuleId: number; mediaId: null }
	| { type: 'edit-media'; mediaId: number };

export function reducer(state: State, action: Actions): State {
	switch (action.type) {
		case 'edit-capsule':
			return {
				...state,
				capsuleId: action.capsuleId,
				mediaId: action.mediaId,
			};
		case 'edit-media':
			return {
				...state,
				mediaId: action.mediaId,
			};

		default:
			throw Error('Unknown action: ' + (action as any).type);
	}
}
