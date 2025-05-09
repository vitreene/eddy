// import { createTimeline, type Timeline } from 'animejs';
import { GSDevTools } from 'gsap/GSDevTools';
import { gsap } from 'gsap';
import { SCENE_ID } from './constants';
import { createElements } from './create-elements';
import { setStaticChanges } from './static-changes';

import type { ID, MapEvent, Perso } from '../types';
import { onUpdateTimeLine } from './on-update';

gsap.registerPlugin(GSDevTools);
export function timeLineScene({
	eventtimes,
	persos,
}: {
	eventtimes: MapEvent;
	persos: Array<Perso>;
}): gsap.core.Timeline {
	const $elements = createElements(persos);
	const persoChanges = setStaticChanges({ eventtimes, persos });

	let timeline: gsap.core.Timeline;
	timeline = gsap.timeline({
		autoplay: true,
		loop: 1,
		alternate: true,
		callbackScope: timeline,
		onUpdate: onUpdateTimeLine($elements, persoChanges),
		onComplete() {
			timeline.progress(0);

			console.log('///////LOOP');
		},
		onReverseComplete() {
			// gsap.set($el, { clearProps: flipProps });
		},
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
					console.log(position);

					timeline.to($element, { duration: 1, ...action.style }, position);
				});
			}
		}
		timeline.to($element, perso.initial.style, 0);
	});

	GSDevTools.create({ animation: timeline });

	return timeline;
}
