import type { SceneComp, TextTime } from "@/api/db";
import { DEFAULT_DURATION, INTRO, OUTRO } from "@/lib/constants";

export type VisibilityWindow = {
	startSec: number;
	endSec: number;
};

export type AncestorCapsuleChainResult = {
	ancestorItemIds: number[];
	isComplete: boolean;
	breakReason?:
		| "item-not-found"
		| "capsule-not-found"
		| "missing-content-link"
		| "missing-parent-item"
		| "cycle-detected";
};

export type SafeCueResult = {
	cueSec: number | null;
	window: VisibilityWindow;
	fallbackUsed: boolean;
	ancestorChain: AncestorCapsuleChainResult;
};

const DEFAULT_DURATION_SEC = DEFAULT_DURATION / 1000;

export function findSceneCueByName(context: SceneComp, cueName: string | null | undefined): TextTime | null {
	if (!cueName) return null;

	for (const sceneContent of Object.values(context.sceneContents || {})) {
		const cue = sceneContent.events?.find((event) => event.name === cueName);
		if (cue) return cue;
	}

	return null;
}

export function getSceneDurationSec(context: SceneComp): number {
	let maxSec = 0;

	for (const sceneContent of Object.values(context.sceneContents || {})) {
		for (const cue of sceneContent.events || []) {
			const end = Number.isFinite(cue.end) ? cue.end : cue.start;
			if (end > maxSec) maxSec = end;
		}
	}

	return maxSec;
}

export function getNodeVisibilityWindow(context: SceneComp, itemId: number): VisibilityWindow {
	const itemEvents = context.events?.[itemId] ?? {};
	const introEvent = itemEvents[INTRO];
	const outroEvent = itemEvents[OUTRO];

	const introCue = findSceneCueByName(context, introEvent?.name);
	const outroCue = findSceneCueByName(context, outroEvent?.name);

	const explicitStartSec = introCue ? introCue.start + DEFAULT_DURATION_SEC : null;
	const explicitEndSec = outroCue ? outroCue.end : null;
	const derivedWindows = deriveItemVisibilityWindows(context);
	const derivedWindow = derivedWindows.get(itemId) || null;

	if (explicitStartSec !== null || explicitEndSec !== null || derivedWindow) {
		return {
			startSec: explicitStartSec ?? derivedWindow?.startSec ?? 0,
			endSec: explicitEndSec ?? derivedWindow?.endSec ?? Number.POSITIVE_INFINITY
		};
	}

	const startSec = 0;
	const endSec = Number.POSITIVE_INFINITY;

	return { startSec, endSec };
}

export function normalizeVisibilityWindow(
	window: VisibilityWindow,
	sceneDurationSec: number
): VisibilityWindow {
	const safeSceneDurationSec = Number.isFinite(sceneDurationSec) ? Math.max(sceneDurationSec, 0) : 0;
	const startSec = clampSec(window.startSec, 0, safeSceneDurationSec);
	const rawEndSec = Number.isFinite(window.endSec) ? window.endSec : safeSceneDurationSec;
	const endSec = clampSec(rawEndSec, 0, safeSceneDurationSec);

	return { startSec, endSec };
}

export function getAncestorCapsuleItems(context: SceneComp, itemId: number): AncestorCapsuleChainResult {
	const selectedItem = context.items?.[itemId];
	if (!selectedItem) {
		return { ancestorItemIds: [], isComplete: false, breakReason: "item-not-found" };
	}

	let currentCapsuleId = selectedItem.capsuleId;
	const ancestorItemIds: number[] = [];
	const visitedCapsuleIds = new Set<number>();

	while (currentCapsuleId !== context.main) {
		if (!context.capsules?.[currentCapsuleId]) {
			return { ancestorItemIds, isComplete: false, breakReason: "capsule-not-found" };
		}

		if (visitedCapsuleIds.has(currentCapsuleId)) {
			return { ancestorItemIds, isComplete: false, breakReason: "cycle-detected" };
		}
		visitedCapsuleIds.add(currentCapsuleId);

		const capsuleContent = Object.values(context.contents || {}).find(
			(content) => content.type === "capsule" && content.capsuleId === currentCapsuleId
		);
		if (!capsuleContent) {
			return { ancestorItemIds, isComplete: false, breakReason: "missing-content-link" };
		}

		const parentItem = Object.values(context.items || {}).find((item) => item.contentId === capsuleContent.id);
		if (!parentItem) {
			return { ancestorItemIds, isComplete: false, breakReason: "missing-parent-item" };
		}

		ancestorItemIds.push(parentItem.id);
		currentCapsuleId = parentItem.capsuleId;
	}

	return { ancestorItemIds, isComplete: true };
}

export function intersectVisibilityWindows(windows: VisibilityWindow[]): VisibilityWindow {
	if (!windows.length) {
		return { startSec: 0, endSec: Number.POSITIVE_INFINITY };
	}

	let startSec = 0;
	let endSec = Number.POSITIVE_INFINITY;

	for (const window of windows) {
		if (window.startSec > startSec) startSec = window.startSec;
		if (window.endSec < endSec) endSec = window.endSec;
	}

	return { startSec, endSec };
}

export function getAssuredVisibleCue(context: SceneComp, itemId: number): SafeCueResult {
	const sceneDurationSec = getSceneDurationSec(context);
	const itemWindow = getNodeVisibilityWindow(context, itemId);
	const ancestorChain = getAncestorCapsuleItems(context, itemId);

	const windows = [
		itemWindow,
		...ancestorChain.ancestorItemIds.map((id) => getNodeVisibilityWindow(context, id))
	];
	const rawWindow = intersectVisibilityWindows(windows);
	const window = normalizeVisibilityWindow(rawWindow, sceneDurationSec);

	if (window.startSec < window.endSec) {
		return {
			cueSec: window.startSec,
			window,
			fallbackUsed: false,
			ancestorChain
		};
	}

	return {
		cueSec: null,
		window,
		fallbackUsed: true,
		ancestorChain
	};
}

// Contract: return the earliest time where the selected item is guaranteed visible,
// after intersecting its own window with all ancestor capsule host-item windows.
export function computeActiveCue(context: SceneComp, itemId: number): number | null {
	return getAssuredVisibleCue(context, itemId).cueSec;
}

function clampSec(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return max;
	if (value < min) return min;
	if (value > max) return max;
	return value;
}

function deriveItemVisibilityWindows(context: SceneComp): Map<number, VisibilityWindow> {
	// Mirrors builder runtime derivation for items without explicit intro/outro.
	// Parent capsule windows are solved first, then child items are distributed.
	type CueWindow = { introCueSec: number; outroCueSec: number };
	type Lock = { index: number; introCueSec: number; outroCueSec: number };

	const result = new Map<number, VisibilityWindow>();
	if (!context?.capsules || !context?.items) return result;

	const cueByName = new Map<string, TextTime>();
	for (const sceneContent of Object.values(context.sceneContents || {})) {
		for (const cue of sceneContent.events || []) cueByName.set(cue.name, cue);
	}

	const allItems = Object.values(context.items || {});
	const allContents = Object.values(context.contents || {});

	const hostItemByCapsuleId = new Map<number, number>();
	for (const content of allContents) {
		if (content.type !== "capsule" || !content.capsuleId) continue;
		const hostItem = allItems.find((item) => item.contentId === content.id);
		if (hostItem) hostItemByCapsuleId.set(content.capsuleId, hostItem.id);
	}

	const explicitCueWindowByItemId = new Map<number, CueWindow>();
	for (const item of allItems) {
		const events = context.events?.[item.id] || {};
		const introName = events[INTRO]?.name;
		const outroName = events[OUTRO]?.name;

		const introCue = introName ? cueByName.get(introName) : null;
		const outroCue = outroName ? cueByName.get(outroName) : null;

		if (introCue || outroCue) {
			explicitCueWindowByItemId.set(item.id, {
				introCueSec: introCue ? introCue.start : 0,
				outroCueSec: outroCue ? outroCue.end : Number.POSITIVE_INFINITY
			});
		}
	}

	const derivedCueWindowByItemId = new Map<number, CueWindow>();

	const pendingCapsuleIds = new Set<number>(Object.keys(context.capsules).map(Number));
	const maxPasses = pendingCapsuleIds.size + 1;
	let pass = 0;

	const getItemCueWindow = (itemId: number): CueWindow | null => {
		return explicitCueWindowByItemId.get(itemId) || derivedCueWindowByItemId.get(itemId) || null;
	};

	while (pendingCapsuleIds.size > 0 && pass < maxPasses) {
		let progressed = false;

		for (const capsuleId of [...pendingCapsuleIds]) {
			const capsule = context.capsules[capsuleId];
			if (!capsule) {
				pendingCapsuleIds.delete(capsuleId);
				continue;
			}

			const hostItemId = hostItemByCapsuleId.get(capsuleId);
			if (!hostItemId) {
				pendingCapsuleIds.delete(capsuleId);
				continue;
			}

			const hostCueWindow = getItemCueWindow(hostItemId);
			if (!hostCueWindow) continue;
			const capsuleStartCue = hostCueWindow.introCueSec;
			const capsuleEndCue = hostCueWindow.outroCueSec;
			if (
				!Number.isFinite(capsuleStartCue) ||
				!Number.isFinite(capsuleEndCue) ||
				capsuleEndCue <= capsuleStartCue
			) {
				pendingCapsuleIds.delete(capsuleId);
				continue;
			}

			const orderedChildren = (capsule.itemIds || [])
				.map((itemId) => context.items[itemId])
				.filter((item): item is SceneComp["items"][number] => Boolean(item))
				.toSorted((a, b) => (a.order > b.order ? 1 : -1));

			if (!orderedChildren.length) {
				pendingCapsuleIds.delete(capsuleId);
				progressed = true;
				continue;
			}

			const locks: Lock[] = [];
			for (const [index, item] of orderedChildren.entries()) {
				const events = context.events?.[item.id] || {};
				const introCue = events[INTRO]?.name ? cueByName.get(events[INTRO].name) : null;
				const outroCue = events[OUTRO]?.name ? cueByName.get(events[OUTRO].name) : null;
				if (!introCue || !outroCue) continue;

				const introCueSec = introCue.start;
				const outroCueSec = outroCue.end;
				if (!Number.isFinite(introCueSec) || !Number.isFinite(outroCueSec)) continue;

				locks.push({ index, introCueSec, outroCueSec });
			}

			const orderedLocks = locks
				.toSorted((a, b) => a.index - b.index)
				.reduce((acc, lock) => {
					const prevOutroCueSec = acc.length ? acc[acc.length - 1].outroCueSec : capsuleStartCue;
					let introCueSec = Math.min(Math.max(lock.introCueSec, capsuleStartCue), capsuleEndCue);
					let outroCueSec = Math.min(Math.max(lock.outroCueSec, capsuleStartCue), capsuleEndCue);
					if (introCueSec < prevOutroCueSec) introCueSec = prevOutroCueSec;
					if (outroCueSec < introCueSec) outroCueSec = introCueSec;
					acc.push({ ...lock, introCueSec, outroCueSec });
					return acc;
				}, [] as Lock[]);

			const cueWindows: Array<CueWindow | undefined> = new Array(orderedChildren.length);
			const allocateEvenly = (fromIndex: number, toIndex: number, introCueSec: number, outroCueSec: number) => {
				if (toIndex < fromIndex) return;
				const count = toIndex - fromIndex + 1;
				const span = outroCueSec - introCueSec;
				for (let offset = 0; offset < count; offset++) {
					const segIntroCueSec = introCueSec + (span * offset) / count;
					const segOutroCueSec = introCueSec + (span * (offset + 1)) / count;
					cueWindows[fromIndex + offset] = { introCueSec: segIntroCueSec, outroCueSec: segOutroCueSec };
				}
			};

			let previousIndex = -1;
			let previousOutroCueSec = capsuleStartCue;
			for (const lock of orderedLocks) {
				allocateEvenly(previousIndex + 1, lock.index - 1, previousOutroCueSec, lock.introCueSec);
				cueWindows[lock.index] = { introCueSec: lock.introCueSec, outroCueSec: lock.outroCueSec };
				previousIndex = lock.index;
				previousOutroCueSec = lock.outroCueSec;
			}
			allocateEvenly(previousIndex + 1, orderedChildren.length - 1, previousOutroCueSec, capsuleEndCue);

			for (const [index, item] of orderedChildren.entries()) {
				const assignedCueWindow = cueWindows[index];
				if (!assignedCueWindow) continue;

				const events = context.events?.[item.id] || {};
				const introCue = events[INTRO]?.name ? cueByName.get(events[INTRO].name) : null;
				const outroCue = events[OUTRO]?.name ? cueByName.get(events[OUTRO].name) : null;

				const introCueSec = introCue ? introCue.start : assignedCueWindow.introCueSec;
				const outroCueSec = outroCue ? outroCue.end : assignedCueWindow.outroCueSec;

				derivedCueWindowByItemId.set(item.id, { introCueSec, outroCueSec });
				result.set(item.id, {
					startSec: introCueSec + DEFAULT_DURATION_SEC,
					endSec: outroCueSec
				});
			}

			pendingCapsuleIds.delete(capsuleId);
			progressed = true;
		}

		if (!progressed) break;
		pass++;
	}

	return result;
}
