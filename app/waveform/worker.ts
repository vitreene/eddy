import { computeWaveformMinMax } from "./compute-waveform";

type WaveformWorkerRequest = {
	audio: Float32Array;
	points: number;
	sampleRate: number;
	durationSec: number;
};

self.addEventListener("message", (event: MessageEvent<WaveformWorkerRequest>) => {
	const message = event.data;
	try {
		const waveform = computeWaveformMinMax(message.audio, { points: message.points });
		self.postMessage({
			status: "complete",
			data: {
				version: 1,
				sampleRate: message.sampleRate,
				durationSec: Number(message.durationSec.toFixed(3)),
				points: waveform.points,
				min: waveform.min,
				max: waveform.max
			}
		});
	} catch (error) {
		self.postMessage({
			status: "error",
			data: {
				message: error instanceof Error ? error.message : "Waveform worker failed"
			}
		});
	}
});
