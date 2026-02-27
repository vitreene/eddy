export const CAPSULE_TYPES = {
	CARROUSEL: "carrousel",
	LIGNE: "ligne",
	GRILLE: "grille",
	CARD: "card",
	LEGACY: "legacy"
} as const;

export type CapsuleKnownType =
	| (typeof CAPSULE_TYPES)["CARROUSEL"]
	| (typeof CAPSULE_TYPES)["LIGNE"]
	| (typeof CAPSULE_TYPES)["GRILLE"]
	| (typeof CAPSULE_TYPES)["CARD"];

export type CapsuleResolvedType = CapsuleKnownType | (typeof CAPSULE_TYPES)["LEGACY"];
export type CapsuleTimeMode = "distributed" | "fixed";
export type CapsuleLineOrientation = "horizontal" | "vertical";

type CapsuleLayoutBehavior =
	| {
			kind: "stack";
			grid: { mode: "forced"; rows: 1; cols: 1 };
	  }
	| {
			kind: "line";
			grid: { mode: "derived"; rows: 1; cols: "n" } | { mode: "derived"; rows: "n"; cols: 1 };
			reloop: true;
	  }
	| {
			kind: "grid";
			grid: { mode: "parametric"; rows: "n"; cols: "n" };
			reloop: true;
	  }
	| {
			kind: "areas";
			grid: { mode: "areas" };
	  }
	| {
			kind: "legacy";
			grid: { mode: "legacy" };
	  };

export type CapsuleRuntimeBehavior = {
	time: {
		mode: CapsuleTimeMode;
		defaultFixedSeconds: number;
	};
	transitions: {
		defaultIntroRef: "fade";
		defaultOutroRef: "fade" | null;
	};
	layout: CapsuleLayoutBehavior;
};

type CapsuleParamSchema = {
	name: string;
	type: "enum" | "number" | "areas";
	defaultValue: string | number;
	options?: string[];
	min?: number;
	max?: number;
	step?: number;
};

/**
 * Structure declarative d'un type de capsule.
 *
 * Vocabulaire:
 * - `ui` decrit la configuration (ce que l'utilisateur peut regler dans edit-capsule).
 * - `runtime` decrit l'execution (ce que builder/player appliquent au moment du play).
 *
 * - `type`: identifiant de type resolu (`carrousel`, `ligne`, `grille`, `card`, `legacy`).
 * - `label` / `description`: metadonnees d'affichage pour l'interface.
 * - `ui`:
 *    - `selectable`: indique si le type est selectionnable dans edit-capsule.
 *    - `params`: schema des parametres UI a rendre selon le type.
 * - `runtime`:
 *    - `time`: regles temporelles (repartition ou duree fixe par item).
 *    - `transitions`: refs de transitions appliquees par defaut.
 *    - `layout`: strategie de placement (stack, line, grid, areas, legacy).
 *
 * En pratique, `runtime` est le contrat direct du moteur de rendu: il determine
 * comment les items sont places, quand ils apparaissent/disparaissent et quels
 * comportements par defaut sont appliques en l'absence d'events explicites.
 */

export type CapsuleTypeConfig = {
	type: CapsuleResolvedType;
	label: string;
	description: string;
	ui: {
		selectable: boolean;
		params: CapsuleParamSchema[];
	};
	runtime: CapsuleRuntimeBehavior;
};

const FIXED_SECONDS_DEFAULT = 2;

const CAPSULE_TYPE_REGISTRY: Record<CapsuleResolvedType, CapsuleTypeConfig> = {
	[CAPSULE_TYPES.CARROUSEL]: {
		type: CAPSULE_TYPES.CARROUSEL,
		label: "Carrousel",
		description: "Affiche un item a la fois en 1x1, avec repartition temporelle ou duree fixe.",
		ui: {
			selectable: true,
			params: [
				{
					name: "timeMode",
					type: "enum",
					defaultValue: "distributed",
					options: ["distributed", "fixed"]
				},
				{
					name: "fixedSeconds",
					type: "number",
					defaultValue: FIXED_SECONDS_DEFAULT,
					min: 1,
					max: 60,
					step: 0.5
				}
			]
		},
		runtime: {
			time: { mode: "distributed", defaultFixedSeconds: FIXED_SECONDS_DEFAULT },
			transitions: { defaultIntroRef: "fade", defaultOutroRef: "fade" },
			layout: {
				kind: "stack",
				grid: { mode: "forced", rows: 1, cols: 1 }
			}
		}
	},
	[CAPSULE_TYPES.LIGNE]: {
		type: CAPSULE_TYPES.LIGNE,
		label: "Ligne",
		description: "Place les items en ligne horizontale ou verticale avec rebouclage.",
		ui: {
			selectable: true,
			params: [
				{
					name: "orientation",
					type: "enum",
					defaultValue: "horizontal",
					options: ["horizontal", "vertical"]
				},
				{
					name: "cells",
					type: "number",
					defaultValue: 3,
					min: 1,
					max: 24,
					step: 1
				},
				{
					name: "timeMode",
					type: "enum",
					defaultValue: "distributed",
					options: ["distributed", "fixed"]
				},
				{
					name: "fixedSeconds",
					type: "number",
					defaultValue: FIXED_SECONDS_DEFAULT,
					min: 1,
					max: 60,
					step: 0.5
				}
			]
		},
		runtime: {
			time: { mode: "distributed", defaultFixedSeconds: FIXED_SECONDS_DEFAULT },
			transitions: { defaultIntroRef: "fade", defaultOutroRef: null },
			layout: {
				kind: "line",
				grid: { mode: "derived", rows: 1, cols: "n" },
				reloop: true
			}
		}
	},
	[CAPSULE_TYPES.GRILLE]: {
		type: CAPSULE_TYPES.GRILLE,
		label: "Grille",
		description: "Place les items sur une grille n x n avec rebouclage.",
		ui: {
			selectable: true,
			params: [
				{
					name: "rows",
					type: "number",
					defaultValue: 2,
					min: 1,
					max: 12,
					step: 1
				},
				{
					name: "cols",
					type: "number",
					defaultValue: 2,
					min: 1,
					max: 12,
					step: 1
				},
				{
					name: "timeMode",
					type: "enum",
					defaultValue: "distributed",
					options: ["distributed", "fixed"]
				},
				{
					name: "fixedSeconds",
					type: "number",
					defaultValue: FIXED_SECONDS_DEFAULT,
					min: 1,
					max: 60,
					step: 0.5
				}
			]
		},
		runtime: {
			time: { mode: "distributed", defaultFixedSeconds: FIXED_SECONDS_DEFAULT },
			transitions: { defaultIntroRef: "fade", defaultOutroRef: null },
			layout: {
				kind: "grid",
				grid: { mode: "parametric", rows: "n", cols: "n" },
				reloop: true
			}
		}
	},
	[CAPSULE_TYPES.CARD]: {
		type: CAPSULE_TYPES.CARD,
		label: "Card",
		description: "Utilise des grid-areas nommees. Configuration seulement a ce stade.",
		ui: {
			selectable: true,
			params: [
				{
					name: "areas",
					type: "areas",
					defaultValue: ""
				}
			]
		},
		runtime: {
			time: { mode: "distributed", defaultFixedSeconds: FIXED_SECONDS_DEFAULT },
			transitions: { defaultIntroRef: "fade", defaultOutroRef: "fade" },
			layout: {
				kind: "areas",
				grid: { mode: "areas" }
			}
		}
	},
	[CAPSULE_TYPES.LEGACY]: {
		type: CAPSULE_TYPES.LEGACY,
		label: "Legacy",
		description: "Mode historique: comportement actuel conserve si aucun type n'est defini.",
		ui: {
			selectable: false,
			params: []
		},
		runtime: {
			time: { mode: "distributed", defaultFixedSeconds: FIXED_SECONDS_DEFAULT },
			transitions: { defaultIntroRef: "fade", defaultOutroRef: "fade" },
			layout: {
				kind: "legacy",
				grid: { mode: "legacy" }
			}
		}
	}
};

export function isCapsuleKnownType(value: string | null | undefined): value is CapsuleKnownType {
	if (!value) return false;
	return (
		value === CAPSULE_TYPES.CARROUSEL ||
		value === CAPSULE_TYPES.LIGNE ||
		value === CAPSULE_TYPES.GRILLE ||
		value === CAPSULE_TYPES.CARD
	);
}

export function resolveCapsuleType(value: string | null | undefined): CapsuleResolvedType {
	return isCapsuleKnownType(value) ? value : CAPSULE_TYPES.LEGACY;
}

export function getCapsuleTypeConfig(value: string | null | undefined): CapsuleTypeConfig {
	const type = resolveCapsuleType(value);
	return CAPSULE_TYPE_REGISTRY[type];
}

export function getSelectableCapsuleTypeConfigs(): CapsuleTypeConfig[] {
	return [
		CAPSULE_TYPE_REGISTRY[CAPSULE_TYPES.CARROUSEL],
		CAPSULE_TYPE_REGISTRY[CAPSULE_TYPES.LIGNE],
		CAPSULE_TYPE_REGISTRY[CAPSULE_TYPES.GRILLE],
		CAPSULE_TYPE_REGISTRY[CAPSULE_TYPES.CARD]
	];
}

// Card areas contract (stage 7):
// capsule.grid can encode named template areas as:
// `areas:header header|media body|footer footer`
// Each `|` separates rows, each row uses space-separated area names.
const CARD_AREAS_PREFIX = "areas:";

export function parseCardTemplateAreas(grid: string | null | undefined): string[] {
	if (!grid) return [];
	const raw = grid.trim();
	if (!raw.startsWith(CARD_AREAS_PREFIX)) return [];

	const payload = raw.slice(CARD_AREAS_PREFIX.length).trim();
	if (!payload) return [];

	const rows = payload
		.split("|")
		.map((row) => row.trim())
		.filter(Boolean)
		.map((row) => row.split(/\s+/).join(" "));

	if (!rows.length) return [];

	const width = rows[0].split(/\s+/).length;
	if (!width) return [];

	for (const row of rows) {
		if (row.split(/\s+/).length !== width) {
			return [];
		}
	}

	return rows;
}

export function shouldCapsuleUseExplicitArea(type: string | null | undefined): boolean {
	const resolved = resolveCapsuleType(type);
	return resolved === CAPSULE_TYPES.CARD || resolved === CAPSULE_TYPES.LEGACY;
}
