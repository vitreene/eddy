import { GRID_DEFAULT_PREFIX } from "@/lib/constants";
import { gridClassNameToCssDefinition } from "@/lib/utils";
import cx from "classnames";
import { Grid2x2 } from "lucide-react";
import { useId, useState, useRef, useMemo } from "react";

export type GridSize = { w: number; h: number };

export type ResizableGridFrameProps = {
	stepPx?: number; // défaut: 16
	gapPx?: number; // défaut: 4
	paddingPx?: number; // défaut: 4
	minCells?: number; // >= 1
	maxCells?: number; // défaut: 16 (limite x/y)
	canvasWidth?: number;
	canvasHeight?: number;
	w?: number;
	h?: number;
	onChange?: (size: GridSize) => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function ResizableGridFrame({
	stepPx = 16,
	gapPx = 4,
	paddingPx = 4,
	minCells = 1,
	maxCells = 16,
	canvasWidth = 250,
	canvasHeight = 120,
	w = 3,
	h = 3,
	onChange
}: ResizableGridFrameProps) {
	const patternId = useId();

	const [cells, setCells] = useState<GridSize>(() => ({
		w: clamp(Math.floor(w), minCells, maxCells),
		h: clamp(Math.floor(h), minCells, maxCells)
	}));

	// cache pour la fonction outsideClick
	const wh = useRef<{ w: number; h: number }>({
		w: clamp(Math.floor(w), minCells, maxCells),
		h: clamp(Math.floor(h), minCells, maxCells)
	});

	const maxFromCanvas = useMemo(
		() => ({
			x: Math.max(minCells, Math.floor((canvasWidth - paddingPx * 2) / stepPx)),
			y: Math.max(minCells, Math.floor((canvasHeight - paddingPx * 2) / stepPx))
		}),
		[canvasWidth, canvasHeight, paddingPx, stepPx, minCells]
	);

	const maxX = Math.max(minCells, Math.min(maxCells, maxFromCanvas.x));
	const maxY = Math.max(minCells, Math.min(maxCells, maxFromCanvas.y));

	const framePx = useMemo(
		() => ({
			w: paddingPx * 2 + cells.w * stepPx,
			h: paddingPx * 2 + cells.h * stepPx,
			innerW: cells.w * stepPx,
			innerH: cells.h * stepPx
		}),
		[cells.w, cells.h, stepPx, paddingPx]
	);

	// motif “carré + gap” : on dessine un carré de taille (step-gap) dans un pas step
	const g = clamp(gapPx, 0, stepPx - 1);
	const tile = Math.max(1, stepPx - g);
	const inset = g / 2;

	const resizeRef = useRef<{
		startClientX: number;
		startClientY: number;
		startX: number;
		startY: number;
		resizing: boolean;
	} | null>(null);

	const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		e.currentTarget.setPointerCapture?.(e.pointerId);
		resizeRef.current = {
			startClientX: e.clientX,
			startClientY: e.clientY,
			startX: cells.w,
			startY: cells.h,
			resizing: true
		};
	};

	const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const s = resizeRef.current;
		if (!s?.resizing) return;

		const dx = e.clientX - s.startClientX;
		const dy = e.clientY - s.startClientY;

		const nextX = clamp(s.startX + Math.round(dx / stepPx), minCells, maxX);
		const nextY = clamp(s.startY + Math.round(dy / stepPx), minCells, maxY);

		if (nextX === cells.w && nextY === cells.h) return;
		setCells({ w: nextX, h: nextY });
		wh.current = { w: nextX, h: nextY };
	};

	const onHandlePointerUp = () => {
		if (resizeRef.current) resizeRef.current.resizing = false;
		resizeRef.current = null;
	};

	const ref = useRef<HTMLDivElement>(null);
	const [isGridVisible, setGridVisible] = useState(false);

	const onDisplayGrid = (e: React.MouseEvent<HTMLElement>) => {
		function outsideClick() {
			setGridVisible(false);

			onChange?.(wh.current);
			document.body.removeEventListener("click", outsideClick);
		}
		document.body.addEventListener("click", outsideClick);
		setGridVisible(true);
	};

	return (
		<div ref={ref} className="grid-size-info relative" onClick={onDisplayGrid}>
			<div className="flex cursor-pointer items-center gap-2 text-xs">
				<Grid2x2 className="w-4" />
				<span>Grille</span>
				<span className="text-sm font-semibold">
					<span>{cells.w}</span> × <span>{cells.h}</span>
				</span>
			</div>
			<div
				className={cx("absolute border border-gray-500 bg-white", isGridVisible ? "grid" : "hidden")}
				style={{ width: framePx.w, height: framePx.h, padding: paddingPx }}
			>
				<div className="grid">
					{/* SVG pattern */}
					<svg
						className="col-start-1 row-start-1 block"
						width={framePx.innerW}
						height={framePx.innerH}
						viewBox={`0 0 ${framePx.innerW} ${framePx.innerH}`}
						aria-hidden="true"
						strokeWidth={1}
						shapeRendering="crispEdges"
					>
						<defs>
							<pattern id={patternId} width={stepPx} height={stepPx} patternUnits="userSpaceOnUse">
								<rect
									x={inset}
									y={inset}
									width={tile}
									height={tile}
									rx={1}
									className="stroke-muted-foreground fill-muted"
								/>
							</pattern>
						</defs>
						<rect width="100%" height="100%" fill={`url(#${patternId})`} />
					</svg>

					{/* Poignée */}
					<div
						role="slider"
						aria-label="Redimensionner"
						onPointerDown={onHandlePointerDown}
						onPointerMove={onHandlePointerMove}
						onPointerUp={onHandlePointerUp}
						onPointerCancel={onHandlePointerUp}
						title="Redimensionner"
						className="border-border col-start-1 row-start-1 -mr-2 -mb-2 h-4 w-4 cursor-nwse-resize place-self-end rounded-full border bg-gray-600"
					/>
				</div>
			</div>
		</div>
	);
}

export function gridWHClassName(
	size: GridSize,
	opts?: { prefix?: string }
): { className: string; cssText: string } {
	const prefix = opts?.prefix ?? GRID_DEFAULT_PREFIX;
	const hash = `grid-w${size.w}-h${size.h}`;

	const className = `${prefix}-${hash}`;
	const cssText = gridClassNameToCssDefinition(className) ?? `.${className}{display:grid;isolation:isolate}`;
	return { className, cssText };
}

function gimiHash(signature: string) {
	// hash FNV-1a (simple + stable)
	let h = 2166136261;
	for (let i = 0; i < signature.length; i++) {
		h ^= signature.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	const hash = (h >>> 0).toString(36);
	return hash;
}
