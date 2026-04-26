import { utils } from "animejs";
import { getProgression, setNextChange } from "./utils";

import type { Timeline, JSAnimation } from "animejs";
import type { ID } from "../types";
import type { Player } from "../player";
import type { Change } from "./static-changes";
import { DEFAULT_DURATION } from "@/config/constants";

function isAutoMove(move: unknown): move is { mode: "auto"; clearTransforms?: boolean } {
	return Boolean(move && typeof move == "object" && (move as any).mode === "auto");
}

export function onUpdateStaticChanges(this: Player): (self: Timeline) => boolean {
	const persoPositions = new Map<ID, Change>();
	const transitions = new Map<Change, JSAnimation>();
	const setters = new Map<ID, JSAnimation>();

	const getChange = (id: ID, currentTime: number) => {
		if (persoPositions.has(id)) return persoPositions.get(id);
		const changes = this.persoChanges.get(id);
		if (!changes) return;
		const change = Object.values(changes).find((ch) => {
			if (ch.prev == null && ch.next == null) return true;
			if (ch.prev == null && typeof ch.next == "number") return currentTime < ch.next;
			if (typeof ch.prev == "number" && ch.next == null) return currentTime >= ch.prev;
			if (typeof ch.prev == "number" && typeof ch.next == "number") {
				return currentTime >= ch.prev && currentTime < ch.next;
			}
			return false;
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
				const progress = resolveChangeProgress(currentTime, change);
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

				if (change.snapshot && shouldApplySnapshotForNextChange(nextChange)) {
					setters.set(id, utils.set($el, change.snapshot));
				}

				if (
					(typeof nextChange.change?.move === "boolean" && nextChange.change.move) ||
					isAutoMove(nextChange.change?.move)
				) {
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
						existing.progress = resolveChangeProgress(currentTime, nextChange);
					} else {
						const transition = this._moveChange(id, nextChange.change);
						if (transition) {
							transitions.set(nextChange, transition);
							transition.progress = resolveChangeProgress(currentTime, nextChange);
						}
					}
				} else if (typeof nextChange.change?.move === "string") {
					this._moveChange(id, nextChange.change);
					this._applyChanges(id, nextChange.change);
				} else {
					this._applyChanges(id, nextChange.change);
				}

				this.applyMediaChanges(currentTime, id, nextChange.change);
			}
		});
		return true;
	};
}

export function shouldApplySnapshotForNextChange(nextChange: Change): boolean {
	return (
		(typeof nextChange.change?.move === "boolean" && nextChange.change.move) ||
		isAutoMove(nextChange.change?.move)
	);
}

export function resolveTransitionEnd(change: Change): number {
	if (typeof change.next === "number" && Number.isFinite(change.next) && change.next > change.curr!) {
		return change.next;
	}
	return (change.curr || 0) + DEFAULT_DURATION;
}

export function resolveChangeProgress(currentTime: number, change: Change): number {
	return getProgression(currentTime, change.curr!, resolveTransitionEnd(change));
}
