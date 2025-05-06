import {
	utils,
	animate,
	type Timeline,
	type JSAnimation,
	type AnimatableParams,
	waapi,
	WAAPIAnimation,
} from 'animejs';

import type { ID } from '../types';
import type { Change } from './static-changes';

export function onUpdateTimeLine(
	$elements: Map<ID, HTMLElement>,
	persoChanges: Map<ID, Record<number, Change>>
) {
	const persoPositions = new Map<ID, Change>();
	const transitions = new Map<Change, JSAnimation>();

	return function (self: Timeline) {
		const currentTime = self.iterationCurrentTime;

		persoChanges.forEach((changes, id) => {
			const change = getChange(id, currentTime);

			if (transitions.has(change)) {
				const transition = transitions.get(change);
				transition.progress = getProgression(
					currentTime,
					change.curr,
					change.curr + 1000
				);
			}

			if (
				currentTime >= (change.next ?? Infinity) ||
				currentTime <= change.curr
			) {
				let nextChange = change;
				while (
					!(
						currentTime <= (nextChange.next ?? Infinity) &&
						currentTime >= nextChange.curr
					)
				) {
					nextChange = nextChange.next ? changes[nextChange.next] : changes[0];
					if (nextChange === change) return;
				}
				persoPositions.set(id, nextChange);

				const transition = transitions.get(change);
				transition && utils.cleanInlineStyles(transition);

				if (nextChange.change?.move && !transitions.has(nextChange)) {
					const transition = move($elements.get(id), nextChange.change);
					transitions.set(nextChange, transition);
					// self.sync(transition, nextChange.curr).seek(nextChange.curr).resume();
					console.log('MOVE', nextChange.change.move, transition);
				} else applyChange($elements.get(id), nextChange.change);
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
		console.log('change.content', change.content);

		$el.textContent = change.content;
	}
	// Additional attributes can be handled here
}

function move($el: HTMLElement, change: Change['change']) {
	// ATTENTION CE N'EST PLUS ADDRESSé
	switch (typeof change.move) {
		case 'string':
			const [parent] = utils.$(change.move);
			parent.appendChild($el);
			break;
		//

		case 'boolean': {
			const old = getAbsoluteCoords($el);

			applyChange($el, change);
			const nex = getAbsoluteCoords($el);

			const px = utils.get($el, 'x', false);
			const py = utils.get($el, 'y', false);
			/* 
			const dp = transformCoords(px, py, -30);

			const dx = old.x - nex.x - dp.x * 2;
			const dy = old.y - nex.y - dp.y * 2; */

			// const dx = old.x - nex.x + px * 2;
			// const dy = old.y - nex.y + py * 2;
			const dx = old.x - nex.x;
			const dy = old.y - nex.y;

			const diff = getTransform($el)
				.invertSelf()
				.transformPoint(new DOMPoint(dx, dy));

			/* 
        le décalage px,py interfère avec le calcul de la position de l'element. 
        px,py * 2 annule en partie ce décalage, mais ce n'est pas le calcul précis. ce décalage doit lui aussi est modifié par le scale et la rotation... 
        
        */
			console.log('***transition****', px, py);
			console.log(diff.x, diff.y);
			/* 
      rien :  : rotate(30deg) scale(0.608) translateX(-316.203px) translateY(2.2133px)
      x: translateX(-313.648px) rotate(30deg) scale(0.6213) translateY(2.1973px)
      r + x : rotate(30deg) translateX(-314.924px) scale(0.6133) translateY(2.2051px)
      x +r : translateX(-316.203px) rotate(30deg) scale(0.608) translateY(2.2133px)
      r+S+x : rotate(30deg) translateX(-315.563px) scale(0.616) translateY(2.2095px)
      */
			const transition = animate($el, {
				autoplay: false,
				composition: 'replace',
				// x: { from: dx, to: 0 + px },
				// y: { from: dy, to: 0 + py },
				x: { from: diff.x, to: 0 + px },
				y: { from: diff.y, to: 0 + py },

				width: { from: old.width, to: nex.width },
				height: { from: old.height, to: nex.height },
				duration: 1000,
				onUpdate: () => {
					// const px = utils.get($el, 'x', false);
					// const py = utils.get($el, 'y', false);
					// console.log(px, py);
					console.log($el.style.transform);
				},
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
	// if (value < start || value > end) return null;
	return Math.max(0, Math.min(1, (value - start) / diff));
}

/* 
function transformCoords(x = 0, y = 0, rotate = 0, s = 1) {
	const scale = 1 / s;
	const distance = hypothenuse(x, y);
	const angle = Math.atan2(y, x);
	const rad = DEGtoRAD(rotate);
	const coords = {
		x: distance * Math.cos(angle - rad) * scale,
		y: distance * Math.sin(angle - rad) * scale,
	};

	return coords;
}

function hypothenuse(x, y) {
	return Math.sqrt(x * x + y * y);
}
function DEGtoRAD(deg) {
	return (deg * Math.PI) / 180;
}


function transformPoint($el: HTMLElement) {
	const el = getAbsoluteCoords($el); // vraies coord de $el sans transform
	const w2 = el.width / 2;
	const h2 = el.height / 2;
	const tP = getTransform($el)
  .invertSelf()
  .transformPoint(new DOMPoint(w2, h2));

	const elx = el.x;
	const ely = el.y;
	const tpx = tP.x - w2;
	const tpy = tP.y - h2;

	const x = elx - tpx;
	const y = ely - tpy;


	return {
		tpx,
		tpy,
		elx,
		ely,
		x,
		y,
		width: el.width,
		height: el.height,
		
	};
} */
