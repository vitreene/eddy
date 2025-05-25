// import { Store, PersoType, PersoDef, PersoVideoDef } from '../types';
import { P } from '../../types';
type Store = any;
type PersoDef = any;
type PersoVideoDef = any;

export async function getPersoVideos(store: Store) {
	const medias = {} as Record<string, PersoVideoDef>;
	const persos = {} as Record<string, PersoDef>;
	for (const id in store) {
		if (store[id].type === P.VIDEO) {
			medias[id] = store[id] as PersoVideoDef;
			const src = medias[id].initial?.src;
			const video = await loadVideo(src);
			medias[id].media = video;
		} else {
			persos[id] = store[id] as PersoDef;
		}
	}
	return { persos, medias };
}

export async function loadVideo(filepath: string): Promise<HTMLVideoElement> {
	return new Promise((resolve, reject) => {
		const video = document.createElement('video');
		if (video.canPlayType('video/mp4') || video.canPlayType('video/webm'))
			video.setAttribute('src', filepath);
		video.oncanplaythrough = () => {
			resolve(video);
		};
	});
}
