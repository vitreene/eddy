import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { ElementTransform, ResizeHandle, Pt, Affine2D } from "./lib.types";
import {
	affineFromTransform,
	applyTransformPreserve,
	matrixFromElementTransform,
	canUseDOM,
	clamp,
	createPointerConverters,
	getOffsetParent,
	getViewportMatrix,
	handleAffects,
	leftTopFromFixedMatrix,
	localToParent,
	oppositeAnchorLocal,
	parentDeltaToLocalDelta,
	parentToLocalFixed,
	rad2deg,
	readTransformPreserve,
	solveLeftTopForAnchor
} from "./lib";

type Props = {
	element: HTMLElement | null;
	active?: boolean;
	onChange: (t: ElementTransform) => void;
	value?: ElementTransform;
	applyToElement?: boolean;
	minWidth?: number;
	minHeight?: number;
	overlayContainer?: HTMLElement | null;
	className?: string;
};

type DragMode =
	| { kind: "resize"; handle: ResizeHandle }
	| { kind: "rotate" }
	| { kind: "origin" }
	| { kind: "move" };

// Canonical overlay handle map: id + local position + cursor.
const RESIZE_HANDLES: Array<[ResizeHandle, number, number, string]> = [
	["nw", 0, 0, "nwse-resize"],
	["n", 50, 0, "ns-resize"],
	["ne", 100, 0, "nesw-resize"],
	["e", 100, 50, "ew-resize"],
	["se", 100, 100, "nwse-resize"],
	["s", 50, 100, "ns-resize"],
	["sw", 0, 100, "nesw-resize"],
	["w", 0, 50, "ew-resize"]
];

export function VisualTransformEditor({
	element,
	active = true,
	onChange,
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

	// True when we can safely read/write DOM geometry.
	const domOk = useMemo(() => canUseDOM(element), [element]);
	// Stable coordinate converters used during pointer interactions.
	const ptr = useMemo(() => createPointerConverters(), []);

	// Layout reference used to project local coordinates into the parent space.
	const offsetParent = element ? getOffsetParent(element) : null;

	// Prevents re-applying transform right after initial DOM read.
	const skipApplyOnceRef = useRef(false);
	const basePositionRef = useRef<{ x: number; y: number } | null>(null);
	const initRafRef = useRef<number | null>(null);

	const setT = (next: ElementTransform) => {
		if (!isControlled) setInternal(next);
		onChange(next);
	};

	useLayoutEffect(() => {
		if (!domOk || !active || !element) return;
		const next = readTransformPreserve(element);
		basePositionRef.current = { x: next.x, y: next.y };
		if (!isControlled) setInternal(next);
		onChange(next);
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
			basePositionRef.current = { x: measured.x, y: measured.y };
			if (!isControlled) setInternal(measured);
			onChange(measured);
			skipApplyOnceRef.current = true;
		});

		return () => {
			if (initRafRef.current == null) return;
			win.cancelAnimationFrame(initRafRef.current);
			initRafRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [domOk, active, element]);

	// force re-measure for overlay matrix
	// Incremented to force recomputing overlay matrix on viewport/layout changes.
	const [nonce, setNonce] = useState(0);
	const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

	// Target portal root where the editing overlay is rendered.
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
		host.setAttribute("data-vte-overlay-host", "");
		host.style.position = "absolute";
		host.style.inset = "0";
		host.style.pointerEvents = "none";
		host.style.zIndex = "9999";
		portalContainer.appendChild(host);
		setPortalHost(host);

		return () => {
			setPortalHost((current) => (current === host ? null : current));
			if (host.parentNode) {
				host.parentNode.removeChild(host);
			}
		};
	}, [domOk, active, element, portalContainer]);

	// Frame matrix (local->viewport)
	// Derived visual frame in viewport coordinates for handles and outlines.
	const frame = useMemo(() => {
		if (!domOk || !active || !element || !offsetParent || !t) return null;

		// parent local -> viewport (inclut transforms parent si getBoxQuads dispo)
		const Mp = getViewportMatrix(offsetParent);

		// element local -> parent local (depuis l'état, donc tourne immédiatement)
		const Ml = matrixFromElementTransform(t);

		// element local -> viewport
		const M = Mp.multiply(Ml);

		return { w: t.width, h: t.height, M };
	}, [domOk, active, element, offsetParent, t, nonce]);

	// Mutable drag session state shared by pointermove/pointerup listeners.
	const dragRef = useRef<{
		mode: DragMode;
		startPointerParent: Pt;
		startT: ElementTransform;
		anchorParent?: Pt;
		pivotParent?: Pt;
		startAngle?: number;
		startXY?: { x: number; y: number };
		fixedM?: Affine2D;
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
				if (
					t &&
					Math.abs(measured.width - t.width) < 0.5 &&
					Math.abs(measured.height - t.height) < 0.5 &&
					Math.abs(measured.x - t.x) < 0.5 &&
					Math.abs(measured.y - t.y) < 0.5 &&
					Math.abs(measured.rotate - t.rotate) < 0.1 &&
					Math.abs(measured.scaleX - t.scaleX) < 0.01 &&
					Math.abs(measured.scaleY - t.scaleY) < 0.01 &&
					Math.abs(measured.originX - t.originX) < 0.001 &&
					Math.abs(measured.originY - t.originY) < 0.001
				) {
					return;
				}

				basePositionRef.current = { x: measured.x, y: measured.y };
				skipApplyOnceRef.current = true;
				if (!isControlled) setInternal(measured);
				onChange(measured);
			});
		};

		const ro = new ResizeObserver(syncFromDom);
		ro.observe(element);
		syncFromDom();

		return () => {
			ro.disconnect();
			if (rafId != null) {
				win.cancelAnimationFrame(rafId);
				rafId = null;
			}
		};
	}, [domOk, active, element, t, isControlled, onChange]);

	const beginDrag = (ev: { clientX: number; clientY: number }, mode: DragMode) => {
		if (!domOk || !active || !t || !element || !offsetParent) return;

		const startPointerParent = ptr.clientToLocal(offsetParent, { x: ev.clientX, y: ev.clientY });
		const startT = { ...t };

		const d: typeof dragRef.current = { mode, startPointerParent, startT };

		if (mode.kind === "resize") {
			const aLocal = oppositeAnchorLocal(mode.handle, startT.width, startT.height);
			d.anchorParent = localToParent(startT, aLocal);
		}
		if (mode.kind === "rotate") {
			const o = { x: startT.originX * startT.width, y: startT.originY * startT.height };
			const pivotParent = { x: startT.x + o.x, y: startT.y + o.y };
			d.pivotParent = pivotParent;
			d.startAngle = Math.atan2(startPointerParent.y - pivotParent.y, startPointerParent.x - pivotParent.x);
		}
		if (mode.kind === "move") d.startXY = { x: startT.x, y: startT.y };
		if (mode.kind === "origin") d.fixedM = affineFromTransform(startT);

		dragRef.current = d;

		const win = element.ownerDocument?.defaultView;
		if (!win) return;

		const onMove = (e: PointerEvent) => {
			const cur = dragRef.current;
			if (!cur || !offsetParent) return;

			const curParent = ptr.clientToLocal(offsetParent, { x: e.clientX, y: e.clientY });
			const { startT } = cur;

			if (cur.mode.kind === "move") {
				const dx = curParent.x - cur.startPointerParent.x;
				const dy = curParent.y - cur.startPointerParent.y;
				setT({ ...startT, x: cur.startXY!.x + dx, y: cur.startXY!.y + dy });
			}

			if (cur.mode.kind === "resize") {
				const { handle } = cur.mode;
				const { hasN, hasS, hasE, hasW } = handleAffects(handle);

				const deltaParent = {
					x: curParent.x - cur.startPointerParent.x,
					y: curParent.y - cur.startPointerParent.y
				};
				const dl = parentDeltaToLocalDelta(startT, deltaParent);

				let nextW = startT.width + (hasE ? dl.x : 0) + (hasW ? -dl.x : 0);
				let nextH = startT.height + (hasS ? dl.y : 0) + (hasN ? -dl.y : 0);

				nextW = Math.max(minWidth, nextW);
				nextH = Math.max(minHeight, nextH);

				const anchorLocal = oppositeAnchorLocal(handle, nextW, nextH);
				const anchorParent = cur.anchorParent!;

				const { x, y } = solveLeftTopForAnchor(anchorParent, anchorLocal, {
					width: nextW,
					height: nextH,
					rotate: startT.rotate,
					scaleX: startT.scaleX,
					scaleY: startT.scaleY,
					originX: startT.originX,
					originY: startT.originY
				});

				setT({ ...startT, x, y, width: nextW, height: nextH });
			}

			if (cur.mode.kind === "rotate") {
				const pivot = cur.pivotParent!;
				const startAng = cur.startAngle!;
				const ang = Math.atan2(curParent.y - pivot.y, curParent.x - pivot.x);
				const delta = ang - startAng;
				setT({ ...startT, rotate: startT.rotate + rad2deg(delta) });
			}

			if (cur.mode.kind === "origin") {
				const M = cur.fixedM!;
				const pLocal = parentToLocalFixed(M, curParent);

				const nextOriginX = clamp(pLocal.x / startT.width, 0, 1);
				const nextOriginY = clamp(pLocal.y / startT.height, 0, 1);

				const o = { x: nextOriginX * startT.width, y: nextOriginY * startT.height };
				const { x, y } = leftTopFromFixedMatrix(M, o);

				setT({ ...startT, x, y, originX: nextOriginX, originY: nextOriginY });
			}
		};

		const onUp = () => {
			dragRef.current = null;
			win.removeEventListener("pointermove", onMove);
			win.removeEventListener("pointerup", onUp);
			win.removeEventListener("pointercancel", onUp);
		};

		win.addEventListener("pointermove", onMove, { passive: false });
		win.addEventListener("pointerup", onUp, { passive: true });
		win.addEventListener("pointercancel", onUp, { passive: true });
	};

	const overlay =
		!domOk || !active || !element || !t || !portalHost || !frame ? null : (
			<VisualTransformOverlay
				className={className}
				frame={frame}
				t={t}
				portalContainer={portalHost}
				onDragStart={beginDrag}
			/>
		);

	return (
		<VisualTransformEditorDomEffects
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
		</VisualTransformEditorDomEffects>
	);
}

type VisualTransformEditorDomEffectsProps = {
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

function VisualTransformEditorDomEffects({
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
}: VisualTransformEditorDomEffectsProps) {
	// Applies the latest transform to the target element after drag/state updates.
	useEffect(() => {
		if (!domOk || !active || !applyToElement || !element || !t) return;
		if (skipApplyOnceRef.current) {
			skipApplyOnceRef.current = false;
			return;
		}
		applyTransformPreserve(element, t, basePositionRef.current);
	}, [domOk, active, applyToElement, element, t, skipApplyOnceRef, basePositionRef]);

	// Invalidates overlay frame when viewport or observed boxes change.
	useEffect(() => {
		if (!domOk || !active || !element) return;
		const doc = element.ownerDocument;
		const win = doc?.defaultView;
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
	t: ElementTransform;
	portalContainer: HTMLElement;
	onDragStart: (ev: { clientX: number; clientY: number }, mode: DragMode) => void;
};

function VisualTransformOverlay({ className, frame, t, portalContainer, onDragStart }: OverlayProps) {
	const { w, h, M } = frame;

	// Overlay placement style derived from local->viewport affine matrix.
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

	// Shared visual style for resize handles.
	const handleBase: React.CSSProperties = {
		position: "absolute",
		width: 10,
		height: 10,
		transform: "translate(-50%, -50%)",
		borderRadius: 2,
		background: "white",
		outline: "1px solid rgba(59,130,246,0.95)",
		boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
		pointerEvents: "auto"
	};

	const overlay = (
		<div className={className} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
			<div
				style={frameStyle}
				onPointerDown={(e) => {
					if (e.button !== 0) return;
					e.preventDefault();
					e.stopPropagation();
					onDragStart(e, { kind: "move" });
				}}
			>
				<div
					style={{
						position: "absolute",
						inset: 0,
						outline: "1px solid rgba(59,130,246,0.9)",
						borderRadius: 4,
						boxSizing: "border-box"
					}}
				/>

				<div
					style={{
						position: "absolute",
						left: "50%",
						top: -28,
						width: 14,
						height: 14,
						transform: "translate(-50%, -50%)",
						borderRadius: 999,
						background: "rgba(59,130,246,0.95)",
						boxShadow: "0 1px 6px rgba(0,0,0,0.25)",
						pointerEvents: "auto",
						cursor: "grab"
					}}
					onPointerDown={(e) => {
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
						background: "rgba(59,130,246,0.8)"
					}}
				/>

				<div
					style={{
						position: "absolute",
						left: `${t.originX * 100}%`,
						top: `${t.originY * 100}%`,
						width: 12,
						height: 12,
						transform: "translate(-50%, -50%)",
						borderRadius: 999,
						background: "rgba(16,185,129,0.95)",
						boxShadow: "0 1px 6px rgba(0,0,0,0.25)",
						pointerEvents: "auto",
						cursor: "move"
					}}
					onPointerDown={(e) => {
						e.preventDefault();
						e.stopPropagation();
						onDragStart(e, { kind: "origin" });
					}}
				/>

				{RESIZE_HANDLES.map(([id, lx, ly, cursor]) => (
					<div
						key={id}
						style={{ ...handleBase, left: `${lx}%`, top: `${ly}%`, cursor }}
						onPointerDown={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onDragStart(e, { kind: "resize", handle: id });
						}}
					/>
				))}
			</div>
		</div>
	);

	return createPortal(overlay, portalContainer);
}
