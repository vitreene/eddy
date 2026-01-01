/**
 * Calcule la transform à appliquer après reparenting pour garder la même pose écran.
 *
 * IMPORTANT: appeler AVANT de déplacer le node dans le DOM.
 *
 * Hypothèse: 2D affine (matrix / matrix3d sans perspective significative).
 */

/* 

// 1) AVANT move
const { cssTransform } = computeReparentMatrix2D(moveEl, parentA, "padding");

// 2) DOM move
parentA.appendChild(moveEl);

// 3) Apply
moveEl.style.position = "absolute";
moveEl.style.left = "0px";
moveEl.style.top = "0px";
moveEl.style.transformOrigin = "0 0";
moveEl.style.transform = cssTransform;
*/

// LIB

export type Pt = { x: number; y: number };

export type Reparent2DResult = {
	localToNewParent: DOMMatrix; // element(border local) -> newParent(padding local)
	cssTransform: string; // matrix(a,b,c,d,e,f)
};

export type BoxRef = "border" | "padding";

function parsePx(v: string): number {
	const n = Number.parseFloat(v);
	return Number.isFinite(n) ? n : 0;
}

function parseOriginPx(transformOrigin: string, w: number, h: number): { ox: number; oy: number } {
	const parts = transformOrigin.split(" ").filter(Boolean);
	const oxs = parts[0] ?? "50%";
	const oys = parts[1] ?? "50%";

	const toPx = (s: string, base: number) => {
		if (s.endsWith("%")) return (parseFloat(s) / 100) * base;
		const n = Number.parseFloat(s);
		return Number.isFinite(n) ? n : base / 2;
	};

	return { ox: toPx(oxs, w), oy: toPx(oys, h) };
}

function cssTransformToMatrix2D(transform: string): DOMMatrix {
	if (!transform || transform === "none") return new DOMMatrix();
	const m = new DOMMatrixReadOnly(transform);

	// Refus explicite si non-2D (3D/perspective)
	// DOMMatrixReadOnly a is2D dans les navigateurs modernes
	if ((m as any).is2D === false) {
		throw new Error("3D transform detected (matrix3d/perspective). Use 2D only for this polyfill.");
	}

	return new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]);
}

function getBorderBoxToOffsetParentPaddingMatrix(el: HTMLElement): DOMMatrix {
	const cs = getComputedStyle(el);
	const w = el.offsetWidth || 1;
	const h = el.offsetHeight || 1;

	const { ox, oy } = parseOriginPx(cs.transformOrigin, w, h);
	const T = cssTransformToMatrix2D(cs.transform);

	// translation layout (offsetLeft/Top) : repère = padding edge de offsetParent
	const tx = el.offsetLeft;
	const ty = el.offsetTop;

	// M = translate(layout) * translate(o) * T * translate(-o)
	return new DOMMatrix().translate(tx, ty).translate(ox, oy).multiply(T).translate(-ox, -oy);
}

/**
 * Polyfill matrice box(border/padding) -> viewport.
 * - compose via offsetParent chain
 * - recale translation finale via getBoundingClientRect()
 */
export function getViewportMatrixPolyfill(el: HTMLElement, box: BoxRef = "border"): DOMMatrix {
	// 1) compose local(border) -> “root space” via offsetParent chain
	let M = new DOMMatrix();
	let node: HTMLElement | null = el;

	while (node) {
		const local = getBorderBoxToOffsetParentPaddingMatrix(node);
		M = local.multiply(M);

		const parent = node.offsetParent as HTMLElement | null;
		if (!parent) break;

		// scroll de l'offsetParent (contenu)
		// (on l’applique ici ; la translation finale sera recalée de toute façon)
		M = new DOMMatrix().translate(-parent.scrollLeft, -parent.scrollTop).multiply(M);

		node = parent;
	}

	// 2) si on veut le repère "padding" du même element, on translate de borderLeft/Top
	if (box === "padding") {
		const cs = getComputedStyle(el);
		const bl = parsePx(cs.borderLeftWidth);
		const bt = parsePx(cs.borderTopWidth);
		M = M.multiply(new DOMMatrix().translate(bl, bt));
	}

	// 3) recale translation finale avec le bounding rect (axis aligned)
	//    en alignant le minX/minY des coins transformés sur rect.left/top
	const rect = el.getBoundingClientRect();
	const w = el.offsetWidth || 1;
	const h = el.offsetHeight || 1;

	// coins du border-box local
	const pts: Pt[] = [
		{ x: 0, y: 0 },
		{ x: w, y: 0 },
		{ x: w, y: h },
		{ x: 0, y: h }
	];

	const out = pts.map((p) => {
		const q = M.transformPoint(new DOMPoint(p.x, p.y));
		return { x: q.x, y: q.y };
	});

	const minX = Math.min(...out.map((p) => p.x));
	const minY = Math.min(...out.map((p) => p.y));

	const dx = rect.left - minX;
	const dy = rect.top - minY;

	M = new DOMMatrix().translate(dx, dy).multiply(M);

	return M;
}

export function toCssMatrix2D(m: DOMMatrix): string {
	// force matrix(a,b,c,d,e,f)
	return `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.e}, ${m.f})`;
}

/**
 * Re-parenting 2D (matrix-only).
 *
 * Appeler AVANT de déplacer l’élément dans le DOM.
 *
 * Résultat: matrice element(border local) -> newParent(padding local)
 * À appliquer en:
 *   left/top=0, transformOrigin=0 0, transform=cssTransform
 */
export function computeReparentMatrix2D(element: HTMLElement, newParent: HTMLElement): Reparent2DResult {
	// monde actuel de l’élément (border -> viewport)
	const M_elem = getViewportMatrixPolyfill(element, "border");

	// monde du nouveau parent (padding -> viewport)
	const M_parentPadding = getViewportMatrixPolyfill(newParent, "padding");

	// element(border) -> newParent(padding)
	const localToNewParent = M_parentPadding.inverse().multiply(M_elem);

	return {
		localToNewParent,
		cssTransform: toCssMatrix2D(localToNewParent)
	};
}
