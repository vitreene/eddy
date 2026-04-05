import { assign, createMachine } from "xstate";

import type { EditableVisualState } from "./editable-visual-state";

type SyncRequest = {
	visualKey: string;
	visualState: EditableVisualState | null;
	selectionAction: string | null;
	selectionCueSec: number | null;
	selectionKey: string | null;
	activeItemId: number | null;
	activeEvent: string | null;
	activeCueSec: number | null;
	activeAction: string | null;
};

type Input = {
	onSeek: (request: SyncRequest) => void;
	onProject: (request: SyncRequest) => void;
};

type Ctx = {
	input: Input;
	request: SyncRequest | null;
	projectedVisualKey: string;
	lastSelectionKey: string | null;
	currentVisualState: EditableVisualState | null;
	editMode: "idle" | "editing";
	editedItemId: number | null;
};

type Ev =
	| { type: "sync.update"; payload: SyncRequest }
	| { type: "edit.start"; payload: { itemId: number; visualState: EditableVisualState } }
	| { type: "edit.commit"; payload: { visualState: EditableVisualState } }
	| { type: "edit.cancel" };

/**
 * Orchestrates edit -> player seek -> DOM projection -> frame sync key publication.
 */
export const editorSyncMachine = createMachine(
	{
		types: {} as { context: Ctx; events: Ev; input: Input },
		id: "editor-sync",
		initial: "idle",
		context: ({ input }) => ({
			input,
			request: null,
			projectedVisualKey: "",
			lastSelectionKey: null,
			currentVisualState: null,
			editMode: "idle",
			editedItemId: null
		}),
		states: {
			idle: {
				on: {
					"sync.update": {
						target: "resolve",
						actions: assign(({ event }) => ({ request: event.payload }))
					},
					"edit.start": {
						actions: assign(({ event }) => {
							if (event.type !== "edit.start") return {};
							return {
								editMode: "editing" as const,
								editedItemId: event.payload.itemId as number,
								currentVisualState: event.payload.visualState
							};
						})
					},
					"edit.commit": {
						actions: assign(({ event }) => {
							if (event.type !== "edit.commit") return {};
							return {
								currentVisualState: event.payload.visualState
							};
						})
					},
					"edit.cancel": {
						actions: assign(
							(): Partial<Ctx> => ({
								editMode: "idle" as const,
								editedItemId: null
							})
						)
					}
				}
			},
			resolve: {
				always: [
					{ target: "seekThenProject", guard: "shouldSeekAndProject" },
					{ target: "seekOnly", guard: "shouldSeek" },
					{ target: "projectOnly", guard: "shouldProject" },
					{ target: "publishOnly" }
				]
			},
			seekThenProject: {
				entry: ["dispatchSeek", "dispatchProject"],
				always: "publishOnly"
			},
			seekOnly: {
				entry: "dispatchSeek",
				always: "publishOnly"
			},
			projectOnly: {
				entry: "dispatchProject",
				always: "publishOnly"
			},
			publishOnly: {
				entry: assign(({ context }) => ({
					projectedVisualKey: shouldProjectRequest(context)
						? context.request?.visualKey || ""
						: context.projectedVisualKey,
					lastSelectionKey: context.request?.selectionKey ?? null
				})),
				always: "idle"
			}
		}
	},
	{
		guards: {
			shouldSeekAndProject: ({ context }) => shouldSeekRequest(context) && shouldProjectRequest(context),
			shouldSeek: ({ context }) => {
				return shouldSeekRequest(context);
			},
			shouldProject: ({ context }) => shouldProjectRequest(context)
		},
		actions: {
			dispatchSeek: ({ context }) => {
				const req = context.request;
				if (!req) return;
				if (!req.selectionAction) return;
				if (typeof req.selectionCueSec !== "number" || !Number.isFinite(req.selectionCueSec)) return;
				context.input.onSeek(req);
			},
			dispatchProject: ({ context }) => {
				const req = context.request;
				if (!req) return;
				context.input.onProject(req);
			}
		}
	}
);

function shouldSeekRequest(context: Ctx): boolean {
	const request = context.request;
	if (!request) return false;
	if (!request.selectionAction) return false;
	if (typeof request.selectionCueSec !== "number" || !Number.isFinite(request.selectionCueSec)) return false;
	if (!request.selectionKey) return false;
	const targetItemId = request.visualState?.itemId ?? request.activeItemId;
	const isAlignedWithTargetSelection =
		typeof targetItemId === "number" &&
		request.activeItemId === targetItemId &&
		request.activeEvent === request.selectionAction &&
		typeof request.activeCueSec === "number" &&
		Number.isFinite(request.activeCueSec) &&
		Math.abs(request.activeCueSec - request.selectionCueSec) <= 0.0005;
	if (isAlignedWithTargetSelection) return false;
	return request.selectionKey !== context.lastSelectionKey;
}

function shouldProjectRequest(context: Ctx): boolean {
	const request = context.request;
	if (!request) return false;
	if (!request.selectionAction) return false;
	if (!request.visualState) return false;
	return request.visualKey !== context.projectedVisualKey;
}
