import { createTimeline, type Timeline } from 'animejs';

import { SCENE_ID } from './constants';
import { createElements } from './create-elements';
import { setStaticChanges } from './static-changes';

import type { ID, MapEvent, Perso } from '../types';
import { onUpdateTimeLine } from './on-update';

export function timeLineScene({
	eventtimes,
	persos,
}: {
	eventtimes: MapEvent;
	persos: Array<Perso>;
}): Timeline {
	if (!document) return null;
	const main = document.querySelector(`#${SCENE_ID}`);
	if (!main) return null;

	const $elements = createElements(persos);
	const persoChanges = setStaticChanges({ eventtimes, persos });
	const timeLine = createTimeline({
		autoplay: true,
		loop: 3,
		alternate: true,
		onUpdate: onUpdateTimeLine($elements, persoChanges),
	});

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
		const $element = $elements.get(perso.initial.id);
		if (!$element) return;
		for (const [actionName, action] of Object.entries(perso.actions)) {
			const positions = timeEvents.get(actionName);
			if (positions && action.style) {
				positions.forEach((position) => {
					timeLine.add($element, action.style, position);
				});
			}
		}
		timeLine.add($element, perso.initial.style, 0);
	});

	timeLine.init();
	return timeLine;
}
