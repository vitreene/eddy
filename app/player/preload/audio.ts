import { P } from '~/player/types';
import type { My, Perso } from '~/player/types';

type PersoDef = any;
type PersoSoundDef = any;

const audioContext =
	typeof window !== 'undefined' ? new AudioContext() : undefined;

export async function getPersoSounds(store: Array<Perso>) {
	const medias = {} as Record<string, PersoSoundDef>;
	const persos = {} as Record<string, PersoDef>;
	for (const id in store) {
		if (store[id].type === P.SOUND) {
			medias[id] = store[id] as PersoSoundDef;
			const src = medias[id].initial?.src;
			const media: MediaElementAudioSourceNode = await loadAudio(
				src,
				audioContext
			);
			medias[id].media = media;
		} else {
			persos[id] = store[id] as PersoDef;
		}
	}
	return { persos, medias };
}

export async function loadAudio(
	filepath: string,
	audioContext: AudioContext | undefined
): Promise<MediaElementAudioSourceNode> {
	return new Promise((resolve, reject) => {
		if (!audioContext) {
			reject();
			return false;
		}
		const source = new Audio();
		const media: My = audioContext.createMediaElementSource(source);
		media.my = {
			connect: () => media.connect(audioContext.destination),
			disconnect: () => media.disconnect(),
		};

		source.oncanplay = () => resolve(media);
		source.onerror = (err) => reject(err);
		source.src = filepath;
	});
}
