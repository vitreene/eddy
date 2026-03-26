import { useEffect, useRef } from "react";

import { SceneLogicContext } from "@/provider/scene-logic";
import { getActiveSceneContent } from "@/scene-runtime/scene-content";
import { parseContentTimestampWaveform } from "@/waveform/payload";

const DEFAULT_HEIGHT = 72;

export function WaveformCanvasTest() {
	const waveform = SceneLogicContext.useSelector((state) => {
		const sceneContent = getActiveSceneContent(state.context as any);
		if (!sceneContent) return null;
		const content = state.context.contents?.[sceneContent.contentId];
		return parseContentTimestampWaveform(content?.timestamp);
	});
	const activeProgress = SceneLogicContext.useSelector((state) => state.context.active.progress ?? 0);

	const summary = waveform
		? `${waveform.points} pts • ${waveform.durationSec.toFixed(2)}s • ${Math.round(waveform.sampleRate)}Hz`
		: null;

	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container || !waveform) return;

		const width = Math.max(1, Math.round(container.clientWidth));

		const pixelRatio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
		const height = DEFAULT_HEIGHT;
		canvas.width = width * pixelRatio;
		canvas.height = height * pixelRatio;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		const context = canvas.getContext("2d");
		if (!context) return;
		context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		context.clearRect(0, 0, width, height);
		context.fillStyle = "#f5f5f4";
		context.fillRect(0, 0, width, height);
		context.lineWidth = 1;

		const progress = clampProgress(activeProgress);
		const elapsedEdgeX = (progress / 100) * Math.max(0, width - 1);
		const elapsedColor = "#115e59";
		const remainingColor = "#5eead4";

		const points = Math.min(waveform.points, waveform.min.length, waveform.max.length);
		if (!points) return;
		const centerY = height / 2;
		const amplitude = height * 0.45;

		for (let index = 0; index < points; index += 1) {
			const x = Math.round((index / Math.max(1, points - 1)) * (width - 1)) + 0.5;
			context.strokeStyle = x <= elapsedEdgeX + 0.5 ? elapsedColor : remainingColor;
			const min = clampWaveformValue(waveform.min[index]);
			const max = clampWaveformValue(waveform.max[index]);
			const yMin = centerY - max * amplitude;
			const yMax = centerY - min * amplitude;
			context.beginPath();
			context.moveTo(x, yMin);
			context.lineTo(x, yMax);
			context.stroke();
		}
	}, [waveform, activeProgress]);

	return (
		<div ref={containerRef} className="rounded-md border border-stone-200 bg-white p-2">
			<div className="mb-1 flex items-center justify-between text-[10px] text-stone-500">
				<span>Waveform test</span>
				<span>{summary || "aucune donnee"}</span>
			</div>
			{waveform ? (
				<canvas ref={canvasRef} className="block w-full" />
			) : (
				<div className="flex h-[72px] items-center justify-center text-[11px] text-stone-400">
					Aucun waveform enregistre
				</div>
			)}
		</div>
	);
}

function clampWaveformValue(value: number): number {
	if (!Number.isFinite(value)) return 0;
	if (value < -1) return -1;
	if (value > 1) return 1;
	return value;
}

function clampProgress(value: number): number {
	if (!Number.isFinite(value)) return 0;
	if (value < 0) return 0;
	if (value > 100) return 100;
	return value;
}
