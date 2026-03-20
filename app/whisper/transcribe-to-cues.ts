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
	subtask?: "transcribe" | "translate";
	language?: string | null;
	dtype?: "fp32" | "fp16" | "q8" | "q4";
	device?: "webgpu" | "wasm" | null;
	soundId?: number | string | null;
	signal?: AbortSignal;
};

export type WhisperCueResult = {
	cues: TextTime[];
	totalDurationSec: number;
};

const WHISPER_DEFAULTS: {
	sampleRate: number;
	model: string;
	subtask: "transcribe";
	language: string | null;
	dtype: NonNullable<WhisperTranscribeOptions["dtype"]>;
	device: WhisperTranscribeOptions["device"];
} = {
	sampleRate: 16000,
	model: "onnx-community/whisper-small_timestamped",
	subtask: "transcribe" as const,
	language: "fr",
	dtype: "q8" as const,
	device: null
};

export async function transcribeAudioFileToCues(
	file: File,
	options: WhisperTranscribeOptions = {}
): Promise<WhisperCueResult> {
	const audioBuffer = await decodeAudioFile(file, WHISPER_DEFAULTS.sampleRate);
	const cues = await transcribeAudioBufferToCues(audioBuffer, options);
	const totalDurationSec =
		typeof audioBuffer.duration == "number" && Number.isFinite(audioBuffer.duration) && audioBuffer.duration > 0
			? Number(audioBuffer.duration.toFixed(3))
			: 0;
	return { cues, totalDurationSec };
}

export function transcribeAudioBufferToCues(
	audioData: AudioBuffer,
	options: WhisperTranscribeOptions = {}
): Promise<TextTime[]> {
	const monoAudio = toMonoAudio(audioData);
	const model = options.model || WHISPER_DEFAULTS.model;

	if (!supportsWordTimestamps(model)) {
		return Promise.reject(
			new Error(
				`Le modele Whisper "${model}" ne semble pas compatible word timestamps. Utiliser un modele *_timestamped (ex: onnx-community/whisper-small_timestamped).`
			)
		);
	}

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
				resolve(mapWhisperChunksToCues(chunks, { soundId: options.soundId }));
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
			model,
			subtask: options.subtask || WHISPER_DEFAULTS.subtask,
			language: options.language === undefined ? WHISPER_DEFAULTS.language : options.language,
			dtype: options.dtype || WHISPER_DEFAULTS.dtype,
			device: options.device === undefined ? WHISPER_DEFAULTS.device : options.device
		});
	});
}

function supportsWordTimestamps(model: string): boolean {
	return /_timestamped$/i.test(model.trim());
}

export function mapWhisperChunksToCues(
	chunks: WhisperChunk[],
	options: { soundId?: number | string | null } = {}
): TextTime[] {
	const mapped = chunks
		.map((chunk, index) => {
			const rawText = chunk.text || "";
			const text = rawText.trim();
			if (!text.length) return null;

			const start = toFiniteSec(chunk.timestamp?.[0]);
			const rawEnd = toFiniteSec(chunk.timestamp?.[1]);
			const end = rawEnd >= start ? rawEnd : start;

			return {
				name: buildCueName(index, text, options.soundId),
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

function buildCueName(index: number, text: string, soundId?: number | string | null): string {
	const soundToken = normalizeSoundToken(soundId);
	const token = String(index + 1).padStart(4, "0");
	const slug = slugifyCueText(text);
	return `${soundToken}-${token}-${slug}`;
}

function normalizeSoundToken(soundId?: number | string | null): string {
	if (typeof soundId == "number" && Number.isFinite(soundId)) {
		return `sound-${Math.max(0, Math.trunc(soundId))}`;
	}

	if (typeof soundId == "string") {
		const trimmed = soundId.trim();
		if (trimmed.length) return `sound-${slugifyCueText(trimmed)}`;
	}

	return "sound-unknown";
}

function slugifyCueText(value: string): string {
	const normalized = value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);

	return normalized || "cue";
}

function toFiniteSec(value: number | null | undefined): number {
	if (typeof value != "number" || !Number.isFinite(value) || value < 0) return 0;
	return Number(value.toFixed(3));
}
