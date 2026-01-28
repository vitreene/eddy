import React, { useState } from "react";
import type { EditableStyle } from "./types";
import Color from "color";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

import type { ColorLike } from "color";
import { GradientCreator } from "./gradient-color";
import {
	ColorPicker,
	ColorPickerSelection,
	ColorPickerEyeDropper,
	ColorPickerHue,
	ColorPickerAlpha,
	ColorPickerOutput,
	ColorPickerFormat
} from "../ui/shadcn-io/color-picker";

interface Props {
	type: "typo" | "visual";
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
	// onSwitchGradient?: () => void; // 👈 bouton switch
}

const colorFields: { type: "typo" | "visual"; key: keyof EditableStyle; label: string }[] = [
	{ type: "typo", key: "color", label: "Texte" },
	{ type: "visual", key: "backgroundColor", label: "Fond" },
	{ type: "visual", key: "borderColor", label: "Bord" }
];

export const ColorMini: React.FC<Props> = ({ type, value, onChange }) => {
	const [openGradient, setOpenGradient] = useState(false);
	const onSwitchGradient = () => {
		setOpenGradient((gradient) => !gradient);
	};

	const changeColor = (key: keyof EditableStyle) => (input: ColorLike) => {
		const val = Color.rgb(input).array();
		const alpha = val[3];
		const color =
			alpha == 1 || alpha == undefined ? Color.rgb(input).hex() : Color.rgb(input).alpha(alpha).hexa();
		if (color !== value[key]) onChange({ ...value, [key]: color });
	};

	const fields = type == "typo" ? colorFields : colorFields.filter((f) => f.type == type);

	return (
		<div className="">
			<div className="my-4 flex w-full items-center justify-around">
				{/* LEFT side : color chips */}

				{fields.map(({ key, label }) => {
					const whichPicker = key == "backgroundColor" && openGradient;
					return (
						<div key={key} className="flex flex-col items-center gap-1 select-none">
							{/* Trigger = color circle */}
							<Popover>
								<PopoverTrigger asChild>
									<div
										className="h-10 w-10 cursor-pointer rounded-full border shadow-sm transition-transform hover:scale-105"
										style={{ background: value[key] || "#ccc" }}
									/>
								</PopoverTrigger>

								<PopoverContent side="right" className="aspect-square w-fit p-2">
									{whichPicker ? (
										<GradientCreator
											onChange={function (gradient: string): void {
												//throw new Error("Function not implemented.");
												console.log(gradient);
											}}
										/>
									) : (
										<ColorPicker
											className="bg-background max-w-sm rounded-md border p-4 shadow-sm"
											defaultValue={value[key] ?? "#000000"}
											onChange={changeColor(key)}
										>
											<ColorPickerSelection />
											<div className="flex items-center gap-4">
												<ColorPickerEyeDropper />
												<div className="grid w-full gap-1">
													<ColorPickerHue />
													<ColorPickerAlpha />
												</div>
											</div>
											<div className="flex items-center gap-2">
												<ColorPickerOutput />
												<ColorPickerFormat />
											</div>
										</ColorPicker>
									)}
									<Button
										size="icon-sm"
										variant="secondary"
										className="h-6 px-2 text-[10px] whitespace-nowrap"
										onClick={onSwitchGradient}
									>
										→ {openGradient ? "Couleur" : "Dégradé"}
									</Button>
								</PopoverContent>
							</Popover>

							<span className="text-[9px] opacity-60">{label}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};
