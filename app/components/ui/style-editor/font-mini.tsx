import React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const FONTS = [
	"Inter",
	"Roboto",
	"Open Sans",
	"Montserrat",
	"Lato",
	"Ubuntu",
	"Poppins",
	"Playfair Display",
	"Merriweather",
	"Source Sans Pro"
];

interface Props {
	value?: string;
	onChange: (value: string) => void;
}

export const FontMini: React.FC<Props> = ({ value, onChange }) => (
	<Select value={value} onValueChange={onChange}>
		<div className="text-[10px] opacity-60">Font</div>
		<SelectTrigger className="h-7 text-xs">
			<SelectValue placeholder="Font" />
		</SelectTrigger>
		<SelectContent>
			{FONTS.map((f) => (
				<SelectItem key={f} value={f}>
					<span style={{ fontFamily: f }}>{f}</span>
				</SelectItem>
			))}
		</SelectContent>
	</Select>
);
