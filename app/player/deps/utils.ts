import type { Change } from "./static-changes";

export function getAbsoluteCoords($el: HTMLElement) {
	const coords = { x: 0, y: 0 };
	const rect = $el.getBoundingClientRect();

	traverse($el);
	const res = coords;
	return {
		x: res.x,
		y: res.y,
		width: rect.width,
		height: rect.height
	};

	function traverse(element: HTMLElement) {
		coords.x += element.offsetLeft;
		coords.y += element.offsetTop;
		if (element.offsetParent instanceof HTMLElement) {
			traverse(element.offsetParent);
		}
	}
}

export function getTransform($el: HTMLElement) {
	const style = window.getComputedStyle($el);
	const transform = style.transform !== "none" ? new DOMMatrix(style.transform) : new DOMMatrix();
	return transform;
}

export function getProgression(value: number, start: number, end: number) {
	const diff = end - start;
	if (diff === 0) return 1;
	return Math.max(0, Math.min(1, (value - start) / diff));
}

export function setNextChange(currentTime: number, change: Change, changes: Record<number, Change>) {
	let nextChange = change;
	while (!(currentTime <= (nextChange.next ?? Infinity) && currentTime >= nextChange.curr!)) {
		nextChange = nextChange.next ? changes[nextChange.next] : changes[0];
		if (nextChange === change) return null; // never
	}
	return nextChange;
}
