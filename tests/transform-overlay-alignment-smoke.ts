import { buildFrame } from "@/components/position-editor/transform-editor.machine";
import { matrixFromElementTransform } from "@/components/position-editor/lib";

type Pt = { x: number; y: number };

function assert(condition: unknown, message: string) {
	if (!condition) throw new Error(message);
}

function nearlyEqual(a: number, b: number, epsilon = 1e-6): boolean {
	return Math.abs(a - b) <= epsilon;
}

function assertPointClose(actual: Pt, expected: Pt, message: string) {
	assert(nearlyEqual(actual.x, expected.x), `${message} (x): got ${actual.x}, expected ${expected.x}`);
	assert(nearlyEqual(actual.y, expected.y), `${message} (y): got ${actual.y}, expected ${expected.y}`);
}

class Matrix2D {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;

	constructor(init?: [number, number, number, number, number, number]) {
		const [a, b, c, d, e, f] = init ?? [1, 0, 0, 1, 0, 0];
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.e = e;
		this.f = f;
	}

	multiply(other: Matrix2D): Matrix2D {
		return new Matrix2D([
			this.a * other.a + this.c * other.b,
			this.b * other.a + this.d * other.b,
			this.a * other.c + this.c * other.d,
			this.b * other.c + this.d * other.d,
			this.a * other.e + this.c * other.f + this.e,
			this.b * other.e + this.d * other.f + this.f
		]);
	}

	translate(tx = 0, ty = 0): Matrix2D {
		return this.multiply(new Matrix2D([1, 0, 0, 1, tx, ty]));
	}

	transformPoint(p: { x: number; y: number }): Pt {
		return {
			x: this.a * p.x + this.c * p.y + this.e,
			y: this.b * p.x + this.d * p.y + this.f
		};
	}

	inverse(): Matrix2D {
		const det = this.a * this.d - this.b * this.c;
		if (Math.abs(det) < 1e-12) throw new Error("Matrix not invertible");
		const invDet = 1 / det;
		const a = this.d * invDet;
		const b = -this.b * invDet;
		const c = -this.c * invDet;
		const d = this.a * invDet;
		const e = -(a * this.e + c * this.f);
		const f = -(b * this.e + d * this.f);
		return new Matrix2D([a, b, c, d, e, f]);
	}

	get is2D() {
		return true;
	}
}

const previousDOMMatrix = (globalThis as any).DOMMatrix;
const previousDOMPoint = (globalThis as any).DOMPoint;
const previousHTMLElement = (globalThis as any).HTMLElement;

(globalThis as any).DOMMatrix = Matrix2D;
(globalThis as any).DOMPoint = class {
	x: number;
	y: number;
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}
};
(globalThis as any).HTMLElement = class {};

try {
	const parentToViewport = new Matrix2D([1, 0, 0, 1, 140, 90]);
	const fakeParent: any = {
		__proto__: (globalThis as any).HTMLElement.prototype,
		offsetWidth: 1000,
		offsetHeight: 600,
		getBoxQuads: () => [
			{
				p1: parentToViewport.transformPoint({ x: 0, y: 0 }),
				p2: parentToViewport.transformPoint({ x: 1000, y: 0 }),
				p4: parentToViewport.transformPoint({ x: 0, y: 600 })
			}
		]
	};

	// Propriétés éditées: slot-position + margin + transform + origin.
	const slotPosition = { x: 320, y: 180 };
	const margin = { left: 24, top: 12 };
	const transform = {
		x: slotPosition.x + margin.left,
		y: slotPosition.y + margin.top,
		width: 260,
		height: 120,
		rotate: 18,
		scaleX: 1.35,
		scaleY: 0.82,
		originX: 0.37,
		originY: 0.58
	};

	const frame = buildFrame(transform, fakeParent as HTMLElement);
	assert(frame !== null, "frame should be computed");

	const elementToParent = matrixFromElementTransform(transform);
	const expectedElementToViewport = parentToViewport.multiply(elementToParent as unknown as Matrix2D);

	const elementCorners = [
		expectedElementToViewport.transformPoint({ x: 0, y: 0 }),
		expectedElementToViewport.transformPoint({ x: transform.width, y: 0 }),
		expectedElementToViewport.transformPoint({ x: transform.width, y: transform.height }),
		expectedElementToViewport.transformPoint({ x: 0, y: transform.height })
	];

	const frameCorners = [
		frame!.M.transformPoint({ x: 0, y: 0 }),
		frame!.M.transformPoint({ x: frame!.w, y: 0 }),
		frame!.M.transformPoint({ x: frame!.w, y: frame!.h }),
		frame!.M.transformPoint({ x: 0, y: frame!.h })
	];

	for (let i = 0; i < 4; i += 1) {
		assertPointClose(frameCorners[i], elementCorners[i], `frame corner ${i} should match element corner`);
	}

	console.log("transform overlay alignment smoke: all checks passed");
} finally {
	(globalThis as any).DOMMatrix = previousDOMMatrix;
	(globalThis as any).DOMPoint = previousDOMPoint;
	(globalThis as any).HTMLElement = previousHTMLElement;
}
