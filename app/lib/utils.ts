import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const DEFAULT_GRID_VALUE = { w: 1, h: 1 };
export function getValuesFromGridName(grid: string = ""): { w: number; h: number } {
	if (!grid) return DEFAULT_GRID_VALUE;
	const values = /-w(\d*)-h(\d*)/.exec(grid);
	if (!values) return DEFAULT_GRID_VALUE;
	return { w: Number(values[1]), h: Number(values[2]) };
}

type ParseAreaOptions = {
	prefix?: string;
	rows?: number;
	cols?: number;
	indexing?: "1-based" | "0-based";
};

type GridPlacementStyle = {
	gridRow?: string;
	gridColumn?: string;
};

/**
 * camelCase -> kebab-case (CSS)
 */
function camelCaseToKebabCase(prop: string): string {
	return prop
		.replace(/^(Webkit|Moz|ms|O)/, "-$1")
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.toLowerCase();
}

/**
 * "cell-r2-c1" -> { gridRow, gridColumn }
 */
function areaToGridStyle(area: string, opts: ParseAreaOptions = {}): GridPlacementStyle {
	const { prefix, rows, cols, indexing = "1-based" } = opts;

	const match = area.match(/^(?<pfx>[a-zA-Z0-9_-]+)-r(?<r>\d+)-c(?<c>\d+)$/);
	if (!match?.groups) {
		throw new Error(`Nom de classe invalide : "${area}"`);
	}

	const { pfx } = match.groups;
	let r = Number(match.groups.r);
	let c = Number(match.groups.c);

	if (prefix && pfx !== prefix) {
		throw new Error(`Préfixe invalide : "${pfx}" (attendu "${prefix}")`);
	}

	if (indexing === "0-based") {
		r += 1;
		c += 1;
	}

	if (r < 1 || c < 1) {
		throw new Error(`Indices invalides dans "${area}"`);
	}

	if (rows && r > rows) {
		throw new Error(`Row ${r} > rows(${rows})`);
	}

	if (cols && c > cols) {
		throw new Error(`Col ${c} > cols(${cols})`);
	}

	return {
		gridRow: `${r} / span 1`,
		gridColumn: `${c} / span 1`
	};
}

/**
 * 🔥 Fonction demandée
 * "cell-r2-c1" -> ".cell-r2-c1{grid-row:2 / span 1;grid-column:1 / span 1;}"
 */
export function classNameToCssDefinition(className: string, opts?: ParseAreaOptions): string {
	const style = areaToGridStyle(className, opts);

	const cssBody = Object.entries(style)
		.map(([prop, value]) => `${camelCaseToKebabCase(prop)}:${value}`)
		.join(";");

	if (!cssBody.length) {
		throw new Error(`Aucune règle CSS générée pour "${className}"`);
	}

	return `.${className}{${cssBody};}`;
}

export function gridPlacementClassNameToCssDefinition(className: string): string | null {
	const token = className.trim();
	if (!token) return null;
	if (token === "cell-span-fill") {
		return `.cell-span-fill{grid-row:1 / -1;grid-column:1 / -1;}`;
	}
	const match = /^cell-span-r(\d+)-c(\d+)-rs(\d+)-cs(\d+)$/.exec(token);
	if (!match) return null;
	const row = Number(match[1]);
	const col = Number(match[2]);
	const rowSpan = Number(match[3]);
	const colSpan = Number(match[4]);
	if (!row || !col || !rowSpan || !colSpan) return null;
	return `.${token}{grid-row:${row} / span ${rowSpan};grid-column:${col} / span ${colSpan};}`;
}

function cssObjectToClass(styles: Record<string, string | number>): string {
	const toKebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

	return Object.entries(styles)
		.filter(([, v]) => v != null && v !== "")
		.map(([k, v]) => `${toKebab(k)}:${String(v).trim()}`)
		.sort()
		.join(";");
}

export function gridClassNameToCssDefinition(gridClassName = ""): string | undefined {
	const className = gridClassName.trim().split(/\s+/)[0]?.replace(/^\./, "");
	if (!className) return undefined;

	const { w, h } = getValuesFromGridName(className);
	if (!w || !h) return undefined;

	const styles: Record<string, string> = {
		display: "grid",
		...(w > 1 && { gridTemplateColumns: `repeat(${w}, minmax(0, 1fr))` }),
		...(h > 1 && { gridTemplateRows: `repeat(${h}, minmax(0, 1fr))` }),
		...(w === 1 && h === 1 && { "& *": "grid-area: 1 / -1" }),
		isolation: "isolate",
		overflow: "hidden"
	};

	return `.${className}{${cssObjectToClass(styles)}}`;
}
