import { utils, animate } from 'animejs';

export function move($el: HTMLElement, a) {
	if ('move' in a) {
		switch (typeof a.move) {
			case 'string':
				const [parent] = utils.$(a.move);
				parent.appendChild($el);
				break;
			case 'boolean': {
				if ('className' in a) {
					const old = getAbsoluteCoords($el);
					setClassNames($el, a);
					const nex = getAbsoluteCoords($el);

					const px = utils.get($el, 'x', false);
					const py = utils.get($el, 'y', false);

					const dx = old.x - nex.x;
					const dy = old.y - nex.y;

					const res = getTransform($el)
						.invertSelf()
						.transformPoint(new DOMPoint(dx, dy));

					animate($el, {
						x: { from: res.x, to: 0 + px },
						y: { from: res.y, to: 0 + py },

						width: { from: old.width, to: nex.width },
						height: { from: old.height, to: nex.height },

						duration: 1000,
						onComplete: utils.cleanInlineStyles,
					});
				}
			}
			default:
				break;
		}
	}
}

export function setClassNames($el, a) {
	if ('className' in a) {
		switch (typeof a.className) {
			case 'string':
				a.className.split(' ').forEach((c: string) => $el.classList.add(c));
				break;
			case 'object': {
				for (const action in a.className) {
					switch (action) {
						case 'add':
							a.className.add
								.split(' ')
								.forEach((c: string) => $el.classList.add(c));
							break;
						case 'remove':
							a.className.remove
								.split(' ')
								.forEach((c: string) => $el.classList.remove(c));
					}
				}
			}

			default:
				break;
		}
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
