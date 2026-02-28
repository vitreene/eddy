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
	onReset?: () => void;
	textValue?: string;
	onTextChange?: (value: string) => void;
	onTextCommit?: (value: string) => void;
}

const typeEdit = {
	img: "visual",
	sprite: "visual",
	video: "visual",
	text: "typo",
	capsule: "typo"
} as const;

export const StyleEditor: React.FC<Props> = ({
	content,
	value,
	onChange,
	onReset,
	textValue,
	onTextChange,
	onTextCommit
}) => {
	const update = (k: keyof EditableStyle, v: any) => onChange({ ...value, [k]: v });
	const visualMode = value.backgroundSize === "contain" ? "sprite" : "image";

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
				<Button size="sm" variant="outline" onClick={() => (onReset ? onReset() : onChange({}))}>
					Reset
				</Button>
				<Button size="sm" variant="outline" onClick={copyCSS}>
					<Copy className="h-4 w-4" />
				</Button>
			</div>

			{content.type === "text" && (
				<div className="mb-3 border-b pb-3">
					<label className="mb-1 block text-xs">Texte</label>
					<input
						type="text"
						value={textValue ?? ""}
						onChange={(e) => onTextChange?.(e.currentTarget.value)}
						onBlur={(e) => onTextCommit?.(e.currentTarget.value)}
						className="w-full rounded border border-stone-300 px-2 py-1 text-xs"
					/>
				</div>
			)}
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

			{content.type === "img" && (
				<div className="mb-4 flex items-center gap-2 border-b pb-3 text-xs">
					<span className="text-muted-foreground">Mode image</span>
					<Button
						type="button"
						size="sm"
						variant={visualMode === "image" ? "default" : "outline"}
						onClick={() => onChange({ ...value, backgroundSize: "cover", backgroundRepeat: "no-repeat" })}
					>
						Image
					</Button>
					<Button
						type="button"
						size="sm"
						variant={visualMode === "sprite" ? "default" : "outline"}
						onClick={() => onChange({ ...value, backgroundSize: "contain", backgroundRepeat: "no-repeat" })}
					>
						Sprite
					</Button>
				</div>
			)}

			<ColorMini type={type} value={value} onChange={onChange} />

			<SpacingMini value={value} onChange={onChange} />

			<div className="mt-2 flex items-center gap-2 text-xs">
				<input
					type="checkbox"
					checked={value.outline === "1px solid red"}
					onChange={(e) => update("outline", e.currentTarget.checked ? "1px solid red" : undefined)}
				/>
				<label>outline</label>
			</div>
		</div>
	);
};
