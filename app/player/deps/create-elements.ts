import { utils } from "animejs";

import { P } from "../types";
import { SCENE_ID, ROOT } from "../constants";

import type { Player } from "../player";
import type { Perso, Initial, PersoMediaDef } from "../types";

export function createElements(this: Player): void {
	if (!document) return null;
	if (!this.render) return null;
	this.$elements.set(SCENE_ID, this.render);

	this.persos.forEach((perso) => {
		const $el = createNode(perso);
		this.$elements.set(perso.initial.id, $el);
	});

	// initial insert in DOM
	this.persos.forEach(({ initial }) => {
		//FIXME DEPRECIE à retirer
		if ("id" in initial && initial.id == ROOT) {
			this.render.appendChild(this.$elements.get(initial.id)!);
		}

		if ("move" in initial && typeof initial.move == "string") {
			const $parent = this.$elements.get(initial.move);

			$parent!.appendChild(this.$elements.get(initial.id)!);
		}
	});
}

function createNode(perso: Perso) {
	const { type, initial } = perso;
	const $el =
		type == P.VIDEO ? (perso as PersoMediaDef).media : document.createElement(createTag({ type, initial }));

	for (const k in initial) {
		if (k == "src") {
			($el as HTMLImageElement).src = initial[k]!;
		}

		if (k == "content") {
			$el.textContent = initial.content;
		}
		if (k == "id") $el.id = initial.id;
		if (k == "style") {
			utils.set($el, { ...initial.style! });
		}
		if (k == "className")
			if (typeof initial.className == "string") {
				initial.className.split(" ").forEach((c) => c && $el.classList.add(c));
			}
	}
	return $el;
}
interface NodeProps {
	type: keyof typeof P;
	initial: Partial<Initial>;
}
function createTag({ type, initial }: NodeProps) {
	if (initial.tag) return initial.tag;
	switch (type) {
		case P.SPRITE:
		case P.IMG:
			return "img";
		case P.SOUND:
		case P.VIDEO:
			return "video";
		case P.THREE:
			// case P.LOTTIE:
			return "canvas";

		default:
			return "div";
	}
}
