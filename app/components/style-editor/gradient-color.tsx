import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
	ColorPicker,
	ColorPickerAlpha,
	ColorPickerEyeDropper,
	ColorPickerHue,
	ColorPickerSelection,
	type ColorPickerProps
} from "@/components/ui/shadcn-io/color-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

import Color, { type ColorLike } from "color";

interface GradientCreatorProps {
	onChange: (gradient: string) => void;
}

type GradientStop = {
	id: number;
	color: string;
};

type GradientType = "linear" | "radial";

export const GradientCreator: React.FC<GradientCreatorProps> = ({ onChange }) => {
	const [gradientType, setGradientType] = useState<GradientType>("linear");
	const [angle, setAngle] = useState<number>(90);
	const [stops, setStops] = useState<GradientStop[]>([
		{ id: 0, color: "#ff0000" },
		{ id: 1, color: "#0000ff" }
	]);

	const makeGradient = (type: GradientType, a: number, s: GradientStop[]) => {
		const colors = s.map((stop) => stop.color).join(", ");
		if (type === "radial") {
			return `radial-gradient(circle, ${colors})`;
		}
		return `linear-gradient(${a}deg, ${colors})`;
	};

	const updateStopColor = (id: number, input: ColorLike | React.FormEvent<HTMLDivElement>) => {
		// Ignore form events, keep only actual color values
		if (typeof input === "object" && "nativeEvent" in input) {
			return;
		}

		const hex = Color(input as ColorLike)
			.hex()
			.toLowerCase();

		// blocage si la valeur ne change pas
		const current = stops.find((s) => s.id === id);
		if (!current || current.color.toLowerCase() === hex) {
			return;
		}

		setStops((prev) => prev.map((stop) => (stop.id === id ? { ...stop, color: hex } : stop)));
	};

	const addStop = () => {
		setStops((prev) => {
			if (prev.length >= 4) return prev;
			return [...prev, { id: Date.now(), color: "#ffffff" }];
		});
	};

	const removeStop = (id: number) => {
		setStops((prev) => (prev.length <= 2 ? prev : prev.filter((s) => s.id !== id)));
	};

	const handleAngleChange = (val: number) => {
		setAngle(val);
	};

	// TODO a chaque modif, mettre à jour
	const handleAddToPalette = () => {
		const gradient = makeGradient(gradientType, angle, stops);
		onChange(gradient);
	};

	const preview = makeGradient(gradientType, angle, stops);

	return (
		<div className="bg-background max-w-sm space-y-3 rounded-md border p-4 shadow-sm">
			{/* Type de dégradé */}
			<div className="flex items-center gap-2">
				<span className="w-10 text-[10px] opacity-60">Type</span>
				<Select value={gradientType} onValueChange={(v) => setGradientType(v as GradientType)}>
					<SelectTrigger className="h-7 w-28 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="linear">Lin&eacute;aire</SelectItem>
						<SelectItem value="radial">Radial</SelectItem>
					</SelectContent>
				</Select>
				{/* <Button
					type="button"
					size="sm"
					variant="secondary"
					onClick={handleAddToPalette}
					className="px-2 text-[11px]"
				>
					Ajouter
				</Button> */}
			</div>

			{/* Stops */}
			<div className="flex items-center gap-3">
				{stops.map((stop) => (
					<div key={stop.id} className="flex flex-col items-center gap-1">
						<Popover>
							<PopoverTrigger asChild>
								<div
									className="h-6 w-6 cursor-pointer rounded-full border shadow-sm transition-transform hover:scale-105"
									style={{ background: stop.color }}
								/>
							</PopoverTrigger>
							<PopoverContent side="right" className="aspect-square w-fit p-2">
								<ColorPickerEdit
									defaultValue={stop.color}
									onChange={(val) => updateStopColor(stop.id, val)}
									className="w-40"
								/>
							</PopoverContent>
						</Popover>

						<button
							type="button"
							className="flex items-center gap-1 text-[9px] opacity-60 hover:opacity-100"
							onClick={() => removeStop(stop.id)}
							disabled={stops.length <= 2}
						>
							<Trash2 className="h-3 w-3" />
						</button>
					</div>
				))}

				{stops.length < 4 && (
					<Button type="button" size="icon" variant="outline" className="h-6 w-6" onClick={addStop}>
						<Plus className="h-3 w-3" />
					</Button>
				)}
			</div>

			{/* Preview  */}
			<div className="flex items-start gap-3">
				<div className="flex-1">
					<div className="h-8 rounded border" style={{ backgroundImage: preview }} />
					{/* Angle */}
					{gradientType === "linear" ? (
						<div className="mt-2 flex items-center gap-2 opacity-100">
							<span className="w-10 text-[10px] opacity-60">Angle</span>
							<Slider
								value={[angle]}
								min={0}
								max={360}
								step={1}
								onValueChange={([v]) => handleAngleChange(v)}
								className="flex-1"
							/>
							<span className="w-8 text-right text-[10px]">{`${angle}°`}</span>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
};

function ColorPickerEdit(props: ColorPickerProps) {
	return (
		<ColorPicker {...props}>
			<ColorPickerSelection />
			<div className="flex items-center gap-4">
				<ColorPickerEyeDropper />
				<div className="grid w-full gap-1">
					<ColorPickerHue />
					<ColorPickerAlpha />
				</div>
			</div>
		</ColorPicker>
	);
}
