import cx from "classnames";
import {
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	type SetStateAction
} from "react";

import {
	detachPointerGestureListeners,
	startPointerGesture,
	type RefCell,
	type PointerGestureFrame
} from "./pointer-gesture-orchestrator";

import type { TimelineEditablePointHandle } from "./timeline-point-editor.model";
import { WaveformPositionLayout } from "./waveform-position-layout";

type WaveformHandle = TimelineEditablePointHandle & {
	timeSec: number;
};

type DragPreview = {
	action: string;
	kind: TimelineEditablePointHandle["kind"];
	x: number;
};

export function WaveformPointEditor({
	containerRef,
	handles,
	durationSec,
	onSelect,
	onCommit
}: {
	containerRef: RefObject<HTMLDivElement | null>;
	handles: Array<WaveformHandle>;
	durationSec: number;
	onSelect?: (action: string) => void;
	onCommit: (action: string, timeSec: number) => void;
}) {
	const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
	const dragPreviewRef = useRef<DragPreview | null>(null);
	const pointerMoveListenerRef = useRef<((event: PointerEvent) => void) | null>(null);
	const pointerUpListenerRef = useRef<((event: PointerEvent) => void) | null>(null);
	const layout = new WaveformPositionLayout(durationSec);

	useEffect(() => {
		return () => {
			detachPointerGestureListeners({ moveRef: pointerMoveListenerRef, upRef: pointerUpListenerRef });
		};
	}, []);

	const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, handle: WaveformHandle) => {
		onSelect?.(handle.action);

		startPointerGesture<number>({
			startEvent: event,
			listenerRefs: { moveRef: pointerMoveListenerRef, upRef: pointerUpListenerRef },
			resolvePoint: (clientX) => resolveRelativeX(containerRef.current, clientX),
			onStart: ({ currentPoint }) => {
				const preview = { action: handle.action, kind: handle.kind, x: currentPoint };
				dragPreviewRef.current = preview;
				setDragPreview(preview);
			},
			onMove: ({ currentPoint }) => {
				const current = dragPreviewRef.current;
				if (!current || current.action !== handle.action) return;
				const nextPreview = { ...current, x: currentPoint };
				dragPreviewRef.current = nextPreview;
				setDragPreview(nextPreview);
			},
			onComplete: (frame) => {
				commitWaveformDrag({
					frame,
					handle,
					containerRef,
					layout,
					onCommit,
					dragPreviewRef,
					setDragPreview
				});
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
				if (dragPreview?.action === handle.action) return null;
				return (
					<button
						type="button"
						key={handle.action}
						title={handle.action}
						onPointerDown={(event) => onPointerDown(event, handle)}
						className={cx(
							"pointer-events-auto absolute top-1/2 z-30 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors",
							handle.kind === "intro" &&
								(handle.isActive ? "border-emerald-700 bg-emerald-400" : "border-emerald-500 bg-emerald-300"),
							handle.kind === "outro" &&
								(handle.isActive ? "border-orange-700 bg-orange-400" : "border-orange-500 bg-orange-300"),
							handle.kind === "custom" &&
								(handle.isActive ? "border-blue-700 bg-blue-400" : "border-blue-500 bg-blue-300")
						)}
						style={{ left: `${layout.secToPercent(handle.timeSec)}%` }}
					/>
				);
			})}

			{dragPreview ? (
				<span
					className={cx(
						"pointer-events-none absolute top-1/2 z-30 inline-block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow",
						dragPreview.kind === "intro" && "border-emerald-700 bg-emerald-400",
						dragPreview.kind === "outro" && "border-orange-700 bg-orange-400",
						dragPreview.kind === "custom" && "border-blue-700 bg-blue-400"
					)}
					style={{ left: `${dragPreview.x}px` }}
				/>
			) : null}
		</div>
	);
}

function resolveRelativeX(container: HTMLDivElement | null, clientX: number): number | null {
	if (!container) return null;
	const rect = container.getBoundingClientRect();
	if (!Number.isFinite(rect.width) || rect.width <= 0) return null;
	const x = clientX - rect.left;
	if (!Number.isFinite(x)) return null;
	if (x < 0) return 0;
	if (x > rect.width) return rect.width;
	return x;
}

function commitWaveformDrag(params: {
	frame: PointerGestureFrame<number>;
	handle: WaveformHandle;
	containerRef: RefObject<HTMLDivElement | null>;
	layout: WaveformPositionLayout;
	onCommit: (action: string, timeSec: number) => void;
	dragPreviewRef: RefCell<DragPreview | null>;
	setDragPreview: Dispatch<SetStateAction<DragPreview | null>>;
}) {
	const { frame, handle, containerRef, layout, onCommit, dragPreviewRef, setDragPreview } = params;
	const container = containerRef.current;
	if (!container) {
		dragPreviewRef.current = null;
		setDragPreview(null);
		return;
	}

	const width = container.clientWidth;
	const timeSec = layout.xToSec(frame.currentPoint, width);
	if (Math.abs(timeSec - handle.timeSec) > 0.001) {
		onCommit(handle.action, timeSec);
	}

	dragPreviewRef.current = null;
	setDragPreview(null);
}
