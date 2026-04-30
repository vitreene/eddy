export type PositionZoneRect = {
	row: number;
	column: number;
	spanRow: number;
	spanColumn: number;
};

export type PositionZoneOrientationVariants = {
	portrait?: PositionZoneRect;
	landscape?: PositionZoneRect;
};

export type PositionZoneStored = {
	id: number;
	name: string;
	className: string;
	rect: PositionZoneRect;
	variants?: PositionZoneOrientationVariants;
};

export type PositionZoneRuntime = PositionZoneStored & {
	cssRule: string;
};

function toPositiveInt(value: unknown, fallback: number): number {
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) return fallback;
	return Math.max(1, Math.floor(n));
}

function normalizeToken(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, "-")
		.replace(/^-+/, "")
		.replace(/-+$/, "")
		.replace(/-{2,}/g, "-");
}

export function buildPositionZoneClassName(name: string, id?: number): string {
	const token = normalizeToken(name) || `zone-${id ?? 1}`;
	const core = token.replace(/^zone-+/, "") || token;
	return `ed-zone-${core}`;
}

export function getPositionZoneClassAliases(zone: PositionZoneStored | PositionZoneRuntime): string[] {
	const aliases = new Set<string>();
	if (zone.className?.trim()) aliases.add(zone.className.trim());
	aliases.add(buildPositionZoneClassName(zone.name, zone.id));
	return [...aliases];
}

function makeDefaultName(index: number): string {
	return `zone-${String(index + 1).padStart(2, "0")}`;
}

function makeDefaultClassName(name: string, id: number): string {
	return buildPositionZoneClassName(name, id);
}

export function buildPositionZoneCssRule(className: string, rect: PositionZoneRect): string {
	return `.${className}{grid-row:${rect.row} / span ${rect.spanRow};grid-column:${rect.column} / span ${rect.spanColumn};}`;
}

export function buildPositionZoneOrientationCssRules(className: string, variants: PositionZoneOrientationVariants): string {
	const portrait = variants.portrait;
	const landscape = variants.landscape;
	if (!portrait || !landscape) return "";
	return [
		`.root-scene.ed-preview-orientation--portrait .${className}{grid-row:${portrait.row} / span ${portrait.spanRow};grid-column:${portrait.column} / span ${portrait.spanColumn};}`,
		`.root-scene.ed-preview-orientation--landscape .${className}{grid-row:${landscape.row} / span ${landscape.spanRow};grid-column:${landscape.column} / span ${landscape.spanColumn};}`,
		`@container scene (aspect-ratio <= 1/1){.${className}{grid-row:${portrait.row} / span ${portrait.spanRow};grid-column:${portrait.column} / span ${portrait.spanColumn};}}`,
		`@container scene (aspect-ratio > 1/1){.${className}{grid-row:${landscape.row} / span ${landscape.spanRow};grid-column:${landscape.column} / span ${landscape.spanColumn};}}`
	].join("");
}

function normalizeRect(value: unknown): PositionZoneRect {
	const rectSource = (value && typeof value == "object" ? value : {}) as Record<string, unknown>;
	return {
		row: toPositiveInt(rectSource.row, 1),
		column: toPositiveInt(rectSource.column, 1),
		spanRow: toPositiveInt(rectSource.spanRow, 1),
		spanColumn: toPositiveInt(rectSource.spanColumn, 1)
	};
}

function normalizeOrientationVariants(value: unknown): PositionZoneOrientationVariants | undefined {
	if (!value || typeof value != "object") return undefined;
	const source = value as Record<string, unknown>;
	const portrait = source.portrait ? normalizeRect(source.portrait) : undefined;
	const landscape = source.landscape ? normalizeRect(source.landscape) : undefined;
	if (!portrait && !landscape) return undefined;
	return {
		...(portrait ? { portrait } : {}),
		...(landscape ? { landscape } : {})
	};
}

export function normalizePositionZones(value: unknown): PositionZoneStored[] {
	if (!Array.isArray(value)) return [];

	const usedIds = new Set<number>();

	return value
		.map((entry, index) => {
			if (!entry || typeof entry != "object") return null;
			const record = entry as Record<string, unknown>;

			let id = toPositiveInt(record.id, index + 1);
			while (usedIds.has(id)) id += 1;
			usedIds.add(id);

			const name =
				typeof record.name == "string" && record.name.trim() ? record.name.trim() : makeDefaultName(index);

			let className =
				typeof record.className == "string" && record.className.trim()
					? normalizeToken(record.className)
					: makeDefaultClassName(name, id);
			if (!className.startsWith("ed-")) className = `ed-${className}`;

			const rect = normalizeRect(record.rect);
			const variants = normalizeOrientationVariants(record.variants);

			return {
				id,
				name,
				className,
				rect,
				...(variants ? { variants } : {})
			};
		})
		.filter((zone): zone is PositionZoneStored => Boolean(zone));
}

export function toRuntimePositionZones(zones: PositionZoneStored[]): PositionZoneRuntime[] {
	return zones.map((zone) => ({
		...zone,
		cssRule: buildPositionZoneCssRule(zone.className, zone.rect)
	}));
}

export function toStoredPositionZones(
	zones: Array<PositionZoneStored | PositionZoneRuntime>
): PositionZoneStored[] {
	return zones.map((zone) => ({
		id: zone.id,
		name: zone.name,
		className: zone.className,
		rect: zone.rect,
		...(zone.variants ? { variants: zone.variants } : {})
	}));
}

export function hasCompleteOrientationVariants(zone: PositionZoneStored): boolean {
	return Boolean(zone.variants?.portrait && zone.variants?.landscape);
}

export function projectZonesForOrientation(
	zones: PositionZoneStored[],
	orientation: "portrait" | "landscape"
): PositionZoneStored[] {
	return zones.map((zone) => {
		if (!hasCompleteOrientationVariants(zone)) return zone;
		const resolvedRect = zone.variants?.[orientation] || zone.rect;
		return {
			...zone,
			rect: resolvedRect
		};
	});
}

export function mergeZonesFromOrientationEdit(args: {
	baseZones: PositionZoneStored[];
	editedZones: PositionZoneStored[];
	orientation: "portrait" | "landscape";
	defaultOrientation: "portrait" | "landscape";
}): PositionZoneStored[] {
	const baseById = new Map(args.baseZones.map((zone) => [zone.id, zone]));

	return args.editedZones.map((edited) => {
		const base = baseById.get(edited.id);
		if (!base) {
			if (args.orientation === args.defaultOrientation) return edited;
			return {
				...edited,
				variants: {
					portrait: edited.rect,
					landscape: edited.rect
				}
			};
		}

		if (hasCompleteOrientationVariants(base)) {
			const nextVariants = {
				portrait: base.variants!.portrait!,
				landscape: base.variants!.landscape!,
				[args.orientation]: edited.rect
			};
			return {
				...base,
				...edited,
				rect: nextVariants[args.defaultOrientation],
				variants: nextVariants
			};
		}

		if (args.orientation === args.defaultOrientation) {
			return {
				...base,
				...edited,
				rect: edited.rect
			};
		}

		const nextVariants = {
			portrait: args.defaultOrientation === "portrait" ? base.rect : edited.rect,
			landscape: args.defaultOrientation === "landscape" ? base.rect : edited.rect
		};

		return {
			...base,
			...edited,
			rect: nextVariants[args.defaultOrientation],
			variants: nextVariants
		};
	});
}
