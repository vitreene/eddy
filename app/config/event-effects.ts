import type { ActionStyle } from "@/player/builder/lib";

export type SustainEffectName = "zoom";
export type SustainEffectDirection = "initial" | "final";

export type SustainEffectRef = {
	name: SustainEffectName;
	in: number;
	out: number;
};

export type SustainEffectUiState = {
	name: SustainEffectName | null;
	direction: SustainEffectDirection;
	value: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 1.5;
const DEFAULT_ZOOM_VALUE = 1.1;

type SustainEffectDefinition = {
	name: SustainEffectName;
	buildStyle: (input: { inScale: number; outScale: number; durationMs: number }) => ActionStyle;
};

const SUSTAIN_EFFECTS: Record<SustainEffectName, SustainEffectDefinition> = {
	zoom: {
		name: "zoom",
		buildStyle: ({ inScale, outScale, durationMs }) => ({
			scale: { from: inScale, to: outScale, duration: durationMs },
			transformOrigin: { to: "50% 50%", duration: durationMs }
		})
	}
};

export function parseSustainEffectRef(raw: string | null | undefined): SustainEffectRef | null {
	if (!raw || typeof raw != "string") return null;
	const trimmed = raw.trim();
	if (!trimmed) return null;

	try {
		const parsed = JSON.parse(trimmed) as Partial<SustainEffectRef>;
		if (parsed?.name !== "zoom") return null;
		if (typeof parsed.in !== "number" || !Number.isFinite(parsed.in)) return null;
		if (typeof parsed.out !== "number" || !Number.isFinite(parsed.out)) return null;

		const inScale = clampScale(parsed.in);
		const outScale = clampScale(parsed.out);
		return {
			name: "zoom",
			in: inScale,
			out: outScale
		};
	} catch {
		return null;
	}
}

export function normalizeSustainEffectRef(raw: string | null | undefined): string | null {
	const parsed = parseSustainEffectRef(raw);
	if (!parsed) return null;
	return JSON.stringify(parsed);
}

export function buildSustainEffectStyle(
	ref: string | null | undefined,
	durationMs: number
): ActionStyle | null {
	const parsed = parseSustainEffectRef(ref);
	if (!parsed) return null;

	const effect = SUSTAIN_EFFECTS[parsed.name];
	if (!effect) return null;

	const safeDuration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
	return effect.buildStyle({
		inScale: parsed.in,
		outScale: parsed.out,
		durationMs: safeDuration
	});
}

export function parseSustainEffectUiState(raw: string | null | undefined): SustainEffectUiState {
	const parsed = parseSustainEffectRef(raw);
	if (!parsed) {
		return {
			name: null,
			direction: "final",
			value: DEFAULT_ZOOM_VALUE
		};
	}

	const distanceIn = Math.abs(parsed.in - 1);
	const distanceOut = Math.abs(parsed.out - 1);
	if (distanceIn > distanceOut) {
		return {
			name: parsed.name,
			direction: "initial",
			value: parsed.in
		};
	}

	return {
		name: parsed.name,
		direction: "final",
		value: parsed.out
	};
}

export function serializeSustainEffectUiState(state: SustainEffectUiState): string | null {
	if (state.name !== "zoom") return null;

	const value = clampScale(state.value);
	const inScale = state.direction === "initial" ? value : 1;
	const outScale = state.direction === "initial" ? 1 : value;

	return JSON.stringify({
		name: "zoom",
		in: inScale,
		out: outScale
	} satisfies SustainEffectRef);
}

function clampScale(value: unknown): number {
	const numberValue = typeof value == "number" ? value : Number(value);
	if (!Number.isFinite(numberValue)) return MIN_SCALE;
	return Number(Math.min(MAX_SCALE, Math.max(MIN_SCALE, numberValue)).toFixed(3));
}
