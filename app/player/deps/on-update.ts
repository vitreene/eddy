import { utils } from "animejs";
import { getProgression, setNextChange } from "./utils";

import type { Timeline, JSAnimation } from "animejs";
import type { ID } from "../types";
import type { Player } from "../player";
import type { Change } from "./static-changes";

export function onUpdateStaticChanges(this: Player): (self: Timeline) => boolean {
	const persoPositions = new Map<ID, Change>();
	const transitions = new Map<Change, JSAnimation>();
	const setters = new Map<ID, JSAnimation>();

	const getChange = (id: ID, currentTime: number) => {
		if (persoPositions.has(id)) return persoPositions.get(id);
		const changes = this.persoChanges.get(id);
		if (!changes) return;
		const change = Object.values(changes).find((ch) => {
			return (
				(ch.next && currentTime < ch.next && ch.prev == null) ||
				(ch.prev && currentTime > ch.prev && ch.next == null) ||
				(ch.next && ch.prev && currentTime < ch.next && currentTime > ch.prev)
			);
		});
		if (change) persoPositions.set(id, change);
		return change;
	};

	return (self: Timeline) => {
		const currentTime = self.iterationCurrentTime;

		this.persoChanges.forEach((changes, id) => {
			const change = getChange(id, currentTime);

			if (!change) return;

			const $el = this.$elements.get(id);

			// update transition
			if (change && transitions.has(change)) {
				const transition = transitions.get(change)!;
				const progress = getProgression(currentTime, change.curr!, change.curr! + 1000);
				transition.progress = progress;
			}

			// update sets :
			if (currentTime >= (change!.next ?? Infinity) || currentTime <= (change.curr! ?? 0)) {
				const nextChange = setNextChange(currentTime, change, changes);

				if (nextChange == null) return;

				persoPositions.set(id, nextChange);

				if (setters.has(id)) {
					setters.get(id)!.revert();
				}
				if (!$el) return;

				if (change.snapshot) {
					setters.set(id, utils.set($el, change.snapshot));
				}

				if (typeof nextChange.change?.move === "boolean" && nextChange.change.move) {
					nextChange.snapshot = {
						x: utils.get($el, "x"),
						y: utils.get($el, "y"),
						width: utils.get($el, "width"),
						height: utils.get($el, "height"),
						originX: utils.get($el, "originX"),
						originY: utils.get($el, "originY")
					};

					if (transitions.has(nextChange)) {
						const existing = transitions.get(nextChange)!;
						this._applyChanges(id, nextChange.change);
						existing.progress = getProgression(currentTime, nextChange.curr!, nextChange.curr! + 1000);
					} else {
						this.enqueueMoveTransition({
							key: `${String(id)}:${nextChange.curr ?? "start"}`,
							id,
							change: nextChange.change,
							onTransition: (transition) => {
								transitions.set(nextChange, transition);
								transition.progress = getProgression(currentTime, nextChange.curr!, nextChange.curr! + 1000);
							}
						});
					}
				} else if (typeof nextChange.change?.move === "string") {
					this._moveChange(id, nextChange.change);
					this._applyChanges(id, nextChange.change);
				} else {
					this._applyChanges(id, nextChange.change);
				}
			}
		});
		return true;
	};
}
