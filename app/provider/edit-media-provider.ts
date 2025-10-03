import { createContext } from 'react';

export const EditMediaContext = createContext<{
	state: Record<string, EditMediaPayload>;
	dispatch: React.ActionDispatch<[action: Action]>;
} | null>(null);

export interface EditMediaPayload {
	ref: string;
	name: string;
}
export type Action =
	| { type: 'set'; payload: Record<string, EditMediaPayload> }
	| { type: 'add' | 'remove'; target: string; payload: EditMediaPayload }
	| { type: 'update'; target: string; payload: Partial<EditMediaPayload> };

export function reducer(state: Record<string, EditMediaPayload>, action: Action) {
	switch (action.type) {
		case 'set':
			return { ...action.payload };
		case 'add':
			return {
				...state,
				[action.target]: action.payload,
			};
		case 'remove': {
			const newState: Record<string, EditMediaPayload> = {};
			for (const target in state) if (target != action.target) newState[target] = state[target];
			return newState;
		}
		case 'update':
			return {
				...state,
				[action.target]: { ...state[action.target], ...action.payload },
			};

		default:
			throw Error('Unknown action: ' + (action as any).type);
	}
}
