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

export function requestSequenceFlush(
	active: ActiveState,
	reason: SequenceFlushReason,
	options?: { preserveSelection?: boolean }
): ActiveState {
	const currentToken = Number(active.sequenceFlushToken) || 0;
	const preserveSelection = Boolean(options?.preserveSelection);
	return {
		...active,
		itemId: preserveSelection ? active.itemId : null,
		node: preserveSelection ? active.node : null,
		contentId: preserveSelection ? active.contentId : null,
		event: preserveSelection ? active.event : null,
		sequenceTouched: false,
		sequenceFlushReason: reason,
		sequenceFlushToken: currentToken + 1
	};
}

export function shouldPreserveSelectionOnFlush(
	active: ActiveState,
	reason: SequenceFlushReason,
	options?: { sequenceAction?: string | null }
): boolean {
	const hasSelection = Boolean(active.itemId || active.node || active.contentId || active.event);
	if (!hasSelection) return false;

	if (reason === "sequence-action") {
		const isEditing = Boolean(
			active.eventTouched || active.decorTouched || active.themeTouched || active.capsuleTouched
		);
		return isEditing || options?.sequenceAction === "seek";
	}

	return false;
}

export function clearSequenceFlushRequest(active: ActiveState): ActiveState {
	if (!active.sequenceFlushReason) return active;
	return {
		...active,
		sequenceFlushReason: null
	};
}
