import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { ElementTransform, Pt } from "./lib.types";
import {
	canUseDOM,
	createPointerConverters,
	getOffsetParent,
	getViewportMatrix,
	matrixFromElementTransform,
	parentDeltaToLocalDelta,
	rad2deg,
	readTransformPreserve
} from "./lib";

type Props = {
	element: HTMLElement | null;
	active?: boolean;
	onCommit: (
		t: ElementTransform,
		mode: DragMode["kind"],
		meta: { translateX: number; translateY: number }
	) => void;
	value?: ElementTransform;
	applyToElement?: boolean;
	minWidth?: number;
	minHeight?: number;
	overlayContainer?: HTMLElement | null;
	className?: string;
};

type DragMode = { kind: "move" } | { kind: "rotate" } | { kind: "resize-se" } | { kind: "cell-snap" };

type GridGeometry = {
	colStarts: number[];
	rowStarts: number[];
};

export function ItemTransformEditor({
	element,
	active = true,
	onCommit,
	value,
	applyToElement = true,
	minWidth = 8,
	minHeight = 8,
	overlayContainer,
	className
}: Props) {
	const isControlled = value != null;
	const [internal, setInternal] = useState<ElementTransform | null>(null);
	const t = (isControlled ? value! : internal) ?? null;

	const domOk = useMemo(() => canUseDOM(element), [element]);
	const ptr = useMemo(() => createPointerConverters(), []);

	const offsetParent = useMemo(() => {
		if (!element) return null;
		return getOffsetParent(element);
	}, [element]);

	const skipApplyOnceRef = useRef(false);
	const basePositionRef = useRef<{ x: number; y: number } | null>(null);
	const initRafRef = useRef<number | null>(null);

	const [_nonce, setNonce] = useState(0);
	const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
	const latestTransformRef = useRef<ElementTransform | null>(null);

	const setT = (next: ElementTransform) => {
		latestTransformRef.current = next;
		if (!isControlled) setInternal(next);
	};

	useLayoutEffect(() => {
		if (!domOk || !active || !element) return;
		const next = readTransformPreserve(element);
		basePositionRef.current = getBasePositionWithoutTranslate(element, next);
		if (!isControlled) setInternal(next);

		skipApplyOnceRef.current = true;

		if (initRafRef.current != null) {
			element.ownerDocument.defaultView?.cancelAnimationFrame(initRafRef.current);
			initRafRef.current = null;
		}

		const win = element.ownerDocument.defaultView;
		if (!win) return;

		initRafRef.current = win.requestAnimationFrame(() => {
			initRafRef.current = null;
			if (!element.isConnected) return;
			const measured = readTransformPreserve(element);
			basePositionRef.current = getBasePositionWithoutTranslate(element, measured);
			if (!isControlled) setInternal(measured);

			skipApplyOnceRef.current = true;
		});

		return () => {
			if (initRafRef.current == null) return;
			win.cancelAnimationFrame(initRafRef.current);
			initRafRef.current = null;
		};
	}, [domOk, active, element, isControlled]);

	const portalContainer = useMemo(() => {
		if (!domOk || !active || !element) return null;
		const doc = element.ownerDocument;
		return overlayContainer ?? doc?.body ?? null;
	}, [domOk, active, element, overlayContainer]);

	useEffect(() => {
		if (!domOk || !active || !element || !portalContainer) {
			setPortalHost(null);
			return;
		}

		const doc = element.ownerDocument;
		const host = doc.createElement("div");
		host.setAttribute("data-vte-grid-overlay-host", "");
		host.style.position = "absolute";
		host.style.inset = "0";
		host.style.pointerEvents = "none";
		host.style.zIndex = "9999";
		portalContainer.appendChild(host);
		setPortalHost(host);

		return () => {
			setPortalHost((current) => (current === host ? null : current));
			if (host.parentNode) host.parentNode.removeChild(host);
		};
	}, [domOk, active, element, portalContainer]);

	const frame = useMemo(() => {
		if (!domOk || !active || !element || !offsetParent || !t) return null;

		const parentToViewport = getViewportMatrix(offsetParent);
		const localToParent = matrixFromElementTransform(t);
		const localToViewport = parentToViewport.multiply(localToParent);

		return { w: t.width, h: t.height, M: localToViewport };
	}, [domOk, active, element, offsetParent, t]);

	useEffect(() => {
		if (!t) return;
		latestTransformRef.current = t;
	}, [t]);

	const dragRef = useRef<{
		mode: DragMode;
		startPointerParent: Pt;
		startT: ElementTransform;
		pivotParent?: Pt;
		startAngle?: number;
		aspect?: number;
		grid?: GridGeometry | null;
	} | null>(null);

	useEffect(() => {
		if (!domOk || !active || !element || typeof ResizeObserver === "undefined") return;
		const win = element.ownerDocument.defaultView;
		if (!win) return;

		let rafId: number | null = null;

		const syncFromDom = () => {
			if (rafId != null) return;
			rafId = win.requestAnimationFrame(() => {
				rafId = null;
				if (!element.isConnected || dragRef.current) return;
				const measured = readTransformPreserve(element);
				if (t && isCloseTransform(measured, t)) return;

				basePositionRef.current = getBasePositionWithoutTranslate(element, measured);
				skipApplyOnceRef.current = true;
				if (!isControlled) setInternal(measured);
			});
		};

		const ro = new ResizeObserver(syncFromDom);
		ro.observe(element);
		syncFromDom();

		return () => {
			ro.disconnect();
			if (rafId != null) win.cancelAnimationFrame(rafId);
		};
	}, [domOk, active, element, t, isControlled]);

	const beginDrag = (ev: { clientX: number; clientY: number }, mode: DragMode) => {
		if (!domOk || !active || !t || !element || !offsetParent) return;

		const startPointerParent = ptr.clientToLocal(offsetParent, { x: ev.clientX, y: ev.clientY });
		const startT = { ...t };
		const dragState: typeof dragRef.current = { mode, startPointerParent, startT };

		if (mode.kind === "rotate") {
			const origin = { x: startT.originX * startT.width, y: startT.originY * startT.height };
			const pivotParent = { x: startT.x + origin.x, y: startT.y + origin.y };
			dragState.pivotParent = pivotParent;
			dragState.startAngle = Math.atan2(
				startPointerParent.y - pivotParent.y,
				startPointerParent.x - pivotParent.x
			);
		}

		if (mode.kind === "resize-se") {
			dragState.aspect = startT.height === 0 ? 1 : startT.width / startT.height;
		}

		if (mode.kind === "cell-snap") {
			dragState.grid = readParentGridGeometry(offsetParent);
		}

		dragRef.current = dragState;

		const win = element.ownerDocument.defaultView;
		if (!win) return;

		const onMove = (e: PointerEvent) => {
			const current = dragRef.current;
			if (!current || !offsetParent) return;

			const curParent = ptr.clientToLocal(offsetParent, { x: e.clientX, y: e.clientY });
			const { startT } = current;

			if (current.mode.kind === "move") {
				const dx = curParent.x - current.startPointerParent.x;
				const dy = curParent.y - current.startPointerParent.y;
				setT({ ...startT, x: startT.x + dx, y: startT.y + dy });
				return;
			}

			if (current.mode.kind === "rotate") {
				const pivot = current.pivotParent!;
				const startAng = current.startAngle!;
				const ang = Math.atan2(curParent.y - pivot.y, curParent.x - pivot.x);
				const deltaDeg = rad2deg(ang - startAng);
				let rotate = startT.rotate + deltaDeg;
				if (e.shiftKey) rotate = Math.round(rotate / 15) * 15;
				setT({ ...startT, rotate });
				return;
			}

			if (current.mode.kind === "resize-se") {
				const deltaParent = {
					x: curParent.x - current.startPointerParent.x,
					y: curParent.y - current.startPointerParent.y
				};
				const deltaLocal = parentDeltaToLocalDelta(startT, deltaParent);

				let nextW = startT.width + deltaLocal.x;
				let nextH = startT.height + deltaLocal.y;

				if (!e.shiftKey) {
					const aspect = current.aspect || 1;
					const byWidth = nextW / (startT.width || 1);
					const byHeight = nextH / (startT.height || 1);
					const scale = Math.max(byWidth, byHeight);
					nextW = startT.width * scale;
					nextH = nextW / aspect;
				}

				nextW = Math.max(minWidth, nextW);
				nextH = Math.max(minHeight, nextH);
				setT({ ...startT, width: nextW, height: nextH });
				return;
			}

			if (current.mode.kind === "cell-snap") {
				const grid = current.grid;
				if (!grid) return;
				const col = nearestTrackStart(grid.colStarts, curParent.x);
				const row = nearestTrackStart(grid.rowStarts, curParent.y);
				setT({ ...startT, x: grid.colStarts[col] ?? startT.x, y: grid.rowStarts[row] ?? startT.y });
			}
		};

		const onUp = () => {
			const finalTransform = latestTransformRef.current;
			const finalMode = dragRef.current?.mode.kind;
			const base = basePositionRef.current;
			dragRef.current = null;
			win.removeEventListener("pointermove", onMove);
			win.removeEventListener("pointerup", onUp);
			win.removeEventListener("pointercancel", onUp);
			if (finalTransform && finalMode) {
				onCommit(finalTransform, finalMode, {
					translateX: finalTransform.x - (base?.x ?? 0),
					translateY: finalTransform.y - (base?.y ?? 0)
				});
			}
		};

		win.addEventListener("pointermove", onMove, { passive: false });
		win.addEventListener("pointerup", onUp, { passive: true });
		win.addEventListener("pointercancel", onUp, { passive: true });
	};

	const overlay =
		!domOk || !active || !element || !t || !portalHost || !frame ? null : (
			<VisualTransformGridOverlay
				className={className}
				frame={frame}
				onDragStart={beginDrag}
				portalContainer={portalHost}
			/>
		);

	return (
		<VisualTransformGridDomEffects
			domOk={domOk}
			active={active}
			applyToElement={applyToElement}
			element={element}
			t={t}
			offsetParent={offsetParent}
			skipApplyOnceRef={skipApplyOnceRef}
			basePositionRef={basePositionRef}
			setNonce={setNonce}
		>
			{overlay}
		</VisualTransformGridDomEffects>
	);
}

type DomEffectsProps = {
	domOk: boolean;
	active: boolean;
	applyToElement: boolean;
	element: HTMLElement | null;
	t: ElementTransform | null;
	offsetParent: HTMLElement | null;
	skipApplyOnceRef: React.MutableRefObject<boolean>;
	basePositionRef: React.MutableRefObject<{ x: number; y: number } | null>;
	setNonce: React.Dispatch<React.SetStateAction<number>>;
	children: React.ReactNode;
};

function VisualTransformGridDomEffects({
	domOk,
	active,
	applyToElement,
	element,
	t,
	offsetParent,
	skipApplyOnceRef,
	basePositionRef,
	setNonce,
	children
}: DomEffectsProps) {
	// Important: the edited target can carry strict min-size presets.
	// We neutralize them only while the editor is active so width/height drag remains predictable.
	useEffect(() => {
		if (!domOk || !active || !element) return;
		const prevMinWidth = element.style.minWidth;
		const prevMinHeight = element.style.minHeight;
		element.style.minWidth = "0px";
		element.style.minHeight = "0px";

		return () => {
			element.style.minWidth = prevMinWidth;
			element.style.minHeight = prevMinHeight;
		};
	}, [domOk, active, element]);

	// Important: apply live transform directly in px to avoid cqi runtime drift.
	useEffect(() => {
		if (!domOk || !active || !applyToElement || !element || !t) return;
		if (skipApplyOnceRef.current) {
			skipApplyOnceRef.current = false;
			return;
		}
		applyTransformLive(element, t, basePositionRef.current);
	}, [domOk, active, applyToElement, element, t, skipApplyOnceRef, basePositionRef]);

	useEffect(() => {
		if (!domOk || !active || !element) return;
		const doc = element.ownerDocument;
		const win = doc.defaultView;
		if (!win) return;

		const bump = () => setNonce((n) => n + 1);
		win.addEventListener("resize", bump, { passive: true });
		win.addEventListener("scroll", bump, { passive: true, capture: true });
		const ro = new ResizeObserver(bump);
		ro.observe(element);
		if (offsetParent) ro.observe(offsetParent);

		return () => {
			win.removeEventListener("resize", bump);
			win.removeEventListener("scroll", bump, true as any);
			ro.disconnect();
		};
	}, [domOk, active, element, offsetParent, setNonce]);

	return <>{children}</>;
}

type OverlayProps = {
	className?: string;
	frame: { w: number; h: number; M: DOMMatrix };
	onDragStart: (ev: { clientX: number; clientY: number }, mode: DragMode) => void;
	portalContainer: HTMLElement;
};

function VisualTransformGridOverlay({ className, frame, onDragStart, portalContainer }: OverlayProps) {
	const { w, h, M } = frame;

	const frameStyle: React.CSSProperties = {
		position: "fixed",
		left: 0,
		top: 0,
		width: w,
		height: h,
		transformOrigin: "0 0",
		transform: `matrix(${M.a}, ${M.b}, ${M.c}, ${M.d}, ${M.e}, ${M.f})`,
		pointerEvents: "auto",
		zIndex: 9999
	};

	const overlay = (
		<div className={className} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
			<div style={frameStyle}>
				<div
					style={{
						position: "absolute",
						inset: 0,
						outline: "1px solid rgba(37,99,235,0.95)",
						borderRadius: 4,
						boxSizing: "border-box",
						cursor: "move"
					}}
					onPointerDown={(e) => {
						if (e.button !== 0) return;
						e.preventDefault();
						e.stopPropagation();
						onDragStart(e, { kind: "move" });
					}}
				/>

				<div
					style={{
						position: "absolute",
						left: "50%",
						top: -26,
						width: 14,
						height: 14,
						transform: "translate(-50%, -50%)",
						borderRadius: 999,
						background: "rgba(37,99,235,0.95)",
						boxShadow: "0 1px 6px rgba(0,0,0,0.25)",
						cursor: "grab",
						pointerEvents: "auto"
					}}
					onPointerDown={(e) => {
						if (e.button !== 0) return;
						e.preventDefault();
						e.stopPropagation();
						onDragStart(e, { kind: "rotate" });
					}}
				/>

				<div
					style={{
						position: "absolute",
						left: "50%",
						top: -14,
						width: 2,
						height: 14,
						transform: "translate(-50%, 0)",
						background: "rgba(37,99,235,0.8)"
					}}
				/>

				<div
					style={{
						position: "absolute",
						left: -10,
						top: -10,
						width: 16,
						height: 16,
						transform: "rotate(45deg)",
						background: "white",
						outline: "1px solid rgba(37,99,235,0.95)",
						boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
						cursor: "alias",
						pointerEvents: "auto"
					}}
					onPointerDown={(e) => {
						if (e.button !== 0) return;
						e.preventDefault();
						e.stopPropagation();
						onDragStart(e, { kind: "cell-snap" });
					}}
				/>

				<div
					style={{
						position: "absolute",
						right: -10,
						bottom: -10,
						width: 16,
						height: 16,
						borderRadius: 999,
						background: "white",
						outline: "1px solid rgba(37,99,235,0.95)",
						boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
						cursor: "nwse-resize",
						pointerEvents: "auto"
					}}
					onPointerDown={(e) => {
						if (e.button !== 0) return;
						e.preventDefault();
						e.stopPropagation();
						onDragStart(e, { kind: "resize-se" });
					}}
				/>
			</div>
		</div>
	);

	return createPortal(overlay, portalContainer);
}

function isCloseTransform(a: ElementTransform, b: ElementTransform): boolean {
	return (
		Math.abs(a.width - b.width) < 0.5 &&
		Math.abs(a.height - b.height) < 0.5 &&
		Math.abs(a.x - b.x) < 0.5 &&
		Math.abs(a.y - b.y) < 0.5 &&
		Math.abs(a.rotate - b.rotate) < 0.1 &&
		Math.abs(a.scaleX - b.scaleX) < 0.01 &&
		Math.abs(a.scaleY - b.scaleY) < 0.01 &&
		Math.abs(a.originX - b.originX) < 0.001 &&
		Math.abs(a.originY - b.originY) < 0.001
	);
}

function applyTransformLive(
	el: HTMLElement,
	t: ElementTransform,
	basePosition: { x: number; y: number } | null
) {
	const s = el.style;
	s.width = `${t.width}px`;
	s.height = `${t.height}px`;
	s.transformOrigin = `${t.originX * 100}% ${t.originY * 100}%`;

	const txPx = t.x - (basePosition?.x ?? 0);
	const tyPx = t.y - (basePosition?.y ?? 0);
	s.transform = `translate(${txPx}px, ${tyPx}px) rotate(${t.rotate}deg) scale(${t.scaleX}, ${t.scaleY})`;
}

function getBasePositionWithoutTranslate(
	el: HTMLElement,
	measured: ElementTransform
): { x: number; y: number } {
	const tr = getComputedStyle(el).transform;
	if (!tr || tr === "none") return { x: measured.x, y: measured.y };
	try {
		const m = new DOMMatrixReadOnly(tr);
		return { x: measured.x - m.e, y: measured.y - m.f };
	} catch {
		return { x: measured.x, y: measured.y };
	}
}

function readParentGridGeometry(parent: HTMLElement): GridGeometry | null {
	const cs = getComputedStyle(parent);
	const cols = parseTrackSizesPx(cs.gridTemplateColumns);
	const rows = parseTrackSizesPx(cs.gridTemplateRows);
	if (!cols.length || !rows.length) return null;

	return {
		colStarts: toStarts(cols),
		rowStarts: toStarts(rows)
	};
}

function parseTrackSizesPx(trackList: string): number[] {
	if (!trackList || trackList === "none") return [];
	const out: number[] = [];
	const matches = trackList.matchAll(/(-?\d+(?:\.\d+)?)px/g);
	for (const match of matches) {
		const value = Number(match[1]);
		if (Number.isFinite(value) && value > 0) out.push(value);
	}
	return out;
}

function toStarts(tracks: number[]): number[] {
	const starts = [0];
	for (let i = 0; i < tracks.length - 1; i += 1) {
		starts.push(starts[i] + tracks[i]);
	}
	return starts;
}

function nearestTrackStart(starts: number[], value: number): number {
	if (!starts.length) return 0;
	let best = 0;
	let bestDist = Math.abs(starts[0] - value);
	for (let i = 1; i < starts.length; i += 1) {
		const dist = Math.abs(starts[i] - value);
		if (dist < bestDist) {
			best = i;
			bestDist = dist;
		}
	}
	return best;
}
