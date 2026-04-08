import assert from "node:assert/strict";

import { restoreNodeFromInitial } from "../app/player/deps/initial-state";

class FakeHTMLElement {}

(globalThis as any).HTMLElement = FakeHTMLElement;

function createStyleBag() {
	const values: Record<string, string> = {};
	return {
		setProperty(name: string, value: string) {
			values[name] = String(value);
		},
		removeProperty(name: string) {
			delete values[name];
			delete (this as any)[name];
		},
		clear() {
			for (const key of Object.keys(values)) delete values[key];
			for (const key of Object.keys(this as any)) {
				if (["setProperty", "removeProperty", "clear", "read"].includes(key)) continue;
				delete (this as any)[key];
			}
		},
		read(name: string) {
			return values[name] ?? (this as any)[name] ?? "";
		}
	};
}

function createNode(id: string) {
	const node: any = new FakeHTMLElement();
	node.id = id;
	node.className = "";
	node.textContent = "";
	node.src = "";
	node.style = createStyleBag();
	node.parentElement = null;
	node.appendChild = (child: any) => {
		child.parentElement = node;
	};
	node.removeChild = (child: any) => {
		if (child.parentElement === node) child.parentElement = null;
	};
	node.setAttribute = (_k: string, _v: string) => {};
	node.removeAttribute = (name: string) => {
		if (name === "style") node.style.clear();
	};
	return node;
}

const parent = createNode("capsule__1");
const node = createNode("item__1");
node.className = "stale old";
node.textContent = "stale";
node.src = "stale.png";
node.style.rotate = "90deg";

restoreNodeFromInitial({
	node,
	initial: {
		id: "item__1",
		move: "capsule__1",
		className: "base",
		content: "hello",
		src: "initial.png",
		style: { backgroundImage: "url(initial.png)" }
	} as any,
	resolveParentById: (id) => (id === "capsule__1" ? parent : null)
});

assert.equal(node.parentElement, parent, "reset should restore initial parent attachment");
assert.equal(node.className, "base", "reset should restore initial className");
assert.equal(node.textContent, "hello", "reset should restore initial content");
assert.equal(node.src, "initial.png", "reset should restore initial src");
assert.equal(node.style.read("rotate"), "", "reset should drop stale rotate style");
assert.equal(
	node.style.read("background-image"),
	"url(initial.png)",
	"reset should reapply initial background style payload"
);

const detachedParent = createNode("capsule__2");
const detachedNode = createNode("item__2");
detachedParent.appendChild(detachedNode);
assert.equal(detachedNode.parentElement, detachedParent, "fixture should start attached");

restoreNodeFromInitial({
	node: detachedNode,
	initial: {
		id: "item__2",
		className: "base-2",
		style: {}
	} as any,
	resolveParentById: () => null
});

assert.equal(detachedNode.parentElement, null, "node with no initial.move should detach from current parent");

const originalParent = createNode("capsule__orig");
const movedParent = createNode("capsule__moved");
const stickyNode = createNode("item__3");
movedParent.appendChild(stickyNode);

restoreNodeFromInitial({
	node: stickyNode,
	initial: {
		id: "item__3",
		className: "base-3",
		style: {}
	} as any,
	resolveParentById: () => null,
	resolveDefaultParent: () => originalParent
});

assert.equal(
	stickyNode.parentElement,
	originalParent,
	"node should return to captured default parent when move is absent"
);

console.log("initial state reset smoke: all checks passed");
