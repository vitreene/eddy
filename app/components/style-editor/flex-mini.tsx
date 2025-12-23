import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

import type { EditableStyle } from "./types";

interface Props {
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

export const FlexMini: React.FC<Props> = ({ value, onChange }) => {
	const grid: [EditableStyle["justifyContent"], EditableStyle["alignItems"]][] = [
		["flex-start", "flex-start"],
		["center", "flex-start"],
		["flex-end", "flex-start"],
		["flex-start", "center"],
		["center", "center"],
		["flex-end", "center"],
		["flex-start", "flex-end"],
		["center", "flex-end"],
		["flex-end", "flex-end"]
	];

	const [selected, setSelected] = useState<number | null>(null);

	useEffect(() => {
		if (value.display === "flex") {
			const index = grid.findIndex(([jc, ai]) => jc === value.justifyContent && ai === value.alignItems);
			setSelected(index >= 0 ? index : null);
		}
	}, [value]);

	const select = (i: number) => {
		const [jc, ai] = grid[i];
		setSelected(i);
		onChange({
			...value,
			display: "flex",
			justifyContent: jc,
			alignItems: ai
		});
	};

	return (
		<div>
			<div className="mb-1 text-[10px] opacity-60">Flex</div>
			<div className="grid aspect-square w-10 grid-cols-3 gap-1">
				{grid.map((_, i) => (
					<button
						key={i}
						className={cn(
							"h-3 w-3 rounded-xs border",
							selected === i ? "bg-blue-500" : "bg-muted hover:bg-accent"
						)}
						onClick={() => select(i)}
					/>
				))}
			</div>
		</div>
	);
};
