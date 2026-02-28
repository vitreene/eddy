import { createTimer } from "animejs";
import type { AnimationItem } from "lottie-web";

import { P } from "../types";

import type { Player } from "../player";
import type { Action, Media, PersoLottieDef, PersoMediaDef } from "../types";

// propriétés exclues des animations
const exceptions = ["backgroundImage"];

export function createScene(this: Player): void {
	if (!document) return null;
	if (!this.render) return null;
	const timeEvents = new Map<string, Set<number>>();
	let positionMax = 0;
	console.log("eventtimes", this.eventtimes);

	this.eventtimes.forEach((event, position) => {
		if (positionMax < position) positionMax = position;
		(Array.isArray(event) ? event : [event]).map((event) => {
			const eventName = event.name;
			const positions = timeEvents.get(eventName) || new Set();
			positions.add(position);
			timeEvents.set(eventName, positions);
		});
	});

	console.log("timeEvents", timeEvents);

	this.persos.forEach((perso) => {
		if (!perso.initial.id) return;
		const $el = this.$elements.get(perso.initial.id);
		if (!$el) return;

		if (perso.initial.style) {
			const style: Record<string, any> = {};

			for (const prop in perso.initial.style) {
				if (exceptions.includes(prop)) {
					// console.log(prop, perso.initial.style[prop]);

					$el.style.setProperty(prop, String(perso.initial.style[prop]));
				} else style[prop] = perso.initial.style[prop];
			}

			// console.log(perso.initial.id, perso.initial.style);
			// console.log(style, $el);

			this.timeLine.add($el, style, 0);
		}
		for (const [actionName, action] of Object.entries(perso.actions)) {
			if (typeof action == "boolean") continue;
			const positions = timeEvents.get(actionName);
			// console.log("ADD", $el.id, actionName, action.style!, positions);

			if (positions && "style" in action) {
				positions.forEach((position) => {
					this.timeLine.add($el, action.style!, position);
				});
			}

			// temp ameliorer la gestion de la durée
			if (perso.type == P.LOTTIE && "media" in perso) {
				const media = (action as Partial<Action & { media: Media }>).media;
				if (media?.action == "play") {
					const lottie = (perso as PersoLottieDef).media;

					const duration = lottie.getDuration() * 1000;
					const speed = duration / (media.duration ?? duration);
					lottie.setSpeed(speed);
					const timer1 = createTimer({
						duration: media.duration ?? duration,
						onUpdate: (self) => {
							((perso as PersoMediaDef).media as AnimationItem).goToAndStop(self.currentTime);
						}
					});
					if (positions)
						positions.forEach((position) => {
							this.timeLine.sync(timer1, position);
						});
				}
			}
		}
	});
	// trigger on end timeline
	this.timeLine.call(this.onEnd, positionMax);
}
