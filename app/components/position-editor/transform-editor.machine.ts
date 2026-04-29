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
	service?: TransformEditorDomService;
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
	service: TransformEditorDomService;
	input: TransformEditorMachineInput;
	domOk: boolean;
	t: ElementTransform | null;
	basePosition: { x: number; y: number } | null;
	offsetParent: HTMLElement | null;
	overlayContainer: HTMLElement | null;
	hideOverlayFrame: boolean;
	isDragging: boolean;
	syncRetryCount: number;
	nonce: number;
};

const MAX_SYNC_RETRIES = 10;

export type Ev =
	| { type: "props.sync"; input: TransformEditorMachineInput }
	| { type: "sync.retry" }
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
			const service = input.service ?? new TransformEditorDomService();
			return {
				service,
				input,
				domOk,
				t,
				basePosition: domOk && input.element && t ? getBasePositionWithoutTranslate(input.element, t) : null,
				offsetParent: input.element ? getOffsetParent(input.element) : null,
				overlayContainer: null,
				hideOverlayFrame: false,
				isDragging: false,
				syncRetryCount: 0,
				nonce: 0
			};
		},
		entry: ["syncFromInput"],
		exit: ["disposeService"],
		on: {
			"props.sync": {
				actions: [
					assign(({ event }) => ({ input: event.input })),
					"syncFromInput",
					"scheduleRetryIfNeeded",
					"applyLiveTransform"
				]
			},
			"sync.retry": {
				actions: ["syncFromInput", "scheduleRetryIfNeeded"]
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
			syncFromInput: assign(({ context }) => {
				const input = context.input;
				const service = context.service;
				const active = input.active ?? true;
				const domOk = canUseDOM(input.element);
				const elementRect = input.element?.getBoundingClientRect() ?? null;
				const offsetParent = input.element ? getOffsetParent(input.element) : null;
				const measured = domOk && active && input.element ? readTransformPreserve(input.element) : null;
				const t = measured ? mergeTransformFromInput(measured, input.value) : null;
				const basePosition =
					domOk && input.element && t ? getBasePositionWithoutTranslate(input.element, t) : null;
				const overlayContainer =
					domOk && active && input.element
						? (input.overlayContainer ?? input.element.ownerDocument.body)
						: null;
				const shouldRetry = Boolean(domOk && active && elementRect && (elementRect.width <= 1 || elementRect.height <= 1));
				const syncRetryCount = shouldRetry ? context.syncRetryCount + 1 : 0;

				if (!domOk || !active || !input.element) {
					service.stopPointerSession();
				}

				return { domOk, offsetParent, t, basePosition, overlayContainer, syncRetryCount };
			}),
			scheduleRetryIfNeeded: ({ context, self }) => {
				const input = context.input;
				if (!input.element || !(input.active ?? true)) return;
				if (context.syncRetryCount < 1 || context.syncRetryCount > MAX_SYNC_RETRIES) return;
				const rect = input.element.getBoundingClientRect();
				if (rect.width > 1 && rect.height > 1) return;
				const win = input.element.ownerDocument.defaultView;
				if (!win) return;
				win.requestAnimationFrame(() => {
					self.send({ type: "sync.retry" });
				});
			},
			startDrag: ({ context, event, self }) => {
				if (event.type !== "drag.start") return;
				const input = context.input;
				const service = context.service;
				if (!context.domOk || !input.element || !context.offsetParent || !context.t) return;

				const started = service.startDrag({
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
					overlayContainer: context.overlayContainer,
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
				context.service.stopPointerSession();
			},
			stopDragSession: ({ self }) => {
				self.send({ type: "drag.session", active: false });
			},
			disposeService: ({ context }) => {
				context.service.dispose();
			},
			applyLiveTransform: ({ context }) => {
				if (!context.isDragging) return;
				if (context.input.disableLiveTransform) return;
				context.service.applyTransformLive(context.input.element, context.t, context.basePosition, {
					applyToElement: context.input.applyToElement ?? true,
					hidden: context.hideOverlayFrame
				});
			}
		}
	}
);

export function buildFrame(
	t: ElementTransform | null,
	offsetParent: HTMLElement | null,
	element?: HTMLElement | null
): { w: number; h: number; M: DOMMatrix } | null {
	if (!t) return null;

	const localToViewport = element
		? getViewportMatrix(element)
		: offsetParent
			? getViewportMatrix(offsetParent).multiply(matrixFromElementTransform(t))
			: null;
	if (!localToViewport) return null;

	const localWidth = Math.max(1, element?.offsetWidth ?? t.width);
	const localHeight = Math.max(1, element?.offsetHeight ?? t.height);

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

	const displayWidth = Math.max(1, localWidth * scaleX);
	const displayHeight = Math.max(1, localHeight * scaleY);

	return { w: displayWidth, h: displayHeight, M: noScaleMatrix };
}
