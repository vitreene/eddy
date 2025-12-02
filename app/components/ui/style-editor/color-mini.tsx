import React from "react";
import type { EditableStyle } from "./types";
import Color from "color";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
	ColorPicker,
	ColorPickerAlpha,
	ColorPickerEyeDropper,
	ColorPickerFormat,
	ColorPickerHue,
	ColorPickerOutput,
	ColorPickerSelection
} from "../shadcn-io/color-picker";
import type { ColorLike } from "color";
import { GradientCreator } from "./gradient-color";

interface Props {
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
	onSwitchGradient?: () => void; // 👈 bouton switch
}

export const ColorMini: React.FC<Props> = ({ value, onChange, onSwitchGradient }) => {
	const fields: { key: keyof EditableStyle; label: string }[] = [
		{ key: "color", label: "Text" },
		{ key: "backgroundColor", label: "BG" },
		{ key: "borderColor", label: "Border" }
	];

	const changeColor = (key: keyof EditableStyle) => (input: ColorLike) => {
		const val = Color.rgb(input).array();
		const alpha = val[3];
		const color =
			alpha == 1 || alpha == undefined ? Color.rgb(input).hex() : Color.rgb(input).alpha(alpha).hexa();
		if (color !== value[key]) onChange({ ...value, [key]: color });
	};

	return (
		<div className="">
			<div className="flex w-full items-center justify-between">
				{/* LEFT side : color chips */}
				<div className="flex items-center gap-4">
					{fields.map(({ key, label }) => {
						return (
							<div key={key} className="flex flex-col items-center gap-1 select-none">
								{/* Trigger = color circle */}
								<Popover>
									<PopoverTrigger asChild>
										<div
											className="h-6 w-6 cursor-pointer rounded-full border shadow-sm transition-transform hover:scale-105"
											style={{ background: value[key] || "#ccc" }}
										/>
									</PopoverTrigger>

									<PopoverContent side="right" className="aspect-square w-fit p-2">
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
									</PopoverContent>
								</Popover>

								<span className="text-[9px] opacity-60">{label}</span>
							</div>
						);
					})}
				</div>

				{/* RIGHT side : switch to gradient */}
				{onSwitchGradient && (
					<Button
						size="icon-sm"
						variant="secondary"
						className="h-6 px-2 text-[10px] whitespace-nowrap"
						onClick={onSwitchGradient}
					>
						→ Gradient
					</Button>
				)}
			</div>
			<GradientCreator
				onAddGradient={function (gradient: string): void {
					//throw new Error("Function not implemented.");
					console.log(gradient);
				}}
			/>
		</div>
	);
};
