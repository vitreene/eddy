import cx from "classnames";
import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";

import type { CustomEventPosition } from "@/config/custom-events";

import type { RubberCueSnapPoint } from "./rubber-proportional-layout";
import type { TimelineEditablePointHandle } from "./timeline-point-editor.model";

type TimelineAnchor = {
	id: string;
	cueName: string;
	position: CustomEventPosition;
	x: number;
	y: number;
	cueWidth: number;
};

const MIDDLE_SNAP_PENALTY_RATIO = 0.1;
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
	containerRef: React.RefObject<HTMLUListElement | null>;
	handles: Array<TimelineEditablePointHandle>;
	snapPoints: Array<RubberCueSnapPoint>;
	onSelect?: (action: string) => void;
	onCommit: (action: string, point: { cueName: string; position: CustomEventPosition }) => void;
}) {
	const [anchors, setAnchors] = useState<Array<TimelineAnchor>>([]);
	const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
	const dragPreviewRef = useRef<DragPreview | null>(null);
	const animationRef = useRef<ReturnType<typeof animate> | null>(null);
	const pointerMoveListenerRef = useRef<((event: PointerEvent) => void) | null>(null);
	const pointerUpListenerRef = useRef<((event: PointerEvent) => void) | null>(null);

	useEffect(() => {
		const refreshAnchors = () => {
			const nextAnchors = resolveAnchors(containerRef.current, snapPoints);
			setAnchors(nextAnchors);
		};

		refreshAnchors();
		window.addEventListener("resize", refreshAnchors);
		return () => {
			window.removeEventListener("resize", refreshAnchors);
		};
	}, [containerRef, snapPoints]);

	useEffect(() => {
		return () => {
			detachActivePointerListeners(pointerMoveListenerRef, pointerUpListenerRef);
			animationRef.current?.cancel();
		};
	}, []);

	const handlePointerDown = (
		event: React.PointerEvent<HTMLButtonElement>,
		handle: TimelineEditablePointHandle
	) => {
		event.preventDefault();
		event.stopPropagation();

		onSelect?.(handle.action);
		animationRef.current?.cancel();
		detachActivePointerListeners(pointerMoveListenerRef, pointerUpListenerRef);

		const pointerPosition = resolveRelativePointer(containerRef.current, event.clientX, event.clientY);
		if (!pointerPosition) return;

		const initialPreview = {
			action: handle.action,
			kind: handle.kind,
			x: pointerPosition.x,
			y: pointerPosition.y
		};
		dragPreviewRef.current = initialPreview;
		setDragPreview(initialPreview);

		const onMove = (moveEvent: PointerEvent) => {
			const nextPointerPosition = resolveRelativePointer(
				containerRef.current,
				moveEvent.clientX,
				moveEvent.clientY
			);
			if (!nextPointerPosition) return;
			const current = dragPreviewRef.current;
			if (!current || current.action !== handle.action) return;
			const nextPreview = { ...current, x: nextPointerPosition.x, y: nextPointerPosition.y };
			dragPreviewRef.current = nextPreview;
			setDragPreview(nextPreview);
		};

		const onUp = (upEvent: PointerEvent) => {
			const releasePointer = resolveRelativePointer(containerRef.current, upEvent.clientX, upEvent.clientY);
			const currentPreview =
				releasePointer && dragPreviewRef.current
					? { ...dragPreviewRef.current, x: releasePointer.x, y: releasePointer.y }
					: dragPreviewRef.current;
			dragPreviewRef.current = currentPreview;
			if (!currentPreview || currentPreview.action !== handle.action) {
				dragPreviewRef.current = null;
				setDragPreview(null);
				detachActivePointerListeners(pointerMoveListenerRef, pointerUpListenerRef);
				return;
			}

			const nearestAnchor = resolveNearestAnchor(anchors, currentPreview.x, currentPreview.y, handle.kind);
			if (!nearestAnchor) {
				setDragPreview(null);
				detachActivePointerListeners(pointerMoveListenerRef, pointerUpListenerRef);
				return;
			}

			const from = { x: currentPreview.x, y: currentPreview.y };
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
			} else {
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

			detachActivePointerListeners(pointerMoveListenerRef, pointerUpListenerRef);
		};

		pointerMoveListenerRef.current = onMove;
		pointerUpListenerRef.current = onUp;
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
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

function resolveAnchors(
	container: HTMLUListElement | null,
	snapPoints: Array<RubberCueSnapPoint>
): Array<TimelineAnchor> {
	if (!container || !snapPoints.length) return [];

	const containerRect = container.getBoundingClientRect();
	if (!containerRect.width || !containerRect.height) return [];

	const cueNodes = Array.from(container.querySelectorAll<HTMLElement>("[data-rubber-cue]"));
	const rectByCueName = new Map<string, DOMRect>();
	for (const cueNode of cueNodes) {
		const cueName = cueNode.dataset.rubberCue;
		if (!cueName) continue;
		rectByCueName.set(cueName, cueNode.getBoundingClientRect());
	}

	const anchors: Array<TimelineAnchor> = [];
	for (const point of snapPoints) {
		const cueRect = rectByCueName.get(point.cueName);
		if (!cueRect) continue;
		const rawX =
			point.position === "start"
				? cueRect.left - containerRect.left
				: point.position === "end"
					? cueRect.right - containerRect.left
					: cueRect.left - containerRect.left + cueRect.width / 2;
		const rawY = cueRect.top - containerRect.top + cueRect.height / 2;
		const x = clamp(rawX, HANDLE_RADIUS_PX, containerRect.width - HANDLE_RADIUS_PX);
		const y = clamp(rawY, HANDLE_RADIUS_PX, containerRect.height - HANDLE_RADIUS_PX);
		anchors.push({
			id: point.id,
			cueName: point.cueName,
			position: point.position,
			x,
			y,
			cueWidth: Math.max(1, cueRect.width)
		});
	}

	return anchors;
}

function clamp(value: number, min: number, max: number): number {
	if (value < min) return min;
	if (value > max) return max;
	return value;
}

function resolveRelativePointer(container: HTMLUListElement | null, clientX: number, clientY: number) {
	if (!container) return null;
	const rect = container.getBoundingClientRect();
	return {
		x: clientX - rect.left,
		y: clientY - rect.top
	};
}

function resolveNearestAnchor(
	anchors: Array<TimelineAnchor>,
	x: number,
	y: number,
	handleKind: TimelineEditablePointHandle["kind"]
): TimelineAnchor | null {
	const gapPreferredAnchor = resolveGapPreferredAnchor(anchors, x, y, handleKind);
	if (gapPreferredAnchor) return gapPreferredAnchor;

	let nearest: TimelineAnchor | null = null;
	let nearestScore = Number.POSITIVE_INFINITY;

	for (const anchor of anchors) {
		const distance = Math.hypot(anchor.x - x, anchor.y - y);
		const middlePenalty = anchor.position === "middle" ? anchor.cueWidth * MIDDLE_SNAP_PENALTY_RATIO : 0;
		const score = distance + middlePenalty;
		if (score < nearestScore) {
			nearest = anchor;
			nearestScore = score;
		}
	}

	return nearest;
}

function resolveGapPreferredAnchor(
	anchors: Array<TimelineAnchor>,
	x: number,
	y: number,
	handleKind: TimelineEditablePointHandle["kind"]
): TimelineAnchor | null {
	if (handleKind !== "intro" && handleKind !== "outro") return null;

	const ROW_Y_TOLERANCE = 8;
	const rowAnchors = anchors.filter((anchor) => Math.abs(anchor.y - y) <= ROW_Y_TOLERANCE);
	if (!rowAnchors.length) return null;

	const startAnchors = rowAnchors
		.filter((anchor) => anchor.position === "start")
		.toSorted((a, b) => a.x - b.x);
	const endAnchors = rowAnchors.filter((anchor) => anchor.position === "end").toSorted((a, b) => a.x - b.x);
	if (!startAnchors.length || !endAnchors.length) return null;

	for (const endAnchor of endAnchors) {
		const nextStartAnchor = startAnchors.find((candidate) => candidate.x > endAnchor.x);
		if (!nextStartAnchor) continue;
		if (x < endAnchor.x || x > nextStartAnchor.x) continue;

		if (handleKind === "intro") return nextStartAnchor;
		return endAnchor;
	}

	return null;
}

function detachActivePointerListeners(
	pointerMoveListenerRef: React.MutableRefObject<((event: PointerEvent) => void) | null>,
	pointerUpListenerRef: React.MutableRefObject<((event: PointerEvent) => void) | null>
) {
	if (pointerMoveListenerRef.current) {
		window.removeEventListener("pointermove", pointerMoveListenerRef.current);
		pointerMoveListenerRef.current = null;
	}
	if (pointerUpListenerRef.current) {
		window.removeEventListener("pointerup", pointerUpListenerRef.current);
		pointerUpListenerRef.current = null;
	}
}
