import React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

import type { EditableStyle } from "./types";

interface Props {
	value: EditableStyle;
	onChange: (s: EditableStyle) => void;
}

export const TypographyMini: React.FC<Props> = ({ value, onChange }) => {
	const update = (k: keyof EditableStyle, v: any) => onChange({ ...value, [k]: v });

	const size = parseInt(value.fontSize || "16");

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<span className="w-8 text-[10px] opacity-60">Size</span>
				<Slider
					value={[size]}
					onValueChange={([v]) => update("fontSize", v + "px")}
					min={8}
					max={48}
					className="flex-1"
				/>
				<span className="w-6 text-right text-[10px]">{size}</span>
			</div>

			<div className="flex gap-1">
				<Button
					size="icon"
					variant={value.fontWeight === "bold" ? "default" : "outline"}
					onClick={() => update("fontWeight", value.fontWeight === "bold" ? "normal" : "bold")}
				>
					<Bold className="h-4 w-4" />
				</Button>

				<Button
					size="icon"
					variant={value.fontStyle === "italic" ? "default" : "outline"}
					onClick={() => update("fontStyle", value.fontStyle === "italic" ? "normal" : "italic")}
				>
					<Italic className="h-4 w-4" />
				</Button>

				<Button
					size="icon"
					variant={value.textAlign === "left" ? "default" : "outline"}
					onClick={() => update("textAlign", "left")}
				>
					<AlignLeft className="h-4 w-4" />
				</Button>

				<Button
					size="icon"
					variant={value.textAlign === "center" ? "default" : "outline"}
					onClick={() => update("textAlign", "center")}
				>
					<AlignCenter className="h-4 w-4" />
				</Button>

				<Button
					size="icon"
					variant={value.textAlign === "right" ? "default" : "outline"}
					onClick={() => update("textAlign", "right")}
				>
					<AlignRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
};
