import cx from "classnames";
import { animate } from "animejs";
import {
	useEffect,
	useState,
	useSyncExternalStore,
	useRef,
	type Dispatch,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	type SetStateAction
} from "react";

import type { CustomEventPosition } from "@/config/custom-events";

import {
	detachPointerGestureListeners,
	startPointerGesture,
	type RefCell,
	type PointerGestureFrame
} from "./pointer-gesture-orchestrator";
import {
	buildTimelineAnchors,
	resolveNearestTimelineAnchor,
	resolveTimelinePointer,
	type TimelineAnchorGeometry
} from "./timeline-anchor-geometry";

import type { RubberCueSnapPoint } from "./rubber-proportional-layout";
import type { TimelineEditablePointHandle } from "./timeline-point-editor.model";

const HANDLE_SIZE_PX = 14;
const HANDLE_RADIUS_PX = HANDLE_SIZE_PX / 2;

type DragPreview = {
	action: string;
	kind: TimelineEditablePointHandle["kind"];
	x: number;
	y: number;
};

export function TimelinePointEditor({
	containerRef,
	handles,
	snapPoints,
	onSelect,
	onCommit
}: {
	containerRef: RefObject<HTMLUListElement | null>;
	handles: Array<TimelineEditablePointHandle>;
	snapPoints: Array<RubberCueSnapPoint>;
	onSelect?: (action: string) => void;
	onCommit: (action: string, point: { cueName: string; position: CustomEventPosition }) => void;
}) {
	const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
	const dragPreviewRef = useRef<DragPreview | null>(null);
	const animationRef = useRef<ReturnType<typeof animate> | null>(null);
	const pointerMoveListenerRef = useRef<((event: PointerEvent) => void) | null>(null);
	const pointerUpListenerRef = useRef<((event: PointerEvent) => void) | null>(null);
	const viewportResizeKey = useViewportResizeKey();
	void viewportResizeKey;
	const anchors = buildTimelineAnchors(containerRef.current, snapPoints, {
		handleRadiusPx: HANDLE_RADIUS_PX
	});

	useEffect(() => {
		return () => {
			detachPointerGestureListeners({ moveRef: pointerMoveListenerRef, upRef: pointerUpListenerRef });
			animationRef.current?.cancel();
		};
	}, []);

	const handlePointerDown = (
		event: ReactPointerEvent<HTMLButtonElement>,
		handle: TimelineEditablePointHandle
	) => {
		onSelect?.(handle.action);
		animationRef.current?.cancel();

		startPointerGesture<{ x: number; y: number }>({
			startEvent: event,
			listenerRefs: { moveRef: pointerMoveListenerRef, upRef: pointerUpListenerRef },
			resolvePoint: (clientX, clientY) => {
				const pointer = resolveTimelinePointer(containerRef.current, clientX, clientY);
				if (!pointer) return null;
				return pointer;
			},
			onStart: ({ currentPoint }) => {
				const snappedPoint = snapPointToAnchorRow(currentPoint, anchors);
				const preview = {
					action: handle.action,
					kind: handle.kind,
					x: snappedPoint.x,
					y: snappedPoint.y
				};
				dragPreviewRef.current = preview;
				setDragPreview(preview);
			},
			onMove: ({ currentPoint }) => {
				const current = dragPreviewRef.current;
				if (!current || current.action !== handle.action) return;
				const snappedPoint = snapPointToAnchorRow(currentPoint, anchors);
				const nextPreview = { ...current, x: snappedPoint.x, y: snappedPoint.y };
				dragPreviewRef.current = nextPreview;
				setDragPreview(nextPreview);
			},
			onComplete: (frame) => {
				commitTimelineDrag({ frame, handle, anchors, onCommit, dragPreviewRef, setDragPreview, animationRef });
			},
			onCancel: () => {
				dragPreviewRef.current = null;
				setDragPreview(null);
			}
		});
	};

	return (
		<div className="pointer-events-none absolute inset-0 z-20">
			{handles.map((handle) => {
				const anchor = anchors.find(
					(candidate) => candidate.cueName === handle.cueName && candidate.position === handle.position
				);
				if (!anchor) return null;
				if (dragPreview?.action === handle.action) return null;

				return (
					<button
						type="button"
						key={handle.action}
						title={handle.action}
						onPointerDown={(event) => handlePointerDown(event, handle)}
						className={cx(
							"pointer-events-auto absolute z-30 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm ring-1 ring-white transition-colors",
							handle.kind === "intro" &&
								(handle.isActive ? "border-emerald-700 bg-emerald-400" : "border-emerald-500 bg-emerald-300"),
							handle.kind === "outro" &&
								(handle.isActive ? "border-orange-700 bg-orange-400" : "border-orange-500 bg-orange-300"),
							handle.kind === "custom" &&
								(handle.isActive ? "border-blue-700 bg-blue-400" : "border-blue-500 bg-blue-300")
						)}
						style={{ left: `${anchor.x}px`, top: `${anchor.y}px` }}
					/>
				);
			})}

			{dragPreview ? (
				<span
					className={cx(
						"pointer-events-none absolute z-30 inline-block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow",
						dragPreview.kind === "intro" && "border-emerald-700 bg-emerald-400",
						dragPreview.kind === "outro" && "border-orange-700 bg-orange-400",
						dragPreview.kind === "custom" && "border-blue-700 bg-blue-400"
					)}
					style={{ left: `${dragPreview.x}px`, top: `${dragPreview.y}px` }}
				/>
			) : null}
		</div>
	);
}

function useViewportResizeKey(): string {
	return useSyncExternalStore(subscribeViewportResize, getViewportResizeSnapshot, () => "0x0");
}

function subscribeViewportResize(onStoreChange: () => void): () => void {
	if (typeof window == "undefined") return () => {};
	window.addEventListener("resize", onStoreChange);
	window.visualViewport?.addEventListener("resize", onStoreChange);
	return () => {
		window.removeEventListener("resize", onStoreChange);
		window.visualViewport?.removeEventListener("resize", onStoreChange);
	};
}

function getViewportResizeSnapshot(): string {
	if (typeof window == "undefined") return "0x0";
	return `${window.innerWidth}x${window.innerHeight}`;
}

function commitTimelineDrag(params: {
	frame: PointerGestureFrame<{ x: number; y: number }>;
	handle: TimelineEditablePointHandle;
	anchors: Array<TimelineAnchorGeometry>;
	onCommit: (action: string, point: { cueName: string; position: CustomEventPosition }) => void;
	dragPreviewRef: RefCell<DragPreview | null>;
	setDragPreview: Dispatch<SetStateAction<DragPreview | null>>;
	animationRef: RefCell<ReturnType<typeof animate> | null>;
}) {
	const { frame, handle, anchors, onCommit, dragPreviewRef, setDragPreview, animationRef } = params;
	const snappedPoint = snapPointToAnchorRow(frame.currentPoint, anchors);
	const nearestAnchor = resolveNearestTimelineAnchor(anchors, snappedPoint.x, snappedPoint.y, {
		gapPreference: handle.kind === "intro" || handle.kind === "outro" ? handle.kind : null
	});
	if (!nearestAnchor) {
		dragPreviewRef.current = null;
		setDragPreview(null);
		return;
	}

	const from = { x: snappedPoint.x, y: snappedPoint.y };
	const to = { x: nearestAnchor.x, y: nearestAnchor.y };
	const distance = Math.hypot(to.x - from.x, to.y - from.y);

	const commit = () => {
		if (nearestAnchor.cueName === handle.cueName && nearestAnchor.position === handle.position) {
			dragPreviewRef.current = null;
			setDragPreview(null);
			return;
		}
		onCommit(handle.action, { cueName: nearestAnchor.cueName, position: nearestAnchor.position });
		dragPreviewRef.current = null;
		setDragPreview(null);
	};

	if (distance < 1) {
		commit();
		return;
	}

	const vector = { ...from };
	animationRef.current?.cancel();
	animationRef.current = animate(vector, {
		x: to.x,
		y: to.y,
		duration: 130,
		easing: "easeOutQuad",
		onUpdate: () => {
			setDragPreview((current) => {
				if (!current || current.action !== handle.action) return current;
				return { ...current, x: vector.x, y: vector.y };
			});
		},
		onComplete: commit
	});
}

function snapPointToAnchorRow(
	point: { x: number; y: number },
	anchors: Array<TimelineAnchorGeometry>
): { x: number; y: number } {
	if (!anchors.length) return point;
	let nearest = anchors[0];
	let nearestDistance = Math.abs(anchors[0].y - point.y);
	for (let index = 1; index < anchors.length; index += 1) {
		const candidate = anchors[index];
		const distance = Math.abs(candidate.y - point.y);
		if (distance < nearestDistance) {
			nearest = candidate;
			nearestDistance = distance;
		}
	}
	return { x: point.x, y: nearest.y };
}
