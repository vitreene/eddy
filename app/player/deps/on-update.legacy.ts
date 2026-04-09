import { animate, utils } from "animejs";

import { mixClassNames } from "./static-changes";
import { getAbsoluteCoords, getProgression, getTransform } from "./utils";
import { P } from "../types";

import type { JSAnimation, Timeline } from "animejs";
import type { ID, MediaStatus, Perso, ActionAtributes } from "../types";
import type { Change } from "./static-changes";

type LegacyPlayerLike = {
	persoChanges: Map<ID, Record<number, Change>>;
	$elements: Map<ID, HTMLElement>;
	persos: Map<ID, Perso>;
	mediaStatus: Map<ID, MediaStatus>;
	applyMediaChanges: (time: number, id: ID, change: Partial<ActionAtributes>) => void;
};

export function onUpdateTimeLineLegacy(this: LegacyPlayerLike): (self: Timeline) => boolean {
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
			const $el = this.$elements.get(id);
			if (!change || !$el) return;

			if (transitions.has(change)) {
				const transition = transitions.get(change)!;
				const progress = getProgression(currentTime, change.curr!, change.curr! + 1000);
				if (!(progress === 1 && transition.completed)) transition.progress = progress;
			}

			if (currentTime >= (change.next ?? Infinity) || currentTime <= (change.curr ?? 0)) {
				const nextChange = setNextChange(currentTime, change, changes);
				if (nextChange == null) return;

				persoPositions.set(id, nextChange);

				if (setters.has(id)) {
					setters.get(id)!.revert();
				}

				if (change.snapshot) {
					setters.set(id, utils.set($el, change.snapshot));
				}

				if (isMoveChange(nextChange.change) && !transitions.has(nextChange)) {
					nextChange.snapshot = {
						x: utils.get($el, "x"),
						y: utils.get($el, "y"),
						width: utils.get($el, "width"),
						height: utils.get($el, "height"),
						originX: utils.get($el, "originX"),
						originY: utils.get($el, "originY")
					};

					const transition = move({
						$el,
						change: nextChange.change,
						perso: this.persos.get(id)!,
						currentTime,
						mediaStatus: this.mediaStatus,
						tmIsPlaying: !self.paused
					});
					if (transition) transitions.set(nextChange, transition);
				} else {
					applyChange({
						$el,
						change: nextChange.change,
						perso: this.persos.get(id)!,
						currentTime,
						mediaStatus: this.mediaStatus,
						tmIsPlaying: !self.paused
					});
					this.applyMediaChanges(currentTime, id, nextChange.change);
				}
			}
		});

		return true;
	};
}

function setNextChange(currentTime: number, change: Change, changes: Record<number, Change>) {
	let nextChange = change;
	while (!(currentTime <= (nextChange.next ?? Infinity) && currentTime >= nextChange.curr!)) {
		nextChange = nextChange.next ? changes[nextChange.next] : changes[0];
		if (nextChange === change) return null;
	}
	return nextChange;
}

function isMoveChange(change: Partial<ActionAtributes>) {
	if (typeof change.move === "string") return true;
	if (typeof change.move === "boolean") return change.move;
	if (change.move && typeof change.move === "object") return (change.move as any).mode === "auto";
	return false;
}

interface ApplyChange {
	$el: HTMLElement;
	change: Change["change"];
	perso: Perso;
	currentTime: number | null;
	mediaStatus: Map<ID, MediaStatus>;
	tmIsPlaying: boolean;
}

function applyChange({ $el, change, perso, currentTime = null, mediaStatus, tmIsPlaying }: ApplyChange) {
	if (change.className) {
		$el.className =
			typeof change.className === "string"
				? mixClassNames(change.className)
				: mixClassNames($el.className || "", change.className);
	}

	if (change.content && perso.type !== P.IMG) {
		$el.textContent = change.content;
	}

	if (perso.type === P.VIDEO && change.media) {
		const $video = $el as HTMLVideoElement;
		const $media = mediaStatus.get(perso.initial.id)!;
		$media.change = {
			changeAt: change.media.changeAt,
			offset: change.media.offset
		};
		$media.startAt = currentTime ?? 0;

		if (change.media.action === "play") {
			$media.status = "play";
			$video.currentTime = (change.media.offset ?? 0) / 1000;
			if (tmIsPlaying) void $video.play();
		}
		if (change.media.action === "pause") {
			$media.status = "pause";
			$video.pause();
		}
	}
}

function move(props: ApplyChange) {
	const { $el, change } = props;

	if (typeof change.move === "string") {
		const parent = document.getElementById(change.move);
		if (parent) parent.appendChild($el);
		return undefined;
	}

	if (
		change.move !== true &&
		!(change.move && typeof change.move === "object" && (change.move as any).mode === "auto")
	) {
		return undefined;
	}

	const old = getAbsoluteCoords($el);
	applyChange(props);
	const nex = getAbsoluteCoords($el);

	const px = Number(utils.get($el, "x", false));
	const py = Number(utils.get($el, "y", false));

	const dx = old.x - nex.x;
	const dy = old.y - nex.y;

	const diff = getTransform($el).translate(-px, -py).invertSelf().transformPoint(new DOMPoint(dx, dy));

	return animate($el, {
		x: { from: diff.x + px, to: 0 + px },
		y: { from: diff.y + py, to: 0 + py },
		width: { from: old.width, to: nex.width },
		height: { from: old.height, to: nex.height },
		autoplay: false,
		duration: 1000,
		composition: "none"
	}).seek(0);
}
