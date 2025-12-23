import React, { useEffect } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface Props {
	value?: string;
	onChange: (font: string) => void;
}

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

/**
 * Utility : Construct Google Fonts link
 * Combines all fonts into ONE efficient request.
 */
const buildGoogleFontURL = (fonts: string[]) => {
	const families = fonts.map((f) => f.replace(/ /g, "+") + ":wght@100;300;400;600;700").join("&family=");
	return `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
};

export const FontMini: React.FC<Props> = ({ value, onChange }) => {
	useEffect(() => {
		// Inject only once
		const id = "editor-google-fonts";

		if (!document.getElementById(id)) {
			const link = document.createElement("link");
			link.id = id;
			link.rel = "stylesheet";
			link.href = buildGoogleFontURL(FONTS);
			document.head.appendChild(link);
		}
	}, []);

	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="h-7 w-full text-xs">
				<SelectValue placeholder="Police" />
			</SelectTrigger>

			<SelectContent>
				{FONTS.map((font) => (
					<SelectItem key={font} value={font}>
						<span style={{ fontFamily: font, fontSize: "12px" }}>{font}</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};
