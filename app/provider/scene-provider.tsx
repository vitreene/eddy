import { createContext } from 'react';
import type { SceneComp } from '~/api/db';

export const SceneContext = createContext<SceneComp | null>(null);
