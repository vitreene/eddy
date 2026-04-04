export type PositionZoneRect = {
	row: number;
	column: number;
	spanRow: number;
	spanColumn: number;
};

export type PositionZoneStored = {
	id: number;
	name: string;
	className: string;
	rect: PositionZoneRect;
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

function makeDefaultName(index: number): string {
	return `zone-${String(index + 1).padStart(2, "0")}`;
}

function makeDefaultClassName(name: string, id: number): string {
	const token = normalizeToken(name) || `zone-${id}`;
	return `ed-${token}`;
}

export function buildPositionZoneCssRule(className: string, rect: PositionZoneRect): string {
	return `.${className}{grid-row:${rect.row} / span ${rect.spanRow};grid-column:${rect.column} / span ${rect.spanColumn};}`;
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

			const rectSource = (record.rect && typeof record.rect == "object" ? record.rect : {}) as Record<
				string,
				unknown
			>;
			const rect: PositionZoneRect = {
				row: toPositiveInt(rectSource.row, 1),
				column: toPositiveInt(rectSource.column, 1),
				spanRow: toPositiveInt(rectSource.spanRow, 1),
				spanColumn: toPositiveInt(rectSource.spanColumn, 1)
			};

			return { id, name, className, rect };
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
		rect: zone.rect
	}));
}
