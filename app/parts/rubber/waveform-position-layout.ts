export class WaveformPositionLayout {
	constructor(private readonly durationSec: number) {}

	secToPercent(timeSec: number): number {
		const duration = this.getSafeDuration();
		const clampedSec = clampNumber(timeSec, 0, duration);
		return (clampedSec / duration) * 100;
	}

	percentToSec(percent: number): number {
		const duration = this.getSafeDuration();
		const clampedPercent = clampNumber(percent, 0, 100);
		return Number(((clampedPercent / 100) * duration).toFixed(3));
	}

	xToSec(xPx: number, widthPx: number): number {
		const safeWidth = Math.max(1, widthPx);
		const ratio = clampNumber(xPx / safeWidth, 0, 1);
		return Number((ratio * this.getSafeDuration()).toFixed(3));
	}

	private getSafeDuration(): number {
		const duration = Number(this.durationSec);
		if (!Number.isFinite(duration) || duration <= 0) return 1;
		return duration;
	}
}

function clampNumber(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	if (value < min) return min;
	if (value > max) return max;
	return value;
}
