import assert from "node:assert/strict";

import {
	hasWhisperWords,
	getContentTimestampDurationSec,
	mergeContentTimestampWords,
	parseContentTimestampWords
} from "../app/lib/content-timestamp";

const waveformOnly = JSON.stringify({
	waveform: {
		version: 1,
		sampleRate: 22050,
		durationSec: 14.932,
		points: 2,
		min: [0, 0],
		max: [0, 0]
	}
});

const words = [{ name: "w-1", text: "bonjour", start: 1.2, end: 1.8 }];
const merged = mergeContentTimestampWords(waveformOnly, words as any);

assert.equal(hasWhisperWords(waveformOnly), false, "waveform-only payload should not count as Whisper transcript");
assert.equal(parseContentTimestampWords(waveformOnly).length, 0, "waveform-only payload should yield no words");
assert.equal(
	getContentTimestampDurationSec(waveformOnly),
	14.932,
	"waveform-only payload should expose the audio duration"
);
assert.equal(hasWhisperWords(merged), true, "merged payload should count as Whisper transcript");
assert.equal(parseContentTimestampWords(merged).length, 1, "merged payload should expose the words array");
assert.equal(
	getContentTimestampDurationSec(merged),
	14.932,
	"merged payload should keep the waveform duration"
);
assert.equal(JSON.parse(merged).waveform.durationSec, 14.932, "waveform data must be preserved while merging words");

console.log("content timestamp smoke: all checks passed");
