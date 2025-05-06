import { utils } from 'animejs';
import { SCENE_ID, ROOT } from './constants';
import { Perso, ID, Initial } from '../types';

export function createElements(persos: Array<Perso>) {
	if (!document) return null;
	const main: HTMLElement = document.querySelector(`#${SCENE_ID}`);
	if (!main) return null;

	const $elements = new Map<ID, HTMLElement>();
	$elements.set(SCENE_ID, main);

	persos.forEach(({ initial }) => {
		const $el = createPerso(initial);
		$elements.set(initial.id, $el);
	});

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
function createPerso(initial: Partial<Initial>) {
	const $el = document.createElement(initial.tag || 'div');
	for (const k in initial) {
		if (k == 'content') $el.textContent = initial.content;
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
