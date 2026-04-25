import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useMachine } from "@xstate/react";

import type { ElementTransform } from "./lib.types";
import {
	type TransformEditorMachineInput,
	buildFrame,
	transformEditorMachine
} from "./transform-editor.machine";
import { type DragCommitMeta, type DragMode, type SnapGridSpec } from "./transform-editor.service";

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

function useTransformRuntime(props: TransformProps) {
	const runtimeInput = toTransformMachineInput(props);
	const [state, send] = useMachine(transformEditorMachine, {
		input: runtimeInput
	});

	useEffect(() => {
		send({
			type: "props.sync",
			input: toTransformMachineInput(props)
		});
	}, [
		send,
		props.element,
		props.active,
		props.onCommit,
		props.snapParentElement,
		props.snapParentId,
		props.snapGrid,
		props.value,
		props.applyToElement,
		props.minWidth,
		props.minHeight,
		props.overlayContainer,
		props.className,
		props.syncToken
	]);

	const frame = resolveTransformOverlayFrame(
		state.context.input.element,
		buildFrame(state.context.t, state.context.offsetParent, state.context.input.element)
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

function toTransformMachineInput(props: TransformProps): TransformEditorMachineInput {
	return {
		...props,
		disableLiveTransform: false,
		alwaysResyncOnCommit: false
	};
}

function resolveTransformOverlayFrame(
	element: HTMLElement | null,
	rawFrame: { w: number; h: number; M: DOMMatrix } | null
): { w: number; h: number; M: DOMMatrix } | null {
	const rect = readElementRect(element);
	if (!rect) return rawFrame;

	const rectFrame = {
		w: Math.max(1, rect.width),
		h: Math.max(1, rect.height),
		M: new DOMMatrix([1, 0, 0, 1, rect.left, rect.top])
	};

	if (!rawFrame) return rectFrame;

	const isAxisAligned = Math.abs(rawFrame.M.b) < 0.0001 && Math.abs(rawFrame.M.c) < 0.0001;
	if (!isAxisAligned) return rawFrame;

	const dx = Math.abs(rawFrame.M.e - rect.left);
	const dy = Math.abs(rawFrame.M.f - rect.top);
	if (dx > 1 || dy > 1) return rectFrame;

	return rawFrame;
}

function readElementRect(
	element: HTMLElement | null
): { left: number; top: number; width: number; height: number } | null {
	if (!element) return null;
	const rect = element.getBoundingClientRect();
	return {
		left: Number(rect.left.toFixed(2)),
		top: Number(rect.top.toFixed(2)),
		width: Number(rect.width.toFixed(2)),
		height: Number(rect.height.toFixed(2))
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

const boxStyle: React.CSSProperties = {
	position: "absolute",
	inset: 0,
	outline: "1px solid rgba(37,99,235,0.95)",
	borderRadius: 4,
	boxSizing: "border-box",
	cursor: "move"
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
