import * as React from "react";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type BaseProps = {
	value?: string;
	onChange: (areaName: string) => void;
	name?: string;
	disabled?: boolean;
	className?: string;
};

type Props =
	| (BaseProps & {
			templateAreas: string[];
			cols?: never;
			rows?: never;
	  })
	| (BaseProps & {
			cols: number;
			rows: number;
			templateAreas?: never;
	  });

type AreaBox = {
	name: string;
	r1: number;
	r2: number;
	c1: number;
	c2: number;
};

function parseTemplateAreas(templateAreas: string[]) {
	const rows = templateAreas.length;
	const grid = templateAreas.map((row) => row.trim().split(/\s+/));
	const cols = grid[0]?.length ?? 0;

	for (let r = 0; r < rows; r++) {
		if (grid[r].length !== cols) {
			throw new Error(`templateAreas row ${r + 1} must have ${cols} tokens (got ${grid[r].length}).`);
		}
	}

	return { grid, cols, rows };
}

function generateAutoGrid(cols: number, rows: number): string[][] {
	return Array.from({ length: rows }, (_, r) =>
		Array.from({ length: cols }, (_, c) => `cell-r${r + 1}-c${c + 1}`)
	);
}

function computeAreaBoxes(grid: string[][]): AreaBox[] {
	const map = new Map<string, AreaBox>();

	for (let r = 0; r < grid.length; r++) {
		for (let c = 0; c < grid[0].length; c++) {
			const name = grid[r][c];
			const box = map.get(name);
			if (!box) {
				map.set(name, { name, r1: r + 1, r2: r + 1, c1: c + 1, c2: c + 1 });
			} else {
				box.r2 = Math.max(box.r2, r + 1);
				box.c2 = Math.max(box.c2, c + 1);
			}
		}
	}

	return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function GridAreaRadioSelector(props: Props) {
	const { value, onChange, name = "gridArea", disabled = false, className } = props;

	const { grid, cols, rows } = React.useMemo(() => {
		if ("templateAreas" in props) return parseTemplateAreas(props.templateAreas);
		return {
			grid: generateAutoGrid(props.cols, props.rows),
			cols: props.cols,
			rows: props.rows
		};
	}, [props]);

	const areas = React.useMemo(() => computeAreaBoxes(grid), [grid]);

	/**
	 * Sizing strategy:
	 * - Keep the grid as compact as possible while preserving click precision
	 * - Use a small, clamped cell size with CSS var, scale with number of cols/rows
	 */
	const cellPx = React.useMemo(() => {
		// heuristic: smaller grids can afford bigger cells; larger grids need smaller
		const maxDim = Math.max(cols, rows);
		if (maxDim <= 4) return 18;
		if (maxDim <= 6) return 16;
		if (maxDim <= 10) return 14;
		return 12;
	}, [cols, rows]);

	const gapPx = 2;

	return (
		<RadioGroup
			className={cn("w-fit", className)}
			value={value}
			onValueChange={onChange}
			name={name}
			disabled={disabled}
			aria-label="Select grid area"
		>
			<div
				className={cn("bg-background relative border p-2", disabled && "opacity-60")}
				style={{
					// keep it minimal: no fixed width, just intrinsic from grid
					width: "fit-content"
				}}
			>
				{/* replica grid background */}
				<div
					className="pointer-events-none grid"
					style={{
						gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
						gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
						gap: `${gapPx}px`
					}}
					aria-hidden="true"
				>
					{Array.from({ length: rows * cols }).map((_, i) => (
						<div key={i} className="bg-muted/20 border" />
					))}
				</div>

				{/* overlay clickable areas */}
				<div
					className="absolute inset-2 grid"
					style={{
						gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
						gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
						gap: `${gapPx}px`
					}}
				>
					{areas.map((area) => {
						const id = `area-radio-${name}-${area.name}`;
						const selected = area.name === value;

						return (
							<div
								key={area.name}
								style={{
									gridColumn: `${area.c1} / ${area.c2 + 1}`,
									gridRow: `${area.r1} / ${area.r2 + 1}`
								}}
								className="relative"
							>
								{/* real radio input (hidden) */}
								<RadioGroupItem id={id} value={area.name} className="sr-only" />

								{/* visual tile (no label text, no rounding) */}
								<label
									htmlFor={id}
									className={cn(
										"block h-full w-full cursor-pointer border transition-colors",
										selected ? "bg-primary/30 border-primary" : "hover:bg-muted/30 bg-transparent",
										disabled && "cursor-not-allowed"
									)}
									aria-label={`Select area ${area.name}`}
									title={area.name}
								/>
							</div>
						);
					})}
				</div>
			</div>
		</RadioGroup>
	);
}
