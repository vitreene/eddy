import * as React from "react";

export type GridSize = { x: number; y: number };

export type GridArea = {
	id: string;
	/** cellule (0-based) */
	x: number;
	y: number;
	/** taille (en cellules) */
	w: number;
	h: number;

	/** explicite, sinon implicite */
	name?: string;

	/** couleur (1..5) -> --chart-n */
	chart?: 1 | 2 | 3 | 4 | 5;

	/** provenance */
	source?: "manual" | "guides";

	/**
	 * Si défini: cette zone (ou un "override" hidden) supprime/override l’aire auto portant ce guideKey.
	 * (utile pour “sortir de la dépendance” ou supprimer une aire auto)
	 */
	overridesGuideKey?: string;

	/** un override "suppression" (non rendu) */
	hidden?: boolean;
};

export type ResizableCardFrameProps = {
	stepPx?: number; // défaut: 16
	gapPx?: number; // défaut: 4
	paddingPx?: number; // défaut: 4
	minCells?: number; // défaut: 1
	maxCells?: number; // défaut: 16
	defaultCells?: GridSize; // défaut: {x:3,y:3}
	canvasWidth?: number;
	canvasHeight?: number;
	onChange?: (size: GridSize) => void;

	areasEnabled?: boolean;
	areas?: GridArea[]; // controlled
	defaultAreas?: GridArea[]; // uncontrolled
	onAreasChange?: (areas: GridArea[]) => void;

	promptAreaName?: boolean;

	/** optionnel: activer les repères (diviseurs) */
	guidesEnabled?: boolean;
	/** épaisseur de la “règle” haut/gauche */
	guideRailPx?: number;
};

/* ----------------------------- utils ----------------------------- */
function clamp(v: number, lo: number, hi: number) {
	return Math.max(lo, Math.min(hi, v));
}
function floorInt(n: number) {
	return Math.floor(Number.isFinite(n) ? n : 0);
}
function toChart(n: number): 1 | 2 | 3 | 4 | 5 {
	const k = ((n - 1) % 5) + 1;
	return k as 1 | 2 | 3 | 4 | 5;
}
function uid() {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const c = (globalThis as any).crypto;
	return c?.randomUUID?.() ?? `a_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}
function chartHsl(n: 1 | 2 | 3 | 4 | 5, alpha: number) {
	return `hsl(var(--chart-${n}) / ${alpha})`;
}

function useControllableState<T>(opts: { value?: T; defaultValue: T; onChange?: (v: T) => void }) {
	const { value, defaultValue, onChange } = opts;
	const [uncontrolled, setUncontrolled] = React.useState<T>(defaultValue);
	const isControlled = value !== undefined;
	const state = isControlled ? (value as T) : uncontrolled;

	const setState = React.useCallback(
		(next: T | ((prev: T) => T)) => {
			const computed = typeof next === "function" ? (next as (p: T) => T)(state) : next;
			if (!isControlled) setUncontrolled(computed);
			onChange?.(computed);
		},
		[isControlled, onChange, state]
	);

	return [state, setState] as const;
}

function normalizeAreas(areas: GridArea[]) {
	// noms implicites + defaults
	return areas.map((a, i) => ({
		source: a.source ?? "manual",
		chart: a.chart ?? toChart(i + 1),
		name: a.name?.trim() || "" || `area-${i + 1}`,
		...a
	}));
}

/**
 * Resize MANUAL areas lors d’un changement de grille.
 * (les zones auto “guides” sont régénérées)
 *
 * Règles (bord droit/bas principalement; gauche/haut est “supporté” au sens où x/y sont clampés):
 * - si (x,y) sort => supprimée
 * - si fin touche le bord (x+w==prev.x / y+h==prev.y) => w/h suit le delta
 * - clamp pour rester dans la nouvelle grille
 */
export function resizeManualAreasOnGridChange(prev: GridSize, next: GridSize, areas: GridArea[]): GridArea[] {
	const dx = next.x - prev.x;
	const dy = next.y - prev.y;

	return areas
		.filter((a) => (a.source ?? "manual") === "manual")
		.map((a0) => {
			const a: GridArea = {
				...a0,
				x: floorInt(a0.x),
				y: floorInt(a0.y),
				w: Math.max(1, floorInt(a0.w)),
				h: Math.max(1, floorInt(a0.h))
			};

			if (a.x < 0 || a.y < 0 || a.x >= next.x || a.y >= next.y) return null;

			const touchedRightPrev = a.x + a.w === prev.x;
			const touchedBottomPrev = a.y + a.h === prev.y;

			let w = a.w;
			let h = a.h;

			if (touchedRightPrev) w += dx;
			if (touchedBottomPrev) h += dy;

			// clamp
			const x = clamp(a.x, 0, next.x - 1);
			const y = clamp(a.y, 0, next.y - 1);
			w = clamp(w, 1, next.x - x);
			h = clamp(h, 1, next.y - y);

			return { ...a, x, y, w, h };
		})
		.filter(Boolean) as GridArea[];
}

/* ----------------------------- guides logic ----------------------------- */
type Guides = {
	v: number[]; // vertical dividers at column boundary (1..grid.x-1)
	h: number[]; // horizontal dividers at row boundary (1..grid.y-1)
};

function normalizeGuides(g: Guides, grid: GridSize): Guides {
	const uniqSort = (arr: number[], max: number) =>
		Array.from(
			new Set(arr.map((n) => clamp(floorInt(n), 1, Math.max(1, max - 1))).filter((n) => n >= 1 && n <= max - 1))
		).sort((a, b) => a - b);

	return {
		v: grid.x <= 1 ? [] : uniqSort(g.v, grid.x),
		h: grid.y <= 1 ? [] : uniqSort(g.h, grid.y)
	};
}

type AutoArea = GridArea & { guideKey: string };

function buildAutoAreasFromGuides(grid: GridSize, guides: Guides): AutoArea[] {
	const cols = [0, ...guides.v, grid.x];
	const rows = [0, ...guides.h, grid.y];

	const res: AutoArea[] = [];
	let idx = 0;

	for (let ry = 0; ry < rows.length - 1; ry++) {
		for (let cx = 0; cx < cols.length - 1; cx++) {
			const x0 = cols[cx];
			const x1 = cols[cx + 1];
			const y0 = rows[ry];
			const y1 = rows[ry + 1];

			const w = Math.max(1, x1 - x0);
			const h = Math.max(1, y1 - y0);
			const guideKey = `g:${x0}-${x1}:${y0}-${y1}`;

			idx += 1;
			const chart = toChart(idx);

			res.push({
				id: `auto_${guideKey}`,
				guideKey,
				source: "guides",
				x: x0,
				y: y0,
				w,
				h,
				name: `area-${idx}`,
				chart
			});
		}
	}

	return res;
}

function suppressedGuideKeys(manual: GridArea[]) {
	const set = new Set<string>();
	for (const a of manual) {
		if (a.overridesGuideKey) set.add(a.overridesGuideKey);
	}
	return set;
}

/* ----------------------------- hooks (composition) ----------------------------- */
function useGridLimits({
	stepPx,
	paddingPx,
	minCells,
	maxCells,
	canvasWidth,
	canvasHeight
}: {
	stepPx: number;
	paddingPx: number;
	minCells: number;
	maxCells: number;
	canvasWidth: number;
	canvasHeight: number;
}) {
	return React.useMemo(() => {
		const maxFromCanvas = {
			x: Math.max(minCells, Math.floor((canvasWidth - paddingPx * 2) / stepPx)),
			y: Math.max(minCells, Math.floor((canvasHeight - paddingPx * 2) / stepPx))
		};
		return {
			x: Math.max(minCells, Math.min(maxCells, maxFromCanvas.x)),
			y: Math.max(minCells, Math.min(maxCells, maxFromCanvas.y))
		} satisfies GridSize;
	}, [canvasWidth, canvasHeight, paddingPx, stepPx, minCells, maxCells]);
}

function useChartCycler() {
	const ref = React.useRef(0);
	return React.useCallback(() => {
		ref.current += 1;
		return toChart(ref.current);
	}, []);
}

/* ----------------------------- 1) GridLayer ----------------------------- */
export type GridLayerContext = {
	grid: GridSize;
	stepPx: number;
	innerSizePx: { w: number; h: number };
};

export type GridLayerProps = {
	value: GridSize;
	onChange: (size: GridSize) => void;

	stepPx: number;
	gapPx: number;
	paddingPx: number;

	minCells: number;
	maxCells: GridSize;

	canvasWidth: number;
	canvasHeight: number;

	overlay?: (ctx: GridLayerContext) => React.ReactNode;
};

export function GridLayer({
	value,
	onChange,
	stepPx,
	gapPx,
	paddingPx,
	minCells,
	maxCells,
	canvasWidth,
	canvasHeight,
	overlay
}: GridLayerProps) {
	const patternId = React.useId();

	const framePx = React.useMemo(
		() => ({
			w: paddingPx * 2 + value.x * stepPx,
			h: paddingPx * 2 + value.y * stepPx,
			innerW: value.x * stepPx,
			innerH: value.y * stepPx
		}),
		[value.x, value.y, stepPx, paddingPx]
	);

	const g = clamp(gapPx, 0, stepPx - 1);
	const tile = Math.max(1, stepPx - g);
	const inset = g / 2;

	const resizeRef = React.useRef<{
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
			startX: value.x,
			startY: value.y,
			resizing: true
		};
	};

	const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const s = resizeRef.current;
		if (!s?.resizing) return;

		const dx = e.clientX - s.startClientX;
		const dy = e.clientY - s.startClientY;

		const nextX = clamp(s.startX + Math.round(dx / stepPx), minCells, maxCells.x);
		const nextY = clamp(s.startY + Math.round(dy / stepPx), minCells, maxCells.y);

		if (nextX === value.x && nextY === value.y) return;
		onChange({ x: nextX, y: nextY });
	};

	const onHandlePointerUp = () => {
		if (resizeRef.current) resizeRef.current.resizing = false;
		resizeRef.current = null;
	};

	const ctx: GridLayerContext = React.useMemo(
		() => ({
			grid: value,
			stepPx,
			innerSizePx: { w: framePx.innerW, h: framePx.innerH }
		}),
		[value, stepPx, framePx.innerW, framePx.innerH]
	);

	return (
		<div className="grid gap-2.5">
			<div className="flex items-center gap-2.5">
				<div className="border-border bg-muted/50 text-foreground rounded-md border px-2.5 py-1.5 text-sm">
					<span className="font-semibold">{value.x}</span> × <span className="font-semibold">{value.y}</span>
					<span className="text-muted-foreground ml-2 text-xs">
						(pas {stepPx}px, gap {gapPx}px, padding {paddingPx}px)
					</span>
				</div>
				<div className="text-muted-foreground text-[13px]">Attrape le coin pour redimensionner.</div>
			</div>

			<div
				className="border-border bg-background grid place-items-start border"
				style={{ width: canvasWidth, height: canvasHeight }}
			>
				<div
					className="border-muted-foreground/50 bg-muted/20 grid border"
					style={{ width: framePx.w, height: framePx.h, padding: paddingPx }}
				>
					{/* superposition (sans absolute global) */}
					<div className="grid">
						{/* INNER = grille CSS (tracks stepPx) */}
						<div
							className="col-start-1 row-start-1 grid"
							style={{
								width: framePx.innerW,
								height: framePx.innerH,
								gridTemplateColumns: `repeat(${value.x}, ${stepPx}px)`,
								gridTemplateRows: `repeat(${value.y}, ${stepPx}px)`
							}}
						>
							{/* fond pattern svg */}
							<svg
								className="pointer-events-none col-start-1 row-start-1"
								style={{ gridColumn: "1 / -1", gridRow: "1 / -1" }}
								width={framePx.innerW}
								height={framePx.innerH}
								viewBox={`0 0 ${framePx.innerW} ${framePx.innerH}`}
								aria-hidden="true"
							>
								<defs>
									<pattern id={patternId} width={stepPx} height={stepPx} patternUnits="userSpaceOnUse">
										<rect
											x={inset}
											y={inset}
											width={tile}
											height={tile}
											rx={1}
											fill="hsl(var(--background) / 0.25)"
											stroke="hsl(var(--muted-foreground) / 0.45)"
											strokeWidth={1}
											shapeRendering="crispEdges"
										/>
									</pattern>
								</defs>
								<rect width="100%" height="100%" fill={`url(#${patternId})`} />
							</svg>

							{/* overlay slot */}
							<div className="col-start-1 row-start-1 grid" style={{ gridColumn: "1 / -1", gridRow: "1 / -1" }}>
								{overlay?.(ctx)}
							</div>
						</div>

						{/* poignée grille */}
						<div
							role="slider"
							aria-label="Redimensionner la grille"
							onPointerDown={onHandlePointerDown}
							onPointerMove={onHandlePointerMove}
							onPointerUp={onHandlePointerUp}
							onPointerCancel={onHandlePointerUp}
							title="Redimensionner"
							className="border-border bg-background col-start-1 row-start-1 -mr-2 -mb-2 h-[18px] w-[18px] cursor-nwse-resize place-self-end rounded-full border"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

/* ----------------------------- 2) AreasLayer (zones + repères) ----------------------------- */
export type AreasLayerProps = {
	enabled: boolean;
	guidesEnabled: boolean;
	guideRailPx: number;

	promptName: boolean;
	grid: GridSize;
	stepPx: number;

	areas: GridArea[];
	onAreasChange: (areas: GridArea[]) => void;
};

function areaStyle(a: GridArea): React.CSSProperties {
	return {
		gridColumn: `${a.x + 1} / ${a.x + 1 + a.w}`,
		gridRow: `${a.y + 1} / ${a.y + 1 + a.h}`
	};
}

export function AreasLayer({
	enabled,
	guidesEnabled,
	guideRailPx,
	promptName,
	grid,
	stepPx,
	areas,
	onAreasChange
}: AreasLayerProps) {
	const nextChart = useChartCycler();

	const [guides, setGuides] = React.useState<Guides>({ v: [], h: [] });
	const normGuides = React.useMemo(() => normalizeGuides(guides, grid), [guides, grid]);

	// overlay ref (pour calculs pointer -> cellule / boundary) ; évite innerRef null
	const overlayRef = React.useRef<HTMLDivElement | null>(null);

	// sélection + resize zone
	const [selectedId, setSelectedId] = React.useState<string | null>(null);
	const [draft, setDraft] = React.useState<GridArea | null>(null);

	// split manual / auto
	const manualAreas = React.useMemo(
		() => normalizeAreas(areas).filter((a) => (a.source ?? "manual") === "manual"),
		[areas]
	);

	const suppressed = React.useMemo(() => suppressedGuideKeys(manualAreas), [manualAreas]);

	const autoAreas = React.useMemo(() => {
		if (!guidesEnabled) return [] as AutoArea[];
		const autos = buildAutoAreasFromGuides(grid, normGuides);
		return autos.filter((a) => !suppressed.has(a.guideKey));
	}, [grid, normGuides, guidesEnabled, suppressed]);

	const effectiveAreas = React.useMemo(() => {
		// on rend manual visibles + auto
		const visibleManual = manualAreas.filter((a) => !a.hidden);
		return [...visibleManual, ...autoAreas];
	}, [manualAreas, autoAreas]);

	// sync: quand guides changent, on push la liste (manual + auto)
	React.useEffect(() => {
		if (!enabled) return;
		// on stocke uniquement manual + overrides "hidden" dans `areas` ? => non, on renvoie full (pour simplicité)
		onAreasChange([...manualAreas, ...autoAreas]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, autoAreas.length, JSON.stringify(normGuides), grid.x, grid.y]);

	const getLocal = (e: { clientX: number; clientY: number }) => {
		const el = overlayRef.current;
		if (!el) return { x: 0, y: 0 };
		const r = el.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	};

	const pointToCell = (clientX: number, clientY: number) => {
		const p = getLocal({ clientX, clientY });
		return {
			x: clamp(Math.floor(p.x / stepPx), 0, grid.x - 1),
			y: clamp(Math.floor(p.y / stepPx), 0, grid.y - 1)
		};
	};

	const pointToVBoundary = (clientX: number) => {
		const p = getLocal({ clientX, clientY: 0 });
		return clamp(Math.round(p.x / stepPx), 1, Math.max(1, grid.x - 1));
	};
	const pointToHBoundary = (clientY: number) => {
		const p = getLocal({ clientX: 0, clientY });
		return clamp(Math.round(p.y / stepPx), 1, Math.max(1, grid.y - 1));
	};

	/* ----- création d'une zone (drag dans la grille) ----- */
	const dragAreaRef = React.useRef<{ start: { x: number; y: number }; active: boolean } | null>(null);

	const onGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!enabled) return;
		const t = e.target as HTMLElement;
		// si on clique sur handle/marker/area, ne pas créer une nouvelle zone
		if (t?.dataset?.role === "resize-handle") return;
		if (t?.dataset?.role === "guide-marker") return;
		if (t?.dataset?.areaId) return;

		e.currentTarget.setPointerCapture?.(e.pointerId);
		const c = pointToCell(e.clientX, e.clientY);
		dragAreaRef.current = { start: c, active: true };
		setDraft({ id: "draft", x: c.x, y: c.y, w: 1, h: 1, source: "manual", chart: nextChart() });
		setSelectedId(null);
	};

	const onGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const s = dragAreaRef.current;
		if (!s?.active || !draft) return;

		const c = pointToCell(e.clientX, e.clientY);
		const x0 = Math.min(s.start.x, c.x);
		const y0 = Math.min(s.start.y, c.y);
		const x1 = Math.max(s.start.x, c.x);
		const y1 = Math.max(s.start.y, c.y);

		setDraft({ ...draft, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
	};

	const commitDraft = () => {
		if (!draft) return;

		const explicit =
			promptName && typeof window !== "undefined"
				? window.prompt("Nom de la zone (optionnel) :", "")?.trim()
				: "";

		const name = explicit || `area-${manualAreas.filter((a) => !a.hidden).length + 1}`;
		const next: GridArea = {
			...draft,
			id: uid(),
			name,
			source: "manual",
			chart: draft.chart ?? nextChart()
		};

		setDraft(null);
		onAreasChange([...manualAreas, next, ...autoAreas]);
	};

	const onGridPointerUp = () => {
		const s = dragAreaRef.current;
		if (!s?.active) return;
		dragAreaRef.current = null;
		commitDraft();
	};

	/* ----- selection + suppression (delete) ----- */
	React.useEffect(() => {
		const onKeyDown = (ev: KeyboardEvent) => {
			if (!enabled) return;
			if (!selectedId) return;
			if (ev.key !== "Backspace" && ev.key !== "Delete") return;

			ev.preventDefault();

			const selManual = manualAreas.find((a) => a.id === selectedId);
			if (selManual) {
				onAreasChange([...manualAreas.filter((a) => a.id !== selectedId), ...autoAreas]);
				setSelectedId(null);
				return;
			}

			// si c'est une aire auto, on la "supprime" via override hidden
			const selAuto = autoAreas.find((a) => a.id === selectedId);
			if (selAuto) {
				const override: GridArea = {
					id: uid(),
					x: selAuto.x,
					y: selAuto.y,
					w: selAuto.w,
					h: selAuto.h,
					name: selAuto.name,
					chart: selAuto.chart,
					source: "manual",
					overridesGuideKey: selAuto.guideKey,
					hidden: true
				};
				onAreasChange([...manualAreas, override, ...autoAreas.filter((a) => a.id !== selectedId)]);
				setSelectedId(null);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [enabled, selectedId, manualAreas, autoAreas, onAreasChange]);

	/* ----- redimensionnement d'une zone (handle type “grille”) ----- */
	const resizeAreaRef = React.useRef<{
		areaId: string;
		startClientX: number;
		startClientY: number;
		startW: number;
		startH: number;
		startX: number;
		startY: number;
		mode: "manual" | "auto";
		guideKey?: string;
		resizing: boolean;
	} | null>(null);

	const ensureManualAreaForAuto = React.useCallback((auto: AutoArea): GridArea => {
		// crée un clone manual (break dependency) + suppress l’auto via overridesGuideKey
		const clone: GridArea = {
			id: uid(),
			x: auto.x,
			y: auto.y,
			w: auto.w,
			h: auto.h,
			name: auto.name,
			chart: auto.chart,
			source: "manual",
			overridesGuideKey: auto.guideKey
		};
		return clone;
	}, []);

	const startResize = (e: React.PointerEvent<HTMLDivElement>, area: GridArea | AutoArea) => {
		e.stopPropagation();
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

		const isAuto = (area as AutoArea).guideKey !== undefined && (area.source ?? "guides") === "guides";
		const base = isAuto ? (area as AutoArea) : (area as GridArea);

		setSelectedId(base.id);

		// si auto => on convertit immédiatement en manual et on resize dessus
		if (isAuto) {
			const clone = ensureManualAreaForAuto(area as AutoArea);
			onAreasChange([...manualAreas, clone, ...autoAreas]); // l’auto sera filtrée au prochain cycle via suppression
			resizeAreaRef.current = {
				areaId: clone.id,
				startClientX: e.clientX,
				startClientY: e.clientY,
				startW: clone.w,
				startH: clone.h,
				startX: clone.x,
				startY: clone.y,
				mode: "manual",
				guideKey: clone.overridesGuideKey,
				resizing: true
			};
			setSelectedId(clone.id);
			return;
		}

		resizeAreaRef.current = {
			areaId: base.id,
			startClientX: e.clientX,
			startClientY: e.clientY,
			startW: base.w,
			startH: base.h,
			startX: base.x,
			startY: base.y,
			mode: "manual",
			resizing: true
		};
	};

	const onOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		// resize zone
		const r = resizeAreaRef.current;
		if (r?.resizing) {
			const dx = e.clientX - r.startClientX;
			const dy = e.clientY - r.startClientY;

			const w = clamp(r.startW + Math.round(dx / stepPx), 1, grid.x - r.startX);
			const h = clamp(r.startH + Math.round(dy / stepPx), 1, grid.y - r.startY);

			onAreasChange(
				[...manualAreas.map((a) => (a.id === r.areaId ? { ...a, w, h } : a)), ...autoAreas].map((a) => a)
			);
			return;
		}

		// drag guide
		const gd = guideDragRef.current;
		if (gd?.active) {
			if (gd.axis === "v") {
				const b = pointToVBoundary(e.clientX);
				setGuides((prev) => {
					const next = { ...prev, v: prev.v.map((x, i) => (i === gd.index ? b : x)) };
					return normalizeGuides(next, grid);
				});
			} else {
				const b = pointToHBoundary(e.clientY);
				setGuides((prev) => {
					const next = { ...prev, h: prev.h.map((y, i) => (i === gd.index ? b : y)) };
					return normalizeGuides(next, grid);
				});
			}
		}
	};

	const onOverlayPointerUp = () => {
		if (resizeAreaRef.current) resizeAreaRef.current.resizing = false;
		resizeAreaRef.current = null;

		if (guideDragRef.current) guideDragRef.current.active = false;
		guideDragRef.current = null;
	};

	/* ----- guides UI: rails + markers + lines ----- */
	const guideDragRef = React.useRef<{ axis: "v" | "h"; index: number; active: boolean } | null>(null);

	const addVGuideAt = (boundary: number) => {
		setGuides((prev) => normalizeGuides({ ...prev, v: [...prev.v, boundary] }, grid));
	};
	const addHGuideAt = (boundary: number) => {
		setGuides((prev) => normalizeGuides({ ...prev, h: [...prev.h, boundary] }, grid));
	};
	const removeVGuideAtIndex = (index: number) => {
		setGuides((prev) => normalizeGuides({ ...prev, v: prev.v.filter((_, i) => i !== index) }, grid));
	};
	const removeHGuideAtIndex = (index: number) => {
		setGuides((prev) => normalizeGuides({ ...prev, h: prev.h.filter((_, i) => i !== index) }, grid));
	};

	const onTopRailPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!enabled || !guidesEnabled) return;
		// add guide at nearest boundary
		const b = pointToVBoundary(e.clientX);
		addVGuideAt(b);
	};
	const onLeftRailPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!enabled || !guidesEnabled) return;
		const b = pointToHBoundary(e.clientY);
		addHGuideAt(b);
	};

	const onVMarkerPointerDown = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
		e.stopPropagation();
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		guideDragRef.current = { axis: "v", index, active: true };
	};
	const onHMarkerPointerDown = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
		e.stopPropagation();
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		guideDragRef.current = { axis: "h", index, active: true };
	};

	const onVMarkerDoubleClick = (e: React.MouseEvent, index: number) => {
		e.stopPropagation();
		removeVGuideAtIndex(index);
	};
	const onHMarkerDoubleClick = (e: React.MouseEvent, index: number) => {
		e.stopPropagation();
		removeHGuideAtIndex(index);
	};

	const rail = guideRailPx;

	return (
		<div
			ref={overlayRef}
			className="relative grid"
			style={{
				gridTemplateColumns: `repeat(${grid.x}, ${stepPx}px)`,
				gridTemplateRows: `repeat(${grid.y}, ${stepPx}px)`,
				width: grid.x * stepPx,
				height: grid.y * stepPx
			}}
			onPointerMove={onOverlayPointerMove}
			onPointerUp={onOverlayPointerUp}
			onPointerCancel={onOverlayPointerUp}
			onPointerDown={onGridPointerDown}
			onPointerMoveCapture={onGridPointerMove}
			onPointerUpCapture={onGridPointerUp}
			onPointerCancelCapture={onGridPointerUp}
		>
			{/* rails (haut + gauche) */}
			{enabled && guidesEnabled && (
				<>
					<div
						className="border-muted-foreground/30 bg-background/60 absolute top-0 left-0 z-20 w-full cursor-crosshair border-b backdrop-blur-[2px]"
						style={{ height: rail }}
						onPointerDown={onTopRailPointerDown}
						title="Cliquer pour ajouter un repère vertical (double-clic sur un repère pour le supprimer)"
					/>
					<div
						className="border-muted-foreground/30 bg-background/60 absolute top-0 left-0 z-20 h-full cursor-crosshair border-r backdrop-blur-[2px]"
						style={{ width: rail }}
						onPointerDown={onLeftRailPointerDown}
						title="Cliquer pour ajouter un repère horizontal (double-clic sur un repère pour le supprimer)"
					/>
				</>
			)}

			{/* lignes diviseurs */}
			{enabled &&
				guidesEnabled &&
				normGuides.v.map((g, i) => (
					<div
						key={`vline_${g}_${i}`}
						className="border-muted-foreground/40 absolute top-0 z-10 h-full border-l"
						style={{ left: g * stepPx }}
					/>
				))}
			{enabled &&
				guidesEnabled &&
				normGuides.h.map((g, i) => (
					<div
						key={`hline_${g}_${i}`}
						className="border-muted-foreground/40 absolute left-0 z-10 w-full border-t"
						style={{ top: g * stepPx }}
					/>
				))}

			{/* markers sur rails */}
			{enabled &&
				guidesEnabled &&
				normGuides.v.map((g, i) => (
					<button
						key={`vmark_${g}_${i}`}
						type="button"
						data-role="guide-marker"
						onPointerDown={(e) => onVMarkerPointerDown(e, i)}
						onDoubleClick={(e) => onVMarkerDoubleClick(e, i)}
						className="border-muted-foreground/60 bg-background/80 absolute z-30 -translate-x-1/2 rounded-sm border shadow-sm"
						style={{ left: g * stepPx, top: 2, width: 10, height: rail - 4 }}
						title="Drag pour déplacer • Double-clic pour supprimer"
					/>
				))}
			{enabled &&
				guidesEnabled &&
				normGuides.h.map((g, i) => (
					<button
						key={`hmark_${g}_${i}`}
						type="button"
						data-role="guide-marker"
						onPointerDown={(e) => onHMarkerPointerDown(e, i)}
						onDoubleClick={(e) => onHMarkerDoubleClick(e, i)}
						className="border-muted-foreground/60 bg-background/80 absolute z-30 -translate-y-1/2 rounded-sm border shadow-sm"
						style={{ top: g * stepPx, left: 2, height: 10, width: rail - 4 }}
						title="Drag pour déplacer • Double-clic pour supprimer"
					/>
				))}

			{/* zones */}
			{enabled &&
				effectiveAreas.map((a) => {
					const isSelected = selectedId === a.id;
					const chart = (a.chart ?? 1) as 1 | 2 | 3 | 4 | 5;

					return (
						<div
							key={a.id}
							data-area-id={a.id}
							className={["relative", "border", "cursor-default", isSelected ? "ring-ring ring-2" : ""].join(" ")}
							style={{
								...areaStyle(a),
								borderColor: chartHsl(chart, 0.7),
								backgroundColor: chartHsl(chart, 0.12)
							}}
							onPointerDown={(e) => {
								e.stopPropagation();
								setSelectedId(a.id);
							}}
							title={a.name}
						>
							<div className="text-foreground/70 pointer-events-none absolute top-1 left-1 text-[10px] font-medium select-none">
								{a.name}
								{a.source === "guides" ? " • auto" : ""}
							</div>

							{/* poignée de resize (comme la grille) */}
							{isSelected && (
								<div
									data-role="resize-handle"
									role="slider"
									aria-label="Redimensionner la zone"
									onPointerDown={(e) => startResize(e, a as any)}
									className="border-border bg-background absolute -right-2 -bottom-2 h-[18px] w-[18px] cursor-nwse-resize rounded-full border"
									title="Redimensionner"
								/>
							)}
						</div>
					);
				})}

			{/* draft */}
			{enabled && draft && (
				<div
					className="border-border border"
					style={{
						...areaStyle(draft),
						borderColor: chartHsl(draft.chart ?? 1, 0.8),
						backgroundColor: chartHsl(draft.chart ?? 1, 0.15)
					}}
				/>
			)}
		</div>
	);
}

/* ----------------------------- 3) Container: ResizableCardFrame ----------------------------- */
export function ResizableCardFrame({
	stepPx = 16,
	gapPx = 4,
	paddingPx = 4,
	minCells = 1,
	maxCells = 16,
	defaultCells = { x: 3, y: 3 },
	canvasWidth = 520,
	canvasHeight = 320,
	onChange,

	areasEnabled = true,
	areas,
	defaultAreas = [],
	onAreasChange,
	promptAreaName = true,

	guidesEnabled = true,
	guideRailPx = 18
}: ResizableCardFrameProps) {
	const maxGrid = useGridLimits({ stepPx, paddingPx, minCells, maxCells, canvasWidth, canvasHeight });

	const [grid, setGrid] = React.useState<GridSize>(() => ({
		x: clamp(floorInt(defaultCells.x), minCells, maxCells),
		y: clamp(floorInt(defaultCells.y), minCells, maxCells)
	}));

	// clamp grid to maxGrid
	React.useEffect(() => {
		setGrid((g) => ({
			x: clamp(g.x, minCells, maxGrid.x),
			y: clamp(g.y, minCells, maxGrid.y)
		}));
	}, [maxGrid.x, maxGrid.y, minCells]);

	// notify grid change
	const lastSent = React.useRef<GridSize>(grid);
	React.useEffect(() => {
		if (lastSent.current.x === grid.x && lastSent.current.y === grid.y) return;
		lastSent.current = grid;
		onChange?.(grid);
	}, [grid.x, grid.y, onChange]);

	const [areasState, setAreasState] = useControllableState<GridArea[]>({
		value: areas ? normalizeAreas(areas) : undefined,
		defaultValue: normalizeAreas(defaultAreas),
		onChange: (v) => onAreasChange?.(normalizeAreas(v))
	});

	// resize MANUAL areas when grid changes
	const prevGridRef = React.useRef<GridSize>(grid);
	React.useEffect(() => {
		const prev = prevGridRef.current;
		const next = grid;
		if (prev.x === next.x && prev.y === next.y) return;
		prevGridRef.current = next;

		setAreasState((curr) => {
			const norm = normalizeAreas(curr);
			const manualResized = resizeManualAreasOnGridChange(prev, next, norm);
			const nonManual = norm.filter((a) => (a.source ?? "manual") !== "manual");
			// en pratique, nonManual est souvent vide (les autos sont régénérées dans AreasLayer)
			return normalizeAreas([...manualResized, ...nonManual]);
		});
	}, [grid.x, grid.y, setAreasState]);

	return (
		<GridLayer
			value={grid}
			onChange={setGrid}
			stepPx={stepPx}
			gapPx={gapPx}
			paddingPx={paddingPx}
			minCells={minCells}
			maxCells={maxGrid}
			canvasWidth={canvasWidth}
			canvasHeight={canvasHeight}
			overlay={({ grid, stepPx }) => (
				<AreasLayer
					enabled={areasEnabled}
					guidesEnabled={guidesEnabled}
					guideRailPx={guideRailPx}
					promptName={promptAreaName}
					grid={grid}
					stepPx={stepPx}
					areas={areasState}
					onAreasChange={setAreasState}
				/>
			)}
		/>
	);
}
