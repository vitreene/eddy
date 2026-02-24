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

	const rawSize = value.fontSize || "3cqw";
	const size = Number.parseFloat(rawSize) || 3;

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<span className="w-8 text-xs">Taille</span>
				<Slider
					value={[size]}
					onValueChange={([v]) => update("fontSize", `${v}cqw`)}
					min={1}
					max={12}
					step={0.1}
					className="flex-1"
				/>
				<span className="w-10 text-right text-xs">{size.toFixed(1)}cqw</span>
			</div>

			<div className="flex gap-2">
				<Button
					size="icon-sm"
					variant={value.fontWeight === "bold" ? "default" : "outline"}
					onClick={() => update("fontWeight", value.fontWeight === "bold" ? "normal" : "bold")}
				>
					<Bold className="h-4 w-4" />
				</Button>

				<Button
					size="icon-sm"
					variant={value.fontStyle === "italic" ? "default" : "outline"}
					onClick={() => update("fontStyle", value.fontStyle === "italic" ? "normal" : "italic")}
				>
					<Italic className="h-4 w-4" />
				</Button>
				<span className="m-auto" />
				<Button
					size="icon-sm"
					variant={value.textAlign === "left" ? "default" : "outline"}
					onClick={() => update("textAlign", "left")}
				>
					<AlignLeft className="h-4 w-4" />
				</Button>

				<Button
					size="icon-sm"
					variant={value.textAlign === "center" ? "default" : "outline"}
					onClick={() => update("textAlign", "center")}
				>
					<AlignCenter className="h-4 w-4" />
				</Button>

				<Button
					size="icon-sm"
					variant={value.textAlign === "right" ? "default" : "outline"}
					onClick={() => update("textAlign", "right")}
				>
					<AlignRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
};
