import { createTimeline, utils, animate } from 'animejs';
import { eventtimes, persos } from './scenes';
import { Eventime, Initial } from './types';
import { ROOT, SCENE_ID } from './scenes/constants';
import { useMemo, useEffect, useRef } from 'react';

import './scenes/scene-01.css';

export default function App() {
	const animeScene = useRef(null);
	useEffect(() => {
		if (!animeScene.current) animeScene.current = scene();
	}, []);

	return <main id={SCENE_ID} />;
}

function scene() {
	if (!document) return null;
	const main = document.querySelector(`#${SCENE_ID}`);
	if (!main) return null;

	const timeLine = createTimeline();

	eventtimes.forEach((event: Eventime, position: number) =>
		Array.isArray(event)
			? event
			: [event].forEach((ev) => timeLine.label(ev.name, position))
	);

	persos.forEach((perso) => {
		if ('initial' in perso) {
			const $el = createPerso(perso.initial);
			if ('id' in perso.initial && perso.initial.id == ROOT) {
				main.appendChild($el);
			}
			for (const position in perso.actions) {
				const a = perso.actions[position];
				const action = {
					...a.style,
					onBegin: () => {
						[move, setClassNames].forEach((f) => f($el, a));
					},
				};

				timeLine.add($el, action, position);
			}
		}
	});

	return timeLine;
}

function createPerso(initial: Partial<Initial>) {
	const $el = document.createElement(initial.tag || 'div');
	for (const k in initial) {
		if (k == 'content') $el.textContent = initial.content;
		if (k == 'id') $el.id = initial.id;
		if (k == 'style') utils.set($el, initial.style);
		if (k == 'className')
			initial.className.split(' ').forEach((c) => $el.classList.add(c));
	}
	return $el;
}

/* 
const p1 = document.createElement('div');
document.body.appendChild(p1);
const p2 = document.createElement('div');
document.body.appendChild(p2);

function point($el, x, y) {
	$el.style = `
  position:absolute; 
  border-radius:50%;
  width:1px;
  height:1px;
  outline:4px solid yellowgreen;
  top:${y}px;
  left:${x}px`;
} 
  */

function move($el, a) {
	if ('move' in a) {
		switch (typeof a.move) {
			case 'string':
				const [parent] = utils.$(a.move);
				parent.appendChild($el);
				break;
			case 'boolean': {
				if ('className' in a) {
					const old = $el.getBoundingClientRect();

					setClassNames($el, a);
					const current = $el.getBoundingClientRect();

					// point(p1, old.x, old.y);
					// point(p2, current.x, current.y);
					animate($el, {
						x: { from: old.x - current.x, to: 0 },
						y: { from: old.y - current.y, to: 0 },
						width: { from: old.width, to: current.width },
						height: { from: old.height, to: current.height },
						duration: 1000,
						onComplete: utils.cleanInlineStyles,
					});
				}
			}
			default:
				break;
		}
	}
}

function setClassNames($el, a) {
	if ('className' in a) {
		switch (typeof a.className) {
			case 'string':
				a.className.split(' ').forEach((c: string) => $el.classList.add(c));
				break;
			case 'object': {
				for (const action in a.className) {
					switch (action) {
						case 'add':
							a.className.add
								.split(' ')
								.forEach((c: string) => $el.classList.add(c));
							break;
						case 'remove':
							a.className.remove
								.split(' ')
								.forEach((c: string) => $el.classList.remove(c));
					}
				}
			}

			default:
				break;
		}
	}
}
