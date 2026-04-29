import { createPortal } from "react-dom";
import { useEffect } from "react";
import { useMachine } from "@xstate/react";

import { type PositionEditorMachineInput, positionEditorMachine } from "./position-editor.machine";
import {
	type PositionDragCommitMeta,
	type PositionDragMode,
	type PositionSnapGridSpec
} from "./position-editor.service";
import { ORIENTATION_LANDSCAPE } from "@/config/orientation";
import { getPlacementForOrientation, parseOrientedPlacementFromClassName } from "@/lib/oriented-placement";

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
	parentClassName: string;
	positionClassName: string;
	gridTemplateColumns: string;
	gridTemplateRows: string;
	columnGap: string;
	rowGap: string;
	placement: PositionGridPlacement | null;
};

export function ItemTransformEditorPositionGridNative(props: PositionProps) {
	const [state, send] = useMachine(positionEditorMachine, {
		input: toPositionMachineInput(props)
	});

	useEffect(() => {
		send({
			type: "props.sync",
			input: toPositionMachineInput(props)
		});
	}, [
		send,
		props.element,
		props.active,
		props.snapParentElement,
		props.snapParentId,
		props.overlayContainer,
		props.className,
		props.syncToken,
		props.onCommit,
		props.snapGrid
	]);

	if (
		!state.context.domOk ||
		!(state.context.input.active ?? true) ||
		!state.context.input.element ||
		!state.context.overlayContainer
	)
		return null;

	const overlay = resolvePositionGridOverlay(state.context.input, state.context.previewPlacement);
	if (!overlay) return null;

	return (
		<GridOverlayPortal
			className={state.context.input.className}
			overlay={overlay}
			hidden={state.context.hideOverlayFrame}
			portalContainer={state.context.overlayContainer}
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
	const positionClassName = extractPositionClassName(element.className || "");
	const placement = previewPlacement ?? readPositionGridPlacement(element);

	return {
		parentRect,
		parentClassName: parent.className || "",
		positionClassName,
		gridTemplateColumns: resolveGridTemplateColumns(parentStyle, input.snapGrid),
		gridTemplateRows: resolveGridTemplateRows(parentStyle, input.snapGrid),
		columnGap: normalizeGapValue(parentStyle.columnGap),
		rowGap: normalizeGapValue(parentStyle.rowGap),
		placement
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

function extractPositionClassName(className: string): string {
	const tokens = className
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	const positionTokens = tokens.filter((token) => isPositionClassToken(token));
	return positionTokens.join(" ");
}

function isPositionClassToken(token: string): boolean {
	if (/^cell-r\d+-c\d+$/.test(token)) return true;
	if (/^cell-span-r\d+-c\d+-rs\d+-cs\d+$/.test(token)) return true;
	if (/^cell-span-fill$/.test(token)) return true;
	if (/^cell_layout_auto(?:_[\w-]+)?$/.test(token)) return true;
	if (/^liste-r\d+$/.test(token)) return true;
	if (/^ed-zone-[\w-]+$/.test(token)) return true;
	if (/^ed-posv1-/.test(token)) return true;
	return false;
}

function readPositionGridPlacement(element: HTMLElement): PositionGridPlacement | null {
	const cs = getComputedStyle(element);
	const classPlacement = parseGridPlacementFromClassTokens(element.className || "");
	const row = parseGridLineStart(cs.gridRowStart) || classPlacement?.row || null;
	const col = parseGridLineStart(cs.gridColumnStart) || classPlacement?.col || null;
	const rowSpan =
		parseGridLineSpan(cs.gridRowEnd) ||
		resolveSpanFromGridEdges(cs.gridRowStart, cs.gridRowEnd) ||
		classPlacement?.rowSpan ||
		null;
	const colSpan =
		parseGridLineSpan(cs.gridColumnEnd) ||
		resolveSpanFromGridEdges(cs.gridColumnStart, cs.gridColumnEnd) ||
		classPlacement?.colSpan ||
		null;

	if (row && col && rowSpan && colSpan) {
		return { row, col, rowSpan, colSpan };
	}

	const stylesheetPlacement = readPlacementFromClassRules(element);
	if (stylesheetPlacement) return stylesheetPlacement;

	if (!row || !col) return null;
	return {
		row,
		col,
		rowSpan: rowSpan || 1,
		colSpan: colSpan || 1
	};
}

function readPlacementFromClassRules(node: HTMLElement): PositionGridPlacement | null {
	const classTokens = (node.className || "")
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	if (!classTokens.length) return null;
	const ownerDocument = node.ownerDocument;
	if (!ownerDocument) return null;

	for (const classToken of classTokens) {
		const ruleStyle = findClassRuleStyle(ownerDocument, classToken);
		if (!ruleStyle) continue;
		const placement = placementFromRuleStyle(ruleStyle);
		if (placement) return placement;
	}
	return null;
}

function findClassRuleStyle(doc: Document, classToken: string): CSSStyleDeclaration | null {
	const selector = `.${classToken}`;
	for (const sheet of Array.from(doc.styleSheets || [])) {
		const style = findClassRuleStyleInSheet(sheet, selector);
		if (style) return style;
	}
	return null;
}

function findClassRuleStyleInSheet(sheet: CSSStyleSheet, selector: string): CSSStyleDeclaration | null {
	let rules: CSSRuleList;
	try {
		rules = sheet.cssRules;
	} catch {
		return null;
	}
	return findClassRuleStyleInRules(rules, selector);
}

function findClassRuleStyleInRules(rules: CSSRuleList, selector: string): CSSStyleDeclaration | null {
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule) {
			const selectors = rule.selectorText
				.split(",")
				.map((value) => value.trim());
			if (selectors.includes(selector)) return rule.style;
			continue;
		}
		if (rule instanceof CSSGroupingRule) {
			const nested = findClassRuleStyleInRules(rule.cssRules, selector);
			if (nested) return nested;
		}
	}
	return null;
}

function placementFromRuleStyle(style: CSSStyleDeclaration): PositionGridPlacement | null {
	const rowParsed = parseGridTrackShorthand(style.getPropertyValue("grid-row"));
	const colParsed = parseGridTrackShorthand(style.getPropertyValue("grid-column"));

	const row =
		rowParsed?.start ||
		parseGridLineStart(style.getPropertyValue("grid-row-start")) ||
		parseGridLineStart(style.gridRowStart);
	const col =
		colParsed?.start ||
		parseGridLineStart(style.getPropertyValue("grid-column-start")) ||
		parseGridLineStart(style.gridColumnStart);
	const rowSpan =
		rowParsed?.span ||
		parseGridLineSpan(style.getPropertyValue("grid-row-end")) ||
		resolveSpanFromGridEdges(style.getPropertyValue("grid-row-start"), style.getPropertyValue("grid-row-end")) ||
		parseGridLineSpan(style.gridRowEnd) ||
		resolveSpanFromGridEdges(style.gridRowStart, style.gridRowEnd);
	const colSpan =
		colParsed?.span ||
		parseGridLineSpan(style.getPropertyValue("grid-column-end")) ||
		resolveSpanFromGridEdges(
			style.getPropertyValue("grid-column-start"),
			style.getPropertyValue("grid-column-end")
		) ||
		parseGridLineSpan(style.gridColumnEnd) ||
		resolveSpanFromGridEdges(style.gridColumnStart, style.gridColumnEnd);

	if (!row || !col) return null;
	return {
		row,
		col,
		rowSpan: rowSpan || 1,
		colSpan: colSpan || 1
	};
}

function parseGridTrackShorthand(value: string): { start: number | null; span: number | null } | null {
	const raw = String(value || "").trim();
	if (!raw) return null;
	const parts = raw.split("/").map((part) => part.trim());
	if (!parts.length) return null;
	const start = parseGridLineStart(parts[0]);
	let span = parts.length > 1 ? parseGridLineSpan(parts[1]) : null;
	if (!span && parts.length > 1) span = resolveSpanFromGridEdges(parts[0], parts[1]);
	return { start, span };
}

function parseGridPlacementFromClassTokens(className: string): PositionGridPlacement | null {
	const oriented = parseOrientedPlacementFromClassName(className);
	if (oriented) {
		const resolved = getPlacementForOrientation(oriented.variants, ORIENTATION_LANDSCAPE);
		return {
			row: resolved.row,
			col: resolved.col,
			rowSpan: resolved.rowSpan,
			colSpan: resolved.colSpan
		};
	}

	const tokens = className
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);

	let row = 1;
	let col = 1;
	let rowSpan = 1;
	let colSpan = 1;
	let matched = false;

	for (const token of tokens) {
		const areaMatch = /^cell-r(\d+)-c(\d+)$/.exec(token);
		if (areaMatch) {
			matched = true;
			row = Math.max(1, Number(areaMatch[1]) || 1);
			col = Math.max(1, Number(areaMatch[2]) || 1);
			continue;
		}
		const spanMatch = /^cell-span-r(\d+)-c(\d+)-rs(\d+)-cs(\d+)$/.exec(token);
		if (spanMatch) {
			matched = true;
			row = Math.max(1, Number(spanMatch[1]) || 1);
			col = Math.max(1, Number(spanMatch[2]) || 1);
			rowSpan = Math.max(1, Number(spanMatch[3]) || 1);
			colSpan = Math.max(1, Number(spanMatch[4]) || 1);
		}
	}

	if (!matched) return null;
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

function resolveSpanFromGridEdges(startValue: string, endValue: string): number | null {
	const start = parseGridLineStart(startValue);
	if (!start) return null;
	const end = parseGridLineStart(endValue);
	if (!end) return null;
	const span = end - start;
	if (!Number.isFinite(span) || span < 1) return null;
	return Math.round(span);
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
	const frameStyle: React.CSSProperties = overlay.placement
		? {
				gridRow: `${overlay.placement.row} / span ${overlay.placement.rowSpan}`,
				gridColumn: `${overlay.placement.col} / span ${overlay.placement.colSpan}`,
				position: "relative",
				minWidth: 0,
				minHeight: 0,
				alignSelf: "stretch",
				justifySelf: "stretch",
				pointerEvents: "auto",
				zIndex: 9999
			}
		: {
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
			<div className={overlay.parentClassName} style={{ ...rootStyle, display: hidden ? "none" : "grid" }}>
				<div className={overlay.positionClassName} style={frameStyle}>
					{children}
				</div>
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
