import { assign, createMachine } from "xstate";

import { canUseDOM, getOffsetParent, getViewportMatrix } from "./lib";
import {
	type PositionDragCommitMeta,
	type PositionDragMode,
	type PositionSnapGridSpec,
	PositionEditorDomService
} from "./position-editor.service";

export type PositionEditorMachineInput = {
	service?: PositionEditorDomService;
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
	service: PositionEditorDomService;
	input: PositionEditorMachineInput;
	domOk: boolean;
	frame: { w: number; h: number; M: DOMMatrix } | null;
	offsetParent: HTMLElement | null;
	portalHost: HTMLElement | null;
	hideOverlayFrame: boolean;
	isDragging: boolean;
	previewSize: { width: number; height: number } | null;
	previewPlacement: { row: number; col: number; rowSpan: number; colSpan: number } | null;
};

type Ev =
	| { type: "props.sync"; input: PositionEditorMachineInput }
	| { type: "overlay.hide"; hidden: boolean }
	| { type: "drag.session"; active: boolean }
	| { type: "preview.size"; preview: { width: number; height: number } | null }
	| {
			type: "preview.placement";
			placement: { row: number; col: number; rowSpan: number; colSpan: number } | null;
	  }
	| { type: "frame.resync" }
	| { type: "drag.start"; mode: PositionDragMode; clientX: number; clientY: number }
	| { type: "drag.end" };

const POST_COMMIT_RESYNC_FRAMES = 8;

export const positionEditorMachine = createMachine(
	{
		types: {} as { context: Ctx; events: Ev; input: PositionEditorMachineInput },
		id: "position-editor",
		context: ({ input }) => {
			const active = input.active ?? true;
			const domOk = canUseDOM(input.element);
			const offsetParent = input.element ? getOffsetParent(input.element) : null;
			const frame = active && input.element ? buildPositionFrame(input.element, null) : null;
			const service = input.service ?? new PositionEditorDomService();
			return {
				service,
				input,
				domOk,
				frame,
				offsetParent,
				portalHost: null,
				hideOverlayFrame: false,
				isDragging: false,
				previewSize: null,
				previewPlacement: null
			};
		},
		entry: ["syncFromInput"],
		exit: ["disposeService"],
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
			"preview.size": {
				actions: [
					assign(({ context, event }) => ({
						previewSize: event.preview,
						frame: rebuildFrame(context, event.preview)
					}))
				]
			},
			"preview.placement": {
				actions: [
					assign(({ event }) => ({
						previewPlacement: event.placement
					}))
				]
			},
			"frame.resync": {
				actions: ["resyncFrameFromDom"]
			},
			"drag.start": {
				actions: ["startDrag"]
			},
			"drag.end": {
				actions: ["stopDrag", "stopDragSession", "schedulePostCommitResync"]
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
				const offsetParent = input.element ? getOffsetParent(input.element) : null;
				const frame = active && input.element ? buildPositionFrame(input.element, context.previewSize) : null;
				const portalHost =
					domOk && active && input.element
						? service.attachOverlayHost(input.element, input.overlayContainer ?? null)
						: null;

				if (!domOk || !active || !input.element) {
					service.stopPointerSession();
					service.detachOverlayHost();
				}

				return { domOk, offsetParent, frame, portalHost };
			}),
			resyncFrameFromDom: assign(({ context }) => ({
				frame: rebuildFrame(context, null)
			})),
			startDrag: ({ context, event, self }) => {
				if (event.type !== "drag.start") return;
				const input = context.input;
				const service = context.service;
				if (!context.domOk || !input.element) return;
				const started = service.startDrag({
					element: input.element,
					mode: event.mode,
					clientX: event.clientX,
					clientY: event.clientY,
					snapParentElement: input.snapParentElement,
					snapParentId: input.snapParentId,
					snapGrid: input.snapGrid,
					portalHost: context.portalHost,
					onPreview: (preview) => self.send({ type: "preview.size", preview }),
					onPreviewPlacement: (placement) => self.send({ type: "preview.placement", placement }),
					onOverlayHidden: (hidden) => self.send({ type: "overlay.hide", hidden }),
					onCommit: (mode, meta) => {
						input.onCommit(mode, meta);
					},
					onEnd: () => self.send({ type: "drag.end" })
				});
				self.send({ type: "drag.session", active: started });
				if (!started) self.send({ type: "overlay.hide", hidden: false });
			},
			stopDrag: ({ context }) => {
				context.service.stopPointerSession();
			},
			stopDragSession: ({ self }) => {
				self.send({ type: "drag.session", active: false });
				self.send({ type: "preview.size", preview: null });
				self.send({ type: "preview.placement", placement: null });
			},
			schedulePostCommitResync: ({ context, self }) => {
				const input = context.input;
				if (!context.domOk || !(input.active ?? true) || !input.element) return;
				const win = input.element.ownerDocument.defaultView;
				if (!win) return;
				let remaining = POST_COMMIT_RESYNC_FRAMES;
				const tick = () => {
					if (remaining <= 0) return;
					self.send({ type: "frame.resync" });
					remaining -= 1;
					if (remaining > 0) win.requestAnimationFrame(tick);
				};
				win.requestAnimationFrame(() => {
					win.requestAnimationFrame(tick);
				});
			},
			disposeService: ({ context }) => {
				context.service.dispose();
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
	const rect = element.getBoundingClientRect();
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
	const width = preview ? Math.max(1, preview.width * scaleX) : Math.max(1, rect.width || 1);
	const height = preview ? Math.max(1, preview.height * scaleY) : Math.max(1, rect.height || 1);
	return { w: width, h: height, M: noScaleMatrix };
}
