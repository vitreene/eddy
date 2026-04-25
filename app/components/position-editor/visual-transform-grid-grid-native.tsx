import { createPortal } from "react-dom";
import { useMachine } from "@xstate/react";

import { type PositionEditorMachineInput, positionEditorMachine } from "./position-editor.machine";
import {
	type PositionDragCommitMeta,
	type PositionDragMode,
	type PositionSnapGridSpec
} from "./position-editor.service";

type PositionProps = {
	element: HTMLElement | null;
	active?: boolean;
	snapParentElement?: HTMLElement | null;
	snapParentId?: string | null;
	overlayContainer?: HTMLElement | null;
	className?: string;
	syncToken?: string | number | null;
	onCommit: (mode: PositionDragMode["kind"], meta: PositionDragCommitMeta) => void;
	snapGrid?: PositionSnapGridSpec | null;
};

type PositionGridPlacement = {
	row: number;
	col: number;
	rowSpan: number;
	colSpan: number;
};

type PositionGridOverlay = {
	parentRect: { left: number; top: number; width: number; height: number };
	gridTemplateColumns: string;
	gridTemplateRows: string;
	columnGap: string;
	rowGap: string;
	placement: PositionGridPlacement;
};

export function ItemTransformEditorPositionGridNative(props: PositionProps) {
	const [state, send] = useMachine(positionEditorMachine, {
		input: toPositionMachineInput(props)
	});

	if (
		!state.context.domOk ||
		!(state.context.input.active ?? true) ||
		!state.context.input.element ||
		!state.context.portalHost
	)
		return null;

	const overlay = resolvePositionGridOverlay(state.context.input, state.context.previewPlacement);
	if (!overlay) return null;

	return (
		<GridOverlayPortal
			className={state.context.input.className}
			overlay={overlay}
			hidden={state.context.hideOverlayFrame}
			portalContainer={state.context.portalHost}
		>
			<div style={boxPositionFrameStyle} />
			<DiamondHandle
				left={-10}
				top={-10}
				onPointerDown={(e) => startPositionDrag(e, send, { kind: "cell-snap" })}
			/>
			<ResizeHandle
				onPointerDown={(e) => startPositionDrag(e, send, { kind: "resize-grid-se" })}
			/>
		</GridOverlayPortal>
	);
}

function toPositionMachineInput(props: PositionProps): PositionEditorMachineInput {
	return { ...props };
}

function resolvePositionGridOverlay(
	input: PositionEditorMachineInput,
	previewPlacement: { row: number; col: number; rowSpan: number; colSpan: number } | null
): PositionGridOverlay | null {
	const element = input.element;
	if (!element) return null;
	const parent = resolveOverlayGridParent(element, input);
	if (!parent) return null;

	const parentRect = readElementRect(parent);
	if (!parentRect || parentRect.width <= 0 || parentRect.height <= 0) return null;

	const parentStyle = getComputedStyle(parent);
	const placement = previewPlacement ?? readPositionGridPlacement(element);
	if (!placement) return null;
	const snapGridLayout = buildOverlayGridLayoutFromSnapGrid(input.snapGrid);

	return {
		parentRect,
		gridTemplateColumns: snapGridLayout?.columns ?? resolveGridTemplateColumns(parentStyle, input.snapGrid),
		gridTemplateRows: snapGridLayout?.rows ?? resolveGridTemplateRows(parentStyle, input.snapGrid),
		columnGap: snapGridLayout?.columnGap ?? normalizeGapValue(parentStyle.columnGap),
		rowGap: snapGridLayout?.rowGap ?? normalizeGapValue(parentStyle.rowGap),
		placement
	};
}

function buildOverlayGridLayoutFromSnapGrid(
	snapGrid?: PositionSnapGridSpec | null
): { columns: string; rows: string; columnGap: string; rowGap: string } | null {
	if (!snapGrid) return null;
	if (snapGrid.kind === "grid") {
		return {
			columns: `repeat(${Math.max(1, snapGrid.cols)}, minmax(0, 1fr))`,
			rows: `repeat(${Math.max(1, snapGrid.rows)}, minmax(0, 1fr))`,
			columnGap: "0px",
			rowGap: "0px"
		};
	}
	if (snapGrid.orientation === "horizontal") {
		return {
			columns: `repeat(${Math.max(1, snapGrid.cells)}, minmax(0, 1fr))`,
			rows: "repeat(1, minmax(0, 1fr))",
			columnGap: "0px",
			rowGap: "0px"
		};
	}
	return {
		columns: "repeat(1, minmax(0, 1fr))",
		rows: `repeat(${Math.max(1, snapGrid.cells)}, minmax(0, 1fr))`,
		columnGap: "0px",
		rowGap: "0px"
	};
}

function resolveGridTemplateColumns(style: CSSStyleDeclaration, snapGrid?: PositionSnapGridSpec | null): string {
	if (style.gridTemplateColumns && style.gridTemplateColumns !== "none") return style.gridTemplateColumns;
	if (!snapGrid) return "repeat(1, minmax(0, 1fr))";
	if (snapGrid.kind === "grid") return `repeat(${Math.max(1, snapGrid.cols)}, minmax(0, 1fr))`;
	if (snapGrid.orientation === "horizontal") return `repeat(${Math.max(1, snapGrid.cells)}, minmax(0, 1fr))`;
	return "repeat(1, minmax(0, 1fr))";
}

function resolveGridTemplateRows(style: CSSStyleDeclaration, snapGrid?: PositionSnapGridSpec | null): string {
	if (style.gridTemplateRows && style.gridTemplateRows !== "none") return style.gridTemplateRows;
	if (!snapGrid) return "repeat(1, minmax(0, 1fr))";
	if (snapGrid.kind === "grid") return `repeat(${Math.max(1, snapGrid.rows)}, minmax(0, 1fr))`;
	if (snapGrid.orientation === "vertical") return `repeat(${Math.max(1, snapGrid.cells)}, minmax(0, 1fr))`;
	return "repeat(1, minmax(0, 1fr))";
}

function normalizeGapValue(value: string): string {
	const v = String(value || "").trim();
	if (!v || v === "normal") return "0px";
	return v;
}

function resolveOverlayGridParent(element: HTMLElement, input: PositionEditorMachineInput): HTMLElement | null {
	if (input.snapParentElement) return input.snapParentElement;
	if (input.snapParentId) {
		const byId = element.ownerDocument.getElementById(input.snapParentId);
		if (byId instanceof HTMLElement) return byId;
	}
	return element.parentElement instanceof HTMLElement ? element.parentElement : null;
}

function readPositionGridPlacement(element: HTMLElement): PositionGridPlacement | null {
	const cs = getComputedStyle(element);
	const classPlacement = parseGridPlacementFromClassTokens(element.className || "");
	const row = parseGridLineStart(cs.gridRowStart) || classPlacement?.row || 1;
	const col = parseGridLineStart(cs.gridColumnStart) || classPlacement?.col || 1;
	const rowSpan = parseGridLineSpan(cs.gridRowEnd) || classPlacement?.rowSpan || 1;
	const colSpan = parseGridLineSpan(cs.gridColumnEnd) || classPlacement?.colSpan || 1;
	return { row, col, rowSpan, colSpan };
}

function parseGridPlacementFromClassTokens(className: string): PositionGridPlacement | null {
	const tokens = className
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);

	let row = 1;
	let col = 1;
	let rowSpan = 1;
	let colSpan = 1;

	for (const token of tokens) {
		const areaMatch = /^cell-r(\d+)-c(\d+)$/.exec(token);
		if (areaMatch) {
			row = Math.max(1, Number(areaMatch[1]) || 1);
			col = Math.max(1, Number(areaMatch[2]) || 1);
			continue;
		}
		const spanMatch = /^cell-span-r(\d+)-c(\d+)-rs(\d+)-cs(\d+)$/.exec(token);
		if (spanMatch) {
			row = Math.max(1, Number(spanMatch[1]) || 1);
			col = Math.max(1, Number(spanMatch[2]) || 1);
			rowSpan = Math.max(1, Number(spanMatch[3]) || 1);
			colSpan = Math.max(1, Number(spanMatch[4]) || 1);
		}
	}

	return { row, col, rowSpan, colSpan };
}

function parseGridLineStart(value: string): number | null {
	const match = String(value || "")
		.trim()
		.match(/^(\d+)/);
	if (!match) return null;
	const n = Number(match[1]);
	if (!Number.isFinite(n) || n < 1) return null;
	return Math.round(n);
}

function parseGridLineSpan(value: string): number | null {
	const match = String(value || "")
		.trim()
		.match(/^span\s+(\d+)$/i);
	if (!match) return null;
	const n = Number(match[1]);
	if (!Number.isFinite(n) || n < 1) return null;
	return Math.round(n);
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

function GridOverlayPortal({
	className,
	overlay,
	hidden,
	portalContainer,
	children
}: {
	className?: string;
	overlay: PositionGridOverlay;
	hidden: boolean;
	portalContainer: HTMLElement;
	children: React.ReactNode;
}) {
	const rootStyle: React.CSSProperties = {
		position: "fixed",
		left: overlay.parentRect.left,
		top: overlay.parentRect.top,
		width: overlay.parentRect.width,
		height: overlay.parentRect.height,
		display: "grid",
		gridTemplateColumns: overlay.gridTemplateColumns,
		gridTemplateRows: overlay.gridTemplateRows,
		columnGap: overlay.columnGap,
		rowGap: overlay.rowGap,
		pointerEvents: "none"
	};
	const frameStyle: React.CSSProperties = {
		gridRow: `${overlay.placement.row} / span ${overlay.placement.rowSpan}`,
		gridColumn: `${overlay.placement.col} / span ${overlay.placement.colSpan}`,
		position: "relative",
		minWidth: 0,
		minHeight: 0,
		alignSelf: "stretch",
		justifySelf: "stretch",
		pointerEvents: "auto",
		zIndex: 9999
	};

	return createPortal(
		<div className={className} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
			<div style={{ ...rootStyle, display: hidden ? "none" : "grid" }}>
				<div style={frameStyle}>{children}</div>
			</div>
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

function startPositionDrag(
	e: React.PointerEvent<HTMLDivElement>,
	send: { (event: { type: "drag.start"; mode: PositionDragMode; clientX: number; clientY: number }): void },
	mode: PositionDragMode
) {
	if (e.button !== 0) return;
	e.preventDefault();
	e.stopPropagation();
	send({ type: "drag.start", mode, clientX: e.clientX, clientY: e.clientY });
}

const boxPositionFrameStyle: React.CSSProperties = {
	position: "absolute",
	inset: 0,
	outline: "1px solid rgba(37,99,235,0.95)",
	borderRadius: 4,
	boxSizing: "border-box",
	pointerEvents: "none"
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
