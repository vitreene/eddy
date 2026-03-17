import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useMachine } from "@xstate/react";

import type { ElementTransform } from "./lib.types";
import { buildFrame, transformEditorMachine, type Ev } from "./transform-editor.machine";
import {
	type DragMode,
	type DragCommitMeta,
	type SnapGridSpec,
	TransformEditorDomService
} from "./transform-editor.service";
import { positionEditorMachine } from "./position-editor.machine";
import {
	PositionEditorDomService,
	type PositionDragCommitMeta,
	type PositionDragMode,
	type PositionSnapGridSpec
} from "./position-editor.service";

function useElementRetry(element: HTMLElement | null, isActive: boolean, send: { (event: Ev): void }) {
	const retryCountRef = useRef(0);
	const maxRetries = 10;

	useEffect(() => {
		if (!element || !isActive) {
			retryCountRef.current = 0;
			return;
		}

		const checkDimensions = () => {
			if (retryCountRef.current >= maxRetries) return;

			const rect = element.getBoundingClientRect();
			if (rect.width <= 1 || rect.height <= 1) {
				retryCountRef.current++;
				const win = element.ownerDocument.defaultView;
				if (win) {
					win.requestAnimationFrame(() => {
						send({ type: "sync.retry" });
					});
				}
			} else {
				retryCountRef.current = 0;
			}
		};

		checkDimensions();
	}, [element, isActive, send]);
}

type SharedProps = {
	element: HTMLElement | null;
	active?: boolean;
	snapParentElement?: HTMLElement | null;
	snapParentId?: string | null;
	overlayContainer?: HTMLElement | null;
	className?: string;
	syncToken?: string | number | null;
};

type TransformProps = SharedProps & {
	onCommit: (t: ElementTransform, mode: DragMode["kind"], meta: DragCommitMeta) => void;
	snapGrid?: SnapGridSpec | null;
	value?: Partial<ElementTransform>;
	applyToElement?: boolean;
	minWidth?: number;
	minHeight?: number;
};

type PositionProps = SharedProps & {
	onCommit: (mode: PositionDragMode["kind"], meta: PositionDragCommitMeta) => void;
	snapGrid?: PositionSnapGridSpec | null;
};

export function ItemTransformEditorTransform(props: TransformProps) {
	const runtime = useTransformRuntime(props);
	if (!runtime) return null;
	return (
		<OverlayPortal
			className={runtime.className}
			frame={runtime.frame}
			hidden={runtime.hidden}
			portalContainer={runtime.portalContainer}
		>
			<div style={boxStyle} onPointerDown={(e) => startTransformDrag(e, runtime.dragStart, { kind: "move" })} />
			<div
				style={{ ...rotHandleStyle, left: `${runtime.t.originX * 100}%` }}
				onPointerDown={(e) => startTransformDrag(e, runtime.dragStart, { kind: "rotate" })}
			/>
			<div style={{ ...rotStemStyle, left: `${runtime.t.originX * 100}%` }} />
			<div
				style={{ ...originHandleStyle, left: `${runtime.t.originX * 100}%`, top: `${runtime.t.originY * 100}%` }}
				onPointerDown={(e) => startTransformDrag(e, runtime.dragStart, { kind: "origin" })}
			>
				<div style={originCrossH} />
				<div style={originCrossV} />
			</div>
			<DiamondHandle
				left={-10}
				top={-10}
				onPointerDown={(e) => startTransformDrag(e, runtime.dragStart, { kind: "cell-snap" })}
			/>
			<ResizeHandle onPointerDown={(e) => startTransformDrag(e, runtime.dragStart, { kind: "resize-se" })} />
		</OverlayPortal>
	);
}

export function ItemTransformEditorPosition(props: PositionProps) {
	const runtime = usePositionRuntime(props);
	if (!runtime) return null;
	return (
		<OverlayPortal
			className={runtime.className}
			frame={runtime.frame}
			hidden={runtime.hidden}
			portalContainer={runtime.portalContainer}
		>
			<div
				style={boxPositionDragStyle}
				onPointerDown={(e) => startPositionDrag(e, runtime.dragStart, { kind: "cell-snap" })}
			/>
			<DiamondHandle left="50%" top="50%" transform="translate(-50%, -50%) rotate(45deg)" />
			<ResizeHandle onPointerDown={(e) => startPositionDrag(e, runtime.dragStart, { kind: "resize-grid-se" })} />
		</OverlayPortal>
	);
}

function useTransformRuntime(props: TransformProps) {
	const service = useMemo(() => new TransformEditorDomService(), []);
	const [state, send] = useMachine(transformEditorMachine, {
		input: { service, ...props, disableLiveTransform: false, alwaysResyncOnCommit: false }
	});
	useEffect(() => {
		send({
			type: "props.sync",
			input: { service, ...props, disableLiveTransform: false, alwaysResyncOnCommit: false }
		});
	}, [send, service, props]);
	useEffect(() => () => service.dispose(), [service]);

	useElementRetry(state.context.input.element, state.context.input.active ?? true, send);

	const frame = useMemo(
		() => buildFrame(state.context.t, state.context.offsetParent),
		[state.context.t, state.context.offsetParent]
	);
	if (
		!state.context.domOk ||
		!(state.context.input.active ?? true) ||
		!state.context.input.element ||
		!state.context.t ||
		!state.context.portalHost ||
		!frame
	)
		return null;
	return {
		hidden: state.context.hideOverlayFrame,
		portalContainer: state.context.portalHost,
		frame,
		t: state.context.t,
		dragStart: (ev: { clientX: number; clientY: number }, mode: DragMode) =>
			send({ type: "drag.start", mode, clientX: ev.clientX, clientY: ev.clientY }),
		className: state.context.input.className
	};
}

function usePositionRuntime(props: PositionProps) {
	const service = useMemo(() => new PositionEditorDomService(), []);
	const [state, send] = useMachine(positionEditorMachine, {
		input: { service, ...props }
	});
	useEffect(() => {
		send({ type: "props.sync", input: { service, ...props } });
	}, [send, service, props]);
	useEffect(() => () => service.dispose(), [service]);

	if (
		!state.context.domOk ||
		!(state.context.input.active ?? true) ||
		!state.context.input.element ||
		!state.context.portalHost ||
		!state.context.frame
	)
		return null;
	return {
		hidden: state.context.hideOverlayFrame,
		portalContainer: state.context.portalHost,
		frame: state.context.frame,
		dragStart: (ev: { clientX: number; clientY: number }, mode: PositionDragMode) =>
			send({ type: "drag.start", mode, clientX: ev.clientX, clientY: ev.clientY }),
		className: state.context.input.className
	};
}

function OverlayPortal({
	className,
	frame,
	hidden,
	portalContainer,
	children
}: {
	className?: string;
	frame: { w: number; h: number; M: DOMMatrix };
	hidden: boolean;
	portalContainer: HTMLElement;
	children: React.ReactNode;
}) {
	const { w, h, M } = frame;
	const frameStyle: React.CSSProperties = {
		position: "absolute",
		left: 0,
		top: 0,
		width: w,
		height: h,
		transformOrigin: "0 0",
		transform: `matrix(${M.a}, ${M.b}, ${M.c}, ${M.d}, ${M.e}, ${M.f})`,
		pointerEvents: "auto",
		zIndex: 9999
	};
	return createPortal(
		<div className={className} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
			<div style={{ ...frameStyle, display: hidden ? "none" : "block" }}>{children}</div>
		</div>,
		portalContainer
	);
}

function DiamondHandle({
	left,
	top,
	transform,
	onPointerDown
}: {
	left: number | string;
	top: number | string;
	transform?: string;
	onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
	return (
		<div
			style={{
				...diamondStyle,
				left,
				top,
				transform: transform || "rotate(45deg)",
				pointerEvents: onPointerDown ? "auto" : "none"
			}}
			onPointerDown={onPointerDown}
		/>
	);
}

function ResizeHandle({ onPointerDown }: { onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void }) {
	return <div style={resizeStyle} onPointerDown={onPointerDown} />;
}

function startTransformDrag(
	e: React.PointerEvent<HTMLDivElement>,
	dragStart: (ev: { clientX: number; clientY: number }, mode: DragMode) => void,
	mode: DragMode
) {
	if (e.button !== 0) return;
	e.preventDefault();
	e.stopPropagation();
	dragStart(e, mode);
}

function startPositionDrag(
	e: React.PointerEvent<HTMLDivElement>,
	dragStart: (ev: { clientX: number; clientY: number }, mode: PositionDragMode) => void,
	mode: PositionDragMode
) {
	if (e.button !== 0) return;
	e.preventDefault();
	e.stopPropagation();
	dragStart(e, mode);
}

const boxStyle: React.CSSProperties = {
	position: "absolute",
	inset: 0,
	outline: "1px solid rgba(37,99,235,0.95)",
	borderRadius: 4,
	boxSizing: "border-box",
	cursor: "move"
};
const boxStaticStyle: React.CSSProperties = { ...boxStyle, cursor: "default" };
const boxPositionDragStyle: React.CSSProperties = {
	...boxStaticStyle,
	cursor: "alias",
	pointerEvents: "auto"
};
const rotHandleStyle: React.CSSProperties = {
	position: "absolute",
	top: -26,
	width: 14,
	height: 14,
	transform: "translate(-50%, -50%)",
	borderRadius: 999,
	background: "rgba(37,99,235,0.95)",
	boxShadow: "0 1px 6px rgba(0,0,0,0.25)",
	cursor: "grab",
	pointerEvents: "auto"
};
const rotStemStyle: React.CSSProperties = {
	position: "absolute",
	top: -14,
	width: 2,
	height: 14,
	transform: "translate(-50%, 0)",
	background: "rgba(37,99,235,0.8)"
};
const originHandleStyle: React.CSSProperties = {
	position: "absolute",
	width: 14,
	height: 14,
	transform: "translate(-50%, -50%)",
	borderRadius: 999,
	background: "rgba(16,185,129,0.95)",
	boxShadow: "0 1px 6px rgba(0,0,0,0.25)",
	pointerEvents: "auto",
	cursor: "move"
};
const originCrossH: React.CSSProperties = {
	position: "absolute",
	left: "50%",
	top: "50%",
	width: 8,
	height: 2,
	background: "white",
	transform: "translate(-50%, -50%)"
};
const originCrossV: React.CSSProperties = {
	position: "absolute",
	left: "50%",
	top: "50%",
	width: 2,
	height: 8,
	background: "white",
	transform: "translate(-50%, -50%)"
};
const diamondStyle: React.CSSProperties = {
	position: "absolute",
	width: 16,
	height: 16,
	background: "white",
	outline: "1px solid rgba(37,99,235,0.95)",
	boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
	cursor: "alias",
	pointerEvents: "auto"
};
const resizeStyle: React.CSSProperties = {
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
};
