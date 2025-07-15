import { createTimeline, createTimer, type Timeline } from 'animejs';
import lottie, { AnimationItem } from 'lottie-web';

import { SCENE_ID } from './constants';
import { createElements } from './create-elements';
import { setStaticChanges } from './static-changes';

import {
	Action,
	Media,
	P,
	PersoLottieDef,
	PersoMediaDef,
	type ID,
	type MapEvent,
	type Perso,
} from '../types';
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
	initMedias($elements, persos);
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
		if (!$el) return;
		timeLine.add($el, perso.initial.style, 0);

		for (const [actionName, action] of Object.entries(perso.actions)) {
			const positions = timeEvents.get(actionName);
			if (positions && action.style) {
				positions.forEach((position) => {
					timeLine.add($el, action.style, position);
				});
			}

			// temp ameliorer la gestion de la durée
			if (perso.type == P.LOTTIE && 'media' in perso) {
				const media = (action as Partial<Action & { media: Media }>).media;
				if (media?.action == 'play') {
					const lottie = (perso as PersoLottieDef).media;

					const duration = lottie.getDuration() * 1000;
					const speed = duration / (media.duration ?? duration);
					lottie.setSpeed(speed);
					const timer1 = createTimer({
						duration: media.duration ?? duration,
						onUpdate: (self) => {
							((perso as PersoMediaDef).media as AnimationItem).goToAndStop(
								self.currentTime
							);
						},
					});
					positions.forEach((position) => {
						timeLine.sync(timer1, position);
					});
				}
			}
		}
	});

	return { $elements, persoChanges };
}

function initMedias($elements: Map<ID, HTMLElement>, persos: Array<Perso>) {
	const lotties = persos.filter(
		(p) => p.type == P.LOTTIE
	) as Array<PersoMediaDef>;

	lotties.forEach((l) => {
		const media = lottie.loadAnimation({
			container: $elements.get(l.initial.id),
			renderer: 'svg',
			loop: false,
			autoplay: false,
			animationData: l.media,
		});
		l.media = media;
		// l.media.play();
	});
}

/* 
comment lancer une anim lottie, su une duée voulue, et synchro ?
-> lancer un timer qui se sync avec l'animation ?

*/
