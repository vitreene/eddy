export type WaveformDataV1 = {
	version: 1;
	sampleRate: number;
	durationSec: number;
	points: number;
	min: number[];
	max: number[];
};

export function isWaveformDataV1(value: unknown): value is WaveformDataV1 {
	if (!value || typeof value != "object" || Array.isArray(value)) return false;
	const data = value as Record<string, unknown>;
	if (data.version !== 1) return false;
	if (!isFiniteNumber(data.sampleRate, 1)) return false;
	if (!isFiniteNumber(data.durationSec, 0)) return false;
	if (!isFiniteNumber(data.points, 1)) return false;
	if (!Array.isArray(data.min) || !Array.isArray(data.max)) return false;
	if (data.min.length !== data.max.length) return false;
	if (data.min.length !== Number(data.points)) return false;
	if (!data.min.every((entry) => typeof entry == "number" && Number.isFinite(entry))) return false;
	if (!data.max.every((entry) => typeof entry == "number" && Number.isFinite(entry))) return false;
	return true;
}

export function parseContentTimestampWaveform(raw: string | null | undefined): WaveformDataV1 | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed != "object" || Array.isArray(parsed)) return null;
		const waveform = (parsed as { waveform?: unknown }).waveform;
		if (!isWaveformDataV1(waveform)) return null;
		return waveform;
	} catch {
		return null;
	}
}

function isFiniteNumber(value: unknown, min: number): boolean {
	return typeof value == "number" && Number.isFinite(value) && value >= min;
}
