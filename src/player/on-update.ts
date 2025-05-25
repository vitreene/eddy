import {
	utils,
	animate,
	type Timeline,
	type JSAnimation,
	type AnimatableParams,
	waapi,
	WAAPIAnimation,
} from 'animejs';

import { persoTypes, type ID, type Perso } from '../types';
import type { Change } from './static-changes';

export function onUpdateTimeLine(
	$elements: Map<ID, HTMLElement>,
	persos: Record<ID, Perso>,
	persoChanges: Map<ID, Record<number, Change>>
) {
	console.log('persos', persos);

	const persoPositions = new Map<ID, Change>();
	const transitions = new Map<Change, JSAnimation>();
	const setters = new Map<ID, JSAnimation>();

	return function (self: Timeline) {
		const currentTime = self.iterationCurrentTime;

		persoChanges.forEach((changes, id) => {
			const change = getChange(id, currentTime);
			const $el = $elements.get(id);

			// update transition
			if (transitions.has(change)) {
				const transition = transitions.get(change);
				const progress = getProgression(
					currentTime,
					change.curr,
					change.curr + 1000
				);

				!(progress == 1 && transition.completed) &&
					(transition.progress = progress);
			}

			// update sets :
			if (
				currentTime >= (change.next ?? Infinity) ||
				currentTime <= change.curr
			) {
				const nextChange = setNextChange(change, changes);
				if (nextChange == null) return;

				persoPositions.set(id, nextChange);

				if (setters.has(id)) {
					setters.get(id).revert();
				}

				if (change.snapshot) {
					setters.set(id, utils.set($el, change.snapshot));
				}
				if (nextChange.change?.move && !transitions.has(nextChange)) {
					nextChange.snapshot = {
						x: utils.get($el, 'x'),
						y: utils.get($el, 'y'),
						width: utils.get($el, 'width'),
						height: utils.get($el, 'height'),
					};

					const transition = move($el, nextChange.change, persos[id]);
					transitions.set(nextChange, transition);

					console.log('MOVE', nextChange.change.move, transition);
				} else applyChange($el, nextChange.change, persos[id]);
			}
		});
		return true;

		function setNextChange(change: Change, changes: Record<number, Change>) {
			let nextChange = change;
			while (
				!(
					currentTime <= (nextChange.next ?? Infinity) &&
					currentTime >= nextChange.curr
				)
			) {
				nextChange = nextChange.next ? changes[nextChange.next] : changes[0];
				if (nextChange === change) return null; // never
			}
			return nextChange;
		}

		function getChange(id: ID, currentTime: number) {
			if (persoPositions.has(id)) return persoPositions.get(id);
			const changes = persoChanges.get(id);
			const change = Object.values(changes).find((ch) => {
				return (
					(currentTime < ch.next && ch.prev == null) ||
					(currentTime > ch.prev && ch.next == null) ||
					(currentTime < ch.next && currentTime > ch.prev)
				);
			});

			persoPositions.set(id, change);
			return change;
		}
	};
}

function applyChange($el: HTMLElement, change: Change['change'], perso: Perso) {
	if (change.className) {
		$el.className = change.className;
	}
	if (change.content && perso.type != persoTypes.IMG) {
		//TODO seulement si content est texte !
		console.log('change.content', change.content);

		$el.textContent = change.content;
	}
	// Additional attributes can be handled here
}

function move($el: HTMLElement, change: Change['change'], perso: Perso) {
	// ATTENTION CE N'EST PLUS ADDRESSé
	switch (typeof change.move) {
		case 'string':
			const [parent] = utils.$(change.move);
			parent.appendChild($el);
			break;
		//

		case 'boolean': {
			const old = getAbsoluteCoords($el);

			applyChange($el, change, perso);
			const nex = getAbsoluteCoords($el);

			const px = utils.get($el, 'x', false);
			const py = utils.get($el, 'y', false);

			const dx = old.x - nex.x;
			const dy = old.y - nex.y;

			const diff = getTransform($el)
				.translate(-px, -py)
				.invertSelf()
				.transformPoint(new DOMPoint(dx, dy));

			const transition = animate($el, {
				x: { from: diff.x + px, to: 0 + px },
				y: { from: diff.y + py, to: 0 + py },

				width: { from: old.width, to: nex.width },
				height: { from: old.height, to: nex.height },
				autoplay: false,
				duration: 1000,
				composition: 'none',
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
		height: $el.offsetHeight,
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

	const transform =
		style.transform !== 'none'
			? new DOMMatrix(style.transform)
			: new DOMMatrix();

	return transform;
}

function getProgression(value: number, start: number, end: number) {
	const diff = end - start;
	if (diff === 0) return 1;
	return Math.max(0, Math.min(1, (value - start) / diff));
}
