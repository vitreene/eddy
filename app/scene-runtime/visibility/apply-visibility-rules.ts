import type { SceneComp } from "@/api/db";

/**
 * Build a runtime-ready snapshot by removing hidden items and unreachable capsules.
 */
export function applyVisibilityRules(snapshot: SceneComp): SceneComp {
	if (!snapshot?.items || !snapshot?.capsules || !snapshot?.contents) return snapshot;

	const capsuleHostItemIdByCapsuleId = buildCapsuleHostItemMap(snapshot);
	const visibleItemIds = new Set<number>();
	for (const item of Object.values(snapshot.items)) {
		if (isItemEffectivelyVisible(item.id, snapshot, capsuleHostItemIdByCapsuleId)) {
			visibleItemIds.add(item.id);
		}
	}

	const visibleItems = Object.fromEntries(
		Object.entries(snapshot.items).filter(([id]) => visibleItemIds.has(Number(id)))
	) as SceneComp["items"];

	const visibleCapsuleIds = collectReachableVisibleCapsuleIds(snapshot, visibleItemIds);
	const visibleCapsules = Object.fromEntries(
		Object.entries(snapshot.capsules || {})
			.filter(([id]) => visibleCapsuleIds.has(Number(id)))
			.map(([id, capsule]) => [
				id,
				{
					...capsule,
					itemIds: (capsule.itemIds || []).filter((itemId) => visibleItemIds.has(itemId))
				}
			])
	) as SceneComp["capsules"];

	const visibleEvents = Object.fromEntries(
		Object.entries(snapshot.events || {}).filter(([itemId]) => visibleItemIds.has(Number(itemId)))
	) as SceneComp["events"];

	return {
		...snapshot,
		capsules: visibleCapsules,
		items: visibleItems,
		events: visibleEvents
	};
}

/**
 * Discover capsules reachable from main capsule through visible capsule-content items.
 */
function collectReachableVisibleCapsuleIds(snapshot: SceneComp, visibleItemIds: Set<number>): Set<number> {
	const visibleCapsuleIds = new Set<number>();
	if (!snapshot.main) return visibleCapsuleIds;

	const queue = [snapshot.main];
	while (queue.length) {
		const capsuleId = queue.shift();
		if (!capsuleId || visibleCapsuleIds.has(capsuleId)) continue;
		visibleCapsuleIds.add(capsuleId);

		const capsule = snapshot.capsules[capsuleId];
		if (!capsule) continue;

		for (const itemId of capsule.itemIds || []) {
			if (!visibleItemIds.has(itemId)) continue;
			const item = snapshot.items[itemId];
			if (!item) continue;
			const content = snapshot.contents[item.contentId];
			if (content?.type === "capsule" && content.capsuleId) {
				queue.push(content.capsuleId);
			}
		}
	}

	return visibleCapsuleIds;
}

/**
 * Build capsuleId -> host itemId map for parent visibility propagation.
 */
function buildCapsuleHostItemMap(snapshot: SceneComp): Record<number, number> {
	const map: Record<number, number> = {};
	for (const item of Object.values(snapshot.items || {})) {
		const content = snapshot.contents[item.contentId];
		if (content?.type === "capsule" && content.capsuleId) {
			map[content.capsuleId] = item.id;
		}
	}
	return map;
}

/**
 * Evaluate effective visibility for an item, including host capsule item chain.
 */
function isItemEffectivelyVisible(
	itemId: number,
	snapshot: SceneComp,
	capsuleHostItemIdByCapsuleId: Record<number, number>
): boolean {
	const item = snapshot.items[itemId];
	if (!item) return false;
	if (item.visible === false) return false;

	let capsuleId = item.capsuleId;
	const visitedCapsules = new Set<number>();

	while (typeof capsuleId === "number" && !visitedCapsules.has(capsuleId)) {
		visitedCapsules.add(capsuleId);
		const hostItemId = capsuleHostItemIdByCapsuleId[capsuleId];
		if (!hostItemId) break;

		const hostItem = snapshot.items[hostItemId];
		if (!hostItem) break;
		if (hostItem.visible === false) return false;

		capsuleId = hostItem.capsuleId;
	}

	return true;
}
