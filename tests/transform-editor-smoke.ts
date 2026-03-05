import { createActor } from "xstate";

import type { ElementTransform } from "@/components/position-editor/lib.types";
import {
	type TransformEditorMachineInput,
	buildFrame,
	transformEditorMachine
} from "@/components/position-editor/transform-editor.machine";
import { TransformEditorDomService } from "@/components/position-editor/transform-editor.service";

function assert(condition: unknown, message: string) {
	if (!condition) throw new Error(message);
}

class MockService extends TransformEditorDomService {
	startCalled = false;
	lastHidden = false;
	lastCommitMode: string | null = null;
	override attachOverlayHost(): HTMLElement | null {
		return null;
	}
	override detachOverlayHost() {}
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

actor.stop();

console.log("transform editor smoke: all checks passed");
