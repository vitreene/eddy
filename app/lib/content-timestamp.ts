import type { TextTime } from "@/api/db";

export function parseContentTimestampWords(raw: string | null | undefined): TextTime[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed != "object") return [];
		const words = (parsed as { words?: unknown }).words;
		if (!Array.isArray(words)) return [];
		return normalizeWords(words as TextTime[]);
	} catch {
		return [];
	}
}

export function hasWhisperWords(raw: string | null | undefined): boolean {
	return parseContentTimestampWords(raw).length > 0;
}

export function getContentTimestampDurationSec(raw: string | null | undefined): number | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed != "object") return null;
		const waveform = (parsed as { waveform?: { durationSec?: unknown } }).waveform;
		const waveformDuration = Number(waveform?.durationSec);
		if (Number.isFinite(waveformDuration) && waveformDuration > 0) {
			return Number(waveformDuration.toFixed(3));
		}

		const words = parseContentTimestampWords(raw);
		let maxSec = 0;
		for (const word of words) {
			const end = Number(word.end);
			if (Number.isFinite(end) && end > maxSec) maxSec = end;
		}
		return maxSec > 0 ? Number(maxSec.toFixed(3)) : null;
	} catch {
		return null;
	}
}

export function mergeContentTimestampWords(raw: string | null | undefined, words: TextTime[]): string {
	let current: Record<string, unknown> = {};
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed == "object" && !Array.isArray(parsed)) {
				current = parsed as Record<string, unknown>;
			}
		} catch {
			current = {};
		}
	}

	return JSON.stringify({ ...current, words: normalizeWords(words) });
}

function normalizeWords(words: TextTime[]): TextTime[] {
	return (Array.isArray(words) ? words : [])
		.map((word) => ({
			...word,
			name: typeof word?.name == "string" ? word.name : "",
			text: typeof word?.text == "string" ? word.text : "",
			start: Number(word?.start),
			end: Number(word?.end)
		}))
		.filter((word) => Number.isFinite(word.start) && Number.isFinite(word.end));
}
