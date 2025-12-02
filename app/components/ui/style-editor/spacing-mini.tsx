import React from "react";
import { Slider } from "@/components/ui/slider";

import type { EditableStyle } from "./types";

interface Props {
	value: EditableStyle;
	onChange: (s: EditableStyle) => void;
}

export const SpacingMini: React.FC<Props> = ({ value, onChange }) => {
	const update = (k: keyof EditableStyle, n: number) => onChange({ ...value, [k]: n + "px" });

	const pad = parseInt(value.padding || "0");
	const mar = parseInt(value.margin || "0");

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<span className="w-8 text-[10px] opacity-60">Pad</span>
				<Slider value={[pad]} onValueChange={([v]) => update("padding", v)} max={40} />
				<span className="w-6 text-right text-[10px]">{pad}</span>
			</div>

			<div className="flex items-center gap-2">
				<span className="w-8 text-[10px] opacity-60">Mar</span>
				<Slider value={[mar]} onValueChange={([v]) => update("margin", v)} max={40} />
				<span className="w-6 text-right text-[10px]">{mar}</span>
			</div>
		</div>
	);
};
