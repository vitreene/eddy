import { utils, animate } from "animejs";

import { persoTypes } from "../types";

import type { Timeline, JSAnimation } from "animejs";
import type { MediaStatus, ID, Perso } from "../types";
import type { Player } from "../player";
import type { Change } from "./static-changes";

export function onUpdateTimeLine(this: Player): (self: Timeline) => boolean {
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

		change && persoPositions.set(id, change);
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

				!(progress == 1 && transition.completed) && (transition.progress = progress);
			}

			// update sets :
			if (currentTime >= (change!.next ?? Infinity) || currentTime <= (change.curr! ?? 0)) {
				const nextChange = setNextChange(change, changes);

				if (nextChange == null) return;

				persoPositions.set(id, nextChange);

				if (setters.has(id)) {
					setters.get(id)!.revert();
				}
				if (!$el) return;

				if (change.snapshot) {
					setters.set(id, utils.set($el, change.snapshot));
				}

				console.log(
					nextChange.change?.move,
					transitions.has(nextChange),
					nextChange.change?.move && !transitions.has(nextChange)
				);

				if (nextChange.change?.move && !transitions.has(nextChange)) {
					console.log("->perso->", this.persos.get(id));
					nextChange.snapshot = {
						x: utils.get($el, "x"),
						y: utils.get($el, "y"),
						width: utils.get($el, "width"),
						height: utils.get($el, "height")
					};

					const transition = move({
						$el,
						change: nextChange.change,
						perso: this.persos.get(id)!,
						currentTime,
						mediaStatus: this.mediaStatus,
						tmIsPlaying: !self.paused,
						elements: this.$elements
					});
					transition && transitions.set(nextChange, transition);
				} else
					applyChange({
						$el,
						change: nextChange.change,
						perso: this.persos.get(id)!,
						currentTime,
						mediaStatus: this.mediaStatus,
						tmIsPlaying: !self.paused,
						elements: this.$elements
					});
			}
		});
		return true;

		function setNextChange(change: Change, changes: Record<number, Change>) {
			let nextChange = change;
			while (!(currentTime <= (nextChange.next ?? Infinity) && currentTime >= nextChange.curr!)) {
				nextChange = nextChange.next ? changes[nextChange.next] : changes[0];
				if (nextChange === change) return null; // never
			}
			return nextChange;
		}
	};
}

interface ApplyChange {
	$el: HTMLElement;
	change: Change["change"];
	perso: Perso;
	currentTime: number | null;
	mediaStatus: Map<ID, MediaStatus>;
	tmIsPlaying: boolean;
	elements: Map<ID, HTMLElement>;
}

/* 
il faudrait plutot un système de commit qui permettrait de rassembler les modifications du DOM ensemble, 
en particulier pour les medias qui doivent vérifier si l'état de lecture du player. 

*/

function applyChange({ $el, change, perso, currentTime = null, mediaStatus, tmIsPlaying }: ApplyChange) {
	if (change.className) {
		$el.className = change.className;
	}
	if (change.content && perso.type != persoTypes.IMG) {
		//TODO seulement si content est texte !

		$el.textContent = change.content;
	}

	if (perso.type == persoTypes.VIDEO && change.media) {
		const $video = $el as HTMLVideoElement;

		const $media = mediaStatus.get(perso.initial.id)!;
		$media.change = {
			changeAt: change.media.changeAt,
			offset: change.media.offset
		};
		$media.startAt = currentTime ?? 0;

		if (change.media.action == "play") {
			$media.status = "play";
			$video.currentTime = (change.media.offset ?? 0) / 1000;
			tmIsPlaying && $video.play();
		}
		if (change.media.action == "pause") {
			$media.status = "pause";

			$video.pause();
		}
	}
	// Additional attributes can be handled here
}

// FIX ces props ne sont pas adaptées
// //importer applyChange à la place comme callback
function move(props: ApplyChange) {
	const { $el, change, perso } = props;

	switch (typeof change.move) {
		case "string":
			{
				const parent = props.elements.get(change.move);
				parent && parent.appendChild($el);
			}
			break;
		//

		case "boolean": {
			const old = getAbsoluteCoords($el);

			applyChange(props);
			const nex = getAbsoluteCoords($el);

			const px = utils.get($el, "x", false);
			const py = utils.get($el, "y", false);

			const dx = old.x - nex.x;
			const dy = old.y - nex.y;

			const diff = getTransform($el).translate(-px, -py).invertSelf().transformPoint(new DOMPoint(dx, dy));

			const transition = animate($el, {
				x: { from: diff.x + px, to: 0 + px },
				y: { from: diff.y + py, to: 0 + py },

				width: { from: old.width, to: nex.width },
				height: { from: old.height, to: nex.height },
				autoplay: false,
				duration: 1000,
				composition: "none"
			}).seek(0);

			return transition;
		}
		default:
			break;
	}
}

function getAbsoluteCoords($el: HTMLElement) {
	const coords = { x: 0, y: 0 };

	traverse($el);
	const res = coords;
	return {
		x: res.x,
		y: res.y,
		width: $el.offsetWidth,
		height: $el.offsetHeight
	};

	function traverse(element: HTMLElement) {
		coords.x += element.offsetLeft;
		coords.y += element.offsetTop;
		if (element.offsetParent instanceof HTMLElement) {
			traverse(element.offsetParent);
		}
	}
}

function getTransform($el: HTMLElement) {
	const style = window.getComputedStyle($el);

	const transform = style.transform !== "none" ? new DOMMatrix(style.transform) : new DOMMatrix();

	return transform;
}

function getProgression(value: number, start: number, end: number) {
	const diff = end - start;
	if (diff === 0) return 1;
	return Math.max(0, Math.min(1, (value - start) / diff));
}
