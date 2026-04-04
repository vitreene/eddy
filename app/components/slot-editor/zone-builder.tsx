import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useMachine } from "@xstate/react";
import { Copy, Trash2 } from "lucide-react";

import { SceneLogicContext } from "@/provider/scene-logic";
import { CAPSULE_TYPES, resolveCapsuleType } from "@/config/capsule-types";
import { getValuesFromGridName } from "@/lib/utils";
import { buildNodeId } from "@/scene-runtime/node-id";
import { Button } from "@/components/ui/button";

import { zoneBuilderMachine } from "./zone-builder.machine";
import {
	ZoneBuilderService,
	normalizePositionZones,
	toRuntimePositionZones,
	type ZoneBuilderZonePersisted,
	type ZoneHandle
} from "./zone-builder.service";

type ZoneBuilderProps = {
	targetCapsuleId?: number | null;
	buttonLabel?: string;
	zones?: ZoneBuilderZonePersisted[];
	onZonesChange?: (zones: ZoneBuilderZonePersisted[]) => void;
	active?: boolean;
};

const HANDLE_LAYOUT: Array<{ handle: ZoneHandle; className: string; cursor: string }> = [
	{ handle: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize" },
	{ handle: "n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "ns-resize" },
	{ handle: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "nesw-resize" },
	{ handle: "e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
	{ handle: "se", className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize" },
	{ handle: "s", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", cursor: "ns-resize" },
	{ handle: "sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize" },
	{ handle: "w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" }
];

export function ZoneBuilder({
	targetCapsuleId,
	buttonLabel = "Mode zones",
	zones,
	onZonesChange,
	active = true
}: ZoneBuilderProps) {
	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);
	const capsuleId = targetCapsuleId ?? item?.capsuleId ?? null;
	const capsule = SceneLogicContext.useSelector((state) =>
		capsuleId ? state.context.capsules[capsuleId] : undefined
	);

	const isPosition = resolveCapsuleType(capsule?.type) === CAPSULE_TYPES.POSITION;
	const grid = getValuesFromGridName(capsule?.grid);
	const cols = Math.max(1, grid.w);
	const rows = Math.max(1, grid.h);
	const capsuleNodeId = capsuleId ? buildNodeId("capsule", capsuleId) : null;

	const anchorElement =
		typeof document != "undefined" && capsuleNodeId
			? (document.getElementById(capsuleNodeId) as HTMLElement | null)
			: null;
	const service = useMemo(() => new ZoneBuilderService(), []);
	const controlledZonesKey = useMemo(() => JSON.stringify(normalizePositionZones(zones)), [zones]);
	const controlledZonesRuntime = useMemo(
		() => toRuntimePositionZones(normalizePositionZones(zones)),
		[controlledZonesKey]
	);

	const [state, send] = useMachine(zoneBuilderMachine, {
		input: { buttonLabel, service }
	});

	useEffect(() => {
		send({
			type: "props.sync",
			payload: {
				capsuleId,
				capsuleNodeId,
				isPosition,
				active,
				cols,
				rows,
				anchorElement,
				zones: zones ? controlledZonesRuntime : undefined,
				onZonesChange
			}
		});
	}, [
		send,
		capsuleId,
		capsuleNodeId,
		isPosition,
		active,
		cols,
		rows,
		anchorElement,
		controlledZonesKey,
		onZonesChange,
		zones,
		controlledZonesRuntime
	]);

	if (!state.context.isPosition || !capsule) return null;

	const draftRect = state.context.draft
		? service.toZoneRect(state.context.draft.start, state.context.draft.current)
		: null;
	const cloneClassName = String(state.context.anchorElement?.className || "").trim();
	const selectedZone = state.context.zones.find((zone) => zone.id === state.context.selectedZoneId) || null;

	return (
		<div className="min-w-0 space-y-2">
			<div className="flex items-center gap-1">
				<Button
					type="button"
					size="sm"
					variant={state.context.enabled ? "default" : "outline"}
					onClick={() => send({ type: "mode.toggle" })}
				>
					Zones
				</Button>
				<Button
					type="button"
					size="icon"
					variant="outline"
					disabled={!selectedZone}
					title={selectedZone ? `Dupliquer ${selectedZone.name}` : "Selectionner une zone"}
					onClick={() => send({ type: "zone.duplicate.selected" })}
				>
					<Copy className="h-3.5 w-3.5" />
				</Button>
				<Button
					type="button"
					size="icon"
					variant="outline"
					disabled={!selectedZone}
					title={selectedZone ? `Effacer ${selectedZone.name}` : "Selectionner une zone"}
					onClick={() => send({ type: "zone.delete.selected" })}
				>
					<Trash2 className="h-3.5 w-3.5" />
				</Button>
				<span className="text-muted-foreground text-[11px]">
					Trace sur la grille ({state.context.cols} x {state.context.rows})
				</span>
			</div>

			{state.context.zones.length ? (
				<div className="max-h-52 space-y-1 overflow-auto rounded border border-stone-300 p-2 text-[11px]">
					{state.context.zones.map((zone) => {
						const hasConflict = state.context.nameConflictZoneIds.includes(zone.id);
						const isSelected = state.context.selectedZoneId === zone.id;
						const rowClassName = hasConflict
							? "border-red-500 bg-red-50/70"
							: isSelected
								? "border-blue-500 bg-blue-50/60"
								: "border-stone-200";

						return (
							<div
								key={zone.id}
								title={zone.cssRule}
								className={`space-y-1 rounded border p-2 ${rowClassName}`}
								onClick={() => send({ type: "zone.select", zoneId: zone.id })}
							>
								{state.context.selectedZoneId === zone.id ? (
									<input
										type="text"
										value={zone.name}
										className={`h-7 w-full rounded border px-2 text-xs ${state.context.nameConflictZoneIds.includes(zone.id) ? "border-red-500 text-red-600" : "border-stone-300"}`}
										onChange={(event) =>
											send({ type: "zone.rename", zoneId: zone.id, name: event.currentTarget.value })
										}
										onBlur={() => send({ type: "zone.rename.blur", zoneId: zone.id })}
										onClick={(event) => event.stopPropagation()}
									/>
								) : (
									<div className={`truncate text-xs font-medium ${hasConflict ? "text-red-700" : ""}`}>
										{zone.name}
									</div>
								)}
							</div>
						);
					})}
				</div>
			) : null}

			{state.context.enabled && state.context.anchorElement && state.context.rect
				? createPortal(
						<div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}>
							<div
								style={{
									position: "absolute",
									left: 0,
									top: 0,
									width: state.context.rect.width,
									height: state.context.rect.height,
									transformOrigin: "0 0",
									transform: `matrix(1, 0, 0, 1, ${state.context.rect.left}, ${state.context.rect.top})`,
									pointerEvents: "auto"
								}}
							>
								<div className={cloneClassName} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

								<div
									style={{
										position: "absolute",
										inset: 0,
										zIndex: 2,
										display: "grid",
										gridTemplateColumns: `repeat(${state.context.cols}, minmax(0, 1fr))`,
										gridTemplateRows: `repeat(${state.context.rows}, minmax(0, 1fr))`,
										pointerEvents: "none"
									}}
								>
									{state.context.zones.map((zone) => {
										const selected = state.context.selectedZoneId === zone.id;
										return (
											<div
												key={zone.id}
												className={
													selected
														? "relative rounded border border-blue-700 bg-blue-400/20"
														: "relative rounded border border-emerald-600/80 bg-emerald-400/15"
												}
												style={{
													gridRow: `${zone.rect.row} / span ${zone.rect.spanRow}`,
													gridColumn: `${zone.rect.column} / span ${zone.rect.spanColumn}`,
													pointerEvents: "auto",
													cursor: selected ? "move" : "pointer"
												}}
												onPointerDown={(event) => {
													event.stopPropagation();
													send({
														type: "zone.drag.start",
														zoneId: zone.id,
														mode: "move",
														clientX: event.clientX,
														clientY: event.clientY
													});
													event.currentTarget.setPointerCapture(event.pointerId);
												}}
												onPointerMove={(event) => {
													send({
														type: "zone.drag.move",
														clientX: event.clientX,
														clientY: event.clientY,
														buttons: event.buttons
													});
												}}
												onPointerUp={(event) => {
													send({ type: "zone.drag.end", clientX: event.clientX, clientY: event.clientY });
													event.currentTarget.releasePointerCapture(event.pointerId);
												}}
											>
												<div className="pointer-events-none absolute top-1 left-1 max-w-[70%] truncate rounded bg-black/65 px-1 py-0.5 text-[10px] text-white">
													{zone.name}
												</div>
												{selected
													? HANDLE_LAYOUT.map((cfg) => (
															<div
																key={cfg.handle}
																className={`absolute h-2.5 w-2.5 rounded-full border border-blue-700 bg-white ${cfg.className}`}
																style={{ pointerEvents: "auto", cursor: cfg.cursor }}
																onPointerDown={(event) => {
																	event.stopPropagation();
																	send({
																		type: "zone.drag.start",
																		zoneId: zone.id,
																		mode: cfg.handle,
																		clientX: event.clientX,
																		clientY: event.clientY
																	});
																	event.currentTarget.setPointerCapture(event.pointerId);
																}}
																onPointerMove={(event) => {
																	send({
																		type: "zone.drag.move",
																		clientX: event.clientX,
																		clientY: event.clientY,
																		buttons: event.buttons
																	});
																}}
																onPointerUp={(event) => {
																	send({ type: "zone.drag.end", clientX: event.clientX, clientY: event.clientY });
																	event.currentTarget.releasePointerCapture(event.pointerId);
																}}
															/>
														))
													: null}
											</div>
										);
									})}

									{draftRect ? (
										<div
											className="rounded border border-dashed border-blue-700 bg-blue-500/15"
											style={{
												gridRow: `${draftRect.row} / span ${draftRect.spanRow}`,
												gridColumn: `${draftRect.column} / span ${draftRect.spanColumn}`
											}}
										/>
									) : null}
								</div>

								<div
									style={{ position: "absolute", inset: 0, zIndex: 1, cursor: "crosshair" }}
									onPointerDown={(event) => {
										send({ type: "pointer.down", clientX: event.clientX, clientY: event.clientY });
										event.currentTarget.setPointerCapture(event.pointerId);
									}}
									onPointerMove={(event) => {
										send({
											type: "pointer.move",
											clientX: event.clientX,
											clientY: event.clientY,
											buttons: event.buttons
										});
									}}
									onPointerUp={(event) => {
										send({ type: "pointer.up", clientX: event.clientX, clientY: event.clientY });
										event.currentTarget.releasePointerCapture(event.pointerId);
									}}
								/>
							</div>
						</div>,
						state.context.anchorElement.ownerDocument.body
					)
				: null}
		</div>
	);
}
