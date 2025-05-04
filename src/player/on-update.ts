import {
	utils,
	animate,
	type Timeline,
	type JSAnimation,
	type AnimatableParams,
} from 'animejs';

import type { ID } from '../types';
import type { Change } from './static-changes';

export function onUpdateTimeLine(
	$elements: Map<ID, HTMLElement>,
	persoChanges: Map<ID, Record<number, Change>>
) {
	const persoPositions = new Map<ID, Change>();

	return function (self: Timeline) {
		const currentTime = self.currentTime;

		// console.log(currentTime);

		persoChanges.forEach((changes, id) => {
			const change = getChange(id, currentTime);

			if (currentTime >= (change.next ?? Infinity)) {
				const nextChange = change.next ? changes[change.next] : null;
				if (nextChange) {
					persoPositions.set(id, nextChange);
					if (nextChange.change?.move) {
						const $el = $elements.get(id);
						const old = getAbsoluteCoords($el);

						const transition = move($el, nextChange.change, old);
						console.log('MOVE', nextChange.change.move, transition);
						/* 
reapsser au systeme  ou la transition est jouée à chaque update 
le changement de classe doit etre synchro avec les styles 
*/

						if (transition)
							self
								.add($el, transition, nextChange.curr)
								.seek(nextChange.curr)
								.reverse();
					} else {
						applyChange($elements.get(id), nextChange.change);
					}
				}
			} else if (currentTime <= change.curr) {
				const prevChange = change.prev != null ? changes[change.prev] : null;
				if (prevChange) {
					persoPositions.set(id, prevChange);
					applyChange($elements.get(id), prevChange.change);
				}
			}
		});
		return true;

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

function applyChange($el: HTMLElement, change: Change['change']) {
	if (change.className) {
		$el.className = change.className;
	}
	if (change.content) {
		$el.textContent = change.content;
	}
	// Additional attributes can be handled here
}

const transitions = new Map<Change['change'], AnimatableParams>();
function move(
	$el: HTMLElement,
	change: Change['change'],
	old: {
		x: number;
		y: number;
		width: number;
		height: number;
	}
) {
	switch (typeof change.move) {
		case 'string':
			const [parent] = utils.$(change.move);
			parent.appendChild($el);
			break;
		case 'boolean': {
			// $el.className = change.className;
			applyChange($el, change);
			const nex = getAbsoluteCoords($el);

			const px = utils.get($el, 'x', false);
			const py = utils.get($el, 'y', false);

			const dx = old.x - nex.x;
			const dy = old.y - nex.y;

			const res = getTransform($el)
				.invertSelf()
				.transformPoint(new DOMPoint(dx, dy));

			if (!transitions.has(change)) {
				console.log('***transition****');
				// const transition = animate($el, {
				// 	composition: 'replace',
				// 	x: { from: res.x, to: 0 + px },
				// 	y: { from: res.y, to: 0 + py },

				// 	width: { from: old.width, to: nex.width },
				// 	height: { from: old.height, to: nex.height },
				// 	duration: 1000,
				// 	onComplete(self) {
				// 		utils.cleanInlineStyles(self);
				// 		self.cancel();
				// 	},
				// }).pause();
				const transition = {
					x: { from: res.x, to: 0 + px },
					y: { from: res.y, to: 0 + py },
					width: { from: old.width, to: nex.width },
					height: { from: old.height, to: nex.height },
					duration: 1000,
					onComplete(self) {
						console.log('onComplete');
						utils.cleanInlineStyles(self);
					},
				};
				transitions.set(change, transition);
				return transition;
			}

			// }
		}
		default:
			break;
	}
}

function getAbsoluteCoords($el: HTMLElement) {
	const coords = {
		x: 0,
		y: 0,
	};

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

function getTransform(element: HTMLElement) {
	const style = window.getComputedStyle(element);
	return style.transform !== 'none'
		? new DOMMatrix(style.transform)
		: new DOMMatrix();
}
