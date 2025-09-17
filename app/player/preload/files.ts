// import { Store, PersoType, PersoDef, PersoVideoDef } from '../types';
import { P } from '../types';

type Store = any;
type PersoDef = any;
type PersoVideoDef = any;

const fileTypes = [P.LOTTIE];
export async function getFiles(store: Store) {
	const medias = {} as Record<string, PersoVideoDef>;
	const persos = {} as Record<string, PersoDef>;
	for (const id in store) {
		if (fileTypes.includes(store[id].type)) {
			medias[id] = store[id];
			const src = medias[id].initial?.src;
			const file = await fetch(src).then(async (value) => await value.json());
			medias[id].media = file;
		}
	}
	return { persos, medias };
}
