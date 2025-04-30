import { Change } from './static-changes';

import type { Timeline } from 'animejs';
import type { ID } from '../types';

export function onUpdateTimeLine(
	$elements: Map<string, Element>,
	persoChanges: Map<string, Record<number, Change>>
) {
	const persoPositions = new Map<ID, Change>();
	return function (self: Timeline) {
		const currentTime = self.currentTime;

		persoChanges.forEach((changes, id) => {
			const change = getChange(id, currentTime);

			if (currentTime >= (change.next ?? Infinity)) {
				const nextChange = change.next ? changes[change.next] : null;
				if (nextChange) {
					persoPositions.set(id, nextChange);
					if (nextChange.change?.move) {
						console.log('MOVE', nextChange.change.move);
						applyChange($elements.get(id), nextChange.change);
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

function applyChange($el: Element, change: Change['change']) {
	if (change.className) {
		$el.className = change.className;
	}
	if (change.content) {
		$el.textContent = change.content;
	}
	// Additional attributes can be handled here
}
