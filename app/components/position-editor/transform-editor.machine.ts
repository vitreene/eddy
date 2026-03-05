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
	value?: ElementTransform;
	applyToElement?: boolean;
	minWidth?: number;
	minHeight?: number;
	overlayContainer?: HTMLElement | null;
	className?: string;
	syncToken?: string | number | null;
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
				const elementReady = domOk && active && input.element ? isElementRenderable(input.element) : false;
				const t = elementReady && input.element ? readTransformPreserve(input.element) : null;
				const basePosition =
					elementReady && input.element && t ? getBasePositionWithoutTranslate(input.element, t) : null;
				const portalHost =
					domOk && active && input.element
						? input.service.attachOverlayHost(input.element, input.overlayContainer ?? null)
						: null;

				if (!domOk || !active || !input.element) {
					input.service.stopPointerSession();
					input.service.detachOverlayHost();
				} else {
					if (!elementReady) {
						const win = input.element.ownerDocument.defaultView;
						if (win) {
							win.requestAnimationFrame(() => self.send({ type: "props.sync", input }));
						}
					}
				}

				if (input.element) {
					const win = input.element.ownerDocument.defaultView;
					if (win) {
						win.requestAnimationFrame(() => self.send({ type: "bump" }));
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
					onEnd: () => self.send({ type: "drag.end" })
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
	const displayWidth = Math.max(1, t.width * Math.abs(t.scaleX));
	const displayHeight = Math.max(1, t.height * Math.abs(t.scaleY));
	const pivotParent = {
		x: t.x + t.originX * t.width,
		y: t.y + t.originY * t.height
	};
	const frameTransform = {
		...t,
		width: displayWidth,
		height: displayHeight,
		x: pivotParent.x - t.originX * displayWidth,
		y: pivotParent.y - t.originY * displayHeight,
		scaleX: 1,
		scaleY: 1
	};
	const localToParentMatrix = matrixFromElementTransform(frameTransform);
	const localToViewport = parentToViewport.multiply(localToParentMatrix);
	return { w: displayWidth, h: displayHeight, M: localToViewport };
}

function isElementRenderable(element: HTMLElement): boolean {
	if (!element.isConnected) return false;
	const rect = element.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) return false;
	const cs = getComputedStyle(element);
	if (cs.display === "none" || cs.visibility === "hidden") return false;
	return true;
}
