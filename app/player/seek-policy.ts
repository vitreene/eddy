export function resolveSeekMsForActive(active: {
	action: string | null;
	cue: number | null;
	event: string | null;
}): number {
	const baseMs = (active.cue ?? 0) * 1000;
	if (active.action === "seek" && active.event === "intro" && Number.isFinite(baseMs) && baseMs > 0) {
		return Math.max(0, baseMs - 1);
	}
	return Number.isFinite(baseMs) ? baseMs : 0;
}
