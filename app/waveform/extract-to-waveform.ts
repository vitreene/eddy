import { computeWaveformMinMax } from "./compute-waveform";
import type { WaveformDataV1 } from "./payload";

type WaveformWorkerMessage =
	| {
			status: "complete";
			data?: WaveformDataV1;
	  }
	| {
			status: "error";
			data?: { message?: string };
	  }
	| {
			status: string;
	  };

export type WaveformExtractOptions = {
	points?: number;
	sampleRate?: number;
	signal?: AbortSignal;
};

const DEFAULT_OPTIONS = {
	points: 2048,
	sampleRate: 22050
} as const;

export async function extractAudioFileToWaveform(
	file: File,
	options: WaveformExtractOptions = {}
): Promise<WaveformDataV1> {
	const sampleRate = resolveSampleRate(options.sampleRate);
	const audioBuffer = await decodeAudioFile(file, sampleRate);
	return extractAudioBufferToWaveform(audioBuffer, options);
}

export function extractAudioBufferToWaveform(
	audioBuffer: AudioBuffer,
	options: WaveformExtractOptions = {}
): Promise<WaveformDataV1> {
	const points = resolvePoints(options.points);
	const mono = toMonoAudio(audioBuffer);
	if (typeof Worker == "undefined") {
		const computed = computeWaveformMinMax(mono, { points });
		return Promise.resolve({
			version: 1,
			sampleRate: audioBuffer.sampleRate,
			durationSec: Number(audioBuffer.duration.toFixed(3)),
			points: computed.points,
			min: computed.min,
			max: computed.max
		});
	}

	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

		const cleanup = () => {
			worker.removeEventListener("message", handleMessage);
			worker.removeEventListener("error", handleWorkerError);
			options.signal?.removeEventListener("abort", handleAbort);
			worker.terminate();
		};

		const handleAbort = () => {
			cleanup();
			reject(new Error("Waveform extraction aborted"));
		};

		const handleWorkerError = (event: ErrorEvent) => {
			cleanup();
			reject(event.error || new Error(event.message || "Waveform worker failed"));
		};

		const handleMessage = (event: MessageEvent<WaveformWorkerMessage>) => {
			const message = event.data;
			if (message.status === "complete") {
				cleanup();
				const payload = "data" in message ? message.data : undefined;
				if (!payload) {
					reject(new Error("Waveform extraction returned no data"));
					return;
				}
				resolve(payload);
				return;
			}

			if (message.status === "error") {
				cleanup();
				const payload = "data" in message ? message.data : undefined;
				reject(new Error(payload?.message || "Waveform extraction failed"));
			}
		};

		if (options.signal?.aborted) {
			handleAbort();
			return;
		}

		options.signal?.addEventListener("abort", handleAbort, { once: true });
		worker.addEventListener("message", handleMessage);
		worker.addEventListener("error", handleWorkerError);
		worker.postMessage(
			{
				audio: mono,
				points,
				sampleRate: audioBuffer.sampleRate,
				durationSec: audioBuffer.duration
			},
			[mono.buffer]
		);
	});
}

async function decodeAudioFile(file: File, sampleRate: number): Promise<AudioBuffer> {
	const audioContext = new AudioContext({ sampleRate });
	try {
		const buffer = await file.arrayBuffer();
		return await audioContext.decodeAudioData(buffer);
	} finally {
		void audioContext.close();
	}
}

function toMonoAudio(audioBuffer: AudioBuffer): Float32Array {
	if (audioBuffer.numberOfChannels <= 1) {
		return new Float32Array(audioBuffer.getChannelData(0));
	}

	const left = audioBuffer.getChannelData(0);
	const right = audioBuffer.getChannelData(1);
	const mono = new Float32Array(audioBuffer.length);
	const scalingFactor = Math.sqrt(2);
	for (let index = 0; index < audioBuffer.length; index += 1) {
		mono[index] = (scalingFactor * (left[index] + right[index])) / 2;
	}
	return mono;
}

function resolvePoints(value: unknown): number {
	const numberValue = typeof value == "number" ? value : Number(value);
	if (!Number.isFinite(numberValue) || numberValue <= 0) return DEFAULT_OPTIONS.points;
	return Math.max(64, Math.min(8192, Math.round(numberValue)));
}

function resolveSampleRate(value: unknown): number {
	const numberValue = typeof value == "number" ? value : Number(value);
	if (!Number.isFinite(numberValue) || numberValue < 8000) return DEFAULT_OPTIONS.sampleRate;
	return Math.min(96000, Math.round(numberValue));
}
