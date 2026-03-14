import { assign, createMachine } from "xstate";

import type { EditableVisualState } from "./editable-visual-state";

type SyncRequest = {
	syncKey: string;
	visualState: EditableVisualState | null;
	selectedEventAction: string | null;
	selectedEventCueSec: number | null;
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
	projectedSyncKey: string;
	lastSelectionSignature: string | null;
	currentVisualState: EditableVisualState | null;
	editMode: "idle" | "editing";
	editedItemId: number | null;
};

type Ev =
	| { type: "sync.request"; payload: SyncRequest }
	| { type: "edit.start"; payload: { itemId: number; visualState: EditableVisualState } }
	| { type: "edit.commit"; payload: { visualState: EditableVisualState } }
	| { type: "edit.cancel" };

const SEEK_EPSILON_SEC = 0.0005;

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
			projectedSyncKey: "",
			lastSelectionSignature: null,
			currentVisualState: null,
			editMode: "idle",
			editedItemId: null
		}),
		states: {
			idle: {
				on: {
					"sync.request": {
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
				always: [{ target: "seek", guard: "shouldSeek" }, { target: "project" }]
			},
			seek: {
				entry: "dispatchSeek",
				always: "project"
			},
			project: {
				entry: "dispatchProject",
				always: "publish"
			},
			publish: {
				entry: assign(({ context }) => ({
					projectedSyncKey: context.request?.syncKey || "",
					lastSelectionSignature: buildSelectionSignature(context.request)
				})),
				always: "idle"
			}
		}
	},
	{
		guards: {
			shouldSeek: ({ context }) => {
				const req = context.request;
				if (!req) return false;
				if (!req.selectedEventAction) return false;
				if (typeof req.selectedEventCueSec !== "number" || !Number.isFinite(req.selectedEventCueSec))
					return false;

				const signature = buildSelectionSignature(req);
				if (signature && signature !== context.lastSelectionSignature) return true;

				if (
					req.activeAction === "seek" &&
					typeof req.activeCueSec === "number" &&
					Number.isFinite(req.activeCueSec) &&
					Math.abs(req.activeCueSec) <= SEEK_EPSILON_SEC &&
					req.selectedEventCueSec > SEEK_EPSILON_SEC
				) {
					return false;
				}

				if (typeof req.activeCueSec !== "number" || !Number.isFinite(req.activeCueSec)) return true;
				return Math.abs(req.selectedEventCueSec - req.activeCueSec) > SEEK_EPSILON_SEC;
			}
		},
		actions: {
			dispatchSeek: ({ context }) => {
				const req = context.request;
				if (!req) return;
				if (typeof req.selectedEventCueSec !== "number" || !Number.isFinite(req.selectedEventCueSec)) return;
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

function buildSelectionSignature(request: SyncRequest | null): string | null {
	if (!request) return null;
	if (!request.selectedEventAction) return null;
	if (typeof request.selectedEventCueSec !== "number" || !Number.isFinite(request.selectedEventCueSec))
		return null;
	return `${request.selectedEventAction}:${request.selectedEventCueSec.toFixed(4)}`;
}
