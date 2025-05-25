import { ID, Perso } from '../../types';
import { getPersoSounds } from './audio';
import { getPersoImages } from './ikono';
import { getPersoVideos } from './video';

export type Store = Record<ID, Perso>;
export interface OptionalMediasStoreProps {
	audio: Record<string, Store>;
	thr3d: any;
	ikono: any;
	video: any;
}

export async function preload(store: Array<Perso>): Promise<Store> {
	const st01 = await getPersoSounds(store);
	console.log('LOAD SOUNDS');

	const st02 = await getPersoImages(st01.persos);
	console.log('LOAD IMAGES');

	const st03 = await getPersoVideos(st01.persos);
	console.log('LOAD VIDEOS');

	const persos01 = {
		...st03.persos,
		...st01.medias,
		...st02.medias,
		...st03.medias,
	};

	const persos: Store = {};

	// self action
	Object.entries(persos01).map(([_, p]) => {
		//@ts-ignore
		persos[p.initial.id] = {
			...p,
			actions: { ...p.actions, [p.initial.id]: true },
		};
	});

	return persos;
}
