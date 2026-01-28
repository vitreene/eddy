import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

import { ColorMini } from "./color-mini";
import { FlexMini } from "./flex-mini";
import { FontMini } from "./font-mini";
import { PreviewMini } from "./preview-mini";
import { SpacingMini } from "./spacing-mini";
import { TypographyMini } from "./typography-mini";
import { SlotEditor } from "../slot-editor";

import type { EditableStyle } from "./types";
import type { Content } from "@/api/db";

interface Props {
	content: Content;
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

const typeEdit = {
	img: "visual",
	sprite: "visual",
	video: "visual",
	text: "typo",
	capsule: "typo"
} as const;

export const CompactStyleEditor: React.FC<Props> = ({ content, value, onChange }) => {
	const update = (k: keyof EditableStyle, v: any) => onChange({ ...value, [k]: v });

	const copyCSS = () => {
		const txt = Object.entries(value)
			.map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`)
			.join("\n");

		navigator.clipboard.writeText(txt);
	};

	const type = typeEdit[content.type as keyof typeof typeEdit];

	return (
		<div className="mt-2">
			<div className="mb-2 flex justify-between border-b pb-2">
				<Button size="sm" variant="outline" onClick={() => onChange({})}>
					Reset
				</Button>
				<Button size="sm" variant="outline" onClick={copyCSS}>
					<Copy className="h-4 w-4" />
				</Button>
			</div>
			<div className="my-2 flex gap-4 border-b pb-2">
				<SlotEditor value={value} onChange={onChange} />
				<FlexMini value={value} onChange={onChange} />
			</div>
			{type == "typo" && (
				<>
					<div className="aspect-video w-full overflow-hidden">
						<PreviewMini value={value} />
					</div>
					<div className="flex flex-col gap-4">
						<p className="text-sm">Typographie</p>
						<FontMini value={value.fontFamily} onChange={(v) => update("fontFamily", v)} />
						<TypographyMini value={value} onChange={onChange} />
					</div>
				</>
			)}

			<ColorMini type={type} value={value} onChange={onChange} />

			<SpacingMini value={value} onChange={onChange} />
		</div>
	);
};
