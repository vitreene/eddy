// lib.ts
import type { Affine2D, ElementTransform, Pt, ResizeHandle } from "./lib.types";

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const deg2rad = (d: number) => (d * Math.PI) / 180;
export const rad2deg = (r: number) => (r * 180) / Math.PI;

export function rotate(v: Pt, rad: number): Pt {
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function parsePx(v: string): number | null {
	const n = Number.parseFloat(v);
	return Number.isFinite(n) ? n : null;
}

export function canUseDOM(el?: Element | null): boolean {
	const doc = el ? (el as any).ownerDocument : undefined;
	return !!doc?.defaultView;
}

export function getOffsetParent(el: HTMLElement): HTMLElement | null {
	const p = el.offsetParent;
	return p instanceof HTMLElement ? p : null;
}

/** transform-origin -> px */
export function readTransformOriginPx(el: HTMLElement, w: number, h: number): { ox: number; oy: number } {
	const cs = getComputedStyle(el);
	const parts = cs.transformOrigin.split(" ").filter(Boolean);
	const oxs = parts[0] ?? "50%";
	const oys = parts[1] ?? "50%";

	const toPx = (s: string, base: number) => {
		if (s.endsWith("%")) return (parseFloat(s) / 100) * base;
		return parsePx(s) ?? base / 2;
	};

	return { ox: toPx(oxs, w), oy: toPx(oys, h) };
}

/** transform-origin -> normalisé [0..1] */
export function readTransformOriginNormalized(
	el: HTMLElement,
	w: number,
	h: number
): { originX: number; originY: number } {
	const { ox, oy } = readTransformOriginPx(el, w, h);
	return { originX: clamp(ox / w, 0, 1), originY: clamp(oy / h, 0, 1) };
}

/**
 * Matrice local(border-box) -> viewport.
 * 1) getBoxQuads() si dispo (inclut transforms parents)
 * 2) sinon reconstruction via computed transform + origin + rect (évite "bounding box only")
 */
export function getViewportMatrix(el: HTMLElement): DOMMatrix {
	const anyEl = el as any;
	const w = el.offsetWidth || 1;
	const h = el.offsetHeight || 1;

	// --- 1) voie parfaite : getBoxQuads ---
	if (typeof anyEl.getBoxQuads === "function") {
		const quads: DOMQuad[] | undefined = anyEl.getBoxQuads({ box: "border" });
		const q = quads?.[0];
		if (q) {
			const p1 = q.p1; // TL
			const p2 = q.p2; // TR
			const p4 = q.p4; // BL
			const a = (p2.x - p1.x) / w;
			const b = (p2.y - p1.y) / w;
			const c = (p4.x - p1.x) / h;
			const d = (p4.y - p1.y) / h;
			const e = p1.x;
			const f = p1.y;
			return new DOMMatrix([a, b, c, d, e, f]);
		}
	}

	// --- 2) fallback robuste : transform + origin + rect ---
	const r = el.getBoundingClientRect();
	const cs = getComputedStyle(el);
	const tr = cs.transform && cs.transform !== "none" ? cs.transform : "matrix(1,0,0,1,0,0)";

	const T = new DOMMatrixReadOnly(tr);
	const { ox, oy } = readTransformOriginPx(el, w, h);

	// M2 = translate(o) * T * translate(-o)
	// (DOMMatrix.multiply = this * other)
	const M2 = new DOMMatrix()
		.translate(ox, oy)
		.multiply(T as any)
		.translate(-ox, -oy);

	// Applique à des coins locaux -> pts "sans translation layout"
	const corners: Pt[] = [
		{ x: 0, y: 0 },
		{ x: w, y: 0 },
		{ x: w, y: h },
		{ x: 0, y: h }
	].map((p) => {
		const out = M2.transformPoint(new DOMPoint(p.x, p.y));
		return { x: out.x, y: out.y };
	});

	const minX = Math.min(...corners.map((p) => p.x));
	const minY = Math.min(...corners.map((p) => p.y));

	// Translation pour coller au rect viewport
	const tx = r.left - minX;
	const ty = r.top - minY;

	// Final = translate(tx,ty) * M2
	const M = new DOMMatrix().translate(tx, ty).multiply(M2);

	return M;
}

/** local->viewport */
export function localToViewport(el: HTMLElement, pLocal: Pt): Pt {
	const M = getViewportMatrix(el);
	const out = M.transformPoint(new DOMPoint(pLocal.x, pLocal.y));
	return { x: out.x, y: out.y };
}

/** viewport->local */
export function viewportToLocal(el: HTMLElement, pViewport: Pt): Pt {
	const M = getViewportMatrix(el);
	const inv = M.inverse();
	const out = inv.transformPoint(new DOMPoint(pViewport.x, pViewport.y));
	return { x: out.x, y: out.y };
}

export function createPointerConverters() {
	return {
		clientToLocal: (target: Element, client: Pt) =>
			viewportToLocal(target as HTMLElement, { x: client.x, y: client.y })
	};
}

/** decompose rotation+scale d'une matrice (sans skew) */
export function decomposeRotationScale(M: DOMMatrix): { rotation: number; scaleX: number; scaleY: number } {
	const scaleX = Math.hypot(M.a, M.b) || 1;
	const scaleY = Math.hypot(M.c, M.d) || 1;
	const rotation = rad2deg(Math.atan2(M.b, M.a));
	return { rotation, scaleX, scaleY };
}

export function extractCssLeftTopFromAffine(M: DOMMatrix, originLocal: Pt): { x: number; y: number } {
	const Ax = M.a * originLocal.x + M.c * originLocal.y;
	const Ay = M.b * originLocal.x + M.d * originLocal.y;
	return { x: M.e - originLocal.x + Ax, y: M.f - originLocal.y + Ay };
}

/** Lecture "préserve transform" (priorité quad, sinon style) */
export function readTransformPreserve(el: HTMLElement): ElementTransform {
	const width = el.offsetWidth || 1;
	const height = el.offsetHeight || 1;

	const { originX, originY } = readTransformOriginNormalized(el, width, height);
	const parent = getOffsetParent(el);

	// Si parent existe, on peut obtenir M el->viewport et parent->viewport même sans quads,
	// mais getViewportMatrix fallback ne compose pas les parents => on ne tente pas.
	// On fait:
	// - si getBoxQuads dispo + parent: lecture via matrices relatives (idéale)
	// - sinon: lecture style-only (au moins l'élément reste stable)
	const anyEl = el as any;
	if (typeof anyEl.getBoxQuads === "function" && parent) {
		const originLocal = { x: originX * width, y: originY * height };
		const Me = getViewportMatrix(el);
		const Mp = getViewportMatrix(parent);
		const M = Mp.inverse().multiply(Me); // el local -> parent local
		const { rotation, scaleX, scaleY } = decomposeRotationScale(M);
		const { x, y } = extractCssLeftTopFromAffine(M, originLocal);
		return { x, y, width, height, rotation, originX, originY, scaleX, scaleY };
	}

	// Fallback style-only (considère le transform initial de l’élément)
	const cs = getComputedStyle(el);
	let x = parsePx(cs.left) ?? el.offsetLeft ?? 0;
	let y = parsePx(cs.top) ?? el.offsetTop ?? 0;

	let rotation = 0;
	let scaleX = 1;
	let scaleY = 1;

	const tr = cs.transform;
	if (tr && tr !== "none") {
		try {
			const m = new DOMMatrixReadOnly(tr);

			// ✅ NEW: bake translate into left/top to avoid first-interaction jump
			x += m.e;
			y += m.f;

			rotation = rad2deg(Math.atan2(m.b, m.a));
			scaleX = Math.hypot(m.a, m.b) || 1;
			scaleY = Math.hypot(m.c, m.d) || 1;
		} catch {
			// noop
		}
	}

	return { x, y, width, height, rotation, originX, originY, scaleX, scaleY };
}

export function applyTransformPreserve(el: HTMLElement, t: ElementTransform) {
	const s = el.style;
	if (!s.position) s.position = "absolute";
	s.left = `${t.x}px`;
	s.top = `${t.y}px`;
	s.width = `${t.width}px`;
	s.height = `${t.height}px`;
	s.transformOrigin = `${t.originX * 100}% ${t.originY * 100}%`;
	s.transform = `rotate(${t.rotation}deg) scale(${t.scaleX}, ${t.scaleY})`;
}

export function handleAffects(h: ResizeHandle) {
	return { hasN: h.includes("n"), hasS: h.includes("s"), hasE: h.includes("e"), hasW: h.includes("w") };
}

export function oppositeAnchorLocal(handle: ResizeHandle, w: number, h: number): Pt {
	switch (handle) {
		case "e":
			return { x: 0, y: h / 2 };
		case "w":
			return { x: w, y: h / 2 };
		case "n":
			return { x: w / 2, y: h };
		case "s":
			return { x: w / 2, y: 0 };
		case "ne":
			return { x: 0, y: h };
		case "nw":
			return { x: w, y: h };
		case "se":
			return { x: 0, y: 0 };
		case "sw":
			return { x: w, y: 0 };
	}
}

export function parentDeltaToLocalDelta(start: ElementTransform, deltaParent: Pt): Pt {
	const rad = deg2rad(start.rotation);
	const vr = rotate(deltaParent, -rad);
	return { x: vr.x / start.scaleX, y: vr.y / start.scaleY };
}

export function localToParent(t: ElementTransform, pLocal: Pt): Pt {
	const o = { x: t.originX * t.width, y: t.originY * t.height };
	const rad = deg2rad(t.rotation);
	const v = { x: pLocal.x - o.x, y: pLocal.y - o.y };
	const vs = { x: v.x * t.scaleX, y: v.y * t.scaleY };
	const vr = rotate(vs, rad);
	return { x: t.x + o.x + vr.x, y: t.y + o.y + vr.y };
}

export function solveLeftTopForAnchor(
	anchorParent: Pt,
	anchorLocal: Pt,
	next: Omit<ElementTransform, "x" | "y">
): { x: number; y: number } {
	const o = { x: next.originX * next.width, y: next.originY * next.height };
	const rad = deg2rad(next.rotation);
	const v = { x: anchorLocal.x - o.x, y: anchorLocal.y - o.y };
	const vs = { x: v.x * next.scaleX, y: v.y * next.scaleY };
	const vr = rotate(vs, rad);
	return { x: anchorParent.x - o.x - vr.x, y: anchorParent.y - o.y - vr.y };
}

/* pivot drag fix */
export function affineFromTransform(t: ElementTransform): Affine2D {
	const rad = deg2rad(t.rotation);
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);

	const a = cos * t.scaleX;
	const b = sin * t.scaleX;
	const c = -sin * t.scaleY;
	const d = cos * t.scaleY;

	const o = { x: t.originX * t.width, y: t.originY * t.height };
	const Aox = a * o.x + c * o.y;
	const Aoy = b * o.x + d * o.y;

	const tx = t.x + o.x - Aox;
	const ty = t.y + o.y - Aoy;

	return { a, b, c, d, tx, ty };
}

function inv2x2(m: Pick<Affine2D, "a" | "b" | "c" | "d">) {
	const det = m.a * m.d - m.b * m.c || 1e-12;
	const invDet = 1 / det;
	return { a: m.d * invDet, b: -m.b * invDet, c: -m.c * invDet, d: m.a * invDet };
}

export function parentToLocalFixed(M: Affine2D, pParent: Pt): Pt {
	const invA = inv2x2(M);
	const dx = pParent.x - M.tx;
	const dy = pParent.y - M.ty;
	return { x: invA.a * dx + invA.c * dy, y: invA.b * dx + invA.d * dy };
}

export function leftTopFromFixedMatrix(M: Affine2D, originLocal: Pt): { x: number; y: number } {
	const Aox = M.a * originLocal.x + M.c * originLocal.y;
	const Aoy = M.b * originLocal.x + M.d * originLocal.y;
	return { x: M.tx - originLocal.x + Aox, y: M.ty - originLocal.y + Aoy };
}

export function matrixFromElementTransform(t: ElementTransform): DOMMatrix {
	const rad = deg2rad(t.rotation);
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);

	// A = R * S
	const a = cos * t.scaleX;
	const b = sin * t.scaleX;
	const c = -sin * t.scaleY;
	const d = cos * t.scaleY;

	// origin in local px
	const ox = t.originX * t.width;
	const oy = t.originY * t.height;

	// e,f = x + o - A*o
	const Aox = a * ox + c * oy;
	const Aoy = b * ox + d * oy;

	const e = t.x + ox - Aox;
	const f = t.y + oy - Aoy;

	return new DOMMatrix([a, b, c, d, e, f]);
}
