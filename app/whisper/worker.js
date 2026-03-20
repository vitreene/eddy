/* eslint-disable camelcase */
import { pipeline, env, WhisperTextStreamer } from "@huggingface/transformers";

// Disable local models
env.allowLocalModels = false;

// Define model factories
// Ensures only one model is created of each type
class PipelineFactory {
	static task = null;
	static model = null;
	static dtype = null;
	static device = null;
	static instance = null;

	constructor(tokenizer, model, dtype, device) {
		this.tokenizer = tokenizer;
		this.model = model;
		this.dtype = dtype;
		this.device = device;
	}

	static async getInstance(progress_callback = null) {
		if (this.instance === null) {
			this.instance = pipeline(this.task, this.model, {
				dtype: this.dtype,
				device: this.device,
				progress_callback
			});
		}

		return this.instance;
	}
}

self.addEventListener("message", async (event) => {
	const message = event.data;

	let transcript = await transcribe(message);
	if (transcript === null) return;

	// Send the result back to the main thread
	self.postMessage({
		status: "complete",
		task: "automatic-speech-recognition",
		data: transcript
	});
});

class AutomaticSpeechRecognitionPipelineFactory extends PipelineFactory {
	static task = "automatic-speech-recognition";
	static model = null;
	static dtype = null;
	static device = null;
}

const transcribe = async ({ audio, model, subtask, language, dtype = "q8", device = null }) => {
	if (!audio || !model) {
		self.postMessage({
			status: "error",
			task: "automatic-speech-recognition",
			data: { message: "Missing audio or model for Whisper transcription" }
		});
		return null;
	}

	const isDistilWhisper = model.startsWith("distil-whisper/");

	const p = AutomaticSpeechRecognitionPipelineFactory;
	if (p.model !== model || p.dtype !== dtype || p.device !== device) {
		// Invalidate model if different
		p.model = model;
		p.dtype = dtype;
		p.device = device;

		if (p.instance !== null) {
			(await p.getInstance()).dispose();
			p.instance = null;
		}
	}

	let transcriber = await p.getInstance((data) => {
		self.postMessage(data);
	});

	const time_precision =
		transcriber.processor.feature_extractor.config.chunk_length / transcriber.model.config.max_source_positions;

	const chunk_length_s = isDistilWhisper ? 20 : 30;
	const stride_length_s = isDistilWhisper ? 3 : 5;

	let chunk_count = 0;
	let started_at = null;
	let token_count = 0;
	let tps = null;

	const chunks = [];
	const toPublicChunks = () => chunks.map(({ text, timestamp }) => ({ text, timestamp }));

	const streamer = new WhisperTextStreamer(transcriber.tokenizer, {
		time_precision,
		on_chunk_start: (value) => {
			const offset = (chunk_length_s - stride_length_s) * chunk_count;
			chunks.push({
				text: "",
				timestamp: [offset + value, null],
				offset
			});
		},
		token_callback_function: () => {
			started_at ??= performance.now();
			token_count += 1;

			if (token_count > 1 && started_at !== null) {
				const elapsed_ms = performance.now() - started_at;
				if (elapsed_ms > 0) {
					tps = (token_count / elapsed_ms) * 1000;
				}
			}
		},
		callback_function: (value) => {
			if (!chunks.length) return;

			chunks[chunks.length - 1].text += value;
			self.postMessage({
				status: "update",
				task: "automatic-speech-recognition",
				data: {
					text: "",
					chunks: toPublicChunks(),
					tps
				}
			});
		},
		on_chunk_end: (value) => {
			if (!chunks.length) return;
			const current = chunks[chunks.length - 1];
			current.timestamp[1] = value + current.offset;
		},
		on_finalize: () => {
			started_at = null;
			token_count = 0;
			chunk_count += 1;
		}
	});

	const generation_options = {
		top_k: 0,
		do_sample: false,
		chunk_length_s,
		stride_length_s,
		task: subtask || "transcribe",
		return_timestamps: "word",
		force_full_sequences: false,
		streamer
	};

	if (language && language !== "auto") {
		generation_options.language = language;
	}

	let output = await transcriber(audio, {
		...generation_options
	}).catch((error) => {
		self.postMessage({
			status: "error",
			task: "automatic-speech-recognition",
			data: {
				message: error?.message || "Whisper transcription failed"
			}
		});
		return null;
	});

	if (!output) return null;
	return {
		...output,
		tps
	};
};
