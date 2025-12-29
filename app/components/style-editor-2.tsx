import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ChevronDown } from "lucide-react";

import Color from "color";

import { ColorPicker } from "./ui/shadcn-io/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export interface EditableStyle {
	display?: string;
	margin?: string;
	padding?: string;
	width?: string;
	height?: string;
	minWidth?: string;
	minHeight?: string;
	maxWidth?: string;
	maxHeight?: string;
	overflow?: string;
	position?: string;
	zIndex?: string;
	fontFamily?: string;
	fontWeight?: string;
	fontSize?: string;
	lineHeight?: string;
	textAlign?: string;
	color?: string;
	backgroundColor?: string;
	borderStyle?: string;
	borderColor?: string;
	borderWidth?: string;
	borderRadius?: string;
	letterSpacing?: string;
	textDecorationLine?: string;
	textTransform?: string;
	whiteSpace?: string;
	textWrapMode?: string;
	textWrapStyle?: string;
	direction?: string;
	hyphens?: string;
	textOverflow?: string;
}

interface EditableStylePanelProps {
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

/* ========================= POUR NSPIRATION  ========================= */

/* ========================= ROOT PANEL ========================= */

export const EditableStylePanel: React.FC<EditableStylePanelProps> = ({ value, onChange }) => {
	const update = <K extends keyof EditableStyle>(key: K, v: EditableStyle[K]) =>
		onChange({ ...value, [key]: v });

	return (
		<div className="bg-background flex w-80 flex-col border-l text-xs">
			<Tabs defaultValue="style" className="flex h-full flex-col">
				<PanelTabs />

				<TabsContent value="style" className="flex-1 space-y-6 overflow-auto p-3">
					<SelectedNodeHeader />

					<LayoutSection value={value} onChange={update} />
					<SpaceSection value={value} onChange={update} />
					<SizeSection value={value} onChange={update} />
					<OverflowSection value={value} onChange={update} />
					<PositionSection value={value} onChange={update} />
					<TypographySection value={value} onChange={update} />
					<BackgroundsSection value={value} onChange={update} />
					<BordersSection value={value} onChange={update} />
					<AdvancedSection value={value} />
				</TabsContent>

				<TabsContent value="settings" className="flex-1 p-3 text-[11px]">
					<div className="text-muted-foreground">Settings panel placeholder.</div>
				</TabsContent>
			</Tabs>
		</div>
	);
};

/* ========================= SMALL BUILDING BLOCKS ========================= */

const PanelTabs: React.FC = () => (
	<div className="border-b px-3 pt-2">
		<TabsList className="h-7 text-[11px]">
			<TabsTrigger value="style">Style</TabsTrigger>
			<TabsTrigger value="settings">Settings</TabsTrigger>
		</TabsList>
	</div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
	<section className="border-t pt-3 first:border-t-0">
		<div className="mb-2 flex items-center justify-between">
			<h3 className="text-[11px] font-medium">{title}</h3>
			{/* placeholder for future collapse button */}
		</div>
		<div className="space-y-2">{children}</div>
	</section>
);

const LabelText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<span className="text-muted-foreground w-16 text-[11px]">{children}</span>
);

const TinyButton: React.FC<React.ComponentProps<typeof Button>> = (props) => (
	<Button size="sm" variant="outline" className="h-7 px-1 text-[11px]" {...props} />
);

const NumericInput: React.FC<React.ComponentProps<typeof Input> & { suffix?: string }> = ({
	suffix,
	className,
	...props
}) => (
	<div className="relative w-full">
		<Input {...props} className={`h-7 pr-6 text-[11px] ${className ?? ""}`} type="text" />
		{suffix && (
			<span className="text-muted-foreground absolute inset-y-0 right-1 flex items-center text-[10px]">
				{suffix}
			</span>
		)}
	</div>
);

/* ========================= HEADER (SELECTED NODE) ========================= */

const SelectedNodeHeader: React.FC = () => (
	<div className="mb-2 flex items-center justify-between">
		<div className="flex items-center gap-2 text-[11px]">
			<div className="flex h-4 w-4 items-center justify-center rounded-sm border">
				<div className="border-primary h-3 w-3 border" />
			</div>
			<span>toto</span>
		</div>
		<Button size="icon" variant="outline" className="h-7 w-7" aria-label="More actions">
			<ChevronDown className="h-3 w-3" />
		</Button>
	</div>
);

/* ========================= INDIVIDUAL SECTIONS ========================= */

const LayoutSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Layout">
		<div className="flex items-center gap-2">
			<LabelText>Display</LabelText>
			<Select value={value.display ?? "block"} onValueChange={(v) => onChange("display", v)}>
				<SelectTrigger className="h-7 text-[11px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="block">block</SelectItem>
					<SelectItem value="inline-block">inline-block</SelectItem>
					<SelectItem value="flex">flex</SelectItem>
					<SelectItem value="grid">grid</SelectItem>
				</SelectContent>
			</Select>
		</div>
	</Section>
);

const SpaceSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Space">
		{/* Margin / Padding box style */}
		<div className="grid place-items-center rounded-sm border p-2 text-[10px]">
			<div className="grid gap-1">
				<div className="text-center">
					<Input
						className="mx-auto h-6 w-12 text-center text-[10px]"
						value={value.margin ?? "0"}
						onChange={(e) => onChange("margin", e.target.value)}
					/>
					<div className="text-muted-foreground text-[9px] uppercase">margin</div>
				</div>

				<div className="grid place-items-center gap-1 rounded-sm border p-2">
					<Input
						className="text-primary mx-auto h-6 w-12 text-center text-[10px]"
						value={value.padding ?? "0"}
						onChange={(e) => onChange("padding", e.target.value)}
					/>
					<div className="text-muted-foreground text-[9px] uppercase">padding</div>
				</div>
			</div>
		</div>
	</Section>
);

const SizeSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Size">
		<div className="grid grid-cols-2 items-center gap-2">
			<LabelText>Width</LabelText>
			<NumericInput value={value.width ?? "auto"} onChange={(e) => onChange("width", e.target.value)} />

			<LabelText>Height</LabelText>
			<NumericInput value={value.height ?? "auto"} onChange={(e) => onChange("height", e.target.value)} />

			<LabelText>Min W</LabelText>
			<NumericInput value={value.minWidth ?? "auto"} onChange={(e) => onChange("minWidth", e.target.value)} />

			<LabelText>Min H</LabelText>
			<NumericInput value={value.minHeight ?? "auto"} onChange={(e) => onChange("minHeight", e.target.value)} />

			<LabelText>Max W</LabelText>
			<NumericInput value={value.maxWidth ?? "none"} onChange={(e) => onChange("maxWidth", e.target.value)} />

			<LabelText>Max H</LabelText>
			<NumericInput value={value.maxHeight ?? "none"} onChange={(e) => onChange("maxHeight", e.target.value)} />
		</div>
	</Section>
);

const OverflowSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Overflow">
		<div className="flex items-center gap-2">
			<LabelText>Overflow</LabelText>
			<Select value={value.overflow ?? "visible"} onValueChange={(v) => onChange("overflow", v)}>
				<SelectTrigger className="h-7 text-[11px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="visible">visible</SelectItem>
					<SelectItem value="hidden">hidden</SelectItem>
					<SelectItem value="scroll">scroll</SelectItem>
					<SelectItem value="auto">auto</SelectItem>
				</SelectContent>
			</Select>
		</div>
	</Section>
);

const PositionSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Position">
		<div className="mb-2 flex items-center gap-2">
			<LabelText>Position</LabelText>
			<Select value={value.position ?? "static"} onValueChange={(v) => onChange("position", v)}>
				<SelectTrigger className="h-7 text-[11px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="static">static</SelectItem>
					<SelectItem value="relative">relative</SelectItem>
					<SelectItem value="absolute">absolute</SelectItem>
					<SelectItem value="fixed">fixed</SelectItem>
					<SelectItem value="sticky">sticky</SelectItem>
				</SelectContent>
			</Select>
		</div>

		<div className="flex items-center gap-2">
			<LabelText>Z Index</LabelText>
			<NumericInput value={value.zIndex ?? "auto"} onChange={(e) => onChange("zIndex", e.target.value)} />
		</div>
	</Section>
);
const TypographySection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => {
	const update = <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => onChange(k, v);

	const handleColorChange = (input: any) => {
		// ignore form events
		if (input && typeof input === "object" && "nativeEvent" in input) return;
		try {
			const hex = Color(input as any)
				.hex()
				.toLowerCase();
			update("color" as keyof EditableStyle, hex as any);
		} catch {
			/* noop */
		}
	};

	return (
		<Section title="Typography">
			{/* FAMILY */}
			<div className="flex items-center gap-2">
				<span className="bg-muted text-muted-foreground inline-flex items-center rounded px-2 py-1 text-[10px] font-medium">
					Family
				</span>
				<Input
					className="h-7 flex-1 text-[11px]"
					value={value.fontFamily ?? "Arial, Roboto, sans-serif"}
					onChange={(e) => update("fontFamily", e.target.value as any)}
				/>
				<Button size="icon" variant="ghost" className="text-muted-foreground h-7 w-7" type="button">
					⟳
				</Button>
			</div>

			{/* WEIGHT */}
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground w-14 text-[11px]">Weight</span>
				<Select value={value.fontWeight ?? "400"} onValueChange={(v) => update("fontWeight", v as any)}>
					<SelectTrigger className="h-7 flex-1 text-[11px]">
						<SelectValue placeholder="Weight" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="300">300 – Light</SelectItem>
						<SelectItem value="400">400 – Normal</SelectItem>
						<SelectItem value="500">500 – Medium</SelectItem>
						<SelectItem value="600">600 – Semi Bold</SelectItem>
						<SelectItem value="700">700 – Bold</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* COLOR */}
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground w-14 text-[11px]">Color</span>

				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="h-6 w-6 cursor-pointer rounded border shadow-sm"
							style={{ background: value.color ?? "#000000" }}
						/>
					</PopoverTrigger>
					<PopoverContent side="bottom" className="p-2">
						<ColorPicker
							value={value.color ?? "#000000"}
							defaultValue={value.color ?? "#000000"}
							onChange={handleColorChange}
							className="w-60"
						/>
					</PopoverContent>
				</Popover>

				<Input
					className="h-7 flex-1 text-[11px]"
					value={value.color ?? "black"}
					onChange={(e) => update("color", e.target.value as any)}
				/>
			</div>

			{/* SIZE / HEIGHT / SPACING */}
			<div className="mt-1 grid grid-cols-3 gap-2">
				<div className="space-y-1">
					<div className="flex items-center gap-1">
						<span className="text-muted-foreground text-[11px]">Size</span>
					</div>
					<NumericInput
						suffix="PX"
						value={(value.fontSize as string) ?? "16"}
						onChange={(e) => update("fontSize", e.target.value as any)}
					/>
				</div>

				<div className="space-y-1">
					<span className="text-muted-foreground text-[11px]">Height</span>
					<NumericInput
						value={(value.lineHeight as string) ?? "1.2"}
						onChange={(e) => update("lineHeight", e.target.value as any)}
					/>
				</div>

				<div className="space-y-1">
					<span className="text-muted-foreground text-[11px]">Spacing</span>
					<Select
						value={(value.letterSpacing as string) ?? "normal"}
						onValueChange={(v) => update("letterSpacing", v as any)}
					>
						<SelectTrigger className="h-7 text-[11px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="normal">normal</SelectItem>
							<SelectItem value="0.02em">wide</SelectItem>
							<SelectItem value="0.05em">extra</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* ALIGN + DECORATION ROWS */}
			{/* ALIGN + DECORATION ROWS */}
			<div className="mt-1 grid grid-cols-2 gap-2">
				{/* Text align – radio group */}
				<div className="space-y-1">
					<span className="sr-only">Text align</span>
					<div
						role="radiogroup"
						aria-label="Text alignment"
						className="bg-muted/40 inline-flex w-full gap-0.5 rounded-md border p-0.5"
					>
						{[
							{
								value: "left",
								Icon: AlignLeft,
								label: "Align left",
								css: "text-align: left;",
								desc: "Aligns the text to the left."
							},
							{
								value: "center",
								Icon: AlignCenter,
								label: "Align center",
								css: "text-align: center;",
								desc: "Centers the text."
							},
							{
								value: "right",
								Icon: AlignRight,
								label: "Align right",
								css: "text-align: right;",
								desc: "Aligns the text to the right."
							},
							{
								value: "justify",
								Icon: AlignJustify,
								label: "Justify",
								css: "text-align: justify;",
								desc: "Stretches each line so all lines have equal width."
							}
						].map(({ value: v, Icon, label, css, desc }) => {
							const selected = (value.textAlign ?? "left") === v;
							return (
								<Tooltip key={v}>
									<TooltipTrigger asChild>
										<TinyButton
											type="button"
											role="radio"
											aria-checked={selected}
											aria-label={label}
											variant={selected ? "default" : "outline"}
											className="flex-1 justify-center"
											onClick={() => update("textAlign", v as any)}
										>
											<Icon className="w-2" />
										</TinyButton>
									</TooltipTrigger>
									<TooltipContent>
										<p className="mb-1 text-xs font-medium">Text Align</p>
										<p className="font-mono text-xs">{css}</p>
										<p className="text-muted-foreground text-xs">{desc}</p>
									</TooltipContent>
								</Tooltip>
							);
						})}
					</div>
				</div>

				{/* Text decoration – inchangé, mais séparé */}
				<div className="space-y-1">
					<span className="sr-only">Text decoration</span>
					<div
						role="radiogroup"
						aria-label="Text decoration"
						className="bg-muted/40 inline-flex w-full gap-0.5 rounded-md border p-0.5"
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<TinyButton
									type="button"
									role="radio"
									aria-checked={!value.textDecorationLine || value.textDecorationLine === "none"}
									aria-label="No decoration"
									variant={!value.textDecorationLine || value.textDecorationLine === "none" ? "default" : "outline"}
									className="flex-1 justify-center"
									onClick={() => update("textDecorationLine", "none" as any)}
								>
									x
								</TinyButton>
							</TooltipTrigger>
							<TooltipContent>
								<p className="mb-1 text-xs font-medium">Text Decoration Line</p>
								<p className="font-mono text-xs">text-decoration-line: none;</p>
								<p className="text-muted-foreground text-xs">No decoration is applied to the text.</p>
							</TooltipContent>
						</Tooltip>

						<TinyButton
							type="button"
							role="radio"
							aria-checked={value.textDecorationLine === "underline"}
							aria-label="Underline"
							variant={value.textDecorationLine === "underline" ? "default" : "outline"}
							className="flex-1 justify-center"
							onClick={() => update("textDecorationLine", "underline" as any)}
						>
							<span className="text-[11px] underline">U</span>
						</TinyButton>

						<TinyButton
							type="button"
							role="radio"
							aria-checked={value.textDecorationLine === "line-through"}
							aria-label="Strikethrough"
							variant={value.textDecorationLine === "line-through" ? "default" : "outline"}
							className="flex-1 justify-center"
							onClick={() => update("textDecorationLine", "line-through" as any)}
						>
							<span className="text-[11px] line-through">S</span>
						</TinyButton>

						<TinyButton
							type="button"
							role="radio"
							aria-checked={value.textDecorationLine === "overline"}
							aria-label="Overline"
							variant={value.textDecorationLine === "overline" ? "default" : "outline"}
							className="flex-1 justify-center"
							onClick={() => update("textDecorationLine", "overline" as any)}
						>
							<span className="text-[11px]">O̅</span>
						</TinyButton>
					</div>
				</div>
			</div>

			{/* TRANSFORM / CASE & ADVANCED TOGGLER */}
			<div className="mt-1 grid grid-cols-[1fr_auto] items-start gap-2">
				<div className="grid grid-cols-4 gap-1">
					<TinyButton
						type="button"
						variant={!value.textTransform || value.textTransform === "none" ? "default" : "outline"}
						onClick={() => update("textTransform", "none" as any)}
					>
						x
					</TinyButton>
					<TinyButton
						type="button"
						variant={value.textTransform === "uppercase" ? "default" : "outline"}
						onClick={() => update("textTransform", "uppercase" as any)}
					>
						AB
					</TinyButton>
					<TinyButton
						type="button"
						variant={value.textTransform === "capitalize" ? "default" : "outline"}
						onClick={() => update("textTransform", "capitalize" as any)}
					>
						Aa
					</TinyButton>
					<TinyButton
						type="button"
						variant={value.textTransform === "lowercase" ? "default" : "outline"}
						onClick={() => update("textTransform", "lowercase" as any)}
					>
						ab
					</TinyButton>
				</div>

				<Popover>
					<PopoverTrigger asChild>
						<TinyButton type="button" variant="outline">
							…
						</TinyButton>
					</PopoverTrigger>
					<PopoverContent side="bottom" className="w-80 space-y-2 p-3">
						<div className="mb-1 flex items-center justify-between">
							<span className="text-xs font-medium">Advanced Typography</span>
							<Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-xs">
								×
							</Button>
						</div>

						<div className="grid grid-cols-2 gap-2 text-[11px]">
							<span className="bg-muted text-muted-foreground inline-flex items-center rounded px-2 py-1 text-[10px] font-medium">
								White Space Collapse
							</span>
							<Select
								value={(value.whiteSpace as string) ?? "preserve"}
								onValueChange={(v) => update("whiteSpace", v as any)}
							>
								<SelectTrigger className="h-7 text-[11px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="preserve">preserve</SelectItem>
									<SelectItem value="nowrap">nowrap</SelectItem>
									<SelectItem value="pre-wrap">pre-wrap</SelectItem>
								</SelectContent>
							</Select>

							<span className="text-muted-foreground text-[11px]">Text Wrap Mode</span>
							<Select
								value={(value.textWrapMode as string) ?? "wrap"}
								onValueChange={(v) => update("textWrapMode", v as any)}
							>
								<SelectTrigger className="h-7 text-[11px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="wrap">wrap</SelectItem>
									<SelectItem value="nowrap">nowrap</SelectItem>
								</SelectContent>
							</Select>

							<span className="text-muted-foreground text-[11px]">Text Wrap Style</span>
							<Select
								value={(value.textWrapStyle as string) ?? "auto"}
								onValueChange={(v) => update("textWrapStyle", v as any)}
							>
								<SelectTrigger className="h-7 text-[11px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="auto">auto</SelectItem>
									<SelectItem value="balance">balance</SelectItem>
								</SelectContent>
							</Select>

							<span className="text-muted-foreground text-[11px]">Direction</span>
							<div className="flex gap-1">
								<TinyButton
									type="button"
									variant={!value.direction || value.direction === "ltr" ? "default" : "outline"}
									onClick={() => update("direction", "ltr" as any)}
								>
									→
								</TinyButton>
								<TinyButton
									type="button"
									variant={value.direction === "rtl" ? "default" : "outline"}
									onClick={() => update("direction", "rtl" as any)}
								>
									←
								</TinyButton>
							</div>

							<span className="text-muted-foreground text-[11px]">Hyphens</span>
							<div className="flex gap-1">
								<TinyButton
									type="button"
									variant={!value.hyphens || value.hyphens === "none" ? "default" : "outline"}
									onClick={() => update("hyphens", "none" as any)}
								>
									x
								</TinyButton>
								<TinyButton
									type="button"
									variant={value.hyphens === "auto" ? "default" : "outline"}
									onClick={() => update("hyphens", "auto" as any)}
								>
									–
								</TinyButton>
							</div>

							<span className="text-muted-foreground text-[11px]">Text Overflow</span>
							<Select
								value={(value.textOverflow as string) ?? "clip"}
								onValueChange={(v) => update("textOverflow", v as any)}
							>
								<SelectTrigger className="h-7 text-[11px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="clip">clip</SelectItem>
									<SelectItem value="ellipsis">ellipsis</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</PopoverContent>
				</Popover>
			</div>
		</Section>
	);
};

const BackgroundsSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Backgrounds">
		<div className="flex items-center gap-2">
			<LabelText>Color</LabelText>
			<div
				className="h-5 w-5 cursor-pointer rounded border"
				style={{ background: value.backgroundColor ?? "transparent" }}
				onClick={() =>
					onChange("backgroundColor", value.backgroundColor === "transparent" ? "#ffffff" : "transparent")
				}
			/>
			<Input
				className="h-7 flex-1 text-[11px]"
				value={value.backgroundColor ?? "transparent"}
				onChange={(e) => onChange("backgroundColor", e.target.value)}
			/>
		</div>
	</Section>
);

const BordersSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Borders">
		<div className="flex items-center gap-2">
			<LabelText>Style</LabelText>
			<div className="flex gap-1">
				<TinyButton>x</TinyButton>
				<TinyButton>—</TinyButton>
				<TinyButton>···</TinyButton>
			</div>
		</div>

		<div className="flex items-center gap-2">
			<LabelText>Color</LabelText>
			<Input
				className="h-7 text-[11px]"
				value={value.borderColor ?? "currentcolor"}
				onChange={(e) => onChange("borderColor", e.target.value)}
			/>
		</div>

		<div className="grid grid-cols-2 items-center gap-2">
			<LabelText>Width</LabelText>
			<NumericInput
				value={value.borderWidth ?? "medium"}
				onChange={(e) => onChange("borderWidth", e.target.value)}
			/>

			<LabelText>Radius</LabelText>
			<NumericInput
				suffix="px"
				value={value.borderRadius ?? "0"}
				onChange={(e) => onChange("borderRadius", e.target.value)}
			/>
		</div>
	</Section>
);

const AdvancedSection: React.FC<{ value: EditableStyle }> = () => (
	<Section title="Advanced">
		<div className="text-muted-foreground space-y-1 text-[10px]">
			<div>-moz-osx-font-smoothing: grayscale</div>
			<div>-webkit-font-smoothing: antialiased</div>
			<div>box-sizing: border-box</div>
			<div>user-select: auto</div>
		</div>
	</Section>
);
