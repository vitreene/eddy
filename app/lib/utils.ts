import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Parse une string de classes CSS concaténées (ex: ".a{...}.b{...}")
 * et retourne une Map:
 *   key   = nom de classe sans le "." (ex: "a")
 *   value = contenu entre accolades, sans les accolades (ex: "display:grid;...")
 *
 * Si une classe apparaît plusieurs fois, la dernière occurrence gagne.
 * Ignore les sélecteurs qui ne sont pas des classes (ex: "@media", "#id", "div", ".a:hover", ".a,.b", etc.)
 * -> ici on ne garde que les sélecteurs strictement ".className"
 */
export function cssClassesToMap(css: string): Map<string, string> {
	const s = (css ?? "").trim();
	const map = new Map<string, string>();
	if (!s) return map;

	let i = 0;
	const n = s.length;

	while (i < n) {
		const open = s.indexOf("{", i);
		if (open === -1) break;

		const selector = s.slice(i, open).trim();

		// Trouver la '}' correspondante (supporte accolades imbriquées, même si rare ici)
		let depth = 0;
		let end = -1;
		for (let j = open; j < n; j++) {
			const ch = s[j];
			if (ch === "{") depth++;
			else if (ch === "}") {
				depth--;
				if (depth === 0) {
					end = j;
					break;
				}
			}
		}
		if (end === -1) break;

		const body = s.slice(open + 1, end).trim();

		// On ne garde que les sélecteurs de forme ".className" (sans pseudo, sans liste, etc.)
		// className CSS ident: lettres/chiffres/_/-, et échappements simples non gérés ici.
		if (/^\.[A-Za-z_-][A-Za-z0-9_-]*$/.test(selector)) {
			const key = selector.slice(1);
			map.set(key, body); // dernière occurrence gagne
		}

		i = end + 1;
	}

	return map;
}

/**
 * Inverse de cssClassesToMap:
 * à partir d'une Map (key = nom sans ".", value = contenu sans accolades),
 * reconstruit la string concaténée ".key{value}.key2{value2}..."
 *
 * L'ordre est celui d'itération de la Map (insertion order).
 */
export function mapToCssClasses(map: Map<string, string>): string {
	let out = "";
	for (const [className, body] of map) {
		const key = (className ?? "").trim().replace(/^\./, "");
		if (!key) continue;

		const content = (body ?? "").trim();
		out += `.${key}{${content}}`;
	}
	return out;
}

type GeneratedGridCss = {
	/** ex: "ed-grid-w4-h3" */
	containerClass: string;
	/** ex: "ed-grid-i5" (à mettre sur l’item) */
	itemClassPrefix: string;
	/** CSS concaténé: ".ed-grid-w4-h3{...}.ed-grid-i1{...}..." */
	cssText: string;
};

/**
 * Génère des classes CSS pour:
 *  - 1 conteneur grid w x h
 *  - des classes item par index pour positionner explicitement (grid-column/grid-row)
 *
 * Convention:
 *  - index 1..(w*h) (1-based)
 *    => index 1 = ligne 1 col 1
 *       index w = ligne 1 col w
 *       index w+1 = ligne 2 col 1
 *  - si tu as un index 0-based, passe (index+1)
 */
export function generateGridCss(w: number, h: number): GeneratedGridCss {
	const W = Math.max(1, Math.floor(w));
	const H = Math.max(1, Math.floor(h));

	const containerClass = `ed-grid-w${W}-h${H}`;
	const itemClassPrefix = `ed-grid-i`; // ex: ed-grid-i5

	let cssText = "";

	// Conteneur
	cssText += `.${containerClass}{display:grid;grid-template-columns:repeat(${W}, minmax(0, 1fr));grid-template-rows:repeat(${H}, minmax(0, 1fr))}`;

	// Items (index 1..W*H)
	const total = W * H;
	for (let index = 1; index <= total; index++) {
		const row = Math.floor((index - 1) / W) + 1; // 1..H
		const col = ((index - 1) % W) + 1; // 1..W
		cssText += `.${itemClassPrefix}${index}{grid-column:${col}/span 1;grid-row:${row}/span 1}`;
	}

	return { containerClass, itemClassPrefix, cssText };
}

/* --- Exemple ---
const { containerClass, itemClassPrefix, cssText } = generateGridCss(4, 3);

// containerClass = "ed-grid-w4-h3"
// item class for index 5 => ".ed-grid-i5{grid-column:1;grid-row:2}"
// => un seul enfant avec class "ed-grid-i5" se placera en 1ère colonne / 2e rangée.
*/

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
		isolation: "isolate",
		...(w === 1 && h === 1 && { "& *": "grid-area: 1 / -1" })
	};

	return `.${className}{${cssObjectToClass(styles)}}`;
}
