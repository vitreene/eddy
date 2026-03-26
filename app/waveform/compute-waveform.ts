export type ComputeWaveformOptions = {
	points: number;
};

export type ComputedWaveform = {
	points: number;
	min: number[];
	max: number[];
};

export function computeWaveformMinMax(samples: Float32Array, options: ComputeWaveformOptions): ComputedWaveform {
	const points = normalizePoints(options.points);
	if (!samples.length) {
		return {
			points,
			min: new Array(points).fill(0),
			max: new Array(points).fill(0)
		};
	}

	const min = new Array<number>(points);
	const max = new Array<number>(points);
	const samplesPerPoint = Math.max(1, Math.ceil(samples.length / points));

	for (let pointIndex = 0; pointIndex < points; pointIndex += 1) {
		const start = pointIndex * samplesPerPoint;
		if (start >= samples.length) {
			min[pointIndex] = 0;
			max[pointIndex] = 0;
			continue;
		}
		const end = Math.min(samples.length, start + samplesPerPoint);
		let localMin = 1;
		let localMax = -1;

		for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
			const sample = clampNormalizedSample(samples[sampleIndex]);
			if (sample < localMin) localMin = sample;
			if (sample > localMax) localMax = sample;
		}

		min[pointIndex] = roundSample(localMin);
		max[pointIndex] = roundSample(localMax);
	}

	return { points, min, max };
}

function normalizePoints(value: unknown): number {
	const asNumber = typeof value == "number" ? value : Number(value);
	if (!Number.isFinite(asNumber) || asNumber <= 0) return 2048;
	return Math.max(1, Math.min(8192, Math.round(asNumber)));
}

function clampNormalizedSample(value: number): number {
	if (!Number.isFinite(value)) return 0;
	if (value < -1) return -1;
	if (value > 1) return 1;
	return value;
}

function roundSample(value: number): number {
	return Number(value.toFixed(4));
}
