import { createTimeline, utils } from 'animejs';
import { eventtimes, persos } from './scenes';
import { Eventime, ID, Initial } from './types';
import { ROOT, SCENE_ID } from './scenes/constants';
import { useEffect, useRef } from 'react';

import './scenes/scene-01.css';
import { move, setClassNames } from './scenes/move';

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
	const labels = Object.keys(timeLine.labels);

	const $elements = new Map<ID, Element>();
	$elements.set(SCENE_ID, main);

	console.log(persos);

	persos.forEach(
		({
			initial,
			actions,
		}: {
			initial: Partial<Initial>;
			actions: Record<string, any>;
		}) => {
			if (initial) {
				const $el = createPerso(initial);
				$elements.set(initial.id, $el);
				if ('id' in initial && initial.id == ROOT) {
					main.appendChild($el);
				}

				for (const position in actions) {
					if (labels.includes(position)) {
						const a = actions[position];
						const action = {
							...a.style,
							onBegin: () => {
								[move, setClassNames].forEach((f) => f($el, a));
							},
						};
						timeLine.add($el, action, position);
					}
				}
			}
		}
	);
	persos.forEach(({ initial }: { initial: Partial<Initial> }) => {
		const move = initial.move;
		if (move) {
			switch (typeof move) {
				case 'string': {
					const $el = $elements.get(initial.id);
					const $parent = $elements.get(move);
					$parent && $parent.appendChild($el);
				}
			}
		}
	});
	// console.log(timeLine);

	timeLine.init();
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
