import { utils } from "animejs";
import { getProgression, setNextChange } from "./utils";
import { traceEddy } from "@/lib/eddy-trace";

import type { Timeline, JSAnimation } from "animejs";
import type { ID } from "../types";
import type { Player } from "../player";
import type { Change } from "./static-changes";
import { DEFAULT_DURATION } from "@/config/constants";

function isAutoMove(move: unknown): move is { mode: "auto"; clearTransforms?: boolean } {
	return Boolean(move && typeof move == "object" && (move as any).mode === "auto");
}

function clearMoveInlineStyles(node: HTMLElement) {
	node.style.removeProperty("width");
	node.style.removeProperty("height");
	node.style.removeProperty("transform");
	node.style.removeProperty("transform-origin");
}

export function onUpdateStaticChanges(this: Player): (self: Timeline) => boolean {
	const runtime = this.getUpdateRuntimeState();
	const persoPositions = runtime.persoPositions;
	const transitions = runtime.transitions;
	const setters = runtime.setters;

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
		const isBackward = typeof runtime.previousTime === "number" && currentTime < runtime.previousTime - 0.001;

		this.persoChanges.forEach((changes, id) => {
			const change = getChange(id, currentTime);

			if (!change) return;

			const $el = this.$elements.get(id);

			// update transition
			if (change && transitions.has(change)) {
				const transition = transitions.get(change)!;
				const progress = resolveChangeProgress(currentTime, change);
				transition.progress = progress;
				if (!isBackward && progress >= 0.999) {
					transition.progress = 1;
					if ($el) {
						clearMoveInlineStyles($el as HTMLElement);
					}
					transitions.delete(change);
					traceEddy(
						"flip",
						"transition-complete-forward",
						{
							currentTime,
							window: { curr: change.curr, next: change.next, prev: change.prev },
							nodeStyleAfterCleanup: $el
								? {
										width: ($el as HTMLElement).style.width || "",
										height: ($el as HTMLElement).style.height || "",
										transform: ($el as HTMLElement).style.transform || ""
									}
								: null
						},
						{ nodeId: String(id) }
					);
				}
			}

			// update sets :
			if (currentTime >= (change!.next ?? Infinity) || currentTime <= (change.curr! ?? 0)) {
				const nextChange = setNextChange(currentTime, change, changes);

				if (nextChange == null) return;

				persoPositions.set(id, nextChange);
				traceEddy(
					"flip",
					"change-window-enter",
					{
						currentTime,
						isBackward,
						previousWindow: { curr: change.curr, next: change.next, prev: change.prev },
						nextWindow: { curr: nextChange.curr, next: nextChange.next, prev: nextChange.prev },
						nextMove: nextChange.change?.move ?? null,
						hadPreviousSnapshot: Boolean(change.snapshot)
					},
					{ nodeId: String(id) }
				);

				if (setters.has(id)) {
					setters.get(id)!.revert();
				}
				if (!$el) return;

				if (transitions.has(change)) {
					const previousTransition = transitions.get(change)!;
					if (!isBackward) {
						previousTransition.progress = 1;
						clearMoveInlineStyles($el as HTMLElement);
						traceEddy(
							"flip",
							"transition-finalize-forward",
							{
								currentTime,
								window: { curr: change.curr, next: change.next, prev: change.prev },
								nodeStyleAfterCleanup: {
									width: ($el as HTMLElement).style.width || "",
									height: ($el as HTMLElement).style.height || "",
									transform: ($el as HTMLElement).style.transform || ""
								}
							},
							{ nodeId: String(id) }
						);
					}
					transitions.delete(change);
				}

				if (change.snapshot && isBackward) {
					setters.set(id, utils.set($el, change.snapshot));
					traceEddy(
						"flip",
						"snapshot-apply",
						{
							currentTime,
							snapshot: change.snapshot,
							nodeStyle: {
								width: ($el as HTMLElement).style.width || "",
								height: ($el as HTMLElement).style.height || "",
								transform: ($el as HTMLElement).style.transform || ""
							}
						},
						{ nodeId: String(id) }
					);
				} else if (change.snapshot) {
					traceEddy(
						"flip",
						"snapshot-skip-forward",
						{
							currentTime,
							isBackward,
							snapshot: change.snapshot,
							nodeStyle: {
								width: ($el as HTMLElement).style.width || "",
								height: ($el as HTMLElement).style.height || "",
								transform: ($el as HTMLElement).style.transform || ""
							}
						},
						{ nodeId: String(id) }
					);
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
					traceEddy(
						"flip",
						"snapshot-capture",
						{
							currentTime,
							snapshot: nextChange.snapshot,
							nextWindow: { curr: nextChange.curr, next: nextChange.next },
							nextMove: nextChange.change?.move ?? null
						},
						{ nodeId: String(id) }
					);

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
		runtime.previousTime = currentTime;
		return true;
	};
}

export function resolveTransitionEnd(change: Change): number {
	const defaultEnd = (change.curr || 0) + DEFAULT_DURATION;
	if (typeof change.next === "number" && Number.isFinite(change.next) && change.next > change.curr!) {
		return Math.min(change.next, defaultEnd);
	}
	return defaultEnd;
}

export function resolveChangeProgress(currentTime: number, change: Change): number {
	return getProgression(currentTime, change.curr!, resolveTransitionEnd(change));
}
