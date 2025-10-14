import { P } from '../types';
import type { Img, Perso, PersoImgDef } from '../types';

type Srcs = string[];

const imgTypes = [P.IMG, P.SPRITE];

function isTypeImg(perso: Perso): perso is Perso & { type: typeof P.IMG | typeof P.SPRITE } {
	return perso.type === P.IMG || perso.type === P.SPRITE;
}
export async function getPersoImages(store: Record<string, Perso>) {
	const medias = {} as Record<string, PersoImgDef>;
	const persos = {} as Record<string, Perso>;

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
			return loadImages(srcs).then((ikonos: { ikono: HTMLImageElement; src: string }[]) => {
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
			});
		})
	);
	return { persos, medias };
}

function findSrcs(perso: PersoImgDef) {
	const srcs = [perso.initial.src];
	if (perso.actions) {
		Object.values(perso.actions).forEach((action) => action.src && srcs.push(action.src));
	}
	return srcs;
}

export async function loadImages(srcs: string[] | Img[]) {
	try {
		return await Promise.all(
			srcs.map(
				(source: string | Img) =>
					new Promise<{ ikono: HTMLImageElement; src: string }>((resolve) => {
						const src = typeof source === 'string' ? source : source.src;
						const ikono = <HTMLImageElement>new Image();
						ikono.onload = () => {
							// console.log('IMG LOADED', src);
							resolve({ ikono, src });
						};
						ikono.onerror = (err) => resolve({ ikono: new Image(), src });
						ikono.src = src;
					})
			)
		);
	} catch (err) {
		console.log('on s’est pas trompé ; ça a pas fonctionné', err);
		return [];
	}
}

export const DEFAULT_IMG = {
	width: 250,
	height: 250,
	ratio: 1,
	src: './ikono/placeholder.png',
};
