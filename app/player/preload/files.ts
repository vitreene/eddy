import type { PersoType, PersoDef, PersoVideoDef } from "../types";
import { P } from "../types";

const fileTypes: Array<PersoType> = [P.LOTTIE];
export async function getFiles(store: Record<string, PersoDef>) {
	const medias = {} as Record<string, PersoVideoDef>;
	const persos = {} as Record<string, PersoDef>;
	for (const id in store) {
		if (fileTypes.includes(store[id].type)) {
			medias[id] = store[id] as PersoVideoDef;
			const src = medias[id].initial?.src;
			const file = await fetch(src).then(async (value) => await value.json());
			medias[id].media = file;
		}
	}
	return { persos, medias };
}
