/**
 * DEMO (corrigée) :
 * - Tu peux sélectionner DIRECTEMENT le Pin sur lequel tu cliques (noir = parent, vert = enfant)
 * - Pin enfant: ne déplace que ses dépendants (B)
 * - Pin parent: déplace tout (A + BG + déplace le Pin enfant => donc B suit aussi)
 *
 * Technique:
 * - "Aimant relatif" = on applique le delta (dx,dy) entre position actuelle du pin et position du pin au moment de l'accrochage.
 * - Background: on capture une base IMMUTABLE au moment du addBackground (sinon calc(...) s'empile).
 * - Pin enfant relatif: quand tu drag l'enfant, on "re-basile" l'attache parent->enfant pour que le parent continue de l'embarquer
 *   depuis cette nouvelle position.
 */

type Percent = number;

type PinPoint = { kind: "percent"; x: Percent; y: Percent } | { kind: "px"; x: number; y: number };

type BgMode = "px" | "percent";

type ElementAttachment = {
	kind: "element";
	el: HTMLElement;
	attachedPinPct: { x: number; y: number };
	offsetPx: { x: number; y: number };
};

type BackgroundAttachment = {
	kind: "background";
	el: HTMLElement;
	layer: number;
	mode: BgMode;
	attachedPinPct: { x: number; y: number };
	basePositions: { x: string; y: string }[]; // base immuable
};

export type PinAttachment = {
	kind: "pin";
	child: PinRelativeRuntime;
	parentAttachedPct: { x: number; y: number };
	childBasePct: { x: number; y: number };
};

type Attachment = ElementAttachment | BackgroundAttachment | PinAttachment;

function getRect(el: Element) {
	return (el as HTMLElement).getBoundingClientRect();
}

function resolvePinPx(container: HTMLElement, point: PinPoint) {
	const r = getRect(container);
	if (point.kind === "percent") return { x: (point.x / 100) * r.width, y: (point.y / 100) * r.height };
	return { x: point.x, y: point.y };
}

function pinPctToPx(container: HTMLElement, pct: { x: number; y: number }) {
	return resolvePinPx(container, { kind: "percent", x: pct.x, y: pct.y });
}

function ensurePinTransformPipeline(el: HTMLElement) {
	const hasPipeline =
		el.style.transform.includes("var(--pin-tx") ||
		el.style.transform.includes("--pin-base-transform") ||
		el.style.transform.includes("var(--pin-base-transform");

	if (!hasPipeline) {
		el.style.transform = `translate3d(var(--pin-tx, 0px), var(--pin-ty, 0px), 0) var(--pin-base-transform, )`;
	}
}

function captureBaseTransform(el: HTMLElement) {
	const cs = window.getComputedStyle(el);
	const t = cs.transform === "none" ? "" : cs.transform;
	el.style.setProperty("--pin-base-transform", t);
}

function readBackgroundPositions(cs: CSSStyleDeclaration) {
	const raw = cs.backgroundPosition || "0% 0%";
	return raw.split(",").map((part) => {
		const p = part.trim().split(/\s+/);
		return { x: p[0] ?? "0%", y: p[1] ?? "0%" };
	});
}

function writeBackgroundPositions(el: HTMLElement, positions: { x: string; y: string }[]) {
	el.style.backgroundPosition = positions.map((p) => `${p.x} ${p.y}`).join(", ");
}

export function clamp01(n: number) {
	return Math.max(0, Math.min(100, n));
}
/** Pin runtime: AIMANT RELATIF (éléments + background) + Pin enfant relatif */
export class PinRelativeRuntime {
	container: HTMLElement;
	xPct: number;
	yPct: number;
	attachments: Attachment[] = [];

	constructor(container: HTMLElement, initial: PinPoint) {
		this.container = container;
		const r = getRect(container);
		const px = resolvePinPx(container, initial);
		this.xPct = r.width ? (px.x / r.width) * 100 : 0;
		this.yPct = r.height ? (px.y / r.height) * 100 : 0;
	}

	get pinPct() {
		return { x: this.xPct, y: this.yPct };
	}

	get pinPx() {
		return resolvePinPx(this.container, { kind: "percent", x: this.xPct, y: this.yPct });
	}

	move(point: PinPoint, opts: { clampToBounds?: boolean } = {}) {
		const r = getRect(this.container);
		const px = resolvePinPx(this.container, point);
		const xPct = r.width ? (px.x / r.width) * 100 : 0;
		const yPct = r.height ? (px.y / r.height) * 100 : 0;
		this.xPct = opts.clampToBounds ? clamp01(xPct) : xPct;
		this.yPct = opts.clampToBounds ? clamp01(yPct) : yPct;
		this.apply();
	}

	addElement(el: HTMLElement, opts: { offsetPx?: { x?: number; y?: number } } = {}) {
		ensurePinTransformPipeline(el);
		captureBaseTransform(el);

		this.attachments.push({
			kind: "element",
			el,
			attachedPinPct: { ...this.pinPct },
			offsetPx: { x: opts.offsetPx?.x ?? 0, y: opts.offsetPx?.y ?? 0 }
		});

		this.apply();
	}

	addBackground(el: HTMLElement, opts: { layer?: number; mode?: BgMode } = {}) {
		const cs = window.getComputedStyle(el);
		const basePositions = readBackgroundPositions(cs); // ✅ immuable

		this.attachments.push({
			kind: "background",
			el,
			layer: opts.layer ?? 0,
			mode: opts.mode ?? "px",
			attachedPinPct: { ...this.pinPct },
			basePositions
		});

		this.apply();
	}

	/** accroche un pin enfant (relatif) — retourne l'attache (réutilisée pour "rebasing") */
	addPin(child: PinRelativeRuntime): PinAttachment {
		if (child.container !== this.container) {
			throw new Error("addPin(relative): parent et enfant doivent partager le même conteneur.");
		}
		const att: PinAttachment = {
			kind: "pin",
			child,
			parentAttachedPct: { ...this.pinPct },
			childBasePct: { ...child.pinPct }
		};
		this.attachments.push(att);
		this.apply();
		return att;
	}

	/** re-basile l'attache parent->enfant (utile quand on déplace l'enfant à la main) */
	rebaseChild(att: PinAttachment) {
		att.parentAttachedPct = { ...this.pinPct };
		att.childBasePct = { ...att.child.pinPct };
	}

	apply() {
		const pinNow = this.pinPx;

		for (const att of this.attachments) {
			// ----- Pin enfant relatif -----
			if (att.kind === "pin") {
				const parentAtAttachPx = pinPctToPx(this.container, att.parentAttachedPct);
				const dx = pinNow.x - parentAtAttachPx.x;
				const dy = pinNow.y - parentAtAttachPx.y;

				const childBasePx = pinPctToPx(this.container, att.childBasePct);
				const childNowPx = { x: childBasePx.x + dx, y: childBasePx.y + dy };

				const cr = getRect(this.container);
				const xPct = cr.width ? (childNowPx.x / cr.width) * 100 : 0;
				const yPct = cr.height ? (childNowPx.y / cr.height) * 100 : 0;

				att.child.move({ kind: "percent", x: xPct, y: yPct }, { clampToBounds: true });
				continue;
			}

			// delta relatif de CE pin vs l'instant d'accrochage
			const pinAtAttachPx = pinPctToPx(this.container, att.attachedPinPct);
			const dx = pinNow.x - pinAtAttachPx.x;
			const dy = pinNow.y - pinAtAttachPx.y;

			// ----- Element -----
			if (att.kind === "element") {
				att.el.style.setProperty("--pin-tx", `${dx + att.offsetPx.x}px`);
				att.el.style.setProperty("--pin-ty", `${dy + att.offsetPx.y}px`);
				continue;
			}

			// ----- Background (base immuable) -----
			if (att.kind === "background") {
				const positions = att.basePositions.map((p) => ({ ...p }));
				const layer = Math.max(0, Math.min(positions.length - 1, att.layer));
				const base = positions[layer];

				if (att.mode === "px") {
					positions[layer] = { x: `calc(${base.x} + ${dx}px)`, y: `calc(${base.y} + ${dy}px)` };
				} else {
					const cr = getRect(this.container);
					const dxp = cr.width ? (dx / cr.width) * 100 : 0;
					const dyp = cr.height ? (dy / cr.height) * 100 : 0;
					positions[layer] = { x: `calc(${base.x} + ${dxp}%)`, y: `calc(${base.y} + ${dyp}%)` };
				}

				writeBackgroundPositions(att.el, positions);
				continue;
			}
		}
	}
}
