import { GridAreaRadioSelector } from "./grid-area-selector";
import { SceneLogicContext } from "@/provider/scene-logic";
import { getValuesFromGridName } from "@/lib/utils";
import type { EditableStyle } from "@/components/style-editor/types";
import { normalizePositionZones, toRuntimePositionZones } from "./zone-builder.service";
import { HEAVY_GRID_CELL_THRESHOLD } from "@/config/capsule-presets";
import {
	CAPSULE_TYPES,
	parseCardTemplateAreas,
	resolveCapsuleType,
	shouldCapsuleUseExplicitArea
} from "@/config/capsule-types";

interface Props {
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

export function SlotEditor({ value, onChange }: Props) {
	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);

	const capsule = SceneLogicContext.useSelector((state) =>
		item ? state.context.capsules[item.capsuleId] : undefined
	);

	if (!item || !capsule?.grid) return null;
	if (resolveCapsuleType(capsule.type) === CAPSULE_TYPES.CARROUSEL) return null;
	if (!shouldCapsuleUseExplicitArea(capsule.type)) return null;

	const setArea = (area: string) => {
		onChange({ area });
	};

	const setZoneClass = (zoneClassName: string) => {
		const zones = toRuntimePositionZones(
			normalizePositionZones((capsule as { cardZones?: unknown }).cardZones)
		);
		const zoneClassSet = new Set(zones.map((zone) => zone.className));
		const currentTokens = String(value.className || "")
			.split(/\s+/)
			.map((token) => token.trim())
			.filter(Boolean);
		const keptTokens = currentTokens.filter((token) => !zoneClassSet.has(token));
		const nextTokens = [...keptTokens, zoneClassName].filter(Boolean);
		onChange({ className: nextTokens.length ? nextTokens.join(" ") : null, area: null });
	};

	const capsuleType = resolveCapsuleType(capsule.type);
	if (capsuleType === CAPSULE_TYPES.POSITION) {
		const zones = toRuntimePositionZones(
			normalizePositionZones((capsule as { cardZones?: unknown }).cardZones)
		);
		if (!zones.length) return <p className="text-muted-foreground text-xs">Aucune zone disponible</p>;
		const classTokens = String(value.className || "")
			.split(/\s+/)
			.map((token) => token.trim())
			.filter(Boolean);
		const selectedZoneClass = zones.find((zone) => classTokens.includes(zone.className))?.className || "";
		return (
			<div className="space-y-1 text-xs">
				<label className="block text-[11px] font-medium">Zone</label>
				<select
					className="h-8 rounded border border-stone-300 px-2"
					value={selectedZoneClass}
					onChange={(event) => setZoneClass(event.currentTarget.value)}
				>
					<option value="">Choisir une zone</option>
					{zones.map((zone) => (
						<option key={zone.id} value={zone.className}>
							{zone.name}
						</option>
					))}
				</select>
			</div>
		);
	}

	if (capsuleType === CAPSULE_TYPES.CARD) {
		const templateAreas = parseCardTemplateAreas(capsule.grid);
		if (!templateAreas.length) return null;
		return <GridAreaRadioSelector templateAreas={templateAreas} value={value.area} onChange={setArea} />;
	}

	const { w, h } = getValuesFromGridName(capsule.grid);
	if (Math.max(1, w) * Math.max(1, h) > HEAVY_GRID_CELL_THRESHOLD) return null;

	return <GridAreaRadioSelector cols={w} rows={h} value={value.area} onChange={setArea} />;
}
