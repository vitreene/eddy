// import { Img, PersoDef, PersoType, PersoImgDef } from '../types';

import { Img, P, Perso } from '../../types';

type PersoDef = any;

interface PersoImgDef {
	media: Record<string, Img>;
	initial: { content: string };
	actions: Record<string, { content: string }>;
}

type Srcs = string[];

const imgTypes = [P.IMG, P.SPRITE];

function isTypeImg(perso: PersoDef) {
	return imgTypes.includes(perso.type);
}

export async function getPersoImages(store: Record<string, Perso>) {
	const medias = {} as Record<string, PersoImgDef>;
	const persos = {} as Record<string, PersoDef>;

	const imgSrc: Record<string, Srcs> = {};
	for (const id in store) {
		if (isTypeImg(store[id])) {
			medias[id] = store[id] as PersoImgDef;
			imgSrc[id] = findSrcs(medias[id]);
		} else {
			persos[id] = store[id];
		}
	}

	await Promise.all(
		Object.entries(imgSrc).map(([id, srcs]) => {
			//@ts-ignore
			return loadImages(srcs).then(
				(ikonos: { ikono: HTMLImageElement; src: string }[]) => {
					const media = {} as Record<string, Img>;
					ikonos.forEach(({ ikono, src }) => {
						media[src] = {
							img: ikono,
							src: ikono.src,
							width: ikono.width,
							height: ikono.height,
							ratio: ikono.width / ikono.height,
						};
					});
					medias[id].media = media;
				}
			);
		})
	);
	return { persos, medias };
}

function findSrcs(perso: PersoImgDef) {
	const srcs = [perso.initial.content];
	if (perso.actions) {
		Object.values(perso.actions).forEach(
			(action) => action.content && srcs.push(action.content)
		);
	}
	return srcs;
}

interface ResolveImage {
	ikono: {
		width: number;
		height: number;
		ratio: number;
		src: string;
	};
	src: string;
}
export async function loadImages(srcs: string[] | Img[]) {
	return await Promise.all(
		srcs.map(
			(source: string | Img) =>
				new Promise((resolve, reject) => {
					const src = typeof source === 'string' ? source : source.src;
					const ikono = <HTMLImageElement>new Image();
					ikono.onload = () => {
						console.log('IMG LOADED', src);
						resolve({ ikono, src });
					};
					ikono.onerror = (err) => {
						// reject(err);
						resolve({ ikono: DEFAULT_IMG, src });
					};
					ikono.src = src;
				})
		)
	).catch((err) =>
		console.log('on s’est pas trompé ; ça a pas fonctionné', err)
	);
}

export const DEFAULT_IMG = {
	width: 250,
	height: 250,
	ratio: 1,
	src: './ikono/placeholder.png',
};
