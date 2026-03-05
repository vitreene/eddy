import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useMachine } from "@xstate/react";

import type { ElementTransform } from "./lib.types";
import { buildFrame, transformEditorMachine } from "./transform-editor.machine";
import {
	type DragMode,
	type DragCommitMeta,
	type SnapGridSpec,
	TransformEditorDomService
} from "./transform-editor.service";

type Props = {
	element: HTMLElement | null;
	active?: boolean;
	onCommit: (t: ElementTransform, mode: DragMode["kind"], meta: DragCommitMeta) => void;
	snapParentElement?: HTMLElement | null;
	snapParentId?: string | null;
	snapGrid?: SnapGridSpec | null;
	value?: ElementTransform;
	applyToElement?: boolean;
	minWidth?: number;
	minHeight?: number;
	overlayContainer?: HTMLElement | null;
	className?: string;
	syncToken?: string | number | null;
};

export function ItemTransformEditor(props: Props) {
	const service = useMemo(() => new TransformEditorDomService(), []);
	const [state, send] = useMachine(transformEditorMachine, {
		input: {
			service,
			...props
		}
	});

	useEffect(() => {
		send({ type: "props.sync", input: { service, ...props } });
	}, [send, service, props]);

	useEffect(() => {
		return () => service.dispose();
	}, [service]);

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

	return (
		<VisualTransformGridOverlay
			className={state.context.input.className}
			frame={frame}
			t={state.context.t}
			hidden={state.context.hideOverlayFrame}
			onDragStart={(ev, mode) => send({ type: "drag.start", mode, clientX: ev.clientX, clientY: ev.clientY })}
			portalContainer={state.context.portalHost}
		/>
	);
}

type OverlayProps = {
	className?: string;
	frame: { w: number; h: number; M: DOMMatrix };
	t: ElementTransform;
	hidden?: boolean;
	onDragStart: (ev: { clientX: number; clientY: number }, mode: DragMode) => void;
	portalContainer: HTMLElement;
};

function VisualTransformGridOverlay({
	className,
	frame,
	t,
	hidden = false,
	onDragStart,
	portalContainer
}: OverlayProps) {
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

	return createPortal(
		<div className={className} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
			<div style={{ ...frameStyle, display: hidden ? "none" : "block" }}>
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
						left: `${t.originX * 100}%`,
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
						left: `${t.originX * 100}%`,
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
						left: `${t.originX * 100}%`,
						top: `${t.originY * 100}%`,
						width: 14,
						height: 14,
						transform: "translate(-50%, -50%)",
						borderRadius: 999,
						background: "rgba(16,185,129,0.95)",
						boxShadow: "0 1px 6px rgba(0,0,0,0.25)",
						pointerEvents: "auto",
						cursor: "move"
					}}
					onPointerDown={(e) => {
						if (e.button !== 0) return;
						e.preventDefault();
						e.stopPropagation();
						onDragStart(e, { kind: "origin" });
					}}
				>
					<div
						style={{
							position: "absolute",
							left: "50%",
							top: "50%",
							width: 8,
							height: 2,
							background: "white",
							transform: "translate(-50%, -50%)"
						}}
					/>
					<div
						style={{
							position: "absolute",
							left: "50%",
							top: "50%",
							width: 2,
							height: 8,
							background: "white",
							transform: "translate(-50%, -50%)"
						}}
					/>
				</div>

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
		</div>,
		portalContainer
	);
}
