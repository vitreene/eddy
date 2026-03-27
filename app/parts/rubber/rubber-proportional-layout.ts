import type { TextTime } from "@/api/db";
import type { CustomEventPosition } from "@/config/custom-events";

const DEFAULT_PIXELS_PER_SECOND = 240;
const MIN_SEGMENT_WIDTH_PX = 1;

export interface RubberCueSegment {
	key: string;
	name: string;
	text: string;
	startSec: number;
	endSec: number;
	durationSec: number;
	widthPx: number;
	isActive: boolean;
}

export interface RubberCueSnapPoint {
	id: string;
	segmentKey: string;
	segmentIndex: number;
	cueName: string;
	position: CustomEventPosition;
}

interface RubberCueSegmentBase {
	key: string;
	name: string;
	text: string;
	startSec: number;
	endSec: number;
	durationSec: number;
	widthPx: number;
}

export class RubberProportionalLayout {
	private cachedCues: Array<TextTime> | null = null;
	private cachedCueDurationSec = 0;
	private cachedBaseSegments: Array<RubberCueSegmentBase> = [];
	private cachedSnapPoints: Array<RubberCueSnapPoint> = [];
	private cachedResolvedSegments: Array<RubberCueSegment> = [];
	private cachedResolvedBaseRef: Array<RubberCueSegmentBase> | null = null;
	private cachedResolvedActiveIndex = Number.NaN;

	constructor(private readonly pixelsPerSecond = DEFAULT_PIXELS_PER_SECOND) {}

	build(
		cues: Array<TextTime> | null | undefined,
		progressPercent: number | null | undefined,
		timelineDurationSec?: number | null
	): Array<RubberCueSegment> {
		const baseSegments = this.resolveBaseSegments(cues);
		if (!baseSegments.length) return [];

		const activeIndex = this.resolveActiveIndex(baseSegments, progressPercent, timelineDurationSec);
		if (this.cachedResolvedBaseRef === baseSegments && this.cachedResolvedActiveIndex === activeIndex) {
			return this.cachedResolvedSegments;
		}

		const resolved = baseSegments.map((segment, index) => ({
			...segment,
			isActive: index === activeIndex
		}));

		this.cachedResolvedBaseRef = baseSegments;
		this.cachedResolvedActiveIndex = activeIndex;
		this.cachedResolvedSegments = resolved;

		return resolved;
	}

	getSnapPoints(cues: Array<TextTime> | null | undefined): Array<RubberCueSnapPoint> {
		this.resolveBaseSegments(cues);
		return this.cachedSnapPoints;
	}

	private resolveBaseSegments(cues: Array<TextTime> | null | undefined): Array<RubberCueSegmentBase> {
		if (!Array.isArray(cues) || cues.length === 0) {
			this.cachedCues = null;
			this.cachedCueDurationSec = 0;
			this.cachedBaseSegments = [];
			this.cachedSnapPoints = [];
			this.cachedResolvedBaseRef = null;
			this.cachedResolvedSegments = [];
			this.cachedResolvedActiveIndex = Number.NaN;
			return [];
		}

		if (this.cachedCues === cues) return this.cachedBaseSegments;

		const segments = cues.map((cue, index) => this.toSegment(cue, index));
		this.cachedCues = cues;
		this.cachedBaseSegments = segments;
		this.cachedCueDurationSec = resolveCueDurationSec(segments);
		this.cachedSnapPoints = buildSnapPoints(segments);
		this.cachedResolvedBaseRef = null;
		this.cachedResolvedSegments = [];
		this.cachedResolvedActiveIndex = Number.NaN;

		return segments;
	}

	private toSegment(cue: TextTime, index: number): RubberCueSegmentBase {
		const startSec = sanitizeSeconds(cue.start);
		const rawEnd = sanitizeSeconds(cue.end);
		const endSec = rawEnd >= startSec ? rawEnd : startSec;
		const durationSec = Number((endSec - startSec).toFixed(3));
		const widthPx = Math.max(MIN_SEGMENT_WIDTH_PX, Math.round(durationSec * this.pixelsPerSecond));
		const name = cue.name || `cue-${index}`;
		const text = cue.text?.trim() || name;

		return {
			key: `${name}-${index}`,
			name,
			text,
			startSec,
			endSec,
			durationSec,
			widthPx
		};
	}

	private resolveActiveIndex(
		segments: Array<RubberCueSegmentBase>,
		progressPercent: number | null | undefined,
		timelineDurationSec: number | null | undefined
	): number {
		if (!segments.length) return -1;
		const totalDurationSec = resolveTimelineDurationSec(timelineDurationSec, this.cachedCueDurationSec);
		if (totalDurationSec <= 0) return 0;

		const progress = sanitizeProgressPercent(progressPercent);
		const elapsedSec = Number(((progress / 100) * totalDurationSec).toFixed(3));

		if (elapsedSec <= segments[0].startSec) return 0;

		let lastFinishedIndex = -1;
		for (let index = 0; index < segments.length; index += 1) {
			const segment = segments[index];

			if (elapsedSec < segment.startSec) {
				if (lastFinishedIndex >= 0) return lastFinishedIndex;
				return 0;
			}

			if (elapsedSec <= segment.endSec) return index;

			lastFinishedIndex = index;
		}

		if (lastFinishedIndex >= 0) return lastFinishedIndex;
		return segments.length - 1;
	}
}

function resolveCueDurationSec(segments: Array<RubberCueSegmentBase>): number {
	let maxEnd = 0;
	for (const segment of segments) {
		if (segment.endSec > maxEnd) maxEnd = segment.endSec;
	}
	return Number(maxEnd.toFixed(3));
}

function buildSnapPoints(segments: Array<RubberCueSegmentBase>): Array<RubberCueSnapPoint> {
	const points: Array<RubberCueSnapPoint> = [];
	for (let index = 0; index < segments.length; index += 1) {
		const segment = segments[index];
		for (const position of ["start", "middle", "end"] as const) {
			points.push({
				id: `${segment.name}:${position}`,
				segmentKey: segment.key,
				segmentIndex: index,
				cueName: segment.name,
				position
			});
		}
	}
	return points;
}

function resolveTimelineDurationSec(
	explicitDurationSec: number | null | undefined,
	cueDurationSec: number
): number {
	const explicit = sanitizeSeconds(explicitDurationSec);
	if (explicit > 0) return explicit;
	if (cueDurationSec > 0) return cueDurationSec;
	return 0;
}

function sanitizeSeconds(value: unknown): number {
	const number = Number(value);
	if (!Number.isFinite(number)) return 0;
	if (number < 0) return 0;
	return Number(number.toFixed(3));
}

function sanitizeProgressPercent(value: number | null | undefined): number {
	const number = Number(value);
	if (!Number.isFinite(number)) return 0;
	if (number < 0) return 0;
	if (number > 100) return 100;
	return Number(number.toFixed(2));
}
