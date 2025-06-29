import { utils } from 'animejs';
import { SCENE_ID, ROOT } from './constants';
import { Perso, ID, Initial, P } from '../types';

export function createElements(persos: Array<Perso>): Map<ID, HTMLElement> {
	if (!document) return null;
	const main: HTMLElement = document.querySelector(`#${SCENE_ID}`);
	if (!main) return null;

	const $elements = new Map<ID, HTMLElement>();
	$elements.set(SCENE_ID, main);

	console.log(persos);

	persos.forEach(({ type, initial }) => {
		const $el = createNode({ type, initial });
		$elements.set(initial.id, $el);
	});

	// initial insert in DOM
	persos.forEach(({ initial }) => {
		if ('id' in initial && initial.id == ROOT) {
			main.appendChild($elements.get(initial.id));
		}
		if ('move' in initial && typeof initial.move == 'string') {
			const $parent = $elements.get(initial.move);
			$parent.appendChild($elements.get(initial.id));
		}
	});

	return $elements;
}

interface NodeProps {
	type: keyof typeof P;
	initial: Partial<Initial>;
}
function createNode({ type, initial }: NodeProps) {
	const $el = document.createElement(createTag({ type, initial }));

	for (const k in initial) {
		if (k == 'content') {
			if (type === P.IMG) {
				($el as HTMLImageElement).src = initial.content;
			} else $el.textContent = initial.content;
		}
		if (k == 'id') $el.id = initial.id;
		if (k == 'style') {
			utils.set($el, initial.style);
		}
		if (k == 'className')
			if (typeof initial.className == 'string') {
				initial.className.split(' ').forEach((c) => $el.classList.add(c));
			}
	}
	return $el;
}

function createTag({ type, initial }: NodeProps) {
	if (initial.tag) return initial.tag;
	switch (type) {
		case P.SPRITE:
		case P.IMG:
			return 'img';
		case P.SOUND:
		case P.VIDEO:
			return 'video';
		case P.THREE:
			// case P.LOTTIE:
			return 'canvas';

		default:
			return 'div';
	}
}
