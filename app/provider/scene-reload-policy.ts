import type { ActiveState } from "./types";

export type SequenceFlushReason = "sequence-action" | "tree-mutation" | "scene-switch" | "manual";

export function markSequenceTouched(active: ActiveState): ActiveState {
	if (active.sequenceTouched) return active;
	return {
		...active,
		sequenceTouched: true
	};
}

export function isSequenceAction(action: string | null | undefined): boolean {
	return action === "play" || action === "rewind" || action === "seek";
}

export function requestSequenceFlush(active: ActiveState, reason: SequenceFlushReason): ActiveState {
	const currentToken = Number(active.sequenceFlushToken) || 0;
	return {
		...active,
		itemId: null,
		node: null,
		contentId: null,
		event: null,
		sequenceTouched: false,
		sequenceFlushReason: reason,
		sequenceFlushToken: currentToken + 1
	};
}

export function clearSequenceFlushRequest(active: ActiveState): ActiveState {
	if (!active.sequenceFlushReason) return active;
	return {
		...active,
		sequenceFlushReason: null
	};
}
