import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SceneLogicContext } from "@/provider/scene-logic";
import { getValuesFromGridName } from "@/lib/utils";
import { CAPSULE_TYPES, resolveCapsuleType } from "@/config/capsule-types";

import type { EditableStyle } from "./types";

interface Props {
	contentType: string;
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

export const FlexMini: React.FC<Props> = ({ contentType, value, onChange }) => {
	const grid: [EditableStyle["justifySelf"], EditableStyle["alignSelf"]][] = [
		["start", "start"],
		["center", "start"],
		["end", "start"],
		["start", "center"],
		["center", "center"],
		["end", "center"],
		["start", "end"],
		["center", "end"],
		["end", "end"]
	];
	const NONE_INDEX = 10;
	const isImageContent = contentType === "img" || contentType === "sprite";

	const [selected, setSelected] = useState<number | null>(null);

	const item = SceneLogicContext.useSelector((state) =>
		state.context.active.itemId ? state.context.items[state.context.active.itemId] : undefined
	);
	const capsule = SceneLogicContext.useSelector((state) => {
		if (!item) return undefined;
		const content = state.context.contents[item.contentId];
		// Important source capsule:
		// when editing a capsule host item, orientation must come from the hosted capsule itself,
		// not from the parent capsule containing the host item.
		if (content?.type === "capsule" && content.capsuleId) {
			return state.context.capsules[content.capsuleId];
		}
		return state.context.capsules[item.capsuleId];
	});

	const orientation: "horizontal" | "vertical" = (() => {
		if (!capsule) return "horizontal";
		const type = resolveCapsuleType(capsule.type);
		if (type === CAPSULE_TYPES.LISTE) {
			return capsule.grid?.includes("horizontal") ? "horizontal" : "vertical";
		}
		if (type === CAPSULE_TYPES.RANGEE) {
			const g = getValuesFromGridName(capsule.grid);
			return g.h === 1 ? "horizontal" : "vertical";
		}
		return "horizontal";
	})();

	const current = isImageContent ? resolveBackgroundPosition(value) : resolveSelfPosition(value);
	const stretchEnabled =
		orientation === "vertical" ? current.alignSelf === "stretch" : current.justifySelf === "stretch";

	useEffect(() => {
		if (isImageContent) return;
		const normalized = normalizeStretchAxisForOrientation(current, orientation);
		if (normalized.alignSelf === current.alignSelf && normalized.justifySelf === current.justifySelf) {
			return;
		}

		const placeSelf =
			normalized.alignSelf && normalized.justifySelf
				? `${normalized.alignSelf} ${normalized.justifySelf}`
				: undefined;

		onChange({
			...value,
			display: undefined,
			justifyContent: undefined,
			alignItems: undefined,
			justifySelf: normalized.justifySelf,
			alignSelf: normalized.alignSelf,
			placeSelf
		});
	}, [isImageContent, orientation, current.alignSelf, current.justifySelf]);

	useEffect(() => {
		if (!current.justifySelf && !current.alignSelf) {
			setSelected(null);
			return;
		}

		const selectionJustify = current.justifySelf === "stretch" ? "center" : current.justifySelf;
		const selectionAlign = current.alignSelf === "stretch" ? "center" : current.alignSelf;
		const index = grid.findIndex(([js, as]) => js === selectionJustify && as === selectionAlign);
		setSelected(index >= 0 ? index : null);
	}, [current.justifySelf, current.alignSelf]);

	const select = (i: number) => {
		const [baseJustify, baseAlign] = i === NONE_INDEX ? ([undefined, undefined] as const) : grid[i];
		if (isImageContent) {
			const { justifySelf, alignSelf, placeSelf } = computeSelfPosition({
				justifySelf: baseJustify,
				alignSelf: baseAlign,
				stretchEnabled: false,
				orientation
			});
			const backgroundPosition =
				baseJustify && baseAlign
					? `${mapSelfToBackgroundX(baseJustify)} ${mapSelfToBackgroundY(baseAlign)}`
					: undefined;
			setSelected(i);
			onChange({
				...value,
				backgroundPosition,
				justifySelf,
				alignSelf,
				placeSelf
			});
			return;
		}

		const { justifySelf, alignSelf, placeSelf } = computeSelfPosition({
			justifySelf: baseJustify,
			alignSelf: baseAlign,
			stretchEnabled,
			orientation
		});
		setSelected(i);
		onChange({
			...value,
			// Important: never emit parent-layout props from this control.
			// FlexMini is now strictly about self-positioning inside the parent layout.
			display: undefined,
			justifyContent: undefined,
			alignItems: undefined,
			justifySelf,
			alignSelf,
			placeSelf
		});
	};

	const toggleStretch = () => {
		if (isImageContent) return;
		const fallbackJustify =
			selected !== null && selected >= 0 && selected < grid.length
				? grid[selected][0]
				: current.justifySelf || "center";
		const fallbackAlign =
			selected !== null && selected >= 0 && selected < grid.length
				? grid[selected][1]
				: current.alignSelf || "center";

		const { justifySelf, alignSelf, placeSelf } = computeSelfPosition({
			justifySelf: fallbackJustify,
			alignSelf: fallbackAlign,
			stretchEnabled: !stretchEnabled,
			orientation
		});

		if (stretchEnabled) {
			onChange({
				...value,
				display: undefined,
				justifyContent: undefined,
				alignItems: undefined,
				justifySelf,
				alignSelf,
				placeSelf
			});
			return;
		}

		onChange({
			...value,
			display: undefined,
			justifyContent: undefined,
			alignItems: undefined,
			justifySelf,
			alignSelf,
			placeSelf
		});
	};

	return (
		<div>
			<div className="mb-1 text-[10px] opacity-60">Position</div>
			<div className="grid aspect-square w-10 grid-cols-3 gap-1">
				{grid.map((_, i) => (
					<button
						key={i}
						className={cn("h-3 w-3 rounded-xs border", selected === i ? "bg-blue-500" : "bg-muted hover:bg-accent")}
						onClick={() => select(i)}
					/>
				))}
			</div>
			<button
				type="button"
				className={cn(
					"mt-1 w-full rounded-xs border px-1 py-0.5 text-[10px]",
					stretchEnabled ? "bg-blue-500 text-white" : "bg-muted hover:bg-accent"
				)}
				disabled={isImageContent}
				onClick={toggleStretch}
			>
				Stretch {stretchEnabled ? "on" : "off"}
			</button>
			<button
				type="button"
				className={cn(
					"mt-1 w-full rounded-xs border px-1 py-0.5 text-[10px]",
					selected === NONE_INDEX ? "bg-blue-500 text-white" : "bg-muted hover:bg-accent"
				)}
				onClick={() => select(NONE_INDEX)}
			>
				None
			</button>
		</div>
	);
};

function computeSelfPosition({
	justifySelf,
	alignSelf,
	stretchEnabled,
	orientation
}: {
	justifySelf: EditableStyle["justifySelf"] | undefined;
	alignSelf: EditableStyle["alignSelf"] | undefined;
	stretchEnabled: boolean;
	orientation: "horizontal" | "vertical";
}) {
	let nextJustify = justifySelf;
	let nextAlign = alignSelf;

	if (stretchEnabled) {
		if (orientation === "vertical") {
			nextAlign = "stretch";
			nextJustify = nextJustify === "stretch" ? "center" : nextJustify;
		} else {
			nextJustify = "stretch";
			nextAlign = nextAlign === "stretch" ? "center" : nextAlign;
		}
	}

	const placeSelf = nextAlign && nextJustify ? `${nextAlign} ${nextJustify}` : undefined;

	return {
		justifySelf: nextJustify,
		alignSelf: nextAlign,
		placeSelf
	};
}

function resolveSelfPosition(value: EditableStyle) {
	if (value.justifySelf || value.alignSelf) {
		return {
			justifySelf: value.justifySelf as EditableStyle["justifySelf"] | undefined,
			alignSelf: value.alignSelf as EditableStyle["alignSelf"] | undefined
		};
	}

	if (typeof value.placeSelf === "string") {
		const [alignSelf, justifySelf] = value.placeSelf.trim().split(/\s+/);
		return {
			justifySelf: (justifySelf as EditableStyle["justifySelf"]) || undefined,
			alignSelf: (alignSelf as EditableStyle["alignSelf"]) || undefined
		};
	}

	return {
		justifySelf: undefined,
		alignSelf: undefined
	};
}

function resolveBackgroundPosition(value: EditableStyle) {
	if (typeof value.backgroundPosition === "string") {
		const [x, y] = value.backgroundPosition.trim().split(/\s+/);
		return {
			justifySelf: mapBackgroundToSelf(x),
			alignSelf: mapBackgroundToSelf(y)
		};
	}

	return {
		justifySelf: undefined,
		alignSelf: undefined
	};
}

function mapSelfToBackgroundX(value: EditableStyle["justifySelf"] | EditableStyle["alignSelf"]) {
	if (value === "start") return "left";
	if (value === "end") return "right";
	return "center";
}

function mapSelfToBackgroundY(value: EditableStyle["justifySelf"] | EditableStyle["alignSelf"]) {
	if (value === "start") return "top";
	if (value === "end") return "bottom";
	return "center";
}

function mapBackgroundToSelf(
	value: string | undefined
): EditableStyle["justifySelf"] | EditableStyle["alignSelf"] | undefined {
	if (!value) return undefined;
	if (value === "left" || value === "top") return "start";
	if (value === "right" || value === "bottom") return "end";
	if (value === "center") return "center";
	return undefined;
}

function normalizeStretchAxisForOrientation(
	current: {
		justifySelf: EditableStyle["justifySelf"] | undefined;
		alignSelf: EditableStyle["alignSelf"] | undefined;
	},
	orientation: "horizontal" | "vertical"
): {
	justifySelf: EditableStyle["justifySelf"] | undefined;
	alignSelf: EditableStyle["alignSelf"] | undefined;
} {
	const hasStretch = current.justifySelf === "stretch" || current.alignSelf === "stretch";
	if (!hasStretch) return current;

	if (orientation === "vertical") {
		if (current.alignSelf === "stretch") return current;
		return {
			alignSelf: "stretch",
			justifySelf: current.alignSelf || "center"
		};
	}

	if (current.justifySelf === "stretch") return current;
	return {
		alignSelf: current.justifySelf || "center",
		justifySelf: "stretch"
	};
}
