import type { TextTime } from "@/api/db";
import type { CustomEventPosition } from "@/config/custom-events";

export type CuePointMatch = {
	name: string;
	position: CustomEventPosition;
	timeSec: number;
};

export function resolveClosestCuePointFromDelay(params: {
	cues: TextTime[];
	introName: string | null | undefined;
	outroName: string | null | undefined;
	delaySec: number | null | undefined;
}): CuePointMatch | null {
	const { cues, introName, outroName, delaySec } = params;
	if (typeof delaySec != "number" || !Number.isFinite(delaySec) || delaySec < 0) return null;
	if (!introName) return null;

	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const introCue = cueByName.get(introName);
	if (!introCue) return null;

	const introStart = Number(introCue.start);
	if (!Number.isFinite(introStart)) return null;

	const outroCue = outroName ? cueByName.get(outroName) : null;
	const outroEnd = outroCue ? Number(outroCue.end) : Number.POSITIVE_INFINITY;
	const boundedTarget = Number.isFinite(outroEnd)
		? Math.min(Math.max(introStart + delaySec, introStart), outroEnd)
		: introStart + delaySec;

	let best: CuePointMatch | null = null;
	for (const cue of cues) {
		for (const position of ["start", "middle", "end"] as const) {
			const timeSec = getCueTimeAtPosition(cue, position);
			if (!Number.isFinite(timeSec)) continue;
			const distance = Math.abs(timeSec - boundedTarget);
			if (!best || distance < Math.abs(best.timeSec - boundedTarget)) {
				best = { name: cue.name, position, timeSec };
			}
		}
	}

	return best;
}

export function resolveDelayFromCuePoint(params: {
	cues: TextTime[];
	introName: string | null | undefined;
	outroName: string | null | undefined;
	cueName: string | null | undefined;
	position: CustomEventPosition;
}): number | null {
	const { cues, introName, outroName, cueName, position } = params;
	if (!introName || !cueName) return null;

	const cueByName = new Map(cues.map((cue) => [cue.name, cue]));
	const introCue = cueByName.get(introName);
	const targetCue = cueByName.get(cueName);
	if (!introCue || !targetCue) return null;

	const introStart = Number(introCue.start);
	if (!Number.isFinite(introStart)) return null;

	const cueTime = getCueTimeAtPosition(targetCue, position);
	if (!Number.isFinite(cueTime)) return null;

	const outroCue = outroName ? cueByName.get(outroName) : null;
	const outroEnd = outroCue ? Number(outroCue.end) : Number.POSITIVE_INFINITY;
	const boundedTime = Number.isFinite(outroEnd) ? Math.min(Math.max(cueTime, introStart), outroEnd) : cueTime;

	return Math.max(0, boundedTime - introStart);
}

export function getCueTimeAtPosition(cue: TextTime, position: CustomEventPosition): number {
	const start = Number(cue.start);
	const end = Number(cue.end);
	if (!Number.isFinite(start)) return 0;
	const safeEnd = Number.isFinite(end) ? end : start;
	if (position == "start") return start;
	if (position == "end") return safeEnd;
	return start + (safeEnd - start) / 2;
}
