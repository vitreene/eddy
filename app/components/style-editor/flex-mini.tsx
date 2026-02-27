import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

import type { EditableStyle } from "./types";

interface Props {
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

export const FlexMini: React.FC<Props> = ({ value, onChange }) => {
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

	const [selected, setSelected] = useState<number | null>(null);

	useEffect(() => {
		const index = grid.findIndex(([js, as]) => js === value.justifySelf && as === value.alignSelf);
		setSelected(index >= 0 ? index : null);
	}, [value]);

	const select = (i: number) => {
		const [justifySelf, alignSelf] = grid[i];
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
			placeSelf: undefined
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
		</div>
	);
};
