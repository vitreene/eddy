import { createTimer } from "animejs";
import type { AnimationItem } from "lottie-web";

import { P } from "../types";

import type { Player } from "../player";
import type { Action, Media, PersoLottieDef, PersoMediaDef } from "../types";

export function createScene(this: Player): void {
	if (!document) return null;
	if (!this.render) return null;
	const timeEvents = new Map<string, number[]>();

	this.eventtimes.forEach((event, position) => {
		if (!Array.isArray(event)) {
			const eventName = event.name;
			const positions = timeEvents.get(eventName) || [];
			positions.push(position);
			timeEvents.set(eventName, positions);
		}
	});

	this.persos.forEach((perso) => {
		if (!perso.initial.id) return;
		const $el = this.$elements.get(perso.initial.id);
		if (!$el) return;
		if (perso.initial.style) this.timeLine.add($el, perso.initial.style, 0);

		for (const [actionName, action] of Object.entries(perso.actions)) {
			if (typeof action == "boolean") continue;
			const positions = timeEvents.get(actionName);
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
}
