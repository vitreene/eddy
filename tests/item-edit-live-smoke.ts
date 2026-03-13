import assert from "node:assert/strict";

import { applyLiveStyleOnNode } from "../app/parts/item-edit/live-node-style";
import {
	applyAreaClassPatch,
	applyClassTokenPatch,
	ensureLiveAreaClassDefinition
} from "../app/parts/item-edit/live-node-classes";

type FakeStyle = Record<string, any> & {
	setProperty: (key: string, value: string) => void;
	removeProperty: (key: string) => void;
};

class FakeHTMLElement {}

(globalThis as any).HTMLElement = FakeHTMLElement;

function createFakeNode() {
	const classTokens = new Set<string>();
	const styleStore: Record<string, string> = {};
	const styleNodes = new Map<string, any>();
	const style: FakeStyle = {
		setProperty: (key: string, value: string) => {
			styleStore[key] = value;
		},
		removeProperty: (key: string) => {
			delete styleStore[key];
		}
	};

	const head = {
		appendChild: (node: any) => {
			if (node?.id) styleNodes.set(node.id, node);
		}
	};

	const ownerDocument = {
		defaultView: {},
		head,
		getElementById: (id: string) => styleNodes.get(id) || null,
		createElement: (tag: string) => ({ tagName: tag.toUpperCase(), id: "", textContent: "" })
	};

	const node: any = {
		__proto__: FakeHTMLElement.prototype,
		style,
		classList: {
			add: (...tokens: string[]) => tokens.forEach((token) => classTokens.add(token)),
			remove: (...tokens: string[]) => tokens.forEach((token) => classTokens.delete(token)),
			contains: (token: string) => classTokens.has(token)
		},
		offsetWidth: 200,
		offsetHeight: 100,
		offsetLeft: 0,
		offsetTop: 0,
		offsetParent: null,
		ownerDocument
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

	return { node, styleStore, classTokens, styleNodes };
}

function installComputedStyleMock() {
	const original = (globalThis as any).getComputedStyle;
	(globalThis as any).getComputedStyle = () => ({
		transformOrigin: "50% 50%",
		left: "0px",
		top: "0px",
		transform: "none"
	});
	return () => {
		(globalThis as any).getComputedStyle = original;
	};
}

const restore = installComputedStyleMock();

try {
	{
		const { node } = createFakeNode();
		applyLiveStyleOnNode(
			node,
			{
				x: 12,
				y: 34,
				width: 150,
				height: 80,
				rotate: 10,
				originX: 0.25,
				originY: 0.75,
				scaleX: 1.2,
				scaleY: 0.8
			},
			{ currentStyle: { x: 0, y: 0 } }
		);

		assert.equal(node.style.width, "150px");
		assert.equal(node.style.height, "80px");
		assert.equal(node.style.transformOrigin, "25% 75%");
		assert.equal(node.style.transform, "translate(12px, 34px) rotate(10deg) scale(1.2, 0.8)");
		console.log("OK: live transform patch is applied immediately to node style");
	}

	{
		const { node } = createFakeNode();
		applyLiveStyleOnNode(node, {
			fontFamily: "Lora",
			fontWeight: "bold",
			fontStyle: "italic",
			fontSize: "18px",
			textAlign: "center",
			opacity: 0.5,
			color: "#111111",
			backgroundColor: "#f0f0f0",
			borderColor: "#222222",
			backgroundSize: "contain",
			backgroundPosition: "30% 40%",
			backgroundRepeat: "no-repeat",
			padding: "8px",
			margin: "4px",
			display: "flex",
			justifyContent: "center",
			alignItems: "flex-end",
			justifySelf: "stretch",
			alignSelf: "start",
			placeSelf: "center",
			outline: "1px solid red"
		});

		assert.equal(node.style.fontFamily, "Lora");
		assert.equal(node.style.fontWeight, "bold");
		assert.equal(node.style.fontStyle, "italic");
		assert.equal(node.style.fontSize, "18px");
		assert.equal(node.style.textAlign, "center");
		assert.equal(node.style.opacity, "0.5");
		assert.equal(node.style.color, "#111111");
		assert.equal(node.style.backgroundColor, "#f0f0f0");
		assert.equal(node.style.borderColor, "#222222");
		assert.equal(node.style.backgroundSize, "contain");
		assert.equal(node.style.objectFit, "contain");
		assert.equal(node.style.backgroundPosition, "30% 40%");
		assert.equal(node.style.objectPosition, "30% 40%");
		assert.equal(node.style.backgroundRepeat, "no-repeat");
		assert.equal(node.style.padding, "8px");
		assert.equal(node.style.margin, "4px");
		assert.equal(node.style.display, "flex");
		assert.equal(node.style.justifyContent, "center");
		assert.equal(node.style.alignItems, "flex-end");
		assert.equal(node.style.justifySelf, "stretch");
		assert.equal(node.style.alignSelf, "start");
		assert.equal(node.style.placeSelf, "center");
		assert.equal(node.style.outline, "1px solid red");
		console.log("OK: live non-transform patch is applied immediately to node style");
	}

	{
		const { node } = createFakeNode();
		applyLiveStyleOnNode(node, {
			backgroundImage: 'url("/foo.png")',
			backgroundSize: "cover",
			backgroundPosition: "10% 20%",
			outline: "1px solid red"
		});
		applyLiveStyleOnNode(node, {
			backgroundImage: null,
			backgroundSize: null,
			backgroundPosition: null,
			outline: null
		});

		assert.equal(node.style.backgroundImage, undefined);
		assert.equal(node.style.backgroundSize, "");
		assert.equal(node.style.objectFit, "");
		assert.equal(node.style.backgroundPosition, "");
		assert.equal(node.style.objectPosition, "");
		assert.equal(node.style.outline, "");
		console.log("OK: nullable style props are removed immediately from node style");
	}

	{
		const { node, classTokens } = createFakeNode();
		applyClassTokenPatch(node, "cell-r1-c1", "cell-r2-c2");
		assert.equal(classTokens.has("cell-r1-c1"), false);
		assert.equal(classTokens.has("cell-r2-c2"), true);

		applyClassTokenPatch(node, "badge old", "badge new");
		assert.equal(classTokens.has("old"), false);
		assert.equal(classTokens.has("new"), true);
		assert.equal(classTokens.has("badge"), true);
		console.log("OK: slot/class patches are applied immediately on classList");
	}

	{
		const { node, classTokens } = createFakeNode();
		node.className = "foo cell_layout_auto_grille-r2-c2";
		applyAreaClassPatch(node, null, "cell-r1-c1");
		assert.equal(classTokens.has("cell_layout_auto_grille-r2-c2"), false);
		assert.equal(classTokens.has("cell-r1-c1"), true);
		assert.equal(classTokens.has("foo"), true);
		console.log("OK: explicit area patch removes auto-placement tokens");
	}

	{
		const { node, styleNodes } = createFakeNode();
		ensureLiveAreaClassDefinition(node, "cell-r2-c3");
		const styleEl = styleNodes.get("eddy-live-area-definitions");
		assert.ok(styleEl);
		assert.equal(String(styleEl.textContent || "").includes(".cell-r2-c3{"), true);
		console.log("OK: live area css definition is injected for immediate slot move");
	}

	console.log("item edit live smoke: all checks passed");
} finally {
	restore();
}
