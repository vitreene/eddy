import { createActor } from "xstate";

import type { ElementTransform } from "@/components/position-editor/lib.types";
import {
	type TransformEditorMachineInput,
	buildFrame,
	mergeTransformFromInput,
	transformEditorMachine
} from "@/components/position-editor/transform-editor.machine";
import {
	computeNextResizeScale,
	TransformEditorDomService
} from "@/components/position-editor/transform-editor.service";

function assert(condition: unknown, message: string) {
	if (!condition) throw new Error(message);
}

class MockService extends TransformEditorDomService {
	startCalled = false;
	lastHidden = false;
	lastCommitMode: string | null = null;
	override stopPointerSession() {}
	override startDrag(input: any) {
		this.startCalled = true;
		input.onOverlayHidden(true);
		input.onTransform({ ...input.currentTransform, x: input.currentTransform.x + 10 });
		input.onResyncTransform({ ...input.currentTransform, y: input.currentTransform.y + 5 }, { x: 0, y: 0 });
		input.onCommit(input.currentTransform, input.mode.kind, { translateX: 0, translateY: 0 });
		input.onOverlayHidden(false);
		input.onEnd();
		return true;
	}
}

const service = new MockService();

const input: TransformEditorMachineInput = {
	service,
	element: null,
	active: true,
	onCommit: (_t: ElementTransform, mode: any) => {
		service.lastCommitMode = mode;
	},
	snapGrid: { kind: "grid" as const, cols: 3, rows: 2 }
};

const actor = createActor(transformEditorMachine, { input });
actor.start();

actor.send({ type: "overlay.hide", hidden: true });
assert(actor.getSnapshot().context.hideOverlayFrame === true, "overlay.hide true should set hidden state");

actor.send({ type: "overlay.hide", hidden: false });
assert(
	actor.getSnapshot().context.hideOverlayFrame === false,
	"overlay.hide false should clear hidden state"
);

actor.send({
	type: "transform.update",
	transform: {
		x: 10,
		y: 20,
		width: 100,
		height: 50,
		rotate: 0,
		scaleX: 1,
		scaleY: 1,
		originX: 0.5,
		originY: 0.5
	}
});

assert(actor.getSnapshot().context.t?.x === 10, "transform.update should update context transform");

actor.send({
	type: "transform.resync",
	transform: {
		x: 1,
		y: 2,
		width: 10,
		height: 20,
		rotate: 0,
		scaleX: 1,
		scaleY: 1,
		originX: 0.5,
		originY: 0.5
	},
	base: { x: 4, y: 5 }
});

assert(actor.getSnapshot().context.basePosition?.x === 4, "transform.resync should update base position");

const frame = buildFrame(
	{
		x: 0,
		y: 0,
		width: 100,
		height: 50,
		rotate: 0,
		scaleX: 1,
		scaleY: 1,
		originX: 0.5,
		originY: 0.5
	},
	null
);
assert(frame === null, "buildFrame should return null without offsetParent");

const merged = mergeTransformFromInput(
	{
		x: 100,
		y: 200,
		width: 300,
		height: 150,
		rotate: 10,
		scaleX: 2,
		scaleY: 0.8,
		originX: 0,
		originY: 0
	},
	{
		x: 25,
		y: -12,
		originX: 0.5,
		originY: 0.5,
		scaleX: 1,
		scaleY: 1
	}
);

assert(merged.x === 100 && merged.y === 200, "measured translation should stay runtime-driven");
assert(merged.originX === 0.5 && merged.originY === 0.5, "input transform should override measured origin");
assert(merged.scaleX === 1 && merged.scaleY === 1, "input transform should override measured scale");

const resizeScaleNoDelta = computeNextResizeScale({
	startScale: 2,
	startSize: 200,
	deltaLocal: 0,
	minSize: 8
});
assert(resizeScaleNoDelta === 2, "resize should start from current scale when no pointer delta");

const resizeScaleWithGrowth = computeNextResizeScale({
	startScale: 2,
	startSize: 200,
	deltaLocal: 50,
	minSize: 8
});
assert(resizeScaleWithGrowth === 2.5, "resize should apply local growth on top of current scale");

actor.stop();

console.log("transform editor smoke: all checks passed");
