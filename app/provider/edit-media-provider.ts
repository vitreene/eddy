import type { TextTime } from '@/api/db';
import { createContext } from 'react';

export const EditMediaContext = createContext<{
	state: { [x: string]: TextTime };
	dispatch: React.ActionDispatch<[action: Action]>;
} | null>(null);

export type Action =
	| { type: 'set'; payload: Record<string, TextTime> }
	| { type: 'add' | 'remove'; target: string; payload: TextTime }
	| { type: 'update'; target: string; payload: Partial<TextTime> };

export function reducer(state: { [x: string]: TextTime }, action: Action) {
	switch (action.type) {
		case 'set':
			return { ...action.payload };
		case 'add':
			return {
				...state,
				[action.target]: action.payload,
			};
		case 'remove': {
			const newState: Record<string, TextTime> = {};
			for (const target in state) if (target != action.target) newState[target] = state[target];
			return newState;
		}
		case 'update': {
			const newState = {
				...state,
				[action.target]: { ...state[action.target], ...action.payload },
			};
			return newState;
		}

		default:
			throw Error('Unknown action: ' + (action as any).type);
	}
}
