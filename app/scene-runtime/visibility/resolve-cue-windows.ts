import type { ContentEvent, ItemComp, SceneComp, TextTime } from "@/api/db";
import { deriveEventKind } from "@/config/custom-events";
import { INTRO, OUTRO } from "@/config/constants";
import { getSceneContentCues, SCENE_DEFAULT_DURATION_SEC } from "@/scene-runtime/scene-content";

type Window = { start: number; end: number };
type Lock = { index: number; start: number; end: number };

export type ResolveCueWindowsResult = {
	resolvedEvents: SceneComp["events"];
	resolvedSceneContentEvents: TextTime[];
	cueWindowsByItemId: Map<number, Window>;
	cueByName: Map<string, TextTime>;
};

export type ResolveCueWindowsCapsuleBehavior = {
	timeMode: "distributed" | "fixed";
	fixedSeconds: number;
	generateDefaultOutro: boolean;
};

type ResolveCueWindowsOptions = {
	generateMissingEvents?: boolean;
	behaviorByCapsuleId?: Record<number, ResolveCueWindowsCapsuleBehavior>;
};

const DEFAULT_CAPSULE_BEHAVIOR: ResolveCueWindowsCapsuleBehavior = {
	timeMode: "distributed",
	fixedSeconds: 2,
	generateDefaultOutro: true
};

/**
 * Resolve intro/outro windows for every item and optionally generate missing events.
 */
export function resolveCueWindows(
	snapshot: SceneComp,
	options: ResolveCueWindowsOptions = {}
): ResolveCueWindowsResult {
	const generateMissingEvents = options.generateMissingEvents ?? false;

	const sceneContent =
		Object.values(snapshot.sceneContents || {}).find((sc) => sc.sceneId == snapshot.id) ||
		Object.values(snapshot.sceneContents || {})[0];

	const baseEvents: SceneComp["events"] = Object.fromEntries(
		Object.entries(snapshot.events || {}).map(([itemId, eventMap]) => [itemId, { ...(eventMap || {}) }])
	);
	const resolvedSceneContentEvents = [...getSceneContentCues(sceneContent)];
	if (!resolvedSceneContentEvents.length) {
		const sceneName = (snapshot.title || `Scene ${snapshot.id}`).trim() || `Scene ${snapshot.id}`;
		resolvedSceneContentEvents.push({
			id: -1,
			name: `scene-${snapshot.id}`,
			text: sceneName,
			start: 0,
			end: SCENE_DEFAULT_DURATION_SEC
		});
	}
	const cueByName = new Map<string, TextTime>();
	for (const cue of resolvedSceneContentEvents) cueByName.set(cue.name, cue);

	const allItems = Object.values(snapshot.items || {});
	const allContents = Object.values(snapshot.contents || {});
	const capsulesById = snapshot.capsules || {};
	const pendingCapsuleIds = new Set<number>(Object.keys(capsulesById).map(Number));
	const sceneBounds = getSceneBoundsFromCues(resolvedSceneContentEvents);
	const cueWindowsByItemId = new Map<number, Window>();

	const AUTO_PREFIX = "__auto_";
	const AUTO_MAXIMAL_PREFIX = "__auto_maximal__";
	let syntheticCueId = -1;

	const ensureCueAtTime = (timeSec: number, hint: string, mode: "auto" | "maximal" = "auto") => {
		const prefix = mode == "maximal" ? AUTO_MAXIMAL_PREFIX : AUTO_PREFIX;
		const key = `${prefix}${hint}_${Math.round(timeSec * 1000)}`;
		if (!cueByName.has(key)) {
			const cue: TextTime = { id: syntheticCueId--, name: key, text: "", start: timeSec, end: timeSec };
			resolvedSceneContentEvents.push(cue);
			cueByName.set(key, cue);
		}
		return key;
	};

	const maxPasses = pendingCapsuleIds.size + 1;
	let pass = 0;

	while (pendingCapsuleIds.size > 0 && pass < maxPasses) {
		let progressed = false;

		for (const capsuleId of [...pendingCapsuleIds]) {
			const capsule = capsulesById[capsuleId];
			if (!capsule) {
				pendingCapsuleIds.delete(capsuleId);
				progressed = true;
				continue;
			}

			if (capsule.id === snapshot.main) {
				pendingCapsuleIds.delete(capsuleId);
				progressed = true;
				continue;
			}

			let capsuleStart = 0;
			let capsuleEnd = Number.POSITIVE_INFINITY;

			const capsuleContent = allContents.find(
				(content) => content.type == "capsule" && content.capsuleId == capsule.id
			);
			if (!capsuleContent) {
				pendingCapsuleIds.delete(capsuleId);
				progressed = true;
				continue;
			}

			const capsuleHostItem = allItems.find((item) => item.contentId == capsuleContent.id);
			if (!capsuleHostItem) {
				pendingCapsuleIds.delete(capsuleId);
				progressed = true;
				continue;
			}

			const capsuleHostEvents = baseEvents[capsuleHostItem.id] || {};
			const capsuleIntroName = capsuleHostEvents[INTRO]?.name;
			const capsuleOutroName = capsuleHostEvents[OUTRO]?.name;

			if (!capsuleIntroName || !capsuleOutroName) {
				if (capsuleHostItem.capsuleId === snapshot.main) {
					capsuleStart = sceneBounds.start;
					capsuleEnd = sceneBounds.end;
				} else {
					continue;
				}
			} else {
				const capsuleIntroCue = cueByName.get(capsuleIntroName);
				const capsuleOutroCue = cueByName.get(capsuleOutroName);
				if (!capsuleIntroCue && !capsuleOutroCue) {
					if (capsuleHostItem.capsuleId === snapshot.main) {
						capsuleStart = sceneBounds.start;
						capsuleEnd = sceneBounds.end;
					} else {
						continue;
					}
				} else if (capsuleHostItem.capsuleId === snapshot.main) {
					capsuleStart = capsuleIntroCue ? Number(capsuleIntroCue.start) : sceneBounds.start;
					capsuleEnd = capsuleOutroCue ? Number(capsuleOutroCue.end) : sceneBounds.end;
				} else if (!capsuleIntroCue || !capsuleOutroCue) {
					continue;
				} else {
					capsuleStart = Number(capsuleIntroCue.start);
					capsuleEnd = Number(capsuleOutroCue.end);
				}
			}

			if (!Number.isFinite(capsuleStart) || !Number.isFinite(capsuleEnd) || capsuleEnd <= capsuleStart) {
				pendingCapsuleIds.delete(capsuleId);
				progressed = true;
				continue;
			}

			const orderedChildren = (capsule.itemIds || [])
				.map((itemId) => snapshot.items[itemId])
				.filter((item): item is ItemComp => Boolean(item))
				.toSorted((a, b) => (a.order > b.order ? 1 : -1));

			if (!orderedChildren.length) {
				pendingCapsuleIds.delete(capsuleId);
				progressed = true;
				continue;
			}

			const capsuleBehavior = options.behaviorByCapsuleId?.[capsule.id] || DEFAULT_CAPSULE_BEHAVIOR;

			const locks: Lock[] = [];
			for (const [index, item] of orderedChildren.entries()) {
				const events = baseEvents[item.id] || {};
				const introName = events[INTRO]?.name;
				const outroName = events[OUTRO]?.name;
				if (!introName || !outroName) continue;

				const introCue = cueByName.get(introName);
				const outroCue = cueByName.get(outroName);
				if (!introCue || !outroCue) continue;

				const start = Number(introCue.start);
				const end = Number(outroCue.end);
				if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

				locks.push({ index, start, end });
			}

			const orderedLocks = locks
				.toSorted((a, b) => a.index - b.index)
				.reduce((acc, lock) => {
					const prevEnd = acc.length ? acc[acc.length - 1].end : capsuleStart;
					let start = Math.min(Math.max(lock.start, capsuleStart), capsuleEnd);
					let end = Math.min(Math.max(lock.end, capsuleStart), capsuleEnd);
					if (start < prevEnd) start = prevEnd;
					if (end < start) end = start;
					acc.push({ ...lock, start, end });
					return acc;
				}, [] as Lock[]);

			const windows: Array<Window | undefined> = new Array(orderedChildren.length);
			const allocateEvenly = (fromIndex: number, toIndex: number, start: number, end: number) => {
				if (toIndex < fromIndex) return;
				const count = toIndex - fromIndex + 1;
				const span = end - start;
				for (let offset = 0; offset < count; offset++) {
					const segStart = start + (span * offset) / count;
					const segEnd = start + (span * (offset + 1)) / count;
					windows[fromIndex + offset] = { start: segStart, end: segEnd };
				}
			};

			if (capsuleBehavior.timeMode === "fixed") {
				// Important fixed-time variable:
				// fixedSeconds defines slot duration for each item when no explicit events are provided.
				const fixedSeconds = Math.max(0.1, capsuleBehavior.fixedSeconds || 0);
				for (const [index] of orderedChildren.entries()) {
					const start = Math.min(capsuleStart + index * fixedSeconds, capsuleEnd);
					const end = Math.min(start + fixedSeconds, capsuleEnd);
					windows[index] = { start, end };
				}

				for (const lock of orderedLocks) {
					windows[lock.index] = { start: lock.start, end: lock.end };
				}
			} else {
				let previousIndex = -1;
				let previousEnd = capsuleStart;
				for (const lock of orderedLocks) {
					allocateEvenly(previousIndex + 1, lock.index - 1, previousEnd, lock.start);
					windows[lock.index] = { start: lock.start, end: lock.end };
					previousIndex = lock.index;
					previousEnd = lock.end;
				}
				allocateEvenly(previousIndex + 1, orderedChildren.length - 1, previousEnd, capsuleEnd);
			}

			for (const [index, item] of orderedChildren.entries()) {
				const window = windows[index];
				if (!window) continue;

				const isDegenerateWindow = window.end <= window.start;
				const appliedWindow = isDegenerateWindow ? { start: capsuleStart, end: capsuleEnd } : window;
				const hintPrefix = isDegenerateWindow
					? `maximal_capsule_${capsule.id}_item_${item.id}`
					: `capsule_${capsule.id}_item_${item.id}`;
				const cueMode = isDegenerateWindow ? "maximal" : "auto";

				if (!baseEvents[item.id]) baseEvents[item.id] = {};
				const currentEvents = baseEvents[item.id];
				const hasCustomEvents = Object.values(currentEvents).some(
					(event) => Boolean(event) && deriveEventKind(event!.action) === "custom"
				);
				const introStartSec = hasCustomEvents ? capsuleStart : appliedWindow.start;
				const outroEndSec = hasCustomEvents ? capsuleEnd : appliedWindow.end;

				if (generateMissingEvents && !currentEvents[INTRO]) {
					currentEvents[INTRO] = createGeneratedEvent({
						itemId: item.id,
						action: INTRO,
						name: ensureCueAtTime(introStartSec, `${hintPrefix}_intro`, cueMode)
					});
				}

				if (generateMissingEvents && capsuleBehavior.generateDefaultOutro && !currentEvents[OUTRO]) {
					currentEvents[OUTRO] = createGeneratedEvent({
						itemId: item.id,
						action: OUTRO,
						name: ensureCueAtTime(outroEndSec, `${hintPrefix}_outro`, cueMode)
					});
				}

				const introCue = currentEvents[INTRO]?.name ? cueByName.get(currentEvents[INTRO]?.name || "") : null;
				const outroCue = currentEvents[OUTRO]?.name ? cueByName.get(currentEvents[OUTRO]?.name || "") : null;

				cueWindowsByItemId.set(item.id, {
					start: introCue ? Number(introCue.start) : appliedWindow.start,
					end: outroCue
						? Number(outroCue.end)
						: capsuleBehavior.generateDefaultOutro
							? appliedWindow.end
							: capsuleEnd
				});
			}

			pendingCapsuleIds.delete(capsuleId);
			progressed = true;
		}

		if (!progressed) break;
		pass++;
	}

	for (const item of allItems) {
		const events = baseEvents[item.id];
		if (!events) continue;

		const explicitWindow = cueWindowsByItemId.get(item.id) || null;
		const fallbackWindow = explicitWindow || { start: sceneBounds.start, end: sceneBounds.end };

		const introEvent = events[INTRO];
		if (
			introEvent &&
			(!introEvent.name || !introEvent.name.trim() || !cueByName.has((introEvent.name || "").trim()))
		) {
			introEvent.name = ensureCueAtTime(
				fallbackWindow.start,
				`item_${item.id}_intro_fallback`,
				fallbackWindow.end <= fallbackWindow.start ? "maximal" : "auto"
			);
		}

		const outroEvent = events[OUTRO];
		if (
			outroEvent &&
			(!outroEvent.name || !outroEvent.name.trim() || !cueByName.has((outroEvent.name || "").trim()))
		) {
			outroEvent.name = ensureCueAtTime(
				fallbackWindow.end,
				`item_${item.id}_outro_fallback`,
				fallbackWindow.end <= fallbackWindow.start ? "maximal" : "auto"
			);
		}
	}

	return { resolvedEvents: baseEvents, resolvedSceneContentEvents, cueWindowsByItemId, cueByName };
}

/**
 * Compute full scene time bounds from cue list.
 */
function getSceneBoundsFromCues(cues: TextTime[]): { start: number; end: number } {
	let end = 0;
	for (const cue of cues) {
		const cueEnd = Number.isFinite(cue.end) ? cue.end : cue.start;
		if (cueEnd > end) end = cueEnd;
	}
	if (end <= 0) end = SCENE_DEFAULT_DURATION_SEC;
	return { start: 0, end };
}

/**
 * Build synthetic event payload used for generated intro/outro anchors.
 */
function createGeneratedEvent({
	itemId,
	action,
	name
}: {
	itemId: number;
	action: string;
	name: string;
}): ContentEvent {
	return {
		id: -1,
		name,
		action,
		ref: null,
		duration: null,
		delay: null,
		position: null,
		itemId,
		decorId: null
	};
}
