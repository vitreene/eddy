import { createContext } from 'react';
import type { SceneComp } from '~/api/db';
import type { Actions } from '~/routes/home';

export const SceneContext = createContext<{
	scene: SceneComp;
	state: any;
	dispatch: React.ActionDispatch<[action: Actions]>;
} | null>(null);
