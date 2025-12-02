import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

import { ColorMini } from "./color-mini";
import { FlexMini } from "./flex-mini";
import { FontMini } from "./font-mini";
import { PreviewMini } from "./preview-mini";
import { SpacingMini } from "./spacing-mini";
import { TypographyMini } from "./typography-mini";

import type { EditableStyle } from "./types";

interface Props {
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

export const CompactStyleEditor: React.FC<Props> = ({ value, onChange }) => {
	const update = (k: keyof EditableStyle, v: any) => onChange({ ...value, [k]: v });

	const copyCSS = () => {
		const txt = Object.entries(value)
			.map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`)
			.join("\n");

		navigator.clipboard.writeText(txt);
	};

	return (
		<Card className="w-64 gap-2 p-3">
			<div className="mb-1 flex justify-between">
				<Button size="sm" variant="outline" onClick={() => onChange({})}>
					Reset
				</Button>
				<Button size="sm" variant="outline" onClick={copyCSS}>
					<Copy className="h-4 w-4" />
				</Button>
			</div>
			<div className="aspect-video w-full overflow-hidden">
				<PreviewMini value={value} />
			</div>
			<div className="flex flex-col gap-4">
				<p className="text-sm">Typographie</p>
				<FontMini value={value.fontFamily} onChange={(v) => update("fontFamily", v)} />
				<TypographyMini value={value} onChange={onChange} />
			</div>

			<ColorMini value={value} onChange={onChange} />

			<SpacingMini value={value} onChange={onChange} />

			<FlexMini value={value} onChange={onChange} />
		</Card>
	);
};
