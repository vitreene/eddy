import React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { EditableStyle } from "./types";

interface Props {
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

export const ColorMini: React.FC<Props> = ({ value, onChange }) => {
	const update = (k: keyof EditableStyle, v: string) => onChange({ ...value, [k]: v });

	const colors: [keyof EditableStyle, string][] = [
		["color", "Text"],
		["backgroundColor", "BG"],
		["borderColor", "Border"]
	];

	return (
		<div className="flex items-center gap-2">
			{colors.map(([k, label]) => (
				<Popover key={k}>
					<PopoverTrigger asChild>
						<div className="flex cursor-pointer flex-col items-center">
							<div
								className="h-5 w-5 rounded-full border shadow-sm"
								style={{ background: value[k] || "#ccc" }}
							/>
							<span className="text-[9px] opacity-60">{label}</span>
						</div>
					</PopoverTrigger>

					<PopoverContent className="w-28 p-2">
						<input
							type="color"
							className="h-10 w-full"
							value={value[k] || "#000000"}
							onChange={(e) => update(k, e.target.value)}
						/>
					</PopoverContent>
				</Popover>
			))}
		</div>
	);
};
