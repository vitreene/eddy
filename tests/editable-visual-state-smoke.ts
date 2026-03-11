import assert from "node:assert/strict";

import {
	buildEditableVisualState,
	projectEditableVisualStateToNode
} from "../app/parts/item-edit/editable-visual-state";

class FakeHTMLElement {}
(globalThis as any).HTMLElement = FakeHTMLElement;

function createFakeNode() {
	const classTokens = new Set<string>();
	const styleStore: Record<string, string> = {};
	const styleNodes = new Map<string, any>();

	const style: any = {
		setProperty: (key: string, value: string) => {
			styleStore[key] = value;
		},
		removeProperty: (key: string) => {
			delete styleStore[key];
		}
	};

	const ownerDocument = {
		defaultView: {},
		head: {
			appendChild: (node: any) => {
				if (node?.id) styleNodes.set(node.id, node);
			}
		},
		getElementById: (id: string) => styleNodes.get(id) || null,
		createElement: (tag: string) => ({ tagName: tag.toUpperCase(), id: "", textContent: "" })
	};

	const attrs = new Map<string, string>();
	const node: any = {
		__proto__: FakeHTMLElement.prototype,
		style,
		ownerDocument,
		classList: {
			add: (...tokens: string[]) => tokens.forEach((token) => classTokens.add(token)),
			remove: (...tokens: string[]) => tokens.forEach((token) => classTokens.delete(token)),
			contains: (token: string) => classTokens.has(token)
		},
		setAttribute: (key: string, value: string) => attrs.set(key, value),
		getAttribute: (key: string) => attrs.get(key) ?? null
	};

	Object.defineProperty(node, "className", {
		get() {
			return Array.from(classTokens).join(" ");
		},
		set(value: string) {
			classTokens.clear();
			for (const token of String(value || "")
				.split(/\s+/)
				.filter(Boolean))
				classTokens.add(token);
		}
	});

	return { node, classTokens, styleNodes };
}

const originalGetComputedStyle = (globalThis as any).getComputedStyle;
(globalThis as any).getComputedStyle = () => ({
	transformOrigin: "50% 50%",
	left: "0px",
	top: "0px",
	transform: "none"
});

try {
	const state = buildEditableVisualState({
		itemId: 55,
		eventAction: "custom-2",
		cueSec: 5.8,
		decor: {
			id: 87,
			area: "cell-r1-c1",
			className: "badge",
			style: { x: 10, y: 20, scaleX: 1.1, scaleY: 1.2 }
		} as any
	});

	assert.equal(state.transform.x, 10);
	assert.equal(state.transform.y, 20);
	assert.equal(state.area, "cell-r1-c1");

	const { node, classTokens } = createFakeNode();
	node.className = "cell_auto_grille-r2-c2";
	projectEditableVisualStateToNode(node, state);
	assert.equal(classTokens.has("cell_auto_grille-r2-c2"), false);
	assert.equal(classTokens.has("cell-r1-c1"), true);
	assert.equal(classTokens.has("badge"), true);

	console.log("editable visual state smoke: all checks passed");
} finally {
	(globalThis as any).getComputedStyle = originalGetComputedStyle;
}
