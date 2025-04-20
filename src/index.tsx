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

// const p1 = document.createElement('div');
// document.body.appendChild(p1);
// const p2 = document.createElement('div');
// document.body.appendChild(p2);
// const p3 = document.createElement('div');
// document.body.appendChild(p3);
// const p4 = document.createElement('div');
// document.body.appendChild(p4);
// const n1 = document.createElement('div');
// document.body.appendChild(n1);
// const n2 = document.createElement('div');
// document.body.appendChild(n2);
// const n3 = document.createElement('div');
// document.body.appendChild(n3);
// const n4 = document.createElement('div');
// document.body.appendChild(n4);

function plot($el, x, y, color = 'yellowgreen') {
	if (typeof x == 'number') x = `${x}px`;
	if (typeof y == 'number') y = `${y}px`;
	$el.style = `
  position:absolute; 
  border-radius:50%;
  width:1px;
  height:1px;
  outline:4px solid ${color};
  top:${y};
  left:${x}`;
}

// plot(p1, old.x, old.y);
// plot(p2, current.x, current.y);

/* 
le matrix doit se faire a partir du point de reference, soit le centre de l'élement , soit le transform-origin. 

calculer le centre, passer x/y avec la diff du point ref
-> et, appliquer la diff x/y -> x/Y modifié  à ref ? 



*/

const ROTATE = 30;

function move($el: HTMLElement, a) {
	if ('move' in a) {
		switch (typeof a.move) {
			case 'string':
				const [parent] = utils.$(a.move);
				parent.appendChild($el);
				break;
			case 'boolean': {
				if ('className' in a) {
					const old = getAbsoluteCoords($el);
					setClassNames($el, a);
					const nex = getAbsoluteCoords($el);

					const px = utils.get($el, 'x', false);
					const py = utils.get($el, 'y', false);

					const dx = old.x - nex.x;
					const dy = old.y - nex.y;

					const res = getTransform($el)
						.invertSelf()
						.transformPoint(new DOMPoint(dx, dy));

					animate($el, {
						x: { from: res.x, to: 0 + px },
						y: { from: res.y, to: 0 + py },

						width: { from: old.width, to: nex.width },
						height: { from: old.height, to: nex.height },

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

/* function transformCoords(x = 0, y = 0, rotate = 0, s = 1) {
	const scale = 1 / s;
	const distance = hypothenuse(x, y);
	const angle = Math.atan2(y, x);
	const rad = DEGtoRAD(rotate);
	const coords = {
		x: distance * Math.cos(angle - rad) * scale,
		y: distance * Math.sin(angle - rad) * scale,
	};

	return coords;
}

function hypothenuse(x, y) {
	return Math.sqrt(x * x + y * y);
}
function DEGtoRAD(deg) {
	return (deg * Math.PI) / 180;
}

function transformPoint($el: HTMLElement) {
	const el = getAbsoluteCoords($el); // vraies coord de $el sans transform
	const w2 = el.width / 2;
	const h2 = el.height / 2;
	const tP = el.transform.transformPoint(new DOMPoint(w2, h2));

	const elx = el.x;
	const ely = el.y;
	const tpx = tP.x - w2;
	const tpy = tP.y - h2;

	const x = elx - tpx;
	const y = ely - tpy;

	const p1 = document.createElement('div');
	document.body.appendChild(p1);
	const p2 = document.createElement('div');
	document.body.appendChild(p2);
	plot(p1, el.x, el.y, 'red');
	plot(p2, x, y, 'orange');

	return {
		tpx,
		tpy,
		elx,
		ely,
		x,
		y,
		width: el.width,
		height: el.height,
		transform(x: number, y: number) {
			return el.transform.invertSelf().transformPoint(new DOMPoint(x, y));
		},
	};
}
 */

function getAbsoluteCoords($el: HTMLElement) {
	const coords = {
		x: 0,
		y: 0,
	};

	let transform: DOMMatrix;
	traverse($el, new DOMMatrix());

	// const res = transform
	// 	.invertSelf()
	// 	.transformPoint(new DOMPoint(coords.x, coords.y));

	const res = coords;
	return {
		x: res.x,
		y: res.y,
		width: $el.offsetWidth,
		height: $el.offsetHeight,
	};

	function traverse(element: HTMLElement, matrix: DOMMatrix) {
		if (!element.isEqualNode($el))
			transform = getTransform(element).multiply(matrix);

		coords.x += element.offsetLeft;
		coords.y += element.offsetTop;

		if (element.offsetParent instanceof HTMLElement) {
			traverse(element.offsetParent, transform);
		}
	}
}

function getTransform(element: HTMLElement) {
	const style = window.getComputedStyle(element);
	return style.transform !== 'none'
		? new DOMMatrix(style.transform)
		: new DOMMatrix();
}
