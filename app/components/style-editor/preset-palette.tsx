import React from "react";

import type { EditableStyle } from "./types";

const PRESETS: EditableStyle[] = [
	{ backgroundColor: "#fff", color: "#000", padding: "16px" },
	{ backgroundColor: "#222", color: "#fff", padding: "16px" },
	{ backgroundColor: "#f8e8d0", color: "#663300" },
	{ backgroundColor: "#e0f2ff", color: "#003344" },
	{ backgroundColor: "#ffe0e0", color: "#550000" },
	{ backgroundColor: "#e0ffe6", color: "#004420" }
];

interface Props {
	onPreset: (style: EditableStyle) => void;
}

export const PresetPalette: React.FC<Props> = ({ onPreset }) => {
	return (
		<div className="grid grid-cols-6 gap-2">
			{PRESETS.map((p, i) => (
				<button
					key={i}
					onClick={() => onPreset(p)}
					className="h-6 w-6 rounded shadow-sm"
					style={{ background: p.backgroundColor, color: p.color }}
				/>
			))}
		</div>
	);
};
