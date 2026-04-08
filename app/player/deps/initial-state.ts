import { utils } from "animejs";

import { mixClassNames } from "./static-changes";

import type { Initial } from "../types";

export function restoreNodeFromInitial(input: {
	node: HTMLElement;
	initial: Initial;
	resolveParentById: (id: string | number) => HTMLElement | null;
	resolveDefaultParent?: () => HTMLElement | null;
}) {
	const { node, initial, resolveParentById, resolveDefaultParent } = input;

	if (typeof initial.move === "string") {
		const parent = resolveParentById(initial.move);
		if (parent && node.parentElement !== parent) parent.appendChild(node);
	} else {
		const defaultParent = resolveDefaultParent?.() ?? null;
		if (defaultParent && node.parentElement !== defaultParent) {
			defaultParent.appendChild(node);
		} else if (
			!defaultParent &&
			node.parentElement &&
			typeof (node.parentElement as any).removeChild === "function"
		) {
			(node.parentElement as any).removeChild(node);
		}
	}

	node.removeAttribute("style");

	if (typeof initial.className === "string") {
		node.className = mixClassNames(initial.className);
	}

	if (Object.prototype.hasOwnProperty.call(initial, "content")) {
		node.textContent = typeof initial.content === "string" ? initial.content : "";
	}

	if (typeof initial.src === "string" && "src" in (node as any)) {
		(node as HTMLImageElement).src = initial.src;
	}

	if (initial.attr && typeof initial.attr === "object") {
		for (const [key, value] of Object.entries(initial.attr)) {
			node.setAttribute(key, value);
		}
	}

	const styleEntries = Object.entries((initial.style as Record<string, unknown>) || {});
	const styleForAnime: Record<string, string | number> = {};
	for (const [styleKey, styleValue] of styleEntries) {
		if (styleValue == null) continue;
		if (styleKey === "backgroundImage") {
			node.style.setProperty("background-image", String(styleValue));
			continue;
		}
		if (typeof styleValue === "string" || typeof styleValue === "number") {
			styleForAnime[styleKey] = styleValue;
		}
	}

	if (Object.keys(styleForAnime).length) {
		utils.set(node, styleForAnime);
	}
}
