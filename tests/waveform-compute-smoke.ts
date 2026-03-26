import assert from "node:assert/strict";

import { computeWaveformMinMax } from "../app/waveform/compute-waveform";

const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25, -0.25, 0]);
const waveform = computeWaveformMinMax(samples, { points: 4 });

assert.equal(waveform.points, 4);
assert.deepEqual(waveform.max, [0.5, 1, 0.25, 0]);
assert.deepEqual(waveform.min, [0, -0.5, -1, -0.25]);

console.log("waveform compute smoke: all checks passed");
