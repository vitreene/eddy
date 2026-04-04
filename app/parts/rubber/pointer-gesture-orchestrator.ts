export type PointerGestureListener = ((event: PointerEvent) => void) | null;

export type RefCell<T> = { current: T };

export type PointerGestureListenerRefs = {
	moveRef: RefCell<PointerGestureListener>;
	upRef: RefCell<PointerGestureListener>;
};

export type PointerStartEventLike = {
	clientX: number;
	clientY: number;
	preventDefault: () => void;
	stopPropagation: () => void;
};

export type PointerGestureFrame<Point> = {
	startPoint: Point;
	currentPoint: Point;
	moved: boolean;
	deltaX: number;
	deltaY: number;
	distancePx: number;
};

export function detachPointerGestureListeners(refs: PointerGestureListenerRefs) {
	if (refs.moveRef.current) {
		window.removeEventListener("pointermove", refs.moveRef.current);
		refs.moveRef.current = null;
	}
	if (refs.upRef.current) {
		window.removeEventListener("pointerup", refs.upRef.current);
		refs.upRef.current = null;
	}
}

export function startPointerGesture<Point>(params: {
	startEvent: PointerStartEventLike;
	listenerRefs: PointerGestureListenerRefs;
	resolvePoint: (clientX: number, clientY: number) => Point | null;
	movementThresholdPx?: number;
	onStart?: (frame: PointerGestureFrame<Point>) => void;
	onMove?: (frame: PointerGestureFrame<Point>) => void;
	onComplete: (frame: PointerGestureFrame<Point>) => void;
	onCancel?: () => void;
}) {
	const {
		startEvent,
		listenerRefs,
		resolvePoint,
		movementThresholdPx = 4,
		onStart,
		onMove,
		onComplete,
		onCancel
	} = params;

	startEvent.preventDefault();
	startEvent.stopPropagation();
	detachPointerGestureListeners(listenerRefs);

	const startPoint = resolvePoint(startEvent.clientX, startEvent.clientY);
	if (!startPoint) {
		onCancel?.();
		return;
	}

	let moved = false;

	const buildFrame = (currentPoint: Point, clientX: number, clientY: number): PointerGestureFrame<Point> => {
		const deltaX = clientX - startEvent.clientX;
		const deltaY = clientY - startEvent.clientY;
		const distancePx = Math.hypot(deltaX, deltaY);
		if (distancePx >= movementThresholdPx) moved = true;
		return {
			startPoint,
			currentPoint,
			moved,
			deltaX,
			deltaY,
			distancePx
		};
	};

	onStart?.(buildFrame(startPoint, startEvent.clientX, startEvent.clientY));

	const handlePointerMove = (event: PointerEvent) => {
		const point = resolvePoint(event.clientX, event.clientY);
		if (!point) return;
		onMove?.(buildFrame(point, event.clientX, event.clientY));
	};

	const handlePointerUp = (event: PointerEvent) => {
		detachPointerGestureListeners(listenerRefs);
		const point = resolvePoint(event.clientX, event.clientY);
		if (!point) {
			onCancel?.();
			return;
		}
		onComplete(buildFrame(point, event.clientX, event.clientY));
	};

	listenerRefs.moveRef.current = handlePointerMove;
	listenerRefs.upRef.current = handlePointerUp;
	window.addEventListener("pointermove", handlePointerMove);
	window.addEventListener("pointerup", handlePointerUp);
}
