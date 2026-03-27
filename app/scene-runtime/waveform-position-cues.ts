const WAVEFORM_POSITION_CUE_REGEX = /^__wfpos__t-(\d{4,})$/;

export const WAVEFORM_POSITION_CUE_PREFIX = "__wfpos__t-";

export function isWaveformPositionCueName(name: string | null | undefined): boolean {
	if (!name) return false;
	return WAVEFORM_POSITION_CUE_REGEX.test(name.trim());
}

export function buildNextWaveformPositionCueName(existingNames: Iterable<string>): string {
	let maxId = 0;
	for (const rawName of existingNames) {
		const name = typeof rawName === "string" ? rawName.trim() : "";
		const match = name.match(WAVEFORM_POSITION_CUE_REGEX);
		if (!match) continue;
		const id = Number(match[1]);
		if (!Number.isFinite(id) || id <= 0) continue;
		if (id > maxId) maxId = id;
	}

	return `${WAVEFORM_POSITION_CUE_PREFIX}${String(maxId + 1).padStart(4, "0")}`;
}
