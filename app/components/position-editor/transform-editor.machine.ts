import { assign, createMachine } from "xstate";

import type { ElementTransform } from "./lib.types";
import {
	canUseDOM,
	getOffsetParent,
	getViewportMatrix,
	matrixFromElementTransform,
	readTransformPreserve
} from "./lib";
import {
	type DragCommitMeta,
	type DragMode,
	type SnapGridSpec,
	TransformEditorDomService,
	getBasePositionWithoutTranslate
} from "./transform-editor.service";

export type TransformEditorMachineInput = {
	service: TransformEditorDomService;
	element: HTMLElement | null;
	active?: boolean;
	onCommit: (t: ElementTransform, mode: DragMode["kind"], meta: DragCommitMeta) => void;
	snapParentElement?: HTMLElement | null;
	snapParentId?: string | null;
	snapGrid?: SnapGridSpec | null;
	value?: Partial<ElementTransform>;
	applyToElement?: boolean;
	minWidth?: number;
	minHeight?: number;
	overlayContainer?: HTMLElement | null;
	className?: string;
	syncToken?: string | number | null;
	disableLiveTransform?: boolean;
	alwaysResyncOnCommit?: boolean;
};

type Ctx = {
	input: TransformEditorMachineInput;
	domOk: boolean;
	t: ElementTransform | null;
	basePosition: { x: number; y: number } | null;
	offsetParent: HTMLElement | null;
	portalHost: HTMLElement | null;
	hideOverlayFrame: boolean;
	isDragging: boolean;
	nonce: number;
};

type Ev =
	| { type: "props.sync"; input: TransformEditorMachineInput }
	| { type: "bump" }
	| { type: "overlay.hide"; hidden: boolean }
	| { type: "drag.session"; active: boolean }
	| { type: "transform.update"; transform: ElementTransform }
	| { type: "transform.resync"; transform: ElementTransform; base: { x: number; y: number } }
	| { type: "drag.start"; mode: DragMode; clientX: number; clientY: number }
	| { type: "drag.end" };

export function mergeTransformFromInput(
	measured: ElementTransform,
	inputValue: Partial<ElementTransform> | null | undefined
): ElementTransform {
	if (!inputValue) return measured;
	const next = { ...measured };
	for (const key of ["rotate", "originX", "originY", "scaleX", "scaleY"] as const) {
		const value = inputValue[key];
		if (typeof value == "number" && Number.isFinite(value)) {
			next[key] = value;
		}
	}
	return next;
}

export const transformEditorMachine = createMachine(
	{
		types: {} as { context: Ctx; events: Ev; input: TransformEditorMachineInput },
		id: "transform-editor",
		context: ({ input }) => {
			const active = input.active ?? true;
			const domOk = canUseDOM(input.element);
			const t = domOk && active && input.element ? readTransformPreserve(input.element) : null;
			return {
				input,
				domOk,
				t,
				basePosition: domOk && input.element && t ? getBasePositionWithoutTranslate(input.element, t) : null,
				offsetParent: input.element ? getOffsetParent(input.element) : null,
				portalHost: null,
				hideOverlayFrame: false,
				isDragging: false,
				nonce: 0
			};
		},
		entry: ["syncFromInput"],
		on: {
			"props.sync": {
				actions: [assign(({ event }) => ({ input: event.input })), "syncFromInput", "applyLiveTransform"]
			},
			bump: {
				actions: assign(({ context }) => ({ nonce: context.nonce + 1 }))
			},
			"overlay.hide": {
				actions: [assign(({ event }) => ({ hideOverlayFrame: event.hidden })), "applyLiveTransform"]
			},
			"drag.session": {
				actions: [assign(({ event }) => ({ isDragging: event.active })), "applyLiveTransform"]
			},
			"transform.update": {
				actions: [assign(({ event }) => ({ t: event.transform })), "applyLiveTransform"]
			},
			"transform.resync": {
				actions: [assign(({ event }) => ({ t: event.transform, basePosition: event.base })), "applyLiveTransform"]
			},
			"drag.start": {
				actions: ["startDrag"]
			},
			"drag.end": {
				actions: ["stopDrag", "stopDragSession"]
			}
		}
	},
	{
		actions: {
			syncFromInput: assign(({ context, self }) => {
				const input = context.input;
				const active = input.active ?? true;
				const domOk = canUseDOM(input.element);
				const offsetParent = input.element ? getOffsetParent(input.element) : null;
				const measured = domOk && active && input.element ? readTransformPreserve(input.element) : null;
				const t = measured ? mergeTransformFromInput(measured, input.value) : null;
				const basePosition =
					domOk && input.element && t ? getBasePositionWithoutTranslate(input.element, t) : null;
				const portalHost =
					domOk && active && input.element
						? input.service.attachOverlayHost(input.element, input.overlayContainer ?? null)
						: null;

				if (!domOk || !active || !input.element) {
					input.service.stopPointerSession();
					input.service.detachOverlayHost();
				} else {
					// Retry if element doesn't have valid dimensions yet
					// This handles auto-layout items that need time to measure
					if (t && (t.width <= 1 || t.height <= 1)) {
						const win = input.element.ownerDocument.defaultView;
						if (win) {
							win.requestAnimationFrame(() => self.send({ type: "props.sync", input }));
						}
					}
				}

				return { domOk, offsetParent, t, basePosition, portalHost };
			}),
			startDrag: ({ context, event, self }) => {
				if (event.type !== "drag.start") return;
				const input = context.input;
				if (!context.domOk || !input.element || !context.offsetParent || !context.t) return;

				const started = input.service.startDrag({
					element: input.element,
					offsetParent: context.offsetParent,
					mode: event.mode,
					clientX: event.clientX,
					clientY: event.clientY,
					basePosition: context.basePosition,
					currentTransform: context.t,
					minWidth: input.minWidth ?? 8,
					minHeight: input.minHeight ?? 8,
					snapParentElement: input.snapParentElement,
					snapParentId: input.snapParentId,
					snapGrid: input.snapGrid,
					portalHost: context.portalHost,
					onTransform: (transform) => self.send({ type: "transform.update", transform }),
					onResyncTransform: (transform, base) => self.send({ type: "transform.resync", transform, base }),
					onOverlayHidden: (hidden) => self.send({ type: "overlay.hide", hidden }),
					onCommit: (transform, mode, meta) => input.onCommit(transform, mode, meta),
					onEnd: () => self.send({ type: "drag.end" }),
					alwaysResyncOnCommit: input.alwaysResyncOnCommit
				});

				self.send({ type: "drag.session", active: started });
				if (!started) self.send({ type: "overlay.hide", hidden: false });
			},
			stopDrag: ({ context }) => {
				context.input.service.stopPointerSession();
			},
			stopDragSession: ({ self }) => {
				self.send({ type: "drag.session", active: false });
			},
			applyLiveTransform: ({ context }) => {
				if (!context.isDragging) return;
				if (context.input.disableLiveTransform) return;
				context.input.service.applyTransformLive(context.input.element, context.t, context.basePosition, {
					applyToElement: context.input.applyToElement ?? true,
					hidden: context.hideOverlayFrame
				});
			}
		}
	}
);

export function buildFrame(
	t: ElementTransform | null,
	offsetParent: HTMLElement | null
): { w: number; h: number; M: DOMMatrix } | null {
	if (!t || !offsetParent) return null;
	const parentToViewport = getViewportMatrix(offsetParent);
	const localToParentMatrix = matrixFromElementTransform(t);
	const localToViewport = parentToViewport.multiply(localToParentMatrix);

	const scaleX = Math.hypot(localToViewport.a, localToViewport.b) || 1;
	const scaleY = Math.hypot(localToViewport.c, localToViewport.d) || 1;

	const noScaleMatrix = new DOMMatrix([
		localToViewport.a / scaleX,
		localToViewport.b / scaleX,
		localToViewport.c / scaleY,
		localToViewport.d / scaleY,
		localToViewport.e,
		localToViewport.f
	]);

	const displayWidth = Math.max(1, t.width * scaleX);
	const displayHeight = Math.max(1, t.height * scaleY);

	return { w: displayWidth, h: displayHeight, M: noScaleMatrix };
}
