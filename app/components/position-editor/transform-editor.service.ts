import type { Affine2D, ElementTransform, Pt } from "./lib.types";
import {
	affineFromTransform,
	clamp,
	createPointerConverters,
	leftTopFromFixedMatrix,
	localToParent,
	parentDeltaToLocalDelta,
	parentToLocalFixed,
	rad2deg,
	readTransformPreserve,
	solveLeftTopForAnchor
} from "./lib";
import { HEAVY_GRID_CELL_THRESHOLD } from "@/config/capsule-presets";
import { ORIENTATION_LANDSCAPE } from "@/config/orientation";
import { getPlacementForOrientation, parseOrientedPlacementFromClassName } from "@/lib/oriented-placement";

export type DragMode =
	| { kind: "move" }
	| { kind: "rotate" }
	| { kind: "resize-se" }
	| { kind: "resize-grid-se" }
	| { kind: "cell-snap" }
	| { kind: "origin" };

export type SnapGridSpec =
	| { kind: "list"; orientation: "horizontal" | "vertical"; cells: number }
	| { kind: "grid"; cols: number; rows: number };

export type DragCommitMeta = {
	translateX: number;
	translateY: number;
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
	pointerOffset: Pt;
	superTargets?: SuperCellDropTarget[];
	activeSuperIndex?: number;
	fineTargets?: CellDropTarget[];
	fineLayer?: HTMLElement;
	fineTemplateCache?: Map<string, HTMLTemplateElement>;
};

type DragState = {
	mode: DragMode;
	startPointerParent: Pt;
	startT: ElementTransform;
	pivotParent?: Pt;
	startAngle?: number;
	anchorTopLeftParent?: Pt;
	fixedM?: Affine2D;
	cellSnap?: CellSnapSession | null;
	gridResizeBase?: { row: number; col: number; rowSpan: number; colSpan: number };
};

type StartDragInput = {
	element: HTMLElement;
	offsetParent: HTMLElement;
	mode: DragMode;
	clientX: number;
	clientY: number;
	basePosition: { x: number; y: number } | null;
	currentTransform: ElementTransform;
	minWidth: number;
	minHeight: number;
	snapParentElement?: HTMLElement | null;
	snapParentId?: string | null;
	snapGrid?: SnapGridSpec | null;
	overlayContainer: HTMLElement | null;
	onTransform: (next: ElementTransform) => void;
	onResyncTransform: (next: ElementTransform, base: { x: number; y: number }) => void;
	onOverlayHidden: (hidden: boolean) => void;
	onCommit: (transform: ElementTransform, mode: DragMode["kind"], meta: DragCommitMeta) => void;
	onEnd: () => void;
	alwaysResyncOnCommit?: boolean;
};

export function computeNextResizeScale({
	startScale,
	startSize,
	deltaLocal,
	minSize
}: {
	startScale: number;
	startSize: number;
	deltaLocal: number;
	minSize: number;
}): number {
	const baseSize = Math.max(1, startSize);
	const rawScale = startScale * ((startSize + deltaLocal) / baseSize);
	const minScale = minSize / baseSize;
	return Math.max(minScale, rawScale);
}

export class TransformEditorDomService {
	private pointerCleanup: (() => void) | null = null;
	private ptr = createPointerConverters();

	dispose() {
		this.stopPointerSession();
	}

	applyTransformLive(
		element: HTMLElement | null,
		transform: ElementTransform | null,
		basePosition: { x: number; y: number } | null,
		options?: { applyToElement?: boolean; hidden?: boolean }
	) {
		if (!element || !transform) return;
		if (options?.applyToElement === false) return;
		if (options?.hidden) return;
		const s = element.style;
		s.width = `${transform.width}px`;
		s.height = `${transform.height}px`;
		s.transformOrigin = `${transform.originX * 100}% ${transform.originY * 100}%`;
		s.transform = `translate(${transform.x - (basePosition?.x ?? 0)}px, ${transform.y - (basePosition?.y ?? 0)}px) rotate(${transform.rotate}deg) scale(${transform.scaleX}, ${transform.scaleY})`;
	}

	startDrag(input: StartDragInput) {
		const {
			element,
			offsetParent,
			mode,
			clientX,
			clientY,
			basePosition,
			currentTransform,
			minWidth,
			minHeight,
			snapParentElement,
			snapParentId,
			snapGrid,
			overlayContainer,
			alwaysResyncOnCommit,
			onTransform,
			onResyncTransform,
			onOverlayHidden,
			onCommit,
			onEnd
		} = input;

		const startPointerParent = this.ptr.clientToLocal(offsetParent, { x: clientX, y: clientY });
		const startT = { ...currentTransform };
		let latestTransform = { ...currentTransform };
		const dragState: DragState = { mode, startPointerParent, startT };

		if (mode.kind === "rotate") {
			const origin = { x: startT.originX * startT.width, y: startT.originY * startT.height };
			const pivotParent = { x: startT.x + origin.x, y: startT.y + origin.y };
			dragState.pivotParent = pivotParent;
			dragState.startAngle = Math.atan2(
				startPointerParent.y - pivotParent.y,
				startPointerParent.x - pivotParent.x
			);
		}

		if (mode.kind === "cell-snap") {
			if (!snapGrid) return false;
			const resolvedSnapParent =
				snapParentElement ??
				(snapParentId ? (element.ownerDocument.getElementById(snapParentId) as HTMLElement | null) : null);
			if (!resolvedSnapParent) return false;
			dragState.cellSnap = createCellSnapSession({
				element,
				parent: resolvedSnapParent,
				grid: snapGrid,
				overlayContainer,
				pointer: { x: clientX, y: clientY }
			});
			if (!dragState.cellSnap) return false;
			onOverlayHidden(true);
		}

		if (mode.kind === "resize-se") {
			dragState.anchorTopLeftParent = localToParent(startT, { x: 0, y: 0 });
		}

		if (mode.kind === "resize-grid-se") {
			const placement = readCurrentGridPlacement(element);
			if (!placement) return false;
			dragState.gridResizeBase = placement;
		}

		if (mode.kind === "origin") {
			dragState.fixedM = affineFromTransform(startT);
		}

		const win = element.ownerDocument.defaultView;
		if (!win) return false;

		const resyncFromDom = () => {
			let frames = 0;
			const refresh = () => {
				if (!element.isConnected) return;
				const measured = readTransformPreserve(element);
				const base = getBasePositionWithoutTranslate(element, measured);
				onResyncTransform(measured, base);
				latestTransform = measured;
				frames += 1;
				if (frames < 10) win.requestAnimationFrame(refresh);
			};
			win.requestAnimationFrame(() => win.requestAnimationFrame(refresh));
		};

		const onMove = (e: PointerEvent) => {
			const curParent = this.ptr.clientToLocal(offsetParent, { x: e.clientX, y: e.clientY });
			const { startT } = dragState;

			if (dragState.mode.kind === "move") {
				latestTransform = {
					...startT,
					x: startT.x + (curParent.x - dragState.startPointerParent.x),
					y: startT.y + (curParent.y - dragState.startPointerParent.y)
				};
				onTransform(latestTransform);
				return;
			}

			if (dragState.mode.kind === "rotate") {
				const ang = Math.atan2(curParent.y - dragState.pivotParent!.y, curParent.x - dragState.pivotParent!.x);
				let rotate = startT.rotate + rad2deg(ang - dragState.startAngle!);
				if (e.shiftKey) rotate = Math.round(rotate / 15) * 15;
				latestTransform = { ...startT, rotate };
				onTransform(latestTransform);
				return;
			}

			if (dragState.mode.kind === "resize-se") {
				const deltaParent = {
					x: curParent.x - dragState.startPointerParent.x,
					y: curParent.y - dragState.startPointerParent.y
				};
				const deltaLocal = parentDeltaToLocalDelta(startT, deltaParent);
				let nextScaleX = computeNextResizeScale({
					startScale: startT.scaleX,
					startSize: startT.width,
					deltaLocal: deltaLocal.x,
					minSize: minWidth
				});
				let nextScaleY = computeNextResizeScale({
					startScale: startT.scaleY,
					startSize: startT.height,
					deltaLocal: deltaLocal.y,
					minSize: minHeight
				});
				if (!e.shiftKey) {
					const uniformScale = Math.max(nextScaleX, nextScaleY);
					nextScaleX = uniformScale;
					nextScaleY = uniformScale;
				}
				const anchorParent = dragState.anchorTopLeftParent || localToParent(startT, { x: 0, y: 0 });
				const { x, y } = solveLeftTopForAnchor(
					anchorParent,
					{ x: 0, y: 0 },
					{
						width: startT.width,
						height: startT.height,
						rotate: startT.rotate,
						scaleX: nextScaleX,
						scaleY: nextScaleY,
						originX: startT.originX,
						originY: startT.originY
					}
				);
				latestTransform = {
					...startT,
					x,
					y,
					scaleX: nextScaleX,
					scaleY: nextScaleY,
					originX: startT.originX,
					originY: startT.originY
				};
				onTransform(latestTransform);
				return;
			}

			if (dragState.mode.kind === "origin") {
				const pLocal = parentToLocalFixed(dragState.fixedM!, curParent);
				const nextOriginX = clamp(pLocal.x / startT.width, 0, 1);
				const nextOriginY = clamp(pLocal.y / startT.height, 0, 1);
				const { x, y } = leftTopFromFixedMatrix(dragState.fixedM!, {
					x: nextOriginX * startT.width,
					y: nextOriginY * startT.height
				});
				latestTransform = { ...startT, x, y, originX: nextOriginX, originY: nextOriginY };
				onTransform(latestTransform);
				return;
			}

			if (dragState.mode.kind === "resize-grid-se") {
				if (!snapGrid || snapGrid.kind !== "grid" || !dragState.gridResizeBase) return;
				const parentRect = (snapParentElement || element.parentElement || element).getBoundingClientRect();
				const cols = Math.max(1, snapGrid.cols);
				const rows = Math.max(1, snapGrid.rows);
				const col = clamp(
					Math.floor(((e.clientX - parentRect.left) / Math.max(1, parentRect.width)) * cols) + 1,
					dragState.gridResizeBase.col,
					cols
				);
				const row = clamp(
					Math.floor(((e.clientY - parentRect.top) / Math.max(1, parentRect.height)) * rows) + 1,
					dragState.gridResizeBase.row,
					rows
				);
				dragState.gridResizeBase = {
					...dragState.gridResizeBase,
					rowSpan: Math.max(1, row - dragState.gridResizeBase.row + 1),
					colSpan: Math.max(1, col - dragState.gridResizeBase.col + 1)
				};
				const previewWidth = Math.max(1, (parentRect.width * dragState.gridResizeBase.colSpan) / cols);
				const previewHeight = Math.max(1, (parentRect.height * dragState.gridResizeBase.rowSpan) / rows);
				latestTransform = {
					...latestTransform,
					width: previewWidth,
					height: previewHeight
				};
				onTransform(latestTransform);
				return;
			}

			if (dragState.mode.kind === "cell-snap") {
				const session = dragState.cellSnap;
				if (!session) return;
				moveGhostToPointer(session, e.clientX, e.clientY);
				updateCellSnapSessionPointer(session, e.clientX, e.clientY);
			}
		};

		const onUp = () => {
			if (dragState.cellSnap) destroyCellSnapSession(dragState.cellSnap);
			this.stopPointerSession();
			const finalMode = dragState.mode.kind;
			const finalCellTarget = dragState.cellSnap ? resolveActiveCellTarget(dragState.cellSnap) : null;
			onCommit(latestTransform, finalMode, {
				translateX: latestTransform.x - (basePosition?.x ?? 0),
				translateY: latestTransform.y - (basePosition?.y ?? 0),
				...(dragState.mode.kind === "resize-grid-se" && dragState.gridResizeBase
					? {
							gridPlacement: {
								row: dragState.gridResizeBase.row,
								col: dragState.gridResizeBase.col,
								rowSpan: dragState.gridResizeBase.rowSpan,
								colSpan: dragState.gridResizeBase.colSpan
							}
						}
					: {}),
				...(finalCellTarget
					? {
							cell: { row: finalCellTarget.row, col: finalCellTarget.col },
							reorderIndex: finalCellTarget.reorderIndex
						}
					: {})
			});
			if (finalMode === "cell-snap" || alwaysResyncOnCommit) {
				resyncFromDom();
				win.requestAnimationFrame(() => win.requestAnimationFrame(() => onOverlayHidden(false)));
			} else {
				onOverlayHidden(false);
			}
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

export function getBasePositionWithoutTranslate(
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

function createCellSnapSession({
	element,
	parent,
	grid,
	overlayContainer,
	pointer
}: {
	element: HTMLElement;
	parent: HTMLElement;
	grid: SnapGridSpec;
	overlayContainer: HTMLElement | null;
	pointer: Pt;
}): CellSnapSession | null {
	if (!overlayContainer) return null;
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

	const clone = parent.cloneNode(false) as HTMLElement;
	clone.removeAttribute("id");
	clone.id = "vte-reposition-grid-clone";
	clone.setAttribute("data-vte-reposition-grid-clone", "");
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
	ghost.setAttribute("data-vte-reposition-drag-ghost", "");
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
	ghost.style.boxShadow = "0 8px 28px rgba(0,0,0,0.28)";

	root.appendChild(clone);
	root.appendChild(ghost);
	overlayContainer.appendChild(root);

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
		updateCellSnapSessionPointer(session, pointer.x, pointer.y);
	} else {
		session.activeIndex = findNearestDropTargetIndex(session.targets, pointer.x, pointer.y);
		if (session.targets[session.activeIndex]) paintDropTarget(session.targets[session.activeIndex].node, true);
	}
	moveGhostToPointer(session, pointer.x, pointer.y);
	element.style.visibility = "hidden";
	return session;
}

function destroyCellSnapSession(session: CellSnapSession) {
	session.sourceElement.style.visibility = session.sourceVisibility;
	if (session.root.parentNode) session.root.parentNode.removeChild(session.root);
}

function paintDropTarget(node: HTMLElement, selected: boolean) {
	node.classList.toggle("vte-reposition-cell-active", selected);
}

function moveGhostToPointer(session: CellSnapSession, clientX: number, clientY: number) {
	session.ghost.style.transform = `translate(${clientX - session.pointerOffset.x}px, ${clientY - session.pointerOffset.y}px)`;
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
	if (session.fineTargets?.length) {
		return session.fineTargets[session.activeIndex] ?? session.fineTargets[0] ?? null;
	}
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

function buildDropTargets(grid: SnapGridSpec): CellDropTarget[] {
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

function buildSuperDropTargets(grid: Extract<SnapGridSpec, { kind: "grid" }>): SuperCellDropTarget[] {
	const cols = Math.max(1, grid.cols);
	const rows = Math.max(1, grid.rows);
	const superCols = Math.ceil(cols / 10);
	const superRows = Math.ceil(rows / 10);
	const targets: SuperCellDropTarget[] = [];
	for (let sr = 0; sr < superRows; sr += 1) {
		for (let sc = 0; sc < superCols; sc += 1) {
			const rowStart = sr * 10 + 1;
			const colStart = sc * 10 + 1;
			targets.push({
				rowStart,
				colStart,
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
