import { utils } from "animejs";
import { getProgression, isChangeActiveAtTime, setNextChange } from "./utils";

import type { Timeline, JSAnimation } from "animejs";
import type { ID } from "../types";
import type { Player } from "../player";
import type { Change } from "./static-changes";
import { DEFAULT_DURATION } from "@/config/constants";

function isAutoMove(move: unknown): move is { mode: "auto"; clearTransforms?: boolean } {
	return Boolean(move && typeof move == "object" && (move as any).mode === "auto");
}

function clearMoveInlineStyles(node: HTMLElement, options?: { preserveTransform?: boolean }) {
	const preserved = options?.preserveTransform ? readPersistentTransformState(node) : null;
	node.style.removeProperty("width");
	node.style.removeProperty("height");
	node.style.removeProperty("transform");
	node.style.removeProperty("transform-origin");
	if (preserved) {
		utils.set(node, preserved);
	}
}

function readPersistentTransformState(node: HTMLElement): Record<string, number> | null {
	const rotate = Number(utils.get(node, "rotate", false));
	const scaleX = Number(utils.get(node, "scaleX", false));
	const scaleY = Number(utils.get(node, "scaleY", false));
	const originX = Number(utils.get(node, "originX", false));
	const originY = Number(utils.get(node, "originY", false));

	const state: Record<string, number> = {};
	if (Number.isFinite(rotate) && Math.abs(rotate) > 1e-6) state.rotate = rotate;
	if (Number.isFinite(scaleX) && Math.abs(scaleX - 1) > 1e-6) state.scaleX = scaleX;
	if (Number.isFinite(scaleY) && Math.abs(scaleY - 1) > 1e-6) state.scaleY = scaleY;
	if (Number.isFinite(originX) && Math.abs(originX - 0.5) > 1e-6) state.originX = originX;
	if (Number.isFinite(originY) && Math.abs(originY - 0.5) > 1e-6) state.originY = originY;

	return Object.keys(state).length ? state : null;
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
		const change = Object.values(changes).find((ch) => isChangeActiveAtTime(currentTime, ch));
		if (change) persoPositions.set(id, change);
		return change;
	};

	return (self: Timeline) => {
		const currentTime = self.iterationCurrentTime;
		const isInitialTick = runtime.previousTime === null;
		const isBackward = typeof runtime.previousTime === "number" && currentTime < runtime.previousTime - 0.001;

		this.persoChanges.forEach((changes, id) => {
			const change = getChange(id, currentTime);

			if (!change) return;

			const $el = this.$elements.get(id);

			if (isInitialTick && $el) {
				if ((typeof change.change?.move === "boolean" && change.change.move) || isAutoMove(change.change?.move)) {
					change.snapshot = {
						x: utils.get($el, "x"),
						y: utils.get($el, "y"),
						width: utils.get($el, "width"),
						height: utils.get($el, "height"),
						originX: utils.get($el, "originX"),
						originY: utils.get($el, "originY")
					};
					const transition = this._moveChange(id, change.change);
					if (transition) {
						transitions.set(change, transition);
						transition.progress = resolveChangeProgress(currentTime, change);
					}
				} else if (typeof change.change?.move === "string") {
					this._moveChange(id, change.change);
					this._applyChanges(id, change.change);
				} else {
					this._applyChanges(id, change.change);
				}

				this.applyMediaChanges(currentTime, id, change.change);
			}

			if (change && transitions.has(change)) {
				const transition = transitions.get(change)!;
				const progress = resolveChangeProgress(currentTime, change);
				transition.progress = progress;
				if (!isBackward && progress >= 0.999) {
					transition.progress = 1;
					if ($el) {
						clearMoveInlineStyles($el as HTMLElement, { preserveTransform: Boolean(change.preserveTransform) });
					}
					transitions.delete(change);
				}
			}

			if (currentTime >= (change!.next ?? Infinity) || currentTime < (change.curr! ?? 0)) {
				const nextChange = setNextChange(currentTime, change, changes);

				if (nextChange == null) return;

				persoPositions.set(id, nextChange);

				if (setters.has(id)) {
					setters.get(id)!.revert();
				}
				if (!$el) return;

				if (transitions.has(change)) {
					const previousTransition = transitions.get(change)!;
					if (!isBackward) {
						previousTransition.progress = 1;
						clearMoveInlineStyles($el as HTMLElement, { preserveTransform: Boolean(change.preserveTransform) });
					}
					transitions.delete(change);
				}

				if (change.snapshot && isBackward) {
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
