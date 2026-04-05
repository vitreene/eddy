import {
	buildPositionZoneClassName,
	buildPositionZoneCssRule,
	normalizePositionZones,
	toRuntimePositionZones,
	toStoredPositionZones,
	type PositionZoneRect,
	type PositionZoneRuntime,
	type PositionZoneStored
} from "@/lib/position-zones";

export type ZoneBuilderCell = { row: number; col: number };

export type ZoneBuilderRect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export type ZoneBuilderZoneRect = PositionZoneRect;
export type ZoneBuilderZonePersisted = PositionZoneStored;
export type ZoneBuilderZone = PositionZoneRuntime;
export { normalizePositionZones, toRuntimePositionZones, toStoredPositionZones };

export type ZoneHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export type ZoneEditDrag = {
	zoneId: number;
	startCell: ZoneBuilderCell;
	startRect: ZoneBuilderZoneRect;
	mode: { kind: "move" } | { kind: "resize"; handle: ZoneHandle };
};

export class ZoneBuilderService {
	private rectTrackingCleanup: (() => void) | null = null;

	private clamp(value: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, value));
	}

	readRect(element: HTMLElement): ZoneBuilderRect {
		const rect = element.getBoundingClientRect();
		return {
			left: rect.left,
			top: rect.top,
			width: rect.width,
			height: rect.height
		};
	}

	toCell(
		clientX: number,
		clientY: number,
		rect: ZoneBuilderRect,
		cols: number,
		rows: number
	): ZoneBuilderCell {
		const width = Math.max(1, rect.width);
		const height = Math.max(1, rect.height);
		const localX = Math.min(Math.max(clientX - rect.left, 0), width - 0.001);
		const localY = Math.min(Math.max(clientY - rect.top, 0), height - 0.001);
		const col = Math.min(cols - 1, Math.max(0, Math.floor((localX / width) * cols)));
		const row = Math.min(rows - 1, Math.max(0, Math.floor((localY / height) * rows)));
		return { row, col };
	}

	toZoneRect(start: ZoneBuilderCell, current: ZoneBuilderCell): ZoneBuilderZoneRect {
		const minRow = Math.min(start.row, current.row);
		const maxRow = Math.max(start.row, current.row);
		const minCol = Math.min(start.col, current.col);
		const maxCol = Math.max(start.col, current.col);
		return {
			row: minRow + 1,
			column: minCol + 1,
			spanRow: maxRow - minRow + 1,
			spanColumn: maxCol - minCol + 1
		};
	}

	buildNextZoneName(zones: ZoneBuilderZone[]): string {
		const names = new Set(zones.map((zone) => zone.name.trim().toLowerCase()));
		let i = 1;
		while (true) {
			const candidate = `zone-${String(i).padStart(2, "0")}`;
			if (!names.has(candidate)) return candidate;
			i += 1;
		}
	}

	buildZone(zones: ZoneBuilderZone[], rect: ZoneBuilderZoneRect): ZoneBuilderZone {
		const name = this.buildNextZoneName(zones);
		const className = this.buildUniqueZoneClassName(name, zones);
		const nextId = zones.length ? Math.max(...zones.map((zone) => zone.id)) + 1 : 1;
		return {
			id: nextId,
			name,
			className,
			rect,
			cssRule: buildPositionZoneCssRule(className, rect)
		};
	}

	findZone(zones: ZoneBuilderZone[], zoneId: number): ZoneBuilderZone | null {
		return zones.find((zone) => zone.id === zoneId) || null;
	}

	buildEditDrag(
		zones: ZoneBuilderZone[],
		zoneId: number,
		startCell: ZoneBuilderCell,
		mode: ZoneEditDrag["mode"]
	): ZoneEditDrag | null {
		const zone = this.findZone(zones, zoneId);
		if (!zone) return null;
		return {
			zoneId,
			startCell,
			startRect: zone.rect,
			mode
		};
	}

	updateZoneRect(zones: ZoneBuilderZone[], zoneId: number, nextRect: ZoneBuilderZoneRect): ZoneBuilderZone[] {
		return zones.map((zone) => {
			if (zone.id !== zoneId) return zone;
			return {
				...zone,
				rect: nextRect,
				cssRule: buildPositionZoneCssRule(zone.className, nextRect)
			};
		});
	}

	projectDragRect(
		drag: ZoneEditDrag,
		currentCell: ZoneBuilderCell,
		cols: number,
		rows: number
	): ZoneBuilderZoneRect {
		if (drag.mode.kind === "move") {
			const deltaRow = currentCell.row - drag.startCell.row;
			const deltaCol = currentCell.col - drag.startCell.col;
			const maxRowStart = Math.max(1, rows - drag.startRect.spanRow + 1);
			const maxColStart = Math.max(1, cols - drag.startRect.spanColumn + 1);
			return {
				row: this.clamp(drag.startRect.row + deltaRow, 1, maxRowStart),
				column: this.clamp(drag.startRect.column + deltaCol, 1, maxColStart),
				spanRow: drag.startRect.spanRow,
				spanColumn: drag.startRect.spanColumn
			};
		}

		const deltaRow = currentCell.row - drag.startCell.row;
		const deltaCol = currentCell.col - drag.startCell.col;
		let top = drag.startRect.row;
		let left = drag.startRect.column;
		let bottom = drag.startRect.row + drag.startRect.spanRow - 1;
		let right = drag.startRect.column + drag.startRect.spanColumn - 1;

		if (drag.mode.handle.includes("n")) top = this.clamp(top + deltaRow, 1, bottom);
		if (drag.mode.handle.includes("s")) bottom = this.clamp(bottom + deltaRow, top, rows);
		if (drag.mode.handle.includes("w")) left = this.clamp(left + deltaCol, 1, right);
		if (drag.mode.handle.includes("e")) right = this.clamp(right + deltaCol, left, cols);

		return {
			row: top,
			column: left,
			spanRow: Math.max(1, bottom - top + 1),
			spanColumn: Math.max(1, right - left + 1)
		};
	}

	renameZone(zones: ZoneBuilderZone[], zoneId: number, nextNameRaw: string): ZoneBuilderZone[] {
		return zones.map((zone) => {
			if (zone.id !== zoneId) return zone;
			return {
				...zone,
				name: nextNameRaw,
				cssRule: buildPositionZoneCssRule(zone.className, zone.rect)
			};
		});
	}

	finalizeZoneName(zones: ZoneBuilderZone[], zoneId: number): ZoneBuilderZone[] {
		const target = zones.find((zone) => zone.id === zoneId);
		if (!target) return zones;

		const others = zones.filter((zone) => zone.id !== zoneId);
		const taken = new Set(others.map((zone) => zone.name.trim().toLowerCase()).filter(Boolean));
		let finalName = target.name.trim();
		if (!finalName) {
			finalName = this.buildNextZoneName(others);
		}
		if (taken.has(finalName.toLowerCase())) {
			finalName = this.makeUniqueName(finalName, taken);
		}
		const finalClassName = this.buildUniqueZoneClassName(finalName, zones, zoneId);

		return zones.map((zone) =>
			zone.id === zoneId
				? {
						...zone,
						name: finalName,
						className: finalClassName,
						cssRule: buildPositionZoneCssRule(finalClassName, zone.rect)
					}
				: zone
		);
	}

	hasDuplicateName(zones: ZoneBuilderZone[], zoneId: number): boolean {
		const zone = zones.find((entry) => entry.id === zoneId);
		if (!zone) return false;
		const key = zone.name.trim().toLowerCase();
		if (!key) return false;
		const count = zones.filter((entry) => entry.name.trim().toLowerCase() === key).length;
		return count > 1;
	}

	deleteZone(zones: ZoneBuilderZone[], zoneId: number): ZoneBuilderZone[] {
		return zones.filter((zone) => zone.id !== zoneId);
	}

	duplicateZone(zones: ZoneBuilderZone[], zoneId: number, cols: number, rows: number): ZoneBuilderZone[] {
		const source = zones.find((zone) => zone.id === zoneId);
		if (!source) return zones;
		const nextRect = this.shiftRectForDuplicate(source.rect, cols, rows);
		const duplicated = this.buildZone(zones, nextRect);
		return [...zones, duplicated];
	}

	private makeUniqueName(baseName: string, taken: Set<string>): string {
		let suffix = 2;
		while (true) {
			const candidate = `${baseName}-${suffix}`;
			if (!taken.has(candidate.toLowerCase())) return candidate;
			suffix += 1;
		}
	}

	private buildUniqueZoneClassName(
		baseName: string,
		zones: ZoneBuilderZone[],
		excludeZoneId?: number
	): string {
		const baseClassName = buildPositionZoneClassName(baseName, excludeZoneId);
		const taken = new Set(
			zones
				.filter((zone) => zone.id !== excludeZoneId)
				.map((zone) => zone.className)
				.filter(Boolean)
		);
		if (!taken.has(baseClassName)) return baseClassName;
		let suffix = 2;
		while (true) {
			const candidate = `${baseClassName}-${suffix}`;
			if (!taken.has(candidate)) return candidate;
			suffix += 1;
		}
	}

	private shiftRectForDuplicate(rect: ZoneBuilderZoneRect, cols: number, rows: number): ZoneBuilderZoneRect {
		const DUPLICATE_OFFSET = 2;
		const maxColStart = Math.max(1, cols - rect.spanColumn + 1);
		const maxRowStart = Math.max(1, rows - rect.spanRow + 1);
		const canShiftCol = rect.column < maxColStart;
		if (canShiftCol) {
			return { ...rect, column: this.clamp(rect.column + DUPLICATE_OFFSET, 1, maxColStart) };
		}
		const canShiftRow = rect.row < maxRowStart;
		if (canShiftRow) {
			return { ...rect, row: this.clamp(rect.row + DUPLICATE_OFFSET, 1, maxRowStart) };
		}
		return { ...rect };
	}

	startRectTracking(anchorElement: HTMLElement, onRect: (rect: ZoneBuilderRect) => void) {
		this.stopRectTracking();

		const updateRect = () => onRect(this.readRect(anchorElement));
		updateRect();

		const win = anchorElement.ownerDocument.defaultView;
		if (!win) return;

		const resizeObserver = new ResizeObserver(updateRect);
		resizeObserver.observe(anchorElement);
		win.addEventListener("resize", updateRect);
		win.addEventListener("scroll", updateRect, true);
		win.visualViewport?.addEventListener("resize", updateRect);
		win.visualViewport?.addEventListener("scroll", updateRect);

		this.rectTrackingCleanup = () => {
			resizeObserver.disconnect();
			win.removeEventListener("resize", updateRect);
			win.removeEventListener("scroll", updateRect, true);
			win.visualViewport?.removeEventListener("resize", updateRect);
			win.visualViewport?.removeEventListener("scroll", updateRect);
		};
	}

	stopRectTracking() {
		if (!this.rectTrackingCleanup) return;
		this.rectTrackingCleanup();
		this.rectTrackingCleanup = null;
	}

	dispose() {
		this.stopRectTracking();
	}
}
