import { assign, createMachine } from "xstate";

import { canUseDOM, getOffsetParent, getViewportMatrix } from "./lib";
import {
	type PositionDragCommitMeta,
	type PositionDragMode,
	type PositionSnapGridSpec,
	PositionEditorDomService
} from "./position-editor.service";

export type PositionEditorMachineInput = {
	service: PositionEditorDomService;
	element: HTMLElement | null;
	active?: boolean;
	onCommit: (mode: PositionDragMode["kind"], meta: PositionDragCommitMeta) => void;
	snapParentElement?: HTMLElement | null;
	snapParentId?: string | null;
	snapGrid?: PositionSnapGridSpec | null;
	overlayContainer?: HTMLElement | null;
	className?: string;
	syncToken?: string | number | null;
};

type Ctx = {
	input: PositionEditorMachineInput;
	domOk: boolean;
	frame: { w: number; h: number; M: DOMMatrix } | null;
	offsetParent: HTMLElement | null;
	portalHost: HTMLElement | null;
	hideOverlayFrame: boolean;
	isDragging: boolean;
	previewSize: { width: number; height: number } | null;
};

type Ev =
	| { type: "props.sync"; input: PositionEditorMachineInput }
	| { type: "overlay.hide"; hidden: boolean }
	| { type: "drag.session"; active: boolean }
	| { type: "preview.update"; preview: { width: number; height: number } | null }
	| { type: "drag.start"; mode: PositionDragMode; clientX: number; clientY: number }
	| { type: "drag.end" };

export const positionEditorMachine = createMachine(
	{
		types: {} as { context: Ctx; events: Ev; input: PositionEditorMachineInput },
		id: "position-editor",
		context: ({ input }) => {
			const active = input.active ?? true;
			const domOk = canUseDOM(input.element);
			const offsetParent = input.element ? getOffsetParent(input.element) : null;
			const frame = active && input.element ? buildPositionFrame(input.element, null) : null;
			return {
				input,
				domOk,
				frame,
				offsetParent,
				portalHost: null,
				hideOverlayFrame: false,
				isDragging: false,
				previewSize: null
			};
		},
		entry: ["syncFromInput"],
		on: {
			"props.sync": {
				actions: [assign(({ event }) => ({ input: event.input })), "syncFromInput"]
			},
			"overlay.hide": {
				actions: [assign(({ event }) => ({ hideOverlayFrame: event.hidden }))]
			},
			"drag.session": {
				actions: [assign(({ event }) => ({ isDragging: event.active }))]
			},
			"preview.update": {
				actions: [
					assign(({ context, event }) => ({
						previewSize: event.preview,
						frame: rebuildFrame(context, event.preview)
					}))
				]
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
				const active = input.active ?? true;
				const domOk = canUseDOM(input.element);
				const offsetParent = input.element ? getOffsetParent(input.element) : null;
				const frame = active && input.element ? buildPositionFrame(input.element, context.previewSize) : null;
				const portalHost =
					domOk && active && input.element
						? input.service.attachOverlayHost(input.element, input.overlayContainer ?? null)
						: null;

				if (!domOk || !active || !input.element) {
					input.service.stopPointerSession();
					input.service.detachOverlayHost();
				}

				return { domOk, offsetParent, frame, portalHost };
			}),
			startDrag: ({ context, event, self }) => {
				if (event.type !== "drag.start") return;
				const input = context.input;
				if (!context.domOk || !input.element) return;

				const started = input.service.startDrag({
					element: input.element,
					mode: event.mode,
					clientX: event.clientX,
					clientY: event.clientY,
					snapParentElement: input.snapParentElement,
					snapParentId: input.snapParentId,
					snapGrid: input.snapGrid,
					portalHost: context.portalHost,
					onPreview: (preview) => self.send({ type: "preview.update", preview }),
					onOverlayHidden: (hidden) => self.send({ type: "overlay.hide", hidden }),
					onCommit: (mode, meta) => input.onCommit(mode, meta),
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
				self.send({ type: "preview.update", preview: null });
			}
		}
	}
);

function rebuildFrame(context: Ctx, preview: { width: number; height: number } | null) {
	if (!context.input.element) return null;
	return buildPositionFrame(context.input.element, preview);
}

function buildPositionFrame(
	element: HTMLElement,
	preview: { width: number; height: number } | null
): { w: number; h: number; M: DOMMatrix } {
	const localToViewport = getViewportMatrix(element);
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
	const measuredWidth = Math.max(1, element.offsetWidth || element.getBoundingClientRect().width || 1);
	const measuredHeight = Math.max(1, element.offsetHeight || element.getBoundingClientRect().height || 1);
	const width = (preview?.width ?? measuredWidth) * scaleX;
	const height = (preview?.height ?? measuredHeight) * scaleY;
	return { w: width, h: height, M: noScaleMatrix };
}
