import { createTimeline, type Timeline } from 'animejs';

import { SCENE_ID } from './constants';
import { createElements } from './create-elements';
import { setStaticChanges } from './static-changes';

import type { ID, MapEvent, Perso } from '../types';
import { onUpdateTimeLine } from './on-update';

export function createTimeLine() {
	return createTimeline({
		autoplay: true,
		loop: 1,
		alternate: true,
		onLoop: () => console.log('///////LOOP'),
	});
}

export function createScene({
	timeLine,
	eventtimes,
	persos,
}: {
	timeLine: Timeline;
	eventtimes: MapEvent;
	persos: Array<Perso>;
}) {
	if (!document) return null;
	const main = document.querySelector(`#${SCENE_ID}`);
	if (!main) return null;

	const $elements = createElements(persos);
	const persoChanges = setStaticChanges({ eventtimes, persos });

	const timeEvents = new Map<string, number[]>();

	eventtimes.forEach((event, position) => {
		if (!Array.isArray(event)) {
			const eventName = event.name;
			const positions = timeEvents.get(eventName) || [];
			positions.push(position);
			timeEvents.set(eventName, positions);
		}
	});

	persos.forEach((perso) => {
		if (!perso.initial.id) return;
		const $el = $elements.get(perso.initial.id);
		timeLine.add($el, perso.initial.style, 0);
		if (!$el) return;
		for (const [actionName, action] of Object.entries(perso.actions)) {
			const positions = timeEvents.get(actionName);
			if (positions && action.style) {
				positions.forEach((position) => {
					timeLine.add($el, action.style, position);
				});
			}
		}
	});

	return { $elements, persoChanges };
}
