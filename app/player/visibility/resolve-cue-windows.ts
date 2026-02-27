import type { ContentEvent, ItemComp, SceneComp, TextTime } from "@/api/db";
import { INTRO, OUTRO } from "@/config/constants";

type Window = { start: number; end: number };
type Lock = { index: number; start: number; end: number };

export type ResolveCueWindowsResult = {
	resolvedEvents: SceneComp["events"];
	resolvedSceneContentEvents: TextTime[];
	cueWindowsByItemId: Map<number, Window>;
	cueByName: Map<string, TextTime>;
};

export function resolveCueWindows(
	snapshot: SceneComp,
	options: { generateMissingEvents?: boolean } = {}
): ResolveCueWindowsResult {
	const generateMissingEvents = options.generateMissingEvents ?? false;

	const sceneContent =
		Object.values(snapshot.sceneContents || {}).find((sc) => sc.sceneId == snapshot.id) ||
		Object.values(snapshot.sceneContents || {})[0];

	const baseEvents: SceneComp["events"] = Object.fromEntries(
		Object.entries(snapshot.events || {}).map(([itemId, eventMap]) => [itemId, { ...(eventMap || {}) }])
	);

	if (!sceneContent) {
		return {
			resolvedEvents: baseEvents,
			resolvedSceneContentEvents: [],
			cueWindowsByItemId: new Map<number, Window>(),
			cueByName: new Map<string, TextTime>()
		};
	}

	const resolvedSceneContentEvents = [...(sceneContent.events || [])];
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
				if (!capsuleIntroCue || !capsuleOutroCue) {
					if (capsuleHostItem.capsuleId === snapshot.main) {
						capsuleStart = sceneBounds.start;
						capsuleEnd = sceneBounds.end;
					} else {
						continue;
					}
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

			let previousIndex = -1;
			let previousEnd = capsuleStart;
			for (const lock of orderedLocks) {
				allocateEvenly(previousIndex + 1, lock.index - 1, previousEnd, lock.start);
				windows[lock.index] = { start: lock.start, end: lock.end };
				previousIndex = lock.index;
				previousEnd = lock.end;
			}
			allocateEvenly(previousIndex + 1, orderedChildren.length - 1, previousEnd, capsuleEnd);

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

				if (generateMissingEvents && !currentEvents[INTRO]) {
					currentEvents[INTRO] = createGeneratedEvent({
						itemId: item.id,
						action: INTRO,
						name: ensureCueAtTime(appliedWindow.start, `${hintPrefix}_intro`, cueMode)
					});
				}

				if (generateMissingEvents && !currentEvents[OUTRO]) {
					currentEvents[OUTRO] = createGeneratedEvent({
						itemId: item.id,
						action: OUTRO,
						name: ensureCueAtTime(appliedWindow.end, `${hintPrefix}_outro`, cueMode)
					});
				}

				const introCue = currentEvents[INTRO]?.name ? cueByName.get(currentEvents[INTRO]?.name || "") : null;
				const outroCue = currentEvents[OUTRO]?.name ? cueByName.get(currentEvents[OUTRO]?.name || "") : null;

				cueWindowsByItemId.set(item.id, {
					start: introCue ? Number(introCue.start) : appliedWindow.start,
					end: outroCue ? Number(outroCue.end) : appliedWindow.end
				});
			}

			pendingCapsuleIds.delete(capsuleId);
			progressed = true;
		}

		if (!progressed) break;
		pass++;
	}

	return { resolvedEvents: baseEvents, resolvedSceneContentEvents, cueWindowsByItemId, cueByName };
}

function getSceneBoundsFromCues(cues: TextTime[]): { start: number; end: number } {
	let end = 0;
	for (const cue of cues) {
		const cueEnd = Number.isFinite(cue.end) ? cue.end : cue.start;
		if (cueEnd > end) end = cueEnd;
	}
	return { start: 0, end };
}

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
		ref: "",
		duration: null,
		delay: null,
		itemId,
		decorId: null
	};
}
