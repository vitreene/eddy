import assert from "node:assert/strict";
import { Player } from "../app/player/player";

type RectSpec = { x: number; y: number; width: number; height: number };

class FakeHTMLElement {}

(globalThis as any).HTMLElement = FakeHTMLElement;

function makeRect(rect: RectSpec) {
	return {
		x: rect.x,
		y: rect.y,
		left: rect.x,
		top: rect.y,
		right: rect.x + rect.width,
		bottom: rect.y + rect.height,
		width: rect.width,
		height: rect.height,
		toJSON: () => rect
	} as any;
}

function makeFakeNode() {
	const node: any = new FakeHTMLElement();
	node.id = "item__99";
	node.className = "bg-picture ed-item ed-zone-big-one";
	node.style = {
		width: "",
		height: "",
		transform: "",
		transformOrigin: "",
		removeProperty(name: string) {
			if (name === "width") this.width = "";
			if (name === "height") this.height = "";
			if (name === "transform") this.transform = "";
			if (name === "transform-origin") this.transformOrigin = "";
		}
	};
	node.offsetParent = null;
	Object.defineProperty(node, "offsetLeft", {
		get() {
			return node.className.includes("ed-zone-bas") ? 728 : 559;
		}
	});
	Object.defineProperty(node, "offsetTop", {
		get() {
			return node.className.includes("ed-zone-bas") ? 267 : 157;
		}
	});
	node.getBoundingClientRect = () => {
		if (node.className.includes("ed-zone-bas")) {
			return makeRect({ x: 728, y: 267, width: 175.28125, height: 161.5234375 });
		}
		return makeRect({ x: 559, y: 157, width: 512.078125, height: 244.0078125 });
	};
	return node;
}

const node = makeFakeNode();
let captured: { old: RectSpec; next: RectSpec } | null = null;

const player: any = Object.create(Player.prototype) as Player;

player.$elements = new Map([["item__99", node]]);
player.lastEndCoords = new Map();
player._createMoveTransition = (_el: any, old: RectSpec, next: RectSpec): undefined => {
	captured = { old, next };
	return undefined;
};

player._moveChange("item__99", {
	move: { mode: "auto" },
	className: { add: "ed-zone-bas", remove: "ed-zone-big-one" } as any
});

assert.ok(captured, "_moveChange should compute old/next rects");
assert.deepEqual(
	captured!.old,
	{ x: 559, y: 157, width: 512.078125, height: 244.0078125 },
	"old rect should use pre-class-change geometry"
);
assert.deepEqual(
	captured!.next,
	{ x: 728, y: 267, width: 175.28125, height: 161.5234375 },
	"next rect should use post-class-change geometry"
);

node.className = "bg-picture ed-item ed-zone-big-one";
player.lastEndCoords.set("item__99", { x: 0, y: 0, width: 1, height: 1 });
player._moveChange("item__99", {
	move: { mode: "auto" },
	className: { add: "ed-zone-bas", remove: "ed-zone-big-one" } as any
});

assert.equal(
	player.lastEndCoords.has("item__99"),
	false,
	"stale cached lastEndCoords should be rejected and cleared"
);

console.log("player move old/next smoke: all checks passed");
