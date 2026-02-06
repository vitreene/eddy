import React, { useMemo } from "react";

type RoseGridSvgProps = {
	maxN?: number; // colonnes n=1..maxN
	maxD?: number; // lignes   d=1..maxD
	size?: number; // largeur/hauteur du SVG (carré)
	padding?: number;
	labelBandX?: number; // bande à gauche pour labels
	labelBandY?: number; // bande en haut pour labels
	cellPadding?: number;
	samples?: number;
	strokeWidth?: number;
	background?: string;
	gridColor?: string;
	labelColor?: string;
	fontFamily?: string;
	colorForD?: (d: number, maxD: number) => string;
};

function hsl(h: number, s = 90, l = 60) {
	return `hsl(${h} ${s}% ${l}%)`;
}

function defaultColorForD(d: number, D: number) {
	const t = (d - 1) / Math.max(1, D - 1); // 0..1
	const hue = 15 + t * 210; // rouge/orange -> bleu
	return hsl(hue, 90, 60);
}

function rosePathD(params: { n: number; d: number; cx: number; cy: number; R: number; samples: number }) {
	const { n, d, cx, cy, R, samples } = params;
	const k = n / d;
	const thetaMax = 2 * Math.PI * d; // bonne fermeture visuelle pour k rationnel

	let dStr = "";
	for (let i = 0; i <= samples; i++) {
		const t = (i / samples) * thetaMax;
		const r = Math.cos(k * t);

		const x = cx + R * r * Math.cos(t);
		const y = cy - R * r * Math.sin(t); // y écran inversé

		// limiter la longueur des strings (perf)
		const xs = x.toFixed(2);
		const ys = y.toFixed(2);

		dStr += (i === 0 ? "M" : " L") + xs + " " + ys;
	}
	return dStr;
}

export function RoseGridSvg({
	maxN = 6,
	maxD = 6,
	size = 900,
	padding = 42,
	labelBandX = 34,
	labelBandY = 34,
	cellPadding = 14,
	samples = 200,
	strokeWidth = 3,
	background = "#000",
	gridColor = "rgba(160, 210, 255, 0.9)",
	labelColor = "rgba(230, 240, 255, 0.95)",
	fontFamily = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
	colorForD = defaultColorForD
}: RoseGridSvgProps) {
	const layout = useMemo(() => {
		const W = size;
		const H = size;

		const gridX = padding + labelBandX;
		const gridY = padding + labelBandY;
		const gridW = W - gridX - padding;
		const gridH = H - gridY - padding;

		const cellW = gridW / maxN;
		const cellH = gridH / maxD;

		return { W, H, gridX, gridY, gridW, gridH, cellW, cellH };
	}, [size, padding, labelBandX, labelBandY, maxN, maxD]);

	const { W, H, gridX, gridY, gridW, gridH, cellW, cellH } = layout;

	const curves = useMemo(() => {
		const items: Array<{
			key: string;
			path: string;
			stroke: string;
		}> = [];

		for (let d = 1; d <= maxD; d++) {
			for (let n = 1; n <= maxN; n++) {
				const left = gridX + (n - 1) * cellW;
				const top = gridY + (d - 1) * cellH;
				const cx = left + cellW / 2;
				const cy = top + cellH / 2;

				const R = Math.min(cellW, cellH) / 2 - cellPadding;
				const path = rosePathD({ n, d, cx, cy, R, samples });

				items.push({
					key: `n${n}-d${d}`,
					path,
					stroke: colorForD(d, maxD)
				});
			}
		}

		return items;
	}, [maxN, maxD, gridX, gridY, cellW, cellH, cellPadding, samples, colorForD]);

	const verticalLines = useMemo(() => {
		const lines: Array<{ x: number }> = [];
		for (let i = 0; i <= maxN; i++) lines.push({ x: gridX + i * cellW });
		return lines;
	}, [maxN, gridX, cellW]);

	const horizontalLines = useMemo(() => {
		const lines: Array<{ y: number }> = [];
		for (let j = 0; j <= maxD; j++) lines.push({ y: gridY + j * cellH });
		return lines;
	}, [maxD, gridY, cellH]);

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${W} ${H}`}
			role="img"
			aria-label="Grille de roses polaires r(θ)=cos((n/d)θ)"
			style={{ display: "block", background }}
		>
			{/* Fond */}
			<rect x={0} y={0} width={W} height={H} fill={background} />

			{/* Grille */}
			<g stroke={gridColor} strokeWidth={2} shapeRendering="crispEdges">
				{/* bordure */}
				<rect x={gridX} y={gridY} width={gridW} height={gridH} fill="none" />
				{/* lignes verticales */}
				{verticalLines.map((l, idx) => (
					<line key={`v-${idx}`} x1={l.x} y1={gridY} x2={l.x} y2={gridY + gridH} />
				))}
				{/* lignes horizontales */}
				{horizontalLines.map((l, idx) => (
					<line key={`h-${idx}`} x1={gridX} y1={l.y} x2={gridX + gridW} y2={l.y} />
				))}
			</g>

			{/* Labels */}
			<g fill={labelColor} fontFamily={fontFamily} fontSize={16}>
				{/* n (haut) */}
				{Array.from({ length: maxN }, (_, i) => {
					const n = i + 1;
					const x = gridX + (n - 0.5) * cellW;
					const y = gridY - 18;
					return (
						<text key={`n-${n}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle">
							{n}
						</text>
					);
				})}

				{/* d (gauche) */}
				{Array.from({ length: maxD }, (_, j) => {
					const d = j + 1;
					const x = gridX - 12;
					const y = gridY + (d - 0.5) * cellH;
					return (
						<text key={`d-${d}`} x={x} y={y} textAnchor="end" dominantBaseline="middle">
							{d}
						</text>
					);
				})}

				{/* petit "d" en diagonale (optionnel) */}
				<text
					x={gridX - 30}
					y={gridY - 30}
					transform={`rotate(${-45} ${gridX - 30} ${gridY - 30})`}
					textAnchor="start"
					dominantBaseline="middle"
				>
					d
				</text>

				{/* petit "n" */}
				<text x={gridX - 10} y={gridY - 35} textAnchor="start" dominantBaseline="middle">
					n
				</text>
			</g>

			{/* Courbes */}
			<g fill="none" strokeLinecap="round" strokeLinejoin="round">
				{curves.map((c) => (
					<path key={c.key} d={c.path} stroke={c.stroke} strokeWidth={strokeWidth} />
				))}
			</g>
		</svg>
	);
}
