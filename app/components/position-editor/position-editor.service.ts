import { clamp } from "./lib";
import { HEAVY_GRID_CELL_THRESHOLD } from "@/config/capsule-presets";

const DRAG_ACTIVATION_DISTANCE_PX = 4;

export type PositionDragMode = { kind: "cell-snap" } | { kind: "resize-grid-se" };

export type PositionSnapGridSpec =
	| { kind: "list"; orientation: "horizontal" | "vertical"; cells: number }
	| { kind: "grid"; cols: number; rows: number };

export type PositionDragCommitMeta = {
	cell?: { row: number; col: number };
	reorderIndex?: number;
	gridPlacement?: { row: number; col: number; rowSpan: number; colSpan: number };
};

type CellDropTarget = {
	row: number;
	col: number;
	reorderIndex?: number;
	node: HTMLElement;
};

type SuperCellDropTarget = {
	rowStart: number;
	colStart: number;
	rows: number;
	cols: number;
	node: HTMLElement;
};

type CellSnapSession = {
	root: HTMLElement;
	ghost: HTMLElement;
	sourceElement: HTMLElement;
	sourceVisibility: string;
	targets: CellDropTarget[];
	activeIndex: number;
	pointerOffset: { x: number; y: number };
	superTargets?: SuperCellDropTarget[];
	activeSuperIndex?: number;
	fineTargets?: CellDropTarget[];
	fineLayer?: HTMLElement;
	fineTemplateCache?: Map<string, HTMLTemplateElement>;
};

type StartPositionDragInput = {
	element: HTMLElement;
	mode: PositionDragMode;
	clientX: number;
	clientY: number;
	snapParentElement?: HTMLElement | null;
	snapParentId?: string | null;
	snapGrid?: PositionSnapGridSpec | null;
	portalHost: HTMLElement | null;
	onPreview: (preview: { width: number; height: number } | null) => void;
	onOverlayHidden: (hidden: boolean) => void;
	onCommit: (mode: PositionDragMode["kind"], meta: PositionDragCommitMeta) => void;
	onEnd: () => void;
};

export class PositionEditorDomService {
	private portalHost: HTMLElement | null = null;
	private portalContainer: HTMLElement | null = null;
	private pointerCleanup: (() => void) | null = null;

	attachOverlayHost(element: HTMLElement, overlayContainer: HTMLElement | null): HTMLElement | null {
		const container = overlayContainer ?? element.ownerDocument.body;
		if (this.portalContainer === container && this.portalHost?.isConnected) return this.portalHost;
		this.detachOverlayHost();
		const host = element.ownerDocument.createElement("div");
		host.setAttribute("data-vte-position-overlay-host", "");
		host.style.position = "absolute";
		host.style.inset = "0";
		host.style.pointerEvents = "none";
		host.style.zIndex = "9999";
		container.appendChild(host);
		this.portalContainer = container;
		this.portalHost = host;
		return host;
	}

	detachOverlayHost() {
		if (this.portalHost?.parentNode) this.portalHost.parentNode.removeChild(this.portalHost);
		this.portalHost = null;
		this.portalContainer = null;
	}

	dispose() {
		this.stopPointerSession();
		this.detachOverlayHost();
	}

	startDrag(input: StartPositionDragInput): boolean {
		const {
			element,
			mode,
			clientX,
			clientY,
			snapParentElement,
			snapParentId,
			snapGrid,
			portalHost,
			onPreview,
			onOverlayHidden,
			onCommit,
			onEnd
		} = input;

		let cellSnap: CellSnapSession | null = null;
		let gridPlacement = mode.kind === "resize-grid-se" ? readCurrentGridPlacement(element) : null;
		let didDrag = false;
		const dragStartPointer = { x: clientX, y: clientY };
		if (mode.kind === "resize-grid-se" && !gridPlacement) return false;

		if (mode.kind === "cell-snap") {
			if (!snapGrid) return false;
			const resolvedSnapParent =
				snapParentElement ??
				(snapParentId ? (element.ownerDocument.getElementById(snapParentId) as HTMLElement | null) : null);
			if (!resolvedSnapParent) return false;
			cellSnap = createCellSnapSession({
				element,
				parent: resolvedSnapParent,
				grid: snapGrid,
				overlayHost: portalHost,
				pointer: { x: clientX, y: clientY }
			});
			if (!cellSnap) return false;
			onOverlayHidden(true);
		}

		const win = element.ownerDocument.defaultView;
		if (!win) return false;

		const onMove = (e: PointerEvent) => {
			if (!didDrag) {
				const dx = e.clientX - dragStartPointer.x;
				const dy = e.clientY - dragStartPointer.y;
				if (Math.hypot(dx, dy) >= DRAG_ACTIVATION_DISTANCE_PX) didDrag = true;
			}

			if (mode.kind === "resize-grid-se") {
				if (!snapGrid || snapGrid.kind !== "grid" || !gridPlacement) return;
				const parentRect = (snapParentElement || element.parentElement || element).getBoundingClientRect();
				const cols = Math.max(1, snapGrid.cols);
				const rows = Math.max(1, snapGrid.rows);
				const col = clamp(
					Math.floor(((e.clientX - parentRect.left) / Math.max(1, parentRect.width)) * cols) + 1,
					gridPlacement.col,
					cols
				);
				const row = clamp(
					Math.floor(((e.clientY - parentRect.top) / Math.max(1, parentRect.height)) * rows) + 1,
					gridPlacement.row,
					rows
				);
				gridPlacement = {
					...gridPlacement,
					rowSpan: Math.max(1, row - gridPlacement.row + 1),
					colSpan: Math.max(1, col - gridPlacement.col + 1)
				};
				onPreview({
					width: Math.max(1, (parentRect.width * gridPlacement.colSpan) / cols),
					height: Math.max(1, (parentRect.height * gridPlacement.rowSpan) / rows)
				});
				return;
			}

			if (mode.kind === "cell-snap" && cellSnap) {
				moveGhostToPointer(cellSnap, e.clientX, e.clientY);
				const probe = getSessionProbePointFromPointer(cellSnap, e.clientX, e.clientY);
				updateCellSnapSessionPointer(cellSnap, probe.x, probe.y);
			}
		};

		const onUp = () => {
			if (cellSnap) destroyCellSnapSession(cellSnap);
			this.stopPointerSession();
			if (!didDrag) {
				onPreview(null);
				onOverlayHidden(false);
				onEnd();
				return;
			}
			const finalCellTarget = cellSnap ? resolveActiveCellTarget(cellSnap) : null;
			onCommit(mode.kind, {
				...(gridPlacement ? { gridPlacement } : {}),
				...(finalCellTarget
					? {
							cell: { row: finalCellTarget.row, col: finalCellTarget.col },
							reorderIndex: finalCellTarget.reorderIndex
						}
					: {})
			});
			onPreview(null);
			onOverlayHidden(false);
			onEnd();
		};

		win.addEventListener("pointermove", onMove, { passive: false });
		win.addEventListener("pointerup", onUp, { passive: true });
		win.addEventListener("pointercancel", onUp, { passive: true });
		this.pointerCleanup = () => {
			win.removeEventListener("pointermove", onMove);
			win.removeEventListener("pointerup", onUp);
			win.removeEventListener("pointercancel", onUp);
		};
		return true;
	}

	stopPointerSession() {
		if (this.pointerCleanup) this.pointerCleanup();
		this.pointerCleanup = null;
	}
}

// shared helper block (cell-snap + large grid strategy)
function createCellSnapSession({
	element,
	parent,
	grid,
	overlayHost,
	pointer
}: {
	element: HTMLElement;
	parent: HTMLElement;
	grid: PositionSnapGridSpec;
	overlayHost: HTMLElement | null;
	pointer: { x: number; y: number };
}): CellSnapSession | null {
	if (!overlayHost) return null;
	const doc = element.ownerDocument;
	const parentRect = parent.getBoundingClientRect();
	if (parentRect.width <= 0 || parentRect.height <= 0) return null;

	const previousRoot = doc.getElementById("vte-reposition-overlay-root");
	if (previousRoot?.parentNode) previousRoot.parentNode.removeChild(previousRoot);

	const root = doc.createElement("div");
	root.id = "vte-reposition-overlay-root";
	root.style.position = "fixed";
	root.style.inset = "0";
	root.style.pointerEvents = "none";
	root.style.zIndex = "10000";

	const parentStyle = getComputedStyle(parent);
	const clone = doc.createElement("div");
	clone.id = "vte-reposition-grid-clone";
	clone.style.position = "fixed";
	clone.style.left = `${parentRect.left}px`;
	clone.style.top = `${parentRect.top}px`;
	clone.style.width = `${parentRect.width}px`;
	clone.style.height = `${parentRect.height}px`;
	clone.style.margin = "0";
	clone.style.pointerEvents = "none";
	clone.style.zIndex = "10000";
	clone.style.boxSizing = "border-box";
	clone.style.background = "rgba(255,255,255,0.04)";
	clone.style.display = "grid";
	clone.style.transform = "none";
	clone.style.transformOrigin = "0 0";
	clone.style.gridTemplateColumns = parentStyle.gridTemplateColumns;
	clone.style.gridTemplateRows = parentStyle.gridTemplateRows;
	clone.style.gap = parentStyle.gap;

	const useSuperCells =
		grid.kind === "grid" && Math.max(1, grid.cols) * Math.max(1, grid.rows) > HEAVY_GRID_CELL_THRESHOLD;
	const targets = useSuperCells ? [] : buildDropTargets(grid);
	const superTargets = useSuperCells && grid.kind === "grid" ? buildSuperDropTargets(grid) : [];
	if (!useSuperCells && !targets.length) return null;
	if (useSuperCells) {
		if (!superTargets.length) return null;
		clone.style.gridTemplateColumns = `repeat(${Math.ceil(grid.cols / 10)}, minmax(0, 1fr))`;
		clone.style.gridTemplateRows = `repeat(${Math.ceil(grid.rows / 10)}, minmax(0, 1fr))`;
		for (const target of superTargets) {
			const cell = doc.createElement("div");
			cell.className = "vte-reposition-cell vte-reposition-super-cell";
			paintDropTarget(cell, false);
			target.node = cell;
			clone.appendChild(cell);
		}
	} else {
		for (const target of targets) {
			const cell = doc.createElement("div");
			cell.className = "vte-reposition-cell";
			paintDropTarget(cell, false);
			target.node = cell;
			clone.appendChild(cell);
		}
	}

	const elementRect = element.getBoundingClientRect();
	const ghost = element.cloneNode(true) as HTMLElement;
	ghost.removeAttribute("id");
	ghost.style.position = "fixed";
	ghost.style.left = "0";
	ghost.style.top = "0";
	ghost.style.width = `${elementRect.width}px`;
	ghost.style.height = `${elementRect.height}px`;
	ghost.style.margin = "0";
	ghost.style.pointerEvents = "none";
	ghost.style.zIndex = "10001";
	ghost.style.opacity = "0.96";
	ghost.style.willChange = "transform";

	root.appendChild(clone);
	root.appendChild(ghost);
	overlayHost.appendChild(root);

	const session: CellSnapSession = {
		root,
		ghost,
		sourceElement: element,
		sourceVisibility: element.style.visibility,
		targets: targets.map((target) => ({ ...target, node: target.node! })),
		activeIndex: 0,
		pointerOffset: { x: pointer.x - elementRect.left, y: pointer.y - elementRect.top },
		...(useSuperCells
			? {
					superTargets: superTargets.map((target) => ({ ...target, node: target.node! })),
					activeSuperIndex: -1,
					fineTargets: [],
					fineTemplateCache: new Map<string, HTMLTemplateElement>()
				}
			: {})
	};

	if (session.superTargets?.length) {
		const probe = getSessionProbePointFromPointer(session, pointer.x, pointer.y);
		updateCellSnapSessionPointer(session, probe.x, probe.y);
	} else {
		const probe = getSessionProbePointFromPointer(session, pointer.x, pointer.y);
		session.activeIndex = findNearestDropTargetIndex(session.targets, probe.x, probe.y);
		if (session.targets[session.activeIndex]) paintDropTarget(session.targets[session.activeIndex].node, true);
	}
	moveGhostToPointer(session, pointer.x, pointer.y);
	return session;
}

function destroyCellSnapSession(session: CellSnapSession) {
	session.sourceElement.style.visibility = session.sourceVisibility;
	if (session.root.parentNode) session.root.parentNode.removeChild(session.root);
}

function moveGhostToPointer(session: CellSnapSession, clientX: number, clientY: number) {
	session.ghost.style.transform = `translate(${clientX - session.pointerOffset.x}px, ${clientY - session.pointerOffset.y}px)`;
}

function getSessionProbePointFromPointer(
	session: CellSnapSession,
	clientX: number,
	clientY: number
): { x: number; y: number } {
	const ghostRect = session.ghost.getBoundingClientRect();
	if (ghostRect.width > 0 && ghostRect.height > 0) {
		return {
			x: ghostRect.left + ghostRect.width / 2,
			y: ghostRect.top + ghostRect.height / 2
		};
	}
	return {
		x: clientX - session.pointerOffset.x,
		y: clientY - session.pointerOffset.y
	};
}

function paintDropTarget(node: HTMLElement, selected: boolean) {
	node.classList.toggle("vte-reposition-cell-active", selected);
}

function updateCellSnapSessionPointer(session: CellSnapSession, x: number, y: number) {
	if (!session.superTargets?.length) {
		const nextIndex = findNearestDropTargetIndex(session.targets, x, y);
		if (nextIndex !== session.activeIndex) {
			if (session.targets[session.activeIndex])
				paintDropTarget(session.targets[session.activeIndex].node, false);
			session.activeIndex = nextIndex;
			if (session.targets[session.activeIndex]) paintDropTarget(session.targets[session.activeIndex].node, true);
		}
		return;
	}

	const nextSuperIndex = findNearestSuperDropTargetIndex(session.superTargets, x, y);
	if (nextSuperIndex !== session.activeSuperIndex) {
		if (typeof session.activeSuperIndex === "number" && session.superTargets[session.activeSuperIndex]) {
			paintDropTarget(session.superTargets[session.activeSuperIndex].node, false);
		}
		session.activeSuperIndex = nextSuperIndex;
		if (session.superTargets[nextSuperIndex]) {
			paintDropTarget(session.superTargets[nextSuperIndex].node, true);
			materializeFineTargets(session, session.superTargets[nextSuperIndex]);
		}
	}

	if (!session.fineTargets?.length) return;
	const nextFineIndex = findNearestDropTargetIndex(session.fineTargets, x, y);
	if (nextFineIndex !== session.activeIndex) {
		if (session.fineTargets[session.activeIndex])
			paintDropTarget(session.fineTargets[session.activeIndex].node, false);
		session.activeIndex = nextFineIndex;
		if (session.fineTargets[session.activeIndex])
			paintDropTarget(session.fineTargets[session.activeIndex].node, true);
	}
}

function resolveActiveCellTarget(session: CellSnapSession): CellDropTarget | null {
	if (session.fineTargets?.length)
		return session.fineTargets[session.activeIndex] ?? session.fineTargets[0] ?? null;
	return session.targets[session.activeIndex] ?? null;
}

function findNearestDropTargetIndex(targets: CellDropTarget[], x: number, y: number): number {
	if (!targets.length) return 0;
	for (let i = 0; i < targets.length; i += 1) {
		const rect = targets[i].node.getBoundingClientRect();
		if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return i;
	}
	let best = 0;
	let bestDist = Number.POSITIVE_INFINITY;
	for (let i = 0; i < targets.length; i += 1) {
		const rect = targets[i].node.getBoundingClientRect();
		const dx = distanceAxis(x, rect.left, rect.right);
		const dy = distanceAxis(y, rect.top, rect.bottom);
		const dist = dx * dx + dy * dy;
		if (dist < bestDist) {
			best = i;
			bestDist = dist;
		}
	}
	return best;
}

function findNearestSuperDropTargetIndex(targets: SuperCellDropTarget[], x: number, y: number): number {
	if (!targets.length) return 0;
	for (let i = 0; i < targets.length; i += 1) {
		const rect = targets[i].node.getBoundingClientRect();
		if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return i;
	}
	let best = 0;
	let bestDist = Number.POSITIVE_INFINITY;
	for (let i = 0; i < targets.length; i += 1) {
		const rect = targets[i].node.getBoundingClientRect();
		const dx = distanceAxis(x, rect.left, rect.right);
		const dy = distanceAxis(y, rect.top, rect.bottom);
		const dist = dx * dx + dy * dy;
		if (dist < bestDist) {
			best = i;
			bestDist = dist;
		}
	}
	return best;
}

function distanceAxis(value: number, min: number, max: number): number {
	if (value < min) return min - value;
	if (value > max) return value - max;
	return 0;
}

function buildDropTargets(grid: PositionSnapGridSpec): CellDropTarget[] {
	if (grid.kind === "list") {
		const itemsCount = Math.max(1, grid.cells);
		const horizontal = grid.orientation === "horizontal";
		return Array.from({ length: itemsCount }, (_, index) =>
			horizontal
				? { row: 1, col: index + 1, reorderIndex: index, node: null as unknown as HTMLElement }
				: { row: index + 1, col: 1, reorderIndex: index, node: null as unknown as HTMLElement }
		);
	}
	const cols = Math.max(1, grid.cols);
	const rows = Math.max(1, grid.rows);
	const targets: CellDropTarget[] = [];
	for (let row = 0; row < rows; row += 1) {
		for (let col = 0; col < cols; col += 1) {
			targets.push({ row: row + 1, col: col + 1, node: null as unknown as HTMLElement });
		}
	}
	return targets;
}

function buildSuperDropTargets(grid: Extract<PositionSnapGridSpec, { kind: "grid" }>): SuperCellDropTarget[] {
	const cols = Math.max(1, grid.cols);
	const rows = Math.max(1, grid.rows);
	const superCols = Math.ceil(cols / 10);
	const superRows = Math.ceil(rows / 10);
	const targets: SuperCellDropTarget[] = [];
	for (let sr = 0; sr < superRows; sr += 1) {
		for (let sc = 0; sc < superCols; sc += 1) {
			targets.push({
				rowStart: sr * 10 + 1,
				colStart: sc * 10 + 1,
				rows: Math.min(10, rows - sr * 10),
				cols: Math.min(10, cols - sc * 10),
				node: null as unknown as HTMLElement
			});
		}
	}
	return targets;
}

function materializeFineTargets(session: CellSnapSession, superCell: SuperCellDropTarget) {
	const doc = session.root.ownerDocument;
	if (!session.fineLayer) {
		session.fineLayer = doc.createElement("div");
		session.fineLayer.style.position = "fixed";
		session.fineLayer.style.pointerEvents = "none";
		session.fineLayer.style.display = "grid";
		session.fineLayer.style.zIndex = "10001";
		session.root.appendChild(session.fineLayer);
	}
	const fineLayer = session.fineLayer;
	const superRect = superCell.node.getBoundingClientRect();
	fineLayer.style.left = `${superRect.left}px`;
	fineLayer.style.top = `${superRect.top}px`;
	fineLayer.style.width = `${superRect.width}px`;
	fineLayer.style.height = `${superRect.height}px`;
	fineLayer.style.gridTemplateColumns = `repeat(${superCell.cols}, minmax(0, 1fr))`;
	fineLayer.style.gridTemplateRows = `repeat(${superCell.rows}, minmax(0, 1fr))`;

	const cacheKey = `${superCell.rows}x${superCell.cols}`;
	let template = session.fineTemplateCache?.get(cacheKey);
	if (!template) {
		template = doc.createElement("template");
		const fragment = doc.createDocumentFragment();
		for (let row = 0; row < superCell.rows; row += 1) {
			for (let col = 0; col < superCell.cols; col += 1) {
				const node = doc.createElement("div");
				node.className = "vte-reposition-cell vte-reposition-fine-cell";
				node.setAttribute("data-local-row", String(row + 1));
				node.setAttribute("data-local-col", String(col + 1));
				paintDropTarget(node, false);
				fragment.appendChild(node);
			}
		}
		template.content.appendChild(fragment);
		session.fineTemplateCache?.set(cacheKey, template);
	}
	fineLayer.replaceChildren(template.content.cloneNode(true));
	const nodes = Array.from(fineLayer.children) as HTMLElement[];
	session.fineTargets = nodes.map((node) => ({
		row: superCell.rowStart + Number(node.getAttribute("data-local-row") || "1") - 1,
		col: superCell.colStart + Number(node.getAttribute("data-local-col") || "1") - 1,
		node
	}));
	session.activeIndex = -1;
}

function readCurrentGridPlacement(
	node: HTMLElement
): { row: number; col: number; rowSpan: number; colSpan: number } | null {
	const cs = getComputedStyle(node);
	const classPlacement = parseGridPlacementFromClassTokens(node.className || "");
	const row = parseGridLineStart(cs.gridRowStart) || classPlacement?.row || 1;
	const col = parseGridLineStart(cs.gridColumnStart) || classPlacement?.col || 1;
	return {
		row,
		col,
		rowSpan: parseGridLineSpan(cs.gridRowEnd) || classPlacement?.rowSpan || 1,
		colSpan: parseGridLineSpan(cs.gridColumnEnd) || classPlacement?.colSpan || 1
	};
}

function parseGridPlacementFromClassTokens(className: string): {
	row: number;
	col: number;
	rowSpan: number;
	colSpan: number;
} | null {
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
