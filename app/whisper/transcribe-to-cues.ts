import type { TextTime } from "@/api/db";

type WhisperChunk = {
	text: string;
	timestamp: [number, number | null];
};

type WhisperWorkerMessage =
	| {
			status: "complete";
			data?: {
				text?: string;
				chunks?: WhisperChunk[];
			};
	  }
	| {
			status: "error";
			data?: {
				message?: string;
			};
	  }
	| {
			status: string;
	  };

export type WhisperTranscribeOptions = {
	model?: string;
	multilingual?: boolean;
	quantized?: boolean;
	subtask?: "transcribe" | "translate";
	language?: string | null;
	signal?: AbortSignal;
};

const WHISPER_DEFAULTS = {
	sampleRate: 16000,
	model: "Xenova/whisper-base",
	multilingual: true,
	quantized: false,
	subtask: "transcribe" as const,
	language: "fr"
};

export async function transcribeAudioFileToCues(
	file: File,
	options: WhisperTranscribeOptions = {}
): Promise<TextTime[]> {
	const audioBuffer = await decodeAudioFile(file, WHISPER_DEFAULTS.sampleRate);
	return transcribeAudioBufferToCues(audioBuffer, options);
}

export function transcribeAudioBufferToCues(
	audioData: AudioBuffer,
	options: WhisperTranscribeOptions = {}
): Promise<TextTime[]> {
	const monoAudio = toMonoAudio(audioData);

	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

		const cleanup = () => {
			worker.removeEventListener("message", handleMessage);
			worker.removeEventListener("error", handleWorkerError);
			options.signal?.removeEventListener("abort", handleAbort);
			worker.terminate();
		};

		const handleAbort = () => {
			cleanup();
			reject(new Error("Whisper transcription aborted"));
		};

		const handleWorkerError = (event: ErrorEvent) => {
			cleanup();
			reject(event.error || new Error(event.message || "Whisper worker failed"));
		};

		const handleMessage = (event: MessageEvent<WhisperWorkerMessage>) => {
			const message = event.data;
			if (message.status === "complete") {
				cleanup();
				const chunks = "data" in message ? message.data?.chunks || [] : [];
				resolve(mapWhisperChunksToCues(chunks));
				return;
			}

			if (message.status === "error") {
				cleanup();
				const detail = "data" in message ? message.data?.message : undefined;
				reject(new Error(detail || "Whisper transcription failed"));
			}
		};

		if (options.signal?.aborted) {
			handleAbort();
			return;
		}

		options.signal?.addEventListener("abort", handleAbort, { once: true });
		worker.addEventListener("message", handleMessage);
		worker.addEventListener("error", handleWorkerError);

		worker.postMessage({
			audio: monoAudio,
			model: options.model || WHISPER_DEFAULTS.model,
			multilingual: options.multilingual ?? WHISPER_DEFAULTS.multilingual,
			quantized: options.quantized ?? WHISPER_DEFAULTS.quantized,
			subtask: options.subtask || WHISPER_DEFAULTS.subtask,
			language: options.language === null ? null : options.language || WHISPER_DEFAULTS.language
		});
	});
}

export function mapWhisperChunksToCues(chunks: WhisperChunk[]): TextTime[] {
	const mapped = chunks
		.map((chunk, index) => {
			const rawText = chunk.text || "";
			const text = rawText.trim();
			if (!text.length) return null;

			const start = toFiniteSec(chunk.timestamp?.[0]);
			const rawEnd = toFiniteSec(chunk.timestamp?.[1]);
			const end = rawEnd >= start ? rawEnd : start;

			return {
				name: buildCueName(index),
				text,
				start,
				end
			} as TextTime;
		})
		.filter((cue): cue is TextTime => Boolean(cue))
		.sort((a, b) => a.start - b.start);

	return mapped;
}

function toMonoAudio(audioData: AudioBuffer): Float32Array {
	if (audioData.numberOfChannels <= 1) return audioData.getChannelData(0);

	const left = audioData.getChannelData(0);
	const right = audioData.getChannelData(1);
	const mono = new Float32Array(audioData.length);
	const scalingFactor = Math.sqrt(2);

	for (let i = 0; i < audioData.length; i += 1) {
		mono[i] = (scalingFactor * (left[i] + right[i])) / 2;
	}

	return mono;
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

function buildCueName(index: number): string {
	const token = String(index + 1).padStart(4, "0");
	return `whisper-${token}`;
}

function toFiniteSec(value: number | null | undefined): number {
	if (typeof value != "number" || !Number.isFinite(value) || value < 0) return 0;
	return Number(value.toFixed(3));
}
