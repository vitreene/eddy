import { assign, createMachine } from "xstate";

import { syncLiveZoneClassDefinitions } from "@/parts/item-edit/live-node-classes";

import type {
	ZoneBuilderRect,
	ZoneBuilderService,
	ZoneBuilderZone,
	ZoneBuilderZonePersisted,
	ZoneEditDrag,
	ZoneHandle
} from "./zone-builder.service";
import { toStoredPositionZones } from "./zone-builder.service";

type Draft = {
	start: { row: number; col: number };
	current: { row: number; col: number };
};

export type ZoneBuilderMachineInput = {
	buttonLabel?: string;
	service: ZoneBuilderService;
};

type Ctx = {
	input: ZoneBuilderMachineInput;
	buttonLabel: string;
	capsuleId: number | null;
	capsuleNodeId: string | null;
	isPosition: boolean;
	active: boolean;
	cols: number;
	rows: number;
	anchorElement: HTMLElement | null;
	rect: ZoneBuilderRect | null;
	enabled: boolean;
	zones: ZoneBuilderZone[];
	selectedZoneId: number | null;
	nameConflictZoneIds: number[];
	activeEditDrag: ZoneEditDrag | null;
	draft: Draft | null;
	onZonesChange?: (zones: ZoneBuilderZonePersisted[]) => void;
};

type Ev =
	| {
			type: "props.sync";
			payload: {
				capsuleId: number | null;
				capsuleNodeId: string | null;
				isPosition: boolean;
				active: boolean;
				cols: number;
				rows: number;
				anchorElement: HTMLElement | null;
				zones?: ZoneBuilderZone[];
				onZonesChange?: (zones: ZoneBuilderZonePersisted[]) => void;
			};
	  }
	| { type: "rect.sync"; rect: ZoneBuilderRect | null }
	| { type: "mode.toggle" }
	| { type: "pointer.down"; clientX: number; clientY: number }
	| { type: "pointer.move"; clientX: number; clientY: number; buttons: number }
	| { type: "pointer.up"; clientX: number; clientY: number }
	| { type: "zone.select"; zoneId: number }
	| { type: "zone.drag.start"; zoneId: number; clientX: number; clientY: number; mode: "move" | ZoneHandle }
	| { type: "zone.drag.move"; clientX: number; clientY: number; buttons: number }
	| { type: "zone.drag.end"; clientX: number; clientY: number }
	| { type: "zone.rename"; zoneId: number; name: string }
	| { type: "zone.rename.blur"; zoneId: number }
	| { type: "zone.delete"; zoneId: number }
	| { type: "zone.duplicate"; zoneId: number }
	| { type: "zone.delete.selected" }
	| { type: "zone.duplicate.selected" };

export const zoneBuilderMachine = createMachine(
	{
		types: {} as { context: Ctx; events: Ev; input: ZoneBuilderMachineInput },
		id: "zone-builder",
		exit: ["cleanupTracking"],
		context: ({ input }) => ({
			input,
			buttonLabel: input.buttonLabel || "Mode zones",
			capsuleId: null,
			capsuleNodeId: null,
			isPosition: false,
			active: false,
			cols: 1,
			rows: 1,
			anchorElement: null,
			rect: null,
			enabled: false,
			zones: [],
			selectedZoneId: null,
			nameConflictZoneIds: [],
			activeEditDrag: null,
			draft: null,
			onZonesChange: undefined
		}),
		on: {
			"props.sync": {
				actions: [
					assign(({ context, event }): Partial<Ctx> => {
						const capsuleChanged = context.capsuleId !== event.payload.capsuleId;
						const isPosition = Boolean(event.payload.isPosition);
						const isActive = Boolean(event.payload.active);
						const nextZones =
							typeof event.payload.zones == "undefined"
								? capsuleChanged
									? []
									: context.zones
								: event.payload.zones;
						const selectedExists = nextZones.some((zone) => zone.id === context.selectedZoneId);
						return {
							capsuleId: event.payload.capsuleId,
							capsuleNodeId: event.payload.capsuleNodeId,
							isPosition,
							active: isActive,
							cols: Math.max(1, event.payload.cols),
							rows: Math.max(1, event.payload.rows),
							anchorElement: event.payload.anchorElement,
							onZonesChange: event.payload.onZonesChange,
							enabled: isPosition && isActive ? (capsuleChanged ? false : context.enabled) : false,
							rect: isPosition && isActive ? context.rect : null,
							draft: null,
							activeEditDrag: null,
							zones: nextZones,
							selectedZoneId: selectedExists ? context.selectedZoneId : (nextZones[0]?.id ?? null),
							nameConflictZoneIds: []
						};
					}),
					"syncRectTracking",
					"syncLiveStyles"
				]
			},
			"rect.sync": {
				actions: assign(({ event }): Partial<Ctx> => ({ rect: event.rect }))
			},
			"mode.toggle": {
				actions: [
					assign(({ context }): Partial<Ctx> => {
						if (!context.isPosition || !context.active) {
							return {
								enabled: false,
								draft: null,
								selectedZoneId: null,
								nameConflictZoneIds: [],
								activeEditDrag: null
							};
						}
						const enabled = !context.enabled;
						return {
							enabled,
							draft: null,
							activeEditDrag: null,
							nameConflictZoneIds: enabled ? context.nameConflictZoneIds : [],
							selectedZoneId: enabled ? context.selectedZoneId : null
						};
					}),
					"syncRectTracking"
				]
			},
			"pointer.down": {
				actions: assign(({ context, event }): Partial<Ctx> => {
					if (!context.enabled || !context.rect || context.activeEditDrag) return {};
					const start = context.input.service.toCell(
						event.clientX,
						event.clientY,
						context.rect,
						context.cols,
						context.rows
					);
					return { draft: { start, current: start } };
				})
			},
			"pointer.move": {
				actions: assign(({ context, event }): Partial<Ctx> => {
					if (!context.draft || !context.rect || event.buttons !== 1 || context.activeEditDrag) return {};
					const current = context.input.service.toCell(
						event.clientX,
						event.clientY,
						context.rect,
						context.cols,
						context.rows
					);
					return { draft: { ...context.draft, current } };
				})
			},
			"pointer.up": {
				actions: [
					assign(({ context, event }): Partial<Ctx> => {
						if (!context.draft || !context.rect || context.activeEditDrag) return { draft: null };
						const current = context.input.service.toCell(
							event.clientX,
							event.clientY,
							context.rect,
							context.cols,
							context.rows
						);
						const zoneRect = context.input.service.toZoneRect(context.draft.start, current);
						const zone = context.input.service.buildZone(context.zones, zoneRect);
						return {
							zones: [...context.zones, zone],
							selectedZoneId: zone.id,
							nameConflictZoneIds: context.nameConflictZoneIds.filter((id) => id !== zone.id),
							draft: null
						};
					}),
					"syncLiveStyles",
					"emitZonesChange"
				]
			},
			"zone.select": {
				actions: assign(({ event }): Partial<Ctx> => ({ selectedZoneId: event.zoneId }))
			},
			"zone.drag.start": {
				actions: assign(({ context, event }): Partial<Ctx> => {
					if (!context.enabled || !context.rect) return {};
					const startCell = context.input.service.toCell(
						event.clientX,
						event.clientY,
						context.rect,
						context.cols,
						context.rows
					);
					const drag = context.input.service.buildEditDrag(
						context.zones,
						event.zoneId,
						startCell,
						event.mode === "move" ? { kind: "move" } : { kind: "resize", handle: event.mode }
					);
					if (!drag) return { selectedZoneId: event.zoneId };
					return { selectedZoneId: event.zoneId, activeEditDrag: drag, draft: null };
				})
			},
			"zone.drag.move": {
				actions: assign(({ context, event }): Partial<Ctx> => {
					if (!context.activeEditDrag || !context.rect || event.buttons !== 1) return {};
					const current = context.input.service.toCell(
						event.clientX,
						event.clientY,
						context.rect,
						context.cols,
						context.rows
					);
					const nextRect = context.input.service.projectDragRect(
						context.activeEditDrag,
						current,
						context.cols,
						context.rows
					);
					return {
						zones: context.input.service.updateZoneRect(context.zones, context.activeEditDrag.zoneId, nextRect)
					};
				})
			},
			"zone.drag.end": {
				actions: [
					assign(({ context, event }): Partial<Ctx> => {
						if (!context.activeEditDrag || !context.rect) return { activeEditDrag: null };
						const current = context.input.service.toCell(
							event.clientX,
							event.clientY,
							context.rect,
							context.cols,
							context.rows
						);
						const nextRect = context.input.service.projectDragRect(
							context.activeEditDrag,
							current,
							context.cols,
							context.rows
						);
						return {
							zones: context.input.service.updateZoneRect(context.zones, context.activeEditDrag.zoneId, nextRect),
							activeEditDrag: null
						};
					}),
					"syncLiveStyles",
					"emitZonesChange"
				]
			},
			"zone.rename": {
				actions: assign(({ context, event }): Partial<Ctx> => {
					const zones = context.input.service.renameZone(context.zones, event.zoneId, event.name);
					const hasConflict = context.input.service.hasDuplicateName(zones, event.zoneId);
					const nextIds = context.nameConflictZoneIds.filter((id) => id !== event.zoneId);
					return {
						zones,
						nameConflictZoneIds: hasConflict ? [...nextIds, event.zoneId] : nextIds
					};
				})
			},
			"zone.rename.blur": {
				actions: [
					assign(({ context, event }): Partial<Ctx> => {
						const zones = context.input.service.finalizeZoneName(context.zones, event.zoneId);
						const hasConflict = context.input.service.hasDuplicateName(zones, event.zoneId);
						const nextIds = context.nameConflictZoneIds.filter((id) => id !== event.zoneId);
						return hasConflict
							? { zones, nameConflictZoneIds: [...nextIds, event.zoneId] }
							: { zones, nameConflictZoneIds: nextIds };
					}),
					"emitZonesChange"
				]
			},
			"zone.delete": {
				actions: [
					assign(({ context, event }): Partial<Ctx> => {
						const zones = context.input.service.deleteZone(context.zones, event.zoneId);
						const nameConflictZoneIds = context.nameConflictZoneIds.filter((id) => id !== event.zoneId);
						if (context.selectedZoneId !== event.zoneId) return { zones, nameConflictZoneIds };
						return {
							zones,
							nameConflictZoneIds,
							selectedZoneId: zones[0]?.id ?? null,
							activeEditDrag: null
						};
					}),
					"syncLiveStyles",
					"emitZonesChange"
				]
			},
			"zone.duplicate": {
				actions: [
					assign(({ context, event }): Partial<Ctx> => {
						const zones = context.input.service.duplicateZone(
							context.zones,
							event.zoneId,
							context.cols,
							context.rows
						);
						return {
							zones,
							selectedZoneId: zones[zones.length - 1]?.id ?? context.selectedZoneId
						};
					}),
					"syncLiveStyles",
					"emitZonesChange"
				]
			},
			"zone.delete.selected": {
				actions: [
					assign(({ context }): Partial<Ctx> => {
						if (!context.selectedZoneId) return {};
						const zoneId = context.selectedZoneId;
						const zones = context.input.service.deleteZone(context.zones, zoneId);
						return {
							zones,
							selectedZoneId: zones[0]?.id ?? null,
							activeEditDrag: null,
							nameConflictZoneIds: context.nameConflictZoneIds.filter((id) => id !== zoneId)
						};
					}),
					"syncLiveStyles",
					"emitZonesChange"
				]
			},
			"zone.duplicate.selected": {
				actions: [
					assign(({ context }): Partial<Ctx> => {
						if (!context.selectedZoneId) return {};
						const zones = context.input.service.duplicateZone(
							context.zones,
							context.selectedZoneId,
							context.cols,
							context.rows
						);
						return {
							zones,
							selectedZoneId: zones[zones.length - 1]?.id ?? context.selectedZoneId
						};
					}),
					"syncLiveStyles",
					"emitZonesChange"
				]
			}
		}
	},
	{
		actions: {
			syncRectTracking: ({ context, self }) => {
				context.input.service.stopRectTracking();
				if (!context.enabled || !context.anchorElement) {
					self.send({ type: "rect.sync", rect: null });
					return;
				}
				context.input.service.startRectTracking(context.anchorElement, (rect) => {
					self.send({ type: "rect.sync", rect });
				});
			},
			syncLiveStyles: ({ context }) => {
				syncLiveZoneClassDefinitions(context.anchorElement, context.capsuleNodeId, context.zones);
			},
			emitZonesChange: ({ context }) => {
				if (!context.onZonesChange) return;
				context.onZonesChange(toStoredPositionZones(context.zones));
			},
			cleanupTracking: ({ context }) => {
				context.input.service.stopRectTracking();
			}
		}
	}
);
