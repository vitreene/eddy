import { createTimeline, createTimer, Timeline } from 'animejs';
import lottie, { AnimationItem } from 'lottie-web';

import { SCENE_ID } from './constants';
import { createElements } from './create-elements';
import { setStaticChanges } from './static-changes';
import { P } from '../types';

import type {
	Action,
	Media,
	ID,
	MapEvent,
	Perso,
	PersoLottieDef,
	PersoMediaDef,
	PersoVideoDef,
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
	initMedias($elements, persos, timeLine);
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

function initMedias(
	$elements: Map<ID, HTMLElement>,
	persos: Array<Perso>,
	timeLine: Timeline
) {
	const lotties = persos.filter(
		(p) => p.type == P.LOTTIE
	) as Array<PersoMediaDef>;

	lotties.forEach((l) => {
		l.media = lottie.loadAnimation({
			container: $elements.get(l.initial.id),
			renderer: 'svg',
			loop: false,
			autoplay: false,
			animationData: l.media,
		});
	});

	const videos = persos.filter(
		(p) => p.type == P.VIDEO
	) as Array<PersoVideoDef>;
	videos.forEach((v) => {
		if (!v.initial.master) return;
		/*
		synchroniser les pistes si diff trop importantes
		utiliser le speed général pour éviter des sauts de temps brusques 
		*/
		v.media.playbackRate = 0.25;
		let start: number;
		(v.media as HTMLVideoElement).ontimeupdate = () => {
			if (!start) start = Number(v.media.dataset.start);
			const diff = v.media.currentTime * 1000 + start - timeLine.currentTime;
			if (diff > 60) {
				const speed =
					Math.round(
						((v.media.currentTime * 1000 + start) / timeLine.currentTime) * 100
					) / 100;
				timeLine.speed = speed;
				console.log('speed', speed);
			}
		};
	});
}
