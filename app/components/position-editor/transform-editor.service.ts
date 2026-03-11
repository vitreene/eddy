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

export type DragMode =
	| { kind: "move" }
	| { kind: "rotate" }
	| { kind: "resize-se" }
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
};

type CellDropTarget = {
	row: number;
	col: number;
	reorderIndex?: number;
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
	portalHost: HTMLElement | null;
	onTransform: (next: ElementTransform) => void;
	onResyncTransform: (next: ElementTransform, base: { x: number; y: number }) => void;
	onOverlayHidden: (hidden: boolean) => void;
	onCommit: (transform: ElementTransform, mode: DragMode["kind"], meta: DragCommitMeta) => void;
	onEnd: () => void;
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
	private portalHost: HTMLElement | null = null;
	private portalContainer: HTMLElement | null = null;
	private pointerCleanup: (() => void) | null = null;
	private ptr = createPointerConverters();

	attachOverlayHost(element: HTMLElement, overlayContainer: HTMLElement | null): HTMLElement | null {
		const container = overlayContainer ?? element.ownerDocument.body;
		if (this.portalContainer === container && this.portalHost?.isConnected) {
			return this.portalHost;
		}
		this.detachOverlayHost();
		const host = element.ownerDocument.createElement("div");
		host.setAttribute("data-vte-grid-overlay-host", "");
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
			portalHost,
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
				overlayHost: portalHost,
				pointer: { x: clientX, y: clientY }
			});
			if (!dragState.cellSnap) return false;
			onOverlayHidden(true);
		}

		if (mode.kind === "resize-se") {
			dragState.anchorTopLeftParent = localToParent(startT, { x: 0, y: 0 });
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

			if (dragState.mode.kind === "cell-snap") {
				const session = dragState.cellSnap;
				if (!session) return;
				moveGhostToPointer(session, e.clientX, e.clientY);
				const nextIndex = findNearestDropTargetIndex(session.targets, e.clientX, e.clientY);
				if (nextIndex !== session.activeIndex) {
					if (session.targets[session.activeIndex])
						paintDropTarget(session.targets[session.activeIndex].node, false);
					session.activeIndex = nextIndex;
					if (session.targets[session.activeIndex])
						paintDropTarget(session.targets[session.activeIndex].node, true);
				}
			}
		};

		const onUp = () => {
			if (dragState.cellSnap) destroyCellSnapSession(dragState.cellSnap);
			this.stopPointerSession();
			const finalMode = dragState.mode.kind;
			const finalCellTarget = dragState.cellSnap?.targets[dragState.cellSnap.activeIndex] ?? null;
			onCommit(latestTransform, finalMode, {
				translateX: latestTransform.x - (basePosition?.x ?? 0),
				translateY: latestTransform.y - (basePosition?.y ?? 0),
				...(finalCellTarget
					? {
							cell: { row: finalCellTarget.row, col: finalCellTarget.col },
							reorderIndex: finalCellTarget.reorderIndex
						}
					: {})
			});
			if (finalMode === "cell-snap") {
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
	overlayHost,
	pointer
}: {
	element: HTMLElement;
	parent: HTMLElement;
	grid: SnapGridSpec;
	overlayHost: HTMLElement | null;
	pointer: Pt;
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

	const targets = buildDropTargets(grid);
	if (!targets.length) return null;
	for (const target of targets) {
		const cell = doc.createElement("div");
		cell.className = "vte-reposition-cell";
		paintDropTarget(cell, false);
		target.node = cell;
		clone.appendChild(cell);
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
	overlayHost.appendChild(root);

	const session: CellSnapSession = {
		root,
		ghost,
		sourceElement: element,
		sourceVisibility: element.style.visibility,
		targets: targets.map((target) => ({ ...target, node: target.node! })),
		activeIndex: 0,
		pointerOffset: { x: pointer.x - elementRect.left, y: pointer.y - elementRect.top }
	};

	session.activeIndex = findNearestDropTargetIndex(session.targets, pointer.x, pointer.y);
	if (session.targets[session.activeIndex]) paintDropTarget(session.targets[session.activeIndex].node, true);
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
